import type {
  BoundaryProfile,
  ChangeDescriptor,
  ModalCommand,
  ModalPoint,
  VimOperator,
} from "./modal-command.ts";
import {
  canonicalizeSubtreeRoots,
  serializeSubtrees,
  type BlockNode,
  type SerializedBlock,
} from "./block-subtrees.ts";
import {
  resolveMotion,
  type MotionName,
  type RenderedBlock,
  type RenderedBuffer,
} from "./rendered-buffer.ts";
import {
  applyTextOperator,
  aroundWordRange,
  innerWordRange,
  type TextRange,
} from "./text-objects.ts";
import type { VimRegisterValue } from "./vim-register.ts";

export interface NativeHistorySnapshot {
  roots: SerializedBlock[];
  cursor: ModalPoint | null;
}

export interface NativeHistoryGroup {
  before: NativeHistorySnapshot;
  after: NativeHistorySnapshot;
  maxNativeSteps: number;
  scopeUUIDs: string[];
}

export interface NativeHistoryRunResult {
  matched: boolean;
  steps: number;
  compensated: boolean;
}

export interface MutationPlan {
  updates: Array<{ uuid: string; content: string }>;
  removeRoots: string[];
  register: VimRegisterValue;
  cursor: ModalPoint | null;
}

const rootSignatures = (
  snapshot: NativeHistorySnapshot
): string[] => {
  const signatures: string[] = [];
  const visit = (
    block: SerializedBlock,
    path: readonly number[]
  ): void => {
    signatures.push(
      JSON.stringify({
        path,
        content: block.content,
        properties: block.properties,
      })
    );
    block.children.forEach((child, index) =>
      visit(child, [...path, index])
    );
  };
  snapshot.roots.forEach((root, index) => visit(root, [index]));
  return signatures;
};

const sequenceDistance = (
  left: readonly string[],
  right: readonly string[]
): number => {
  let previous = new Array<number>(right.length + 1).fill(0);
  for (const leftValue of left) {
    const current = new Array<number>(right.length + 1).fill(0);
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      current[rightIndex] =
        leftValue === right[rightIndex - 1]
          ? previous[rightIndex - 1] + 1
          : Math.max(previous[rightIndex], current[rightIndex - 1]);
    }
    previous = current;
  }
  const common = previous[right.length];
  return left.length + right.length - common * 2;
};

export const snapshotDistance = (
  current: NativeHistorySnapshot,
  target: NativeHistorySnapshot
): number => {
  const cursorDistance =
    JSON.stringify(current.cursor) === JSON.stringify(target.cursor)
      ? 0
      : 1;
  return (
    sequenceDistance(rootSignatures(current), rootSignatures(target)) +
    cursorDistance
  );
};

export const runNativeHistoryToward = async (options: {
  target: NativeHistorySnapshot;
  maxNativeSteps: number;
  readSnapshot(): Promise<NativeHistorySnapshot>;
  readSnapshotAfterStep?(
    previous: NativeHistorySnapshot
  ): Promise<NativeHistorySnapshot>;
  step(): Promise<void>;
  compensate(): Promise<void>;
}): Promise<NativeHistoryRunResult> => {
  let current = await options.readSnapshot();
  let distance = snapshotDistance(current, options.target);
  if (distance === 0) {
    return { matched: true, steps: 0, compensated: false };
  }

  const limit = Math.max(1, Math.trunc(options.maxNativeSteps));
  for (let steps = 1; steps <= limit; steps += 1) {
    await options.step();
    const next = options.readSnapshotAfterStep
      ? await options.readSnapshotAfterStep(current)
      : await options.readSnapshot();
    const nextDistance = snapshotDistance(next, options.target);
    if (nextDistance === 0) {
      return { matched: true, steps, compensated: false };
    }
    if (nextDistance >= distance) {
      await options.compensate();
      if (options.readSnapshotAfterStep) {
        await options.readSnapshotAfterStep(next);
      }
      return { matched: false, steps, compensated: true };
    }
    current = next;
    distance = nextDistance;
  }

  return { matched: false, steps: limit, compensated: false };
};

const blockIndex = (
  blocks: readonly RenderedBlock[],
  uuid: string
): number => blocks.findIndex((block) => block.uuid === uuid);

const localMotionRange = (
  start: number,
  target: number,
  motion: MotionName,
  contentLength: number
): TextRange => {
  const backward = target < start;
  const inclusive = motion === "e" || motion === "$";
  if (backward) {
    return {
      start: target,
      end: Math.min(contentLength, start + (inclusive ? 1 : 0)),
    };
  }
  return {
    start,
    end: Math.min(
      contentLength,
      target + (inclusive ? 1 : 0)
    ),
  };
};

const emptyMutation = (cursor: ModalPoint): MutationPlan => ({
  updates: [],
  removeRoots: [],
  register: { kind: "characterwise", text: "" },
  cursor,
});

export const planOperatorMutation = (
  buffer: RenderedBuffer,
  nodes: readonly BlockNode[],
  start: ModalPoint,
  operator: VimOperator,
  motion: MotionName | "iw" | "aw" | "line",
  count: number,
  profile: BoundaryProfile
): MutationPlan => {
  const blocks = [...new Map(
    buffer.blocks.map((block) => [block.uuid, block])
  ).values()];
  const startIndex = blockIndex(blocks, start.blockUUID);
  if (startIndex < 0) return emptyMutation(start);

  if (motion === "line") {
    const selectedUUIDs = blocks
      .slice(startIndex, startIndex + Math.max(1, count))
      .map((block) => block.uuid);
    const roots = canonicalizeSubtreeRoots(selectedUUIDs, nodes);
    const register: VimRegisterValue = {
      kind: "linewise",
      blocks: serializeSubtrees(roots, nodes),
    };
    if (operator === "yank") {
      return { updates: [], removeRoots: [], register, cursor: start };
    }
    if (operator === "change" && roots.length) {
      return {
        updates: [{ uuid: roots[0], content: "" }],
        removeRoots: roots.slice(1),
        register,
        cursor: { blockUUID: roots[0], offset: 0 },
      };
    }
    return {
      updates: [],
      removeRoots: roots,
      register,
      cursor: null,
    };
  }

  const startBlock = blocks[startIndex];
  const normalizedStart = Math.min(
    Math.max(start.offset, 0),
    Math.max(0, startBlock.content.length - 1)
  );
  if (motion === "iw" || motion === "aw") {
    const range =
      motion === "iw"
        ? innerWordRange(startBlock.content, normalizedStart)
        : aroundWordRange(startBlock.content, normalizedStart);
    const result = applyTextOperator(
      startBlock.content,
      range,
      operator
    );
    return {
      updates:
        operator === "yank"
          ? []
          : [{ uuid: startBlock.uuid, content: result.content }],
      removeRoots: [],
      register: { kind: "characterwise", text: result.selected },
      cursor:
        operator === "yank"
          ? start
          : { blockUUID: startBlock.uuid, offset: result.cursor },
    };
  }

  const target = resolveMotion(
    { blocks },
    { blockUUID: startBlock.uuid, offset: normalizedStart },
    motion,
    count,
    {
      profile,
      viewportBlockUUIDs: [],
      preferredColumn: null,
    }
  ).point;
  const targetIndex = blockIndex(blocks, target.blockUUID);
  if (targetIndex < 0) return emptyMutation(start);

  if (targetIndex === startIndex) {
    const range = localMotionRange(
      normalizedStart,
      target.offset,
      motion,
      startBlock.content.length
    );
    const result = applyTextOperator(
      startBlock.content,
      range,
      operator
    );
    return {
      updates:
        operator === "yank"
          ? []
          : [{ uuid: startBlock.uuid, content: result.content }],
      removeRoots: [],
      register: { kind: "characterwise", text: result.selected },
      cursor:
        operator === "yank"
          ? start
          : { blockUUID: startBlock.uuid, offset: result.cursor },
    };
  }

  const forward = targetIndex > startIndex;
  const firstIndex = Math.min(startIndex, targetIndex);
  const lastIndex = Math.max(startIndex, targetIndex);
  const selectedBlocks = blocks.slice(firstIndex, lastIndex + 1);
  const targetBlock = blocks[targetIndex];
  const targetBoundary = Math.min(
    targetBlock.content.length,
    target.offset + (motion === "e" || motion === "$" ? 1 : 0)
  );
  const selectedText = forward
    ? [
        startBlock.content.slice(normalizedStart),
        ...blocks
          .slice(startIndex + 1, targetIndex)
          .map((block) => block.content),
        targetBlock.content.slice(0, targetBoundary),
      ].join("\n")
    : [
        targetBlock.content.slice(targetBoundary),
        ...blocks
          .slice(targetIndex + 1, startIndex)
          .map((block) => block.content),
        startBlock.content.slice(0, normalizedStart),
      ].join("\n");
  const register: VimRegisterValue = {
    kind: "characterwise",
    text: selectedText,
  };
  if (operator === "yank") {
    return { updates: [], removeRoots: [], register, cursor: start };
  }

  const keptBlock = forward ? startBlock : targetBlock;
  const mergedContent = forward
    ? startBlock.content.slice(0, normalizedStart) +
      targetBlock.content.slice(targetBoundary)
    : targetBlock.content.slice(0, targetBoundary) +
      startBlock.content.slice(normalizedStart);
  const removedUUIDs = selectedBlocks
    .map((block) => block.uuid)
    .filter((uuid) => uuid !== keptBlock.uuid);
  const removeRoots = canonicalizeSubtreeRoots(removedUUIDs, nodes);
  return {
    updates: [{ uuid: keptBlock.uuid, content: mergedContent }],
    removeRoots,
    register,
    cursor: {
      blockUUID: keptBlock.uuid,
      offset: Math.min(
        forward ? normalizedStart : targetBoundary,
        Math.max(0, mergedContent.length - 1)
      ),
    },
  };
};

export const replayChange = (
  change: ChangeDescriptor,
  count: number
): ModalCommand => {
  const multiplier = Math.max(1, Math.trunc(count || 1));
  switch (change.kind) {
    case "delete-char":
      return {
        kind: "delete-char",
        count: change.count * multiplier,
      };
    case "operator":
      return {
        kind: "operator",
        operator: change.operator,
        motion: change.motion,
        count: change.count * multiplier,
      };
    case "put":
      return {
        kind: "put",
        before: change.before,
        count: change.count * multiplier,
      };
    case "insert":
      return {
        kind: "replay-insert",
        command: change.command,
        relativeStart: change.relativeStart,
        removedText: change.removedText,
        insertedText: change.insertedText,
        count: change.count * multiplier,
      };
    default: {
      const exhaustive: never = change;
      return exhaustive;
    }
  }
};
