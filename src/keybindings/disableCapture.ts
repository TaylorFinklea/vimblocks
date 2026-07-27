import { ILSPluginUser } from "@logseq/libs/dist/LSPlugin";

import {
  configureHostCapture,
  configureHostNormalModeCapture,
  setHostCaptureAll,
  setHostNormalModeActive,
} from "@/runtime/host-bridge";
import { useSearchStore } from "@/stores/search";

export default (logseq: ILSPluginUser) => {
  logseq.App.registerCommandPalette(
    {
      key: "vimblocks-disable-key-capture",
      label: "Vimblocks: Disable key capture",
    },
    () => {
      setHostCaptureAll(false);
      setHostNormalModeActive(false);
      configureHostCapture([]);
      configureHostNormalModeCapture([]);
      useSearchStore().clearCursor();
      logseq.UI.showMsg(
        "Vimblocks key capture disabled. Reload the plugin to re-enable it.",
        "success"
      );
    }
  );
};
