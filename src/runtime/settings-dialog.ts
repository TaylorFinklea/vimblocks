export interface SettingsDialogStore {
  hide(): void;
}

export interface SettingsDialogApi {
  hideMainUI(options: { restoreEditingCursor: true }): void;
}

export const closeSettingsDialog = (
  settingsStore: SettingsDialogStore,
  api: SettingsDialogApi
): void => {
  settingsStore.hide();
  api.hideMainUI({ restoreEditingCursor: true });
};
