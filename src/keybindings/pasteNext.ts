import { ILSPluginUser } from "@logseq/libs/dist/LSPlugin";
import {
  debug,
  getCurrentBlockUUID,
  getSettings,
  readVimRegister,
  beforeActionExecute,
  beforeActionRegister,
} from "@/common/funcs";
import { firstNonBlankPosition } from "@/runtime/text-objects";
import {
  isVimRegisterEmpty,
  planLinewisePut,
  planRegisterPut,
} from "@/runtime/vim-register";
import {
  insertLinewiseBatch,
  type LinewisePutEditor,
} from "@/runtime/linewise-put";
import { useSearchStore } from "@/stores/search";

export interface PutVimRegisterResult {
  uuids: string[];
  nativeSteps: number;
}

export const putVimRegister = async (
  before: boolean
): Promise<PutVimRegisterResult> => {
  const blockUUID = await getCurrentBlockUUID();
  if (!blockUUID) {
    return { uuids: [], nativeSteps: 0 };
  }

  const block = await logseq.Editor.getBlock(blockUUID);
  const register = readVimRegister();
  if (!block?.uuid || isVimRegisterEmpty(register)) {
    return { uuids: [], nativeSteps: 0 };
  }

  const searchStore = useSearchStore();
  if (register.kind === "linewise") {
    const plan = planLinewisePut(register, block.uuid, before);
    const editor: LinewisePutEditor = {
      insertBatchBlock: (anchorUUID, batch, options) =>
        logseq.Editor.insertBatchBlock(anchorUUID, batch, options),
      getBlock: (identity) =>
        logseq.Editor.getBlock(identity),
      getPage: (identity) =>
        logseq.Editor.getPage(identity as string),
      insertBlock: (anchorUUID, content, options) =>
        logseq.Editor.insertBlock(
          anchorUUID,
          content,
          options as Parameters<
            typeof logseq.Editor.insertBlock
          >[2]
        ),
      prependBlockInPage: (pageUUID, content, options) =>
        logseq.Editor.prependBlockInPage(
          pageUUID,
          content,
          options
        ),
      removeBlock: (uuid) => logseq.Editor.removeBlock(uuid),
    };
    const insertion = await insertLinewiseBatch(
      editor,
      block,
      plan.batch,
      plan.before
    );
    const inserted = insertion.blocks;
    const target = inserted?.[0];
    if (target?.uuid) {
      await logseq.Editor.selectBlock(target.uuid);
      await searchStore.restoreCursor(
        target.uuid,
        target.content ?? "",
        firstNonBlankPosition(target.content ?? "")
      );
    }
    const collectInsertedUUIDs = (items: typeof inserted): string[] =>
      (items ?? []).flatMap((item) => [
        ...(item.uuid ? [item.uuid] : []),
        ...collectInsertedUUIDs(
          (item.children ?? []).filter(
            (child): child is typeof item =>
              typeof child === "object" &&
              child !== null &&
              "uuid" in child
          )
        ),
      ]);
    return {
      uuids: collectInsertedUUIDs(inserted),
      nativeSteps: insertion.nativeSteps,
    };
  }

  const cursor =
    searchStore.cursorMode &&
    searchStore.cursorBlockUUID === blockUUID
      ? searchStore.cursorPosition
      : firstNonBlankPosition(block.content);
  const plan = planRegisterPut(
    block.content,
    cursor,
    register,
    before
  );
  await logseq.Editor.updateBlock(blockUUID, plan.content);
  await logseq.Editor.selectBlock(blockUUID);
  await searchStore.restoreCursor(
    blockUUID,
    plan.content,
    plan.cursor
  );
  return { uuids: [blockUUID], nativeSteps: 1 };
};

export const pasteNextBlock = async (): Promise<void> => {
  await putVimRegister(false);
};

export default (logseq: ILSPluginUser) => {
  // Check if this keybinding is disabled
  if (!beforeActionRegister("pasteNext")) {
    return;
  }

  const settings = getSettings();

  const bindings = Array.isArray(settings.keyBindings.pasteNext)
    ? settings.keyBindings.pasteNext
    : [settings.keyBindings.pasteNext];

  bindings.forEach((binding, index) => {
    logseq.App.registerCommandPalette(
      {
        key: "vim-shortcut-paste-next-" + index,
        label: "Paste to next block",
      },
      async () => {
        // Check before action hook
        if (!beforeActionExecute()) {
          return;
        }

        debug("Paste to next block");

        await putVimRegister(false);
      }
    );
  });
};
