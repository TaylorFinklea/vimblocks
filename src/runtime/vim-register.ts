export type VimRegisterKind = "characterwise" | "linewise";

export interface VimRegisterValue {
  text: string;
  kind: VimRegisterKind;
}

export type RegisterPutPlan =
  | {
      kind: "characterwise";
      content: string;
      cursor: number;
    }
  | {
      kind: "linewise";
      text: string;
      before: boolean;
    };

export class VimRegisterStore {
  private value: VimRegisterValue = {
    text: "",
    kind: "characterwise",
  };

  write(text: string, kind: VimRegisterKind = "characterwise"): void {
    this.value = { text, kind };
  }

  read(): VimRegisterValue {
    return { ...this.value };
  }
}

export const unnamedRegister = new VimRegisterStore();

export const planRegisterPut = (
  content: string,
  cursor: number,
  register: VimRegisterValue,
  before: boolean
): RegisterPutPlan => {
  if (register.kind === "linewise") {
    return {
      kind: "linewise",
      text: register.text,
      before,
    };
  }

  const normalizedCursor =
    content.length === 0
      ? 0
      : Math.min(Math.max(cursor, 0), content.length - 1);
  const insertionPoint =
    content.length === 0
      ? 0
      : before
        ? normalizedCursor
        : normalizedCursor + 1;
  return {
    kind: "characterwise",
    content:
      content.slice(0, insertionPoint) +
      register.text +
      content.slice(insertionPoint),
    cursor:
      register.text.length === 0
        ? normalizedCursor
        : insertionPoint + register.text.length - 1,
  };
};

export const describeUnnamedRegister = (
  register: VimRegisterValue
): string =>
  `Unnamed register (${register.kind}): ${JSON.stringify(register.text)}`;
