import type { ChangeDescriptor } from "@/runtime/modal-command";

export type InsertCommand = "i" | "a" | "I" | "A" | "o" | "O";

export interface InsertSession {
  command: InsertCommand;
  blockUUID: string;
  beforeContent: string;
  editPosition: number;
  count: number;
}

export interface InsertDelta {
  relativeStart: number;
  removedText: string;
  insertedText: string;
}

export const openSiblingOptions = (
  command: "o" | "O"
): { before: boolean; sibling: true } => ({
  before: command === "O",
  sibling: true,
});

const clampPosition = (position: number, content: string): number =>
  Math.min(Math.max(Math.trunc(position), 0), content.length);

const firstNonBlank = (content: string): number => {
  const position = content.search(/\S/);
  return position < 0 ? 0 : position;
};

export const beginInsertSession = (
  command: InsertCommand,
  blockUUID: string,
  content: string,
  cursor: number,
  count: number
): InsertSession => {
  const position = clampPosition(cursor, content);
  const editPosition =
    command === "a"
      ? Math.min(position + 1, content.length)
      : command === "I"
        ? firstNonBlank(content)
        : command === "A"
          ? content.length
          : command === "o" || command === "O"
            ? 0
            : position;

  return {
    command,
    blockUUID,
    beforeContent: content,
    editPosition,
    count: Math.max(1, Math.trunc(count)),
  };
};

export const finishInsertSession = (
  session: InsertSession,
  afterContent: string
): Extract<ChangeDescriptor, { kind: "insert" }> | null => {
  if (session.beforeContent === afterContent) return null;

  let prefixLength = 0;
  const sharedLength = Math.min(
    session.beforeContent.length,
    afterContent.length
  );
  while (
    prefixLength < sharedLength &&
    session.beforeContent[prefixLength] === afterContent[prefixLength]
  ) {
    prefixLength += 1;
  }

  let suffixLength = 0;
  while (
    suffixLength < session.beforeContent.length - prefixLength &&
    suffixLength < afterContent.length - prefixLength &&
    session.beforeContent[session.beforeContent.length - 1 - suffixLength] ===
      afterContent[afterContent.length - 1 - suffixLength]
  ) {
    suffixLength += 1;
  }

  return {
    kind: "insert",
    command: session.command,
    relativeStart: prefixLength - session.editPosition,
    removedText: session.beforeContent.slice(
      prefixLength,
      session.beforeContent.length - suffixLength
    ),
    insertedText: afterContent.slice(
      prefixLength,
      afterContent.length - suffixLength
    ),
    count: session.count,
  };
};

export const applyInsertDelta = (
  content: string,
  editPosition: number,
  delta: InsertDelta
): { content: string; cursor: number } => {
  const start = clampPosition(editPosition + delta.relativeStart, content);
  const end = Math.min(start + delta.removedText.length, content.length);
  const nextContent =
    content.slice(0, start) + delta.insertedText + content.slice(end);
  return {
    content: nextContent,
    cursor:
      delta.insertedText.length > 0
        ? start + delta.insertedText.length - 1
        : Math.min(start, Math.max(nextContent.length - 1, 0)),
  };
};

export const insertExitPosition = (
  session: InsertSession,
  change: Extract<ChangeDescriptor, { kind: "insert" }> | null
): number =>
  change
    ? session.editPosition +
      change.relativeStart +
      Math.max(change.insertedText.length - 1, 0)
    : session.editPosition;
