import type { IBatchBlock } from "@logseq/libs/dist/LSPlugin";

import type { SerializedBlock } from "./block-subtrees.ts";

export type VimRegisterKind = "characterwise" | "linewise";
export type VimRegisterValue =
  | { kind: "characterwise"; text: string }
  | { kind: "linewise"; blocks: SerializedBlock[] };

export interface CharacterwisePutPlan {
  kind: "characterwise";
  content: string;
  cursor: number;
}

export interface LinewisePutPlan {
  batch: IBatchBlock[];
  sibling: true;
  before: boolean;
}

export class VimRegisterStore {
  private value: VimRegisterValue = {
    kind: "characterwise",
    text: "",
  };

  write(value: VimRegisterValue): void {
    this.value =
      value.kind === "characterwise"
        ? { ...value }
        : {
            kind: "linewise",
            blocks: structuredClone(value.blocks),
          };
  }

  read(): VimRegisterValue {
    return this.value.kind === "characterwise"
      ? { ...this.value }
      : {
          kind: "linewise",
          blocks: structuredClone(this.value.blocks),
        };
  }
}

export const unnamedRegister = new VimRegisterStore();

export const isVimRegisterEmpty = (register: VimRegisterValue): boolean =>
  register.kind === "characterwise"
    ? register.text.length === 0
    : register.blocks.length === 0;

export const planRegisterPut = (
  content: string,
  cursor: number,
  register: Extract<VimRegisterValue, { kind: "characterwise" }>,
  before: boolean
): CharacterwisePutPlan => {
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

const toBatchBlock = (block: SerializedBlock): IBatchBlock => ({
  content: block.content,
  ...(block.properties ? { properties: block.properties } : {}),
  ...(block.children.length
    ? { children: block.children.map(toBatchBlock) }
    : {}),
});

export const planLinewisePut = (
  register: Extract<VimRegisterValue, { kind: "linewise" }>,
  _anchorUUID: string,
  before: boolean
): LinewisePutPlan => ({
  batch: register.blocks.map(toBatchBlock),
  sibling: true,
  before,
});

export const describeUnnamedRegister = (
  register: VimRegisterValue
): string =>
  register.kind === "characterwise"
    ? `Unnamed register (characterwise): ${JSON.stringify(register.text)}`
    : `Unnamed register (linewise): ${JSON.stringify(register.blocks)}`;
