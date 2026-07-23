export interface TextEntryTarget {
  tagName?: string;
  isContentEditable?: boolean;
  getAttribute?: (name: string) => string | null;
}

export interface TextEntryGuardOptions {
  allowContentEditable?: boolean;
  guardTextEntry?: boolean;
}

const TEXT_ENTRY_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);
const TEXT_ENTRY_ROLES = new Set([
  "combobox",
  "searchbox",
  "textbox",
]);

export const isTextEntryTarget = (
  target: TextEntryTarget | null | undefined
): boolean => {
  if (!target) {
    return false;
  }

  if (target.isContentEditable) {
    return true;
  }

  if (target.tagName && TEXT_ENTRY_TAGS.has(target.tagName.toUpperCase())) {
    return true;
  }

  const role = target.getAttribute?.("role")?.toLowerCase();
  return role ? TEXT_ENTRY_ROLES.has(role) : false;
};

export const isContentEditableTarget = (
  target: TextEntryTarget | null | undefined
): boolean => Boolean(target?.isContentEditable);

export const getActiveTextEntryTarget = (): TextEntryTarget | null => {
  return window.top?.document.activeElement as TextEntryTarget | null;
};

export const isTextEntryActive = (): boolean => {
  return isTextEntryTarget(getActiveTextEntryTarget());
};

export const shouldBlockTextEntryAction = (
  target: TextEntryTarget | null | undefined,
  options: TextEntryGuardOptions = {}
): boolean => {
  if (options.guardTextEntry === false || !isTextEntryTarget(target)) {
    return false;
  }

  return !(
    options.allowContentEditable && isContentEditableTarget(target)
  );
};
