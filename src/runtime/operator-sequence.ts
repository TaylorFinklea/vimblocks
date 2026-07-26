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

export { keyboardEventToken } from "./key-token.ts";

export interface NormalModeKeyContext {
  composing: boolean;
  repeat: boolean;
  visualMode: boolean;
  textEntryActive: boolean;
}

export const shouldCaptureNormalModeKey = (
  context: NormalModeKeyContext
): boolean =>
  !context.composing &&
  !context.repeat &&
  !context.visualMode &&
  !context.textEntryActive;

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
