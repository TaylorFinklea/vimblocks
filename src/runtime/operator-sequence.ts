export interface OperatorSequence {
  commandId: string;
  tokens: string[];
}

export interface OperatorSequenceResult {
  status: "none" | "pending" | "matched";
  pendingTokens: string[];
  consume: boolean;
  commandId?: string;
}

export interface KeyboardEventLike {
  key: string;
  ctrlKey: boolean;
  altKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
}

export const advanceOperatorSequence = (
  sequences: readonly OperatorSequence[],
  pendingTokens: readonly string[],
  token: string
): OperatorSequenceResult => {
  const candidate = [...pendingTokens, token];
  const exact = sequences.find(
    (sequence) =>
      sequence.tokens.length === candidate.length &&
      sequence.tokens.every(
        (sequenceToken, index) => sequenceToken === candidate[index]
      )
  );

  if (exact) {
    return {
      status: "matched",
      pendingTokens: [],
      consume: true,
      commandId: exact.commandId,
    };
  }

  const isPrefix = sequences.some(
    (sequence) =>
      sequence.tokens.length > candidate.length &&
      candidate.every(
        (candidateToken, index) =>
          candidateToken === sequence.tokens[index]
      )
  );
  if (isPrefix) {
    return {
      status: "pending",
      pendingTokens: candidate,
      consume: pendingTokens.length > 0,
    };
  }

  return {
    status: "none",
    pendingTokens: [],
    consume: false,
  };
};

export const expandOperatorBinding = (
  binding: string,
  requiresFinalWord: boolean
): string[] => {
  const tokens = binding
    .trim()
    .toLowerCase()
    .split(/\s+/u)
    .filter(Boolean);
  return requiresFinalWord ? [...tokens, "w"] : tokens;
};

const SHIFTED_KEYS: Readonly<Record<string, string>> = {
  "!": "1",
  "@": "2",
  "#": "3",
  $: "4",
  "%": "5",
  "^": "6",
  "&": "7",
  "*": "8",
  "(": "9",
  ")": "0",
  _: "-",
  "+": "=",
  "{": "[",
  "}": "]",
  "|": "\\",
  ":": ";",
  '"': "'",
  "<": ",",
  ">": ".",
  "?": "/",
  "~": "`",
};

export const keyboardEventToken = (
  event: KeyboardEventLike
): string => {
  if (!event.key) {
    return "";
  }

  const key = event.shiftKey
    ? SHIFTED_KEYS[event.key] ?? event.key.toLowerCase()
    : event.key.toLowerCase();
  const modifiers: string[] = [];
  if (event.metaKey) {
    modifiers.push("mod");
  }
  if (event.ctrlKey) {
    modifiers.push("ctrl");
  }
  if (event.altKey) {
    modifiers.push("alt");
  }
  if (event.shiftKey) {
    modifiers.push("shift");
  }

  return [...modifiers, key].join("+");
};
