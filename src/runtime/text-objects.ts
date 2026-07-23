export type TextOperator = "change" | "delete" | "yank";

export interface TextRange {
  start: number;
  end: number;
}

export interface TextOperationResult {
  content: string;
  selected: string;
  cursor: number;
  entersInsertMode: boolean;
}

export interface DeferredWhitespace {
  persistedContent: string;
  deferredWhitespace: string;
}

type CharacterClass = "word" | "punctuation" | "whitespace";

const characterClass = (character: string): CharacterClass => {
  if (/\s/u.test(character)) {
    return "whitespace";
  }
  if (/[\p{L}\p{N}_]/u.test(character)) {
    return "word";
  }
  return "punctuation";
};

const clampCursor = (content: string, cursor: number): number => {
  if (content.length === 0) {
    return 0;
  }
  return Math.min(Math.max(Math.trunc(cursor), 0), content.length - 1);
};

const tokenRangeAt = (content: string, cursor: number): TextRange => {
  if (content.length === 0) {
    return { start: 0, end: 0 };
  }

  let position = clampCursor(content, cursor);
  if (characterClass(content[position]) === "whitespace") {
    while (
      position < content.length &&
      characterClass(content[position]) === "whitespace"
    ) {
      position += 1;
    }
    if (position === content.length) {
      position = clampCursor(content, cursor);
      while (
        position > 0 &&
        characterClass(content[position]) === "whitespace"
      ) {
        position -= 1;
      }
    }
  }

  const kind = characterClass(content[position]);
  let start = position;
  let end = position + 1;

  while (start > 0 && characterClass(content[start - 1]) === kind) {
    start -= 1;
  }
  while (end < content.length && characterClass(content[end]) === kind) {
    end += 1;
  }

  return { start, end };
};

export const innerWordRange = (
  content: string,
  cursor: number
): TextRange => tokenRangeAt(content, cursor);

export const aroundWordRange = (
  content: string,
  cursor: number
): TextRange => {
  const range = tokenRangeAt(content, cursor);
  let { start, end } = range;

  while (
    end < content.length &&
    characterClass(content[end]) === "whitespace"
  ) {
    end += 1;
  }
  if (end === range.end) {
    while (
      start > 0 &&
      characterClass(content[start - 1]) === "whitespace"
    ) {
      start -= 1;
    }
  }

  return { start, end };
};

export const wordForwardRange = (
  content: string,
  cursor: number
): TextRange => {
  if (content.length === 0) {
    return { start: 0, end: 0 };
  }

  const start = clampCursor(content, cursor);
  let end = start;
  const kind = characterClass(content[end]);

  while (end < content.length && characterClass(content[end]) === kind) {
    end += 1;
  }
  if (kind !== "whitespace") {
    while (
      end < content.length &&
      characterClass(content[end]) === "whitespace"
    ) {
      end += 1;
    }
  }

  return { start, end };
};

export const wordEndRange = (
  content: string,
  cursor: number
): TextRange => {
  if (content.length === 0) {
    return { start: 0, end: 0 };
  }

  const start = clampCursor(content, cursor);
  let end = start;
  while (
    end < content.length &&
    characterClass(content[end]) === "whitespace"
  ) {
    end += 1;
  }
  if (end < content.length) {
    const kind = characterClass(content[end]);
    while (end < content.length && characterClass(content[end]) === kind) {
      end += 1;
    }
  }

  return { start, end };
};

export const lineEndRange = (
  content: string,
  cursor: number
): TextRange => ({
  start: content.length === 0 ? 0 : clampCursor(content, cursor),
  end: content.length,
});

export const lineRange = (content: string): TextRange => ({
  start: 0,
  end: content.length,
});

export const firstNonBlankPosition = (content: string): number => {
  const position = content.search(/\S/u);
  return position === -1 ? 0 : position;
};

export const deferTrailingWhitespace = (
  content: string
): DeferredWhitespace => {
  const match = content.match(/\s+$/u);
  if (!match) {
    return { persistedContent: content, deferredWhitespace: "" };
  }

  return {
    persistedContent: content.slice(0, -match[0].length),
    deferredWhitespace: match[0],
  };
};

export const applyTextOperator = (
  content: string,
  range: TextRange,
  operator: TextOperator
): TextOperationResult => {
  const start = Math.min(Math.max(range.start, 0), content.length);
  const end = Math.min(Math.max(range.end, start), content.length);
  const selected = content.slice(start, end);
  const nextContent =
    operator === "yank"
      ? content
      : content.slice(0, start) + content.slice(end);

  return {
    content: nextContent,
    selected,
    cursor:
      nextContent.length === 0
        ? 0
        : Math.min(start, nextContent.length - 1),
    entersInsertMode: operator === "change",
  };
};
