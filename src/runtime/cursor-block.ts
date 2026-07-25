export const resolveCurrentBlockUUID = (
  editingBlockUUID: string | undefined,
  cursorMode: boolean,
  cursorBlockUUID: string | undefined
): string | undefined =>
  editingBlockUUID ??
  (cursorMode ? cursorBlockUUID : undefined);

export const resolveNormalModeBlockUUID = (
  requestedBlockUUID: string | undefined,
  cursorMode: boolean,
  cursorBlockUUID: string | undefined,
  currentBlockUUID: string | undefined
): string | undefined =>
  requestedBlockUUID ??
  (cursorMode ? cursorBlockUUID : undefined) ??
  currentBlockUUID;
