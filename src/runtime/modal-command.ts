export type BoundaryProfile = "logseq-first" | "vim-first";
export type ModalMode =
  | "normal"
  | "operator-pending"
  | "visual-char"
  | "visual-line"
  | "char-pending";
export type VimOperator = "delete" | "change" | "yank";
export type ModalMotionToken =
  | "h" | "j" | "k" | "l" | "w" | "b" | "e"
  | "0" | "^" | "$" | "gg" | "G" | "ctrl+u" | "ctrl+d"
  | "f" | "F" | "t" | "T" | ";" | "," | "iw" | "aw" | "line";
export interface ModalPoint {
  blockUUID: string;
  offset: number;
}
export type ChangeDescriptor =
  | { kind: "delete-char"; count: number }
  | { kind: "operator"; operator: VimOperator; motion: ModalMotionToken; count: number }
  | { kind: "put"; before: boolean; count: number }
  | {
      kind: "insert";
      command: "i" | "a" | "I" | "A" | "o" | "O";
      relativeStart: number;
      removedText: string;
      insertedText: string;
      count: number;
    };
export interface ModalState {
  mode: ModalMode;
  profile: BoundaryProfile;
  countDigits: string;
  operator: VimOperator | null;
  operatorCount: number;
  pendingPrefix: string;
  pendingFind: "f" | "F" | "t" | "T" | null;
  visualAnchor: ModalPoint | null;
  lastChange: ChangeDescriptor | null;
}
export type ModalCommand =
  | { kind: "escape" }
  | { kind: "motion"; motion: ModalMotionToken; count: number }
  | { kind: "delete-char"; count: number }
  | { kind: "put"; before: boolean; count: number }
  | { kind: "operator"; operator: VimOperator; motion: ModalMotionToken; count: number }
  | { kind: "visual"; mode: "char" | "line" }
  | { kind: "insert"; command: "i" | "a" | "I" | "A" | "o" | "O"; count: number }
  | {
      kind: "replay-insert";
      command: "i" | "a" | "I" | "A" | "o" | "O";
      relativeStart: number;
      removedText: string;
      insertedText: string;
      count: number;
    }
  | { kind: "search"; direction: "forward" | "next" | "previous"; count: number }
  | {
      kind: "char-find";
      motion: "f" | "F" | "t" | "T" | ";" | ",";
      character: string | null;
      count: number;
    }
  | { kind: "undo"; count: number }
  | { kind: "redo"; count: number }
  | { kind: "change-case"; case: "lower" | "upper"; count: number }
  | { kind: "repeat-change"; count: number };
export interface ModalStep {
  state: ModalState;
  command?: ModalCommand;
}

export const normalizeBoundaryProfile = (value: unknown): BoundaryProfile =>
  value === "vim-first" ? "vim-first" : "logseq-first";

export const createModalState = (profile: BoundaryProfile): ModalState => ({
  mode: "normal",
  profile,
  countDigits: "",
  operator: null,
  operatorCount: 1,
  pendingPrefix: "",
  pendingFind: null,
  visualAnchor: null,
  lastChange: null,
});

const countOf = (digits: string): number =>
  digits ? Math.max(1, Number.parseInt(digits, 10)) : 1;
const normal = (state: ModalState): ModalState => ({
  ...state,
  mode: "normal",
  countDigits: "",
  operator: null,
  operatorCount: 1,
  pendingPrefix: "",
  pendingFind: null,
});
const motionFor = (token: string): ModalMotionToken | null => {
  const motions: Record<string, ModalMotionToken> = {
    h: "h", j: "j", k: "k", l: "l", w: "w", b: "b", e: "e",
    "0": "0", "shift+6": "^", "shift+4": "$",
    "shift+g": "G", "ctrl+u": "ctrl+u", "ctrl+d": "ctrl+d",
  };
  return motions[token] ?? null;
};

export const stepModalKey = (state: ModalState, token: string): ModalStep => {
  if (token === "escape") {
    return { state: normal(state), command: { kind: "escape" } };
  }
  if (state.mode === "char-pending" && state.pendingFind) {
    if (token.length !== 1) return { state: normal(state) };
    return {
      state: normal(state),
      command: {
        kind: "char-find",
        motion: state.pendingFind,
        character: token,
        count: countOf(state.countDigits),
      },
    };
  }
  if (/^[0-9]$/.test(token) && (token !== "0" || state.countDigits)) {
    return { state: { ...state, countDigits: state.countDigits + token } };
  }
  if (state.pendingPrefix === "g") {
    if (token === "g") {
      return { state: normal(state), command: { kind: "motion", motion: "gg", count: countOf(state.countDigits) } };
    }
    if (token === "u" || token === "shift+u") {
      return { state: normal(state), command: { kind: "change-case", case: token === "u" ? "lower" : "upper", count: countOf(state.countDigits) } };
    }
    return { state: normal(state) };
  }
  if (token === "g") return { state: { ...state, pendingPrefix: "g" } };
  if (state.operator) {
    const motion = token === "i" ? null : motionFor(token);
    if (token === "i" || token === "a") {
      return { state: { ...state, pendingPrefix: token } };
    }
    if (state.pendingPrefix === "i" && token === "w") {
      return { state: normal(state), command: { kind: "operator", operator: state.operator, motion: "iw", count: state.operatorCount * countOf(state.countDigits) } };
    }
    if (state.pendingPrefix === "a" && token === "w") {
      return { state: normal(state), command: { kind: "operator", operator: state.operator, motion: "aw", count: state.operatorCount * countOf(state.countDigits) } };
    }
    const repeated = (state.operator === "delete" && token === "d") ||
      (state.operator === "change" && token === "c") ||
      (state.operator === "yank" && token === "y");
    if (repeated) {
      return { state: normal(state), command: { kind: "operator", operator: state.operator, motion: "line", count: state.operatorCount * countOf(state.countDigits) } };
    }
    if (motion) {
      return { state: normal(state), command: { kind: "operator", operator: state.operator, motion, count: state.operatorCount * countOf(state.countDigits) } };
    }
    return { state: normal(state) };
  }
  if (token === "d" || token === "c" || token === "y") {
    const operator = token === "d" ? "delete" : token === "c" ? "change" : "yank";
    return { state: { ...state, mode: "operator-pending", operator, operatorCount: countOf(state.countDigits), countDigits: "" } };
  }
  const motion = motionFor(token);
  if (motion) return { state: normal(state), command: { kind: "motion", motion, count: countOf(state.countDigits) } };
  if (token === "x") return { state: normal(state), command: { kind: "delete-char", count: countOf(state.countDigits) } };
  if (token === "p" || token === "shift+p") return { state: normal(state), command: { kind: "put", before: token === "shift+p", count: countOf(state.countDigits) } };
  if (token === "v" || token === "shift+v") {
    const mode = token === "v" ? "char" : "line";
    return { state: { ...normal(state), mode: mode === "char" ? "visual-char" : "visual-line" }, command: { kind: "visual", mode } };
  }
  const insertCommands: Record<string, "i" | "a" | "I" | "A" | "o" | "O"> = {
    i: "i", a: "a", "shift+i": "I", "shift+a": "A", o: "o", "shift+o": "O",
  };
  if (insertCommands[token]) return { state: normal(state), command: { kind: "insert", command: insertCommands[token], count: countOf(state.countDigits) } };
  if (token === "/" || token === "n" || token === "shift+n") {
    const direction = token === "/" ? "forward" : token === "n" ? "next" : "previous";
    return { state: normal(state), command: { kind: "search", direction, count: countOf(state.countDigits) } };
  }
  if (["f", "shift+f", "t", "shift+t"].includes(token)) {
    const find = token === "f" ? "f" : token === "shift+f" ? "F" : token === "t" ? "t" : "T";
    return { state: { ...state, mode: "char-pending", pendingFind: find } };
  }
  if (token === ";" || token === ",") {
    return { state: normal(state), command: { kind: "char-find", motion: token, character: null, count: countOf(state.countDigits) } };
  }
  if (token === "u") return { state: normal(state), command: { kind: "undo", count: countOf(state.countDigits) } };
  if (token === "ctrl+r") return { state: normal(state), command: { kind: "redo", count: countOf(state.countDigits) } };
  if (token === ".") return { state: normal(state), command: { kind: "repeat-change", count: countOf(state.countDigits) } };
  return { state: normal(state) };
};
