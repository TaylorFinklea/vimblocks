export interface NormalModeEditor {
  updateBlock(blockUUID: string, content: string): Promise<void>;
  editBlock(blockUUID: string, options: { pos: number }): Promise<void>;
  exitEditingMode(selectBlock?: boolean): Promise<void>;
}

export interface PersistNormalModeContentOptions {
  editor: NormalModeEditor;
  blockUUID: string;
  content: string;
  cursor: number;
  restoreCursor(
    blockUUID: string,
    content: string,
    cursor: number
  ): Promise<void>;
}

export const persistNormalModeContent = async ({
  editor,
  blockUUID,
  content,
  cursor,
  restoreCursor,
}: PersistNormalModeContentOptions): Promise<void> => {
  await editor.updateBlock(blockUUID, content);
  await editor.editBlock(blockUUID, { pos: cursor });
  await editor.exitEditingMode(true);
  await restoreCursor(blockUUID, content, cursor);
};
