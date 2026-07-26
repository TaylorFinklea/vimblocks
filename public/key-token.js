(() => {
  const codeKeys = {
    Backquote: "`",
    Minus: "-",
    Equal: "=",
    BracketLeft: "[",
    BracketRight: "]",
    Backslash: "\\",
    Semicolon: ";",
    Quote: "'",
    Comma: ",",
    Period: ".",
    Slash: "/",
    Space: "space",
  };

  const baseKey = (event) => {
    if (/^Key[A-Z]$/.test(event.code || "")) {
      return event.code.slice(3).toLowerCase();
    }
    if (/^Digit[0-9]$/.test(event.code || "")) {
      return event.code.slice(5);
    }
    if (codeKeys[event.code]) return codeKeys[event.code];
    return String(event.key || "").toLowerCase();
  };

  const eventToken = (event) => {
    const key = baseKey(event);
    if (!key) return "";
    const modifiers = [];
    if (event.metaKey) modifiers.push("mod");
    if (event.ctrlKey) modifiers.push("ctrl");
    if (event.altKey) modifiers.push("alt");
    if (event.shiftKey) modifiers.push("shift");
    return [...modifiers, key].join("+");
  };

  const shouldCapture = ({
    token,
    textEntryActive,
    captureAll,
    normalModeActive,
    captureTokens,
    normalModeTokens,
  }) =>
    !textEntryActive &&
    (captureAll ||
      captureTokens.includes(token) ||
      (normalModeActive && normalModeTokens.includes(token)));

  const entersTextEntry = (token) =>
    ["i", "a", "shift+i", "shift+a", "o", "shift+o"].includes(token);

  window.__vimblocksKeyToken = {
    eventToken,
    shouldCapture,
    entersTextEntry,
  };
})();
