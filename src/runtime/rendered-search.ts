import { buildPositionMap, type RenderedBuffer } from "./rendered-buffer.ts";
import type { ModalPoint } from "./modal-command.ts";

export interface RenderedMatch extends ModalPoint {
  length: number;
}

export type RenderedBlockRow = readonly [uuid: string, content: string];

export interface RenderedSearchPlan {
  buffer: RenderedBuffer;
  matches: RenderedMatch[];
  fetchAndMatchMs: number;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const buildRenderedBlocksQuery = (
  renderedBlockUUIDs: readonly string[]
): string => {
  const uuidLiterals = [...new Set(renderedBlockUUIDs)]
    .filter((uuid) => UUID_PATTERN.test(uuid))
    .map((uuid) => `#uuid "${uuid}"`)
    .join(" ");
  return `
    [:find ?uuid ?title
     :where
     [?block :block/uuid ?uuid]
     [(contains? #{${uuidLiterals}} ?uuid)]
     [?block :block/title ?title]]
  `;
};

const renderedText = (
  content: string
): { text: string; rawOffsets: number[] } => {
  const map = buildPositionMap(content);
  const rawOffsets = map
    .map((rendered, raw) => ({ rendered, raw }))
    .filter(({ rendered }) => rendered >= 0)
    .sort((left, right) => left.rendered - right.rendered)
    .map(({ raw }) => raw);
  return {
    text: rawOffsets.map((raw) => content[raw]).join(""),
    rawOffsets,
  };
};

export const findRenderedMatches = (
  buffer: RenderedBuffer,
  query: string
): RenderedMatch[] => {
  if (!query) return [];
  const caseSensitive = query.toLowerCase() !== query;
  const needle = caseSensitive ? query : query.toLowerCase();
  const matches: RenderedMatch[] = [];

  for (const block of buffer.blocks) {
    const rendered = renderedText(block.content);
    const haystack = caseSensitive
      ? rendered.text
      : rendered.text.toLowerCase();
    let index = haystack.indexOf(needle);
    while (index >= 0) {
      matches.push({
        blockUUID: block.uuid,
        offset: rendered.rawOffsets[index] ?? 0,
        length: query.length,
      });
      index = haystack.indexOf(needle, index + Math.max(query.length, 1));
    }
  }
  return matches;
};

export const planRenderedSearch = async (
  renderedBlockUUIDs: readonly string[],
  query: string,
  fetchRows: (uuids: readonly string[]) => Promise<readonly RenderedBlockRow[]>,
  now: () => number = () => performance.now()
): Promise<RenderedSearchPlan> => {
  const uuids = [...new Set(renderedBlockUUIDs.filter(Boolean))];
  const startedAt = now();
  const rows = await fetchRows(uuids);
  const contentByUUID = new Map(rows);
  const buffer: RenderedBuffer = {
    blocks: uuids.flatMap((uuid) => {
      const content = contentByUUID.get(uuid);
      return content === undefined ? [] : [{ uuid, content }];
    }),
  };
  const matches = findRenderedMatches(buffer, query);
  return {
    buffer,
    matches,
    fetchAndMatchMs: now() - startedAt,
  };
};

export const moveRenderedMatch = (
  matches: readonly RenderedMatch[],
  currentIndex: number,
  direction: "next" | "previous",
  count: number
): { index: number; wrapped: boolean } => {
  if (matches.length === 0) return { index: -1, wrapped: false };
  const step = direction === "next" ? 1 : -1;
  const moves = Math.max(1, Math.trunc(count));
  let index =
    currentIndex >= 0 && currentIndex < matches.length
      ? currentIndex
      : direction === "next"
        ? -1
        : 0;
  let wrapped = false;
  for (let move = 0; move < moves; move += 1) {
    const next = index + step;
    if (next >= matches.length || next < 0) wrapped = true;
    index = (next + matches.length) % matches.length;
  }
  return { index, wrapped };
};

export const resolveCharacterFind = (
  content: string,
  cursor: number,
  motion: "f" | "F" | "t" | "T",
  character: string,
  count: number
): number | null => {
  if ([...character].length !== 1) return null;
  const forward = motion === "f" || motion === "t";
  let position = Math.min(Math.max(Math.trunc(cursor), 0), content.length);
  const moves = Math.max(1, Math.trunc(count));

  for (let move = 0; move < moves; move += 1) {
    if (!forward && position <= 0) return null;
    position = forward
      ? content.indexOf(character, position + 1)
      : content.lastIndexOf(character, position - 1);
    if (position < 0) return null;
  }

  if (motion === "t") return Math.max(position - 1, 0);
  if (motion === "T") return Math.min(position + 1, content.length - 1);
  return position;
};
