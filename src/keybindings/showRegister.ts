import { ILSPluginUser } from "@logseq/libs/dist/LSPlugin";

import { readVimRegister } from "@/common/funcs";
import { describeUnnamedRegister } from "@/runtime/vim-register";

export default (logseq: ILSPluginUser) => {
  logseq.App.registerCommandPalette(
    {
      key: "vim-shortcut-show-unnamed-register",
      label: "Vim: Show unnamed register",
    },
    () => {
      logseq.UI.showMsg(
        describeUnnamedRegister(readVimRegister()),
        "info"
      );
    }
  );
};
