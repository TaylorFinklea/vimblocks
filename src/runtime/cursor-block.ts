export const resolveCurrentBlockUUID = (
  editingBlockUUID: string | undefined,
  cursorMode: boolean,
  cursorBlockUUID: string | undefined
): string | undefined =>
  editingBlockUUID ??
  (cursorMode ? cursorBlockUUID : undefined);
