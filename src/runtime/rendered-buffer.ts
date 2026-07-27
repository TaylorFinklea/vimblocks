import type {
  BoundaryProfile,
  ModalMotionToken,
  ModalPoint,
} from "./modal-command.ts";
import {
  canonicalizeSubtreeRoots,
  type BlockNode,
} from "./block-subtrees.ts";

export interface RenderedBlock {
  uuid: string;
  content: string;
}

export interface RenderedBuffer {
  blocks: readonly RenderedBlock[];
}

export type MotionName = Exclude<
  ModalMotionToken,
  "f" | "F" | "t" | "T" | ";" | "," | "iw" | "aw" | "line"
>;

export interface MotionContext {
  profile: BoundaryProfile;
  viewportBlockUUIDs: readonly string[];
  preferredColumn: number | null;
}

export interface MotionResult {
  point: ModalPoint;
  preferredColumn: number | null;
  crossedBlock: boolean;
}

export interface VisualRange {
  kind: "characterwise" | "linewise";
  start: ModalPoint;
  end: ModalPoint;
  rootUUIDs: string[];
}

type CharacterClass = "word" | "punctuation" | "whitespace";

const characterClass = (character: string): CharacterClass => {
  if (/\s/u.test(character)) return "whitespace";
  if (/[\p{L}\p{N}_]/u.test(character)) return "word";
  return "punctuation";
};

const markHidden = (map: number[], start: number, length: number): void => {
  for (let index = start; index < start + length; index += 1) {
    map[index] = -1;
  }
};

export const buildPositionMap = (content: string): number[] => {
  const map: number[] = [];
  let renderedOffset = 0;
  let index = 0;
  let closingMarker = "";

  while (index < content.length) {
    if (closingMarker && content.startsWith(closingMarker, index)) {
      markHidden(map, index, closingMarker.length);
      index += closingMarker.length;
      closingMarker = "";
      continue;
    }

    if (!closingMarker) {
      if (
        content[index] === "<" &&
        /^(?:https?|file):\/\//u.test(content.slice(index + 1))
      ) {
        map[index] = -1;
        closingMarker = ">";
        index += 1;
        continue;
      }
      if (content.startsWith("[[", index)) {
        markHidden(map, index, 2);
        closingMarker = "]]";
        index += 2;
        continue;
      }

      const marker = ["**", "__", "~~", "`", "*", "_"].find(
        (candidate) =>
          content.startsWith(candidate, index) &&
          content.indexOf(candidate, index + candidate.length) >= 0
      );
      if (marker) {
        markHidden(map, index, marker.length);
        closingMarker = marker;
        index += marker.length;
        continue;
      }
    }

    if (content[index] === "\n") {
      map[index] = -1;
      index += 1;
      continue;
    }

    map[index] = renderedOffset;
    renderedOffset += 1;
    index += 1;
  }

  return map;
};

export const normalizeRawOffset = (
  content: string,
  rawOffset: number
): number => {
  if (!content.length) return 0;
  const map = buildPositionMap(content);
  const clamped = Math.min(
    Math.max(Math.trunc(rawOffset || 0), 0),
    content.length - 1
  );
  if (map[clamped] !== -1 && map[clamped] !== undefined) return clamped;

  for (let index = clamped + 1; index < map.length; index += 1) {
    if (map[index] !== -1 && map[index] !== undefined) return index;
  }
  for (let index = clamped - 1; index >= 0; index -= 1) {
    if (map[index] !== -1 && map[index] !== undefined) return index;
  }
  return 0;
};

export const toRenderedOffset = (
  content: string,
  rawOffset: number
): number => {
  if (!content.length) return 0;
  const normalized = normalizeRawOffset(content, rawOffset);
  const rendered = buildPositionMap(content)[normalized];
  return rendered === -1 || rendered === undefined ? 0 : rendered;
};

const visibleRawOffsets = (content: string): number[] =>
  buildPositionMap(content)
    .map((rendered, raw) => ({ raw, rendered }))
    .filter(({ rendered }) => rendered !== -1 && rendered !== undefined)
    .map(({ raw }) => raw);

const uniqueBlocks = (buffer: RenderedBuffer): RenderedBlock[] => {
  const seen = new Set<string>();
  return buffer.blocks.filter((block) => {
    if (!block.uuid || seen.has(block.uuid)) return false;
    seen.add(block.uuid);
    return true;
  });
};

export const resolveVisualRange = (
  buffer: RenderedBuffer,
  nodes: readonly BlockNode[],
  anchor: ModalPoint,
  head: ModalPoint,
  kind: VisualRange["kind"],
  profile: BoundaryProfile
): VisualRange => {
  const blocks = uniqueBlocks(buffer);
  const anchorIndex = blocks.findIndex(
    (block) => block.uuid === anchor.blockUUID
  );
  let headIndex = blocks.findIndex((block) => block.uuid === head.blockUUID);
  const safeAnchor = {
    blockUUID: anchor.blockUUID,
    offset: normalizeRawOffset(
      blocks[anchorIndex]?.content ?? "",
      anchor.offset
    ),
  };
  let safeHead = {
    blockUUID: head.blockUUID,
    offset: normalizeRawOffset(blocks[headIndex]?.content ?? "", head.offset),
  };

  if (
    kind === "characterwise" &&
    profile === "logseq-first" &&
    safeHead.blockUUID !== safeAnchor.blockUUID
  ) {
    safeHead = safeAnchor;
    headIndex = anchorIndex;
  }

  const anchorBeforeHead =
    anchorIndex < headIndex ||
    (anchorIndex === headIndex && safeAnchor.offset <= safeHead.offset);
  const start = anchorBeforeHead ? safeAnchor : safeHead;
  const end = anchorBeforeHead ? safeHead : safeAnchor;
  const firstIndex = Math.min(anchorIndex, headIndex);
  const lastIndex = Math.max(anchorIndex, headIndex);
  const selectedUUIDs =
    firstIndex >= 0
      ? blocks.slice(firstIndex, lastIndex + 1).map((block) => block.uuid)
      : [anchor.blockUUID];

  return {
    kind,
    start,
    end,
    rootUUIDs:
      kind === "linewise"
        ? canonicalizeSubtreeRoots(selectedUUIDs, nodes)
        : [],
  };
};

const rawAtRenderedColumn = (
  content: string,
  renderedColumn: number
): number => {
  const offsets = visibleRawOffsets(content);
  if (!offsets.length) return 0;
  return offsets[Math.min(Math.max(renderedColumn, 0), offsets.length - 1)];
};

const firstTokenOffset = (block: RenderedBlock): number => {
  const offsets = visibleRawOffsets(block.content);
  return (
    offsets.find(
      (offset) => characterClass(block.content[offset]) !== "whitespace"
    ) ??
    offsets[0] ??
    0
  );
};

const lastVisibleOffset = (block: RenderedBlock): number => {
  const offsets = visibleRawOffsets(block.content);
  return offsets.at(-1) ?? 0;
};

const findNonEmptyBlock = (
  blocks: readonly RenderedBlock[],
  startIndex: number,
  direction: -1 | 1
): { block: RenderedBlock; index: number } | null => {
  for (
    let index = startIndex;
    index >= 0 && index < blocks.length;
    index += direction
  ) {
    if (visibleRawOffsets(blocks[index].content).length) {
      return { block: blocks[index], index };
    }
  }
  return null;
};

const moveCharacter = (
  blocks: readonly RenderedBlock[],
  point: ModalPoint,
  direction: -1 | 1,
  profile: BoundaryProfile
): ModalPoint => {
  const blockIndex = blocks.findIndex((block) => block.uuid === point.blockUUID);
  if (blockIndex < 0) return point;
  const block = blocks[blockIndex];
  const offsets = visibleRawOffsets(block.content);
  const raw = normalizeRawOffset(block.content, point.offset);
  const offsetIndex = Math.max(0, offsets.indexOf(raw));
  const nextOffset = offsets[offsetIndex + direction];
  if (nextOffset !== undefined) {
    return { blockUUID: block.uuid, offset: nextOffset };
  }
  if (profile === "logseq-first") return point;

  const adjacent = findNonEmptyBlock(
    blocks,
    blockIndex + direction,
    direction
  );
  if (!adjacent) return point;
  return {
    blockUUID: adjacent.block.uuid,
    offset:
      direction === 1
        ? visibleRawOffsets(adjacent.block.content)[0]
        : lastVisibleOffset(adjacent.block),
  };
};

const moveWordForward = (
  blocks: readonly RenderedBlock[],
  point: ModalPoint,
  profile: BoundaryProfile
): ModalPoint => {
  let blockIndex = blocks.findIndex((block) => block.uuid === point.blockUUID);
  if (blockIndex < 0) return point;
  let block = blocks[blockIndex];
  let offsets = visibleRawOffsets(block.content);
  const raw = normalizeRawOffset(block.content, point.offset);
  let index = Math.max(0, offsets.indexOf(raw));
  const currentClass = characterClass(block.content[offsets[index]] ?? "");

  index += 1;
  while (
    index < offsets.length &&
    characterClass(block.content[offsets[index]]) === currentClass
  ) {
    index += 1;
  }
  if (currentClass !== "whitespace") {
    while (
      index < offsets.length &&
      characterClass(block.content[offsets[index]]) === "whitespace"
    ) {
      index += 1;
    }
  }
  if (index < offsets.length) {
    return { blockUUID: block.uuid, offset: offsets[index] };
  }
  if (profile === "logseq-first") return point;

  const adjacent = findNonEmptyBlock(blocks, blockIndex + 1, 1);
  if (!adjacent) return point;
  blockIndex = adjacent.index;
  block = adjacent.block;
  offsets = visibleRawOffsets(block.content);
  return {
    blockUUID: block.uuid,
    offset:
      offsets.find(
        (offset) => characterClass(block.content[offset]) !== "whitespace"
      ) ??
      offsets[0] ??
      0,
  };
};

const moveWordBackward = (
  blocks: readonly RenderedBlock[],
  point: ModalPoint,
  profile: BoundaryProfile
): ModalPoint => {
  let blockIndex = blocks.findIndex((block) => block.uuid === point.blockUUID);
  if (blockIndex < 0) return point;
  let block = blocks[blockIndex];
  let offsets = visibleRawOffsets(block.content);
  const raw = normalizeRawOffset(block.content, point.offset);
  let index = offsets.indexOf(raw) - 1;

  if (index < 0) {
    if (profile === "logseq-first") return point;
    const adjacent = findNonEmptyBlock(blocks, blockIndex - 1, -1);
    if (!adjacent) return point;
    blockIndex = adjacent.index;
    block = adjacent.block;
    offsets = visibleRawOffsets(block.content);
    index = offsets.length - 1;
  }
  while (
    index > 0 &&
    characterClass(block.content[offsets[index]]) === "whitespace"
  ) {
    index -= 1;
  }
  const kind = characterClass(block.content[offsets[index]] ?? "");
  while (
    index > 0 &&
    characterClass(block.content[offsets[index - 1]]) === kind
  ) {
    index -= 1;
  }
  return { blockUUID: block.uuid, offset: offsets[index] ?? 0 };
};

const moveWordEnd = (
  blocks: readonly RenderedBlock[],
  point: ModalPoint,
  profile: BoundaryProfile
): ModalPoint => {
  let blockIndex = blocks.findIndex((block) => block.uuid === point.blockUUID);
  if (blockIndex < 0) return point;
  let block = blocks[blockIndex];
  let offsets = visibleRawOffsets(block.content);
  const raw = normalizeRawOffset(block.content, point.offset);
  let index = offsets.indexOf(raw) + 1;

  if (index >= offsets.length) {
    if (profile === "logseq-first") return point;
    const adjacent = findNonEmptyBlock(blocks, blockIndex + 1, 1);
    if (!adjacent) return point;
    blockIndex = adjacent.index;
    block = adjacent.block;
    offsets = visibleRawOffsets(block.content);
    index = 0;
  }
  while (
    index < offsets.length &&
    characterClass(block.content[offsets[index]]) === "whitespace"
  ) {
    index += 1;
  }
  if (index >= offsets.length) return point;
  const kind = characterClass(block.content[offsets[index]]);
  while (
    index + 1 < offsets.length &&
    characterClass(block.content[offsets[index + 1]]) === kind
  ) {
    index += 1;
  }
  return { blockUUID: block.uuid, offset: offsets[index] };
};

export const resolveMotion = (
  buffer: RenderedBuffer,
  point: ModalPoint,
  motion: MotionName,
  count: number,
  context: MotionContext
): MotionResult => {
  const blocks = uniqueBlocks(buffer);
  const startBlockIndex = blocks.findIndex(
    (block) => block.uuid === point.blockUUID
  );
  if (startBlockIndex < 0) {
    return { point, preferredColumn: context.preferredColumn, crossedBlock: false };
  }

  const startBlock = blocks[startBlockIndex];
  const startPoint = {
    blockUUID: startBlock.uuid,
    offset: normalizeRawOffset(startBlock.content, point.offset),
  };
  const repetitions = Math.max(1, Math.trunc(count || 1));
  let target = startPoint;
  let preferredColumn: number | null = null;

  if (motion === "h" || motion === "l") {
    const direction = motion === "h" ? -1 : 1;
    for (let index = 0; index < repetitions; index += 1) {
      target = moveCharacter(blocks, target, direction, context.profile);
    }
  } else if (motion === "w" || motion === "b" || motion === "e") {
    for (let index = 0; index < repetitions; index += 1) {
      target =
        motion === "w"
          ? moveWordForward(blocks, target, context.profile)
          : motion === "b"
            ? moveWordBackward(blocks, target, context.profile)
            : moveWordEnd(blocks, target, context.profile);
    }
  } else if (motion === "0" || motion === "^" || motion === "$") {
    let targetIndex = startBlockIndex;
    if (motion === "$" && repetitions > 1) {
      targetIndex = Math.min(blocks.length - 1, targetIndex + repetitions - 1);
    }
    const block = blocks[targetIndex];
    target = {
      blockUUID: block.uuid,
      offset:
        motion === "^"
          ? firstTokenOffset(block)
          : motion === "$"
            ? lastVisibleOffset(block)
            : visibleRawOffsets(block.content)[0] ?? 0,
    };
  } else {
    const currentColumn =
      context.preferredColumn ??
      toRenderedOffset(startBlock.content, startPoint.offset);
    preferredColumn = currentColumn;
    let targetIndex = startBlockIndex;

    if (motion === "j" || motion === "k") {
      targetIndex += (motion === "j" ? 1 : -1) * repetitions;
    } else if (motion === "ctrl+d" || motion === "ctrl+u") {
      const viewportRows = new Set(context.viewportBlockUUIDs).size;
      const distance = Math.max(1, Math.floor(viewportRows / 2)) * repetitions;
      targetIndex += motion === "ctrl+d" ? distance : -distance;
    } else if (motion === "gg") {
      targetIndex = repetitions - 1;
    } else if (motion === "G") {
      targetIndex = repetitions > 1 ? repetitions - 1 : blocks.length - 1;
    }

    targetIndex = Math.min(Math.max(targetIndex, 0), blocks.length - 1);
    const block = blocks[targetIndex];
    target = {
      blockUUID: block.uuid,
      offset: rawAtRenderedColumn(block.content, currentColumn),
    };
  }

  return {
    point: target,
    preferredColumn,
    crossedBlock: target.blockUUID !== startPoint.blockUUID,
  };
};
