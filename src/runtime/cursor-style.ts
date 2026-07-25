export const normalizeCursorColor = (
  value: unknown,
  fallback = "#ffff00"
): string =>
  typeof value === "string" &&
  /^#(?:[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i.test(value.trim())
    ? value.trim()
    : fallback;

export const cursorHighlightStyle = (value: unknown): string => `
  mark.vim-shortcuts-highlight {
    padding-left: 0 !important;
    padding-right: 0 !important;
    background-color: ${normalizeCursorColor(value)} !important;
  }
`;
