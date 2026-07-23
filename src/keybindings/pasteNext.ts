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
import { planRegisterPut } from "@/runtime/vim-register";
import { useSearchStore } from "@/stores/search";

export const putVimRegister = async (
  before: boolean
): Promise<void> => {
  const blockUUID = await getCurrentBlockUUID();
  if (!blockUUID) {
    return;
  }

  const block = await logseq.Editor.getBlock(blockUUID);
  const register = readVimRegister();
  if (!block?.uuid || !register.text) {
    return;
  }

  const searchStore = useSearchStore();
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
  if (plan.kind === "linewise") {
    await logseq.Editor.insertBlock(block.uuid, plan.text, {
      before: plan.before,
      sibling: true,
    });
    return;
  }

  await logseq.Editor.updateBlock(blockUUID, plan.content);
  await logseq.Editor.selectBlock(blockUUID);
  await searchStore.restoreCursor(
    blockUUID,
    plan.content,
    plan.cursor
  );
};

export const pasteNextBlock = async (): Promise<void> =>
  putVimRegister(false);

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
        keybinding: {
          mode: "non-editing",
          binding,
        },
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
