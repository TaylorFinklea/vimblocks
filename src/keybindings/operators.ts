import {
  BlockEntity,
  ILSPluginUser,
} from "@logseq/libs/dist/LSPlugin";
import * as changeCase from "change-case-all";

import {
  beforeActionExecute,
  beforeActionRegister,
  getCurrentBlockUUID,
  getNumber,
  getSettings,
  resetNumber,
  writeClipboard,
} from "@/common/funcs";
import type { DefaultSettingsType } from "@/common/funcs";
import {
  advanceOperatorSequence,
  expandOperatorBinding,
  shouldCaptureNormalModeKey,
} from "@/runtime/operator-sequence";
import type { OperatorSequence } from "@/runtime/operator-sequence";
import {
  applyTextOperator,
  aroundWordRange,
  deferTrailingWhitespace,
  firstNonBlankPosition,
  innerWordRange,
  lineEndRange,
  lineRange,
  wordEndRange,
  wordForwardRange,
} from "@/runtime/text-objects";
import type {
  TextOperator,
  TextRange,
} from "@/runtime/text-objects";
import { useSearchStore } from "@/stores/search";
import { putVimRegister } from "@/keybindings/pasteNext";
import { cutAtNormalCursor } from "@/keybindings/cut";
import {
  isTextEntryEvent,
} from "@/runtime/context-guard";
import { persistNormalModeContent } from "@/runtime/normal-mode-mutation";
import {
  addHostKeydownListener,
  configureHostCapture,
  configureHostNormalModeCapture,
  setHostCaptureAll,
  setHostNormalModeActive,
  type HostKeydownEvent,
} from "@/runtime/host-bridge";
import { keyboardEventToken } from "@/runtime/key-token";
import { useModalStore } from "@/stores/modal";
import {
  canonicalizeSubtreeRoots,
  collectSubtreeUUIDs,
  firstSurvivingUUID,
  serializeSubtrees,
  type BlockNode,
} from "@/runtime/block-subtrees";
import { unnamedRegister } from "@/runtime/vim-register";
import {
  planOperatorMutation,
  replayChange,
  runNativeHistoryToward,
  snapshotDistance,
  type NativeHistorySnapshot,
} from "@/runtime/modal-change";
import {
  NORMAL_MODE_CAPTURE_TOKENS,
  type ModalCommand,
} from "@/runtime/modal-command";
import {
  applyInsertDelta,
  beginInsertSession,
  openSiblingOptions,
} from "@/runtime/insert-session";
import { resolveVisualRange } from "@/runtime/rendered-buffer";

type OperatorObject =
  | "inner-word"
  | "around-word"
  | "word-forward"
  | "word-end"
  | "line-end"
  | "line";

export interface OperatorCommandDefinition {
  id: string;
  label: string;
  settingKey: keyof DefaultSettingsType["keyBindings"];
  operator: TextOperator;
  object: OperatorObject;
}

export const OPERATOR_COMMANDS: readonly OperatorCommandDefinition[] = [
  {
    id: "change-inner-word",
    label: "Vim: Change inner word (ciw)",
    settingKey: "changeInnerWord",
    operator: "change",
    object: "inner-word",
  },
  {
    id: "delete-inner-word",
    label: "Vim: Delete inner word (diw)",
    settingKey: "deleteInnerWord",
    operator: "delete",
    object: "inner-word",
  },
  {
    id: "yank-inner-word",
    label: "Vim: Yank inner word (yiw)",
    settingKey: "yankInnerWord",
    operator: "yank",
    object: "inner-word",
  },
  {
    id: "change-around-word",
    label: "Vim: Change around word (caw)",
    settingKey: "changeAroundWord",
    operator: "change",
    object: "around-word",
  },
  {
    id: "delete-around-word",
    label: "Vim: Delete around word (daw)",
    settingKey: "deleteAroundWord",
    operator: "delete",
    object: "around-word",
  },
  {
    id: "yank-around-word",
    label: "Vim: Yank around word (yaw)",
    settingKey: "yankAroundWord",
    operator: "yank",
    object: "around-word",
  },
  {
    id: "change-word",
    label: "Vim: Change word (cw)",
    settingKey: "changeWord",
    operator: "change",
    object: "word-end",
  },
  {
    id: "delete-word",
    label: "Vim: Delete word (dw)",
    settingKey: "deleteWord",
    operator: "delete",
    object: "word-forward",
  },
  {
    id: "yank-word",
    label: "Vim: Yank word (yw)",
    settingKey: "yankWord",
    operator: "yank",
    object: "word-forward",
  },
  {
    id: "change-word-end",
    label: "Vim: Change to word end (ce)",
    settingKey: "changeWordEnd",
    operator: "change",
    object: "word-end",
  },
  {
    id: "delete-word-end",
    label: "Vim: Delete to word end (de)",
    settingKey: "deleteWordEnd",
    operator: "delete",
    object: "word-end",
  },
  {
    id: "yank-word-end",
    label: "Vim: Yank to word end (ye)",
    settingKey: "yankWordEnd",
    operator: "yank",
    object: "word-end",
  },
  {
    id: "change-line-end",
    label: "Vim: Change to line end (c$ / C)",
    settingKey: "changeLineEnd",
    operator: "change",
    object: "line-end",
  },
  {
    id: "delete-line-end",
    label: "Vim: Delete to line end (d$ / D)",
    settingKey: "deleteLineEnd",
    operator: "delete",
    object: "line-end",
  },
  {
    id: "yank-line-end",
    label: "Vim: Yank to line end (y$)",
    settingKey: "yankLineEnd",
    operator: "yank",
    object: "line-end",
  },
  {
    id: "change-line",
    label: "Vim: Change line (cc / S)",
    settingKey: "changeLine",
    operator: "change",
    object: "line",
  },
];

const resolveOnce = (
  content: string,
  cursor: number,
  object: OperatorObject
): TextRange => {
  switch (object) {
    case "inner-word":
      return innerWordRange(content, cursor);
    case "around-word":
      return aroundWordRange(content, cursor);
    case "word-forward":
      return wordForwardRange(content, cursor);
    case "word-end":
      return wordEndRange(content, cursor);
    case "line-end":
      return lineEndRange(content, cursor);
    case "line":
      return lineRange(content);
  }
};

export const resolveOperatorRange = (
  content: string,
  cursor: number,
  object: OperatorObject,
  count = 1
): TextRange => {
  const first = resolveOnce(content, cursor, object);
  if (count <= 1 || object === "line" || object === "line-end") {
    return first;
  }

  let end = first.end;
  for (let index = 1; index < count && end < content.length; index += 1) {
    end = resolveOnce(content, end, object).end;
  }
  return { start: first.start, end };
};

const executeOperator = async (
  command: OperatorCommandDefinition
): Promise<void> => {
  const searchStore = useSearchStore();
  const blockUUID =
    searchStore.cursorMode && searchStore.cursorBlockUUID
      ? searchStore.cursorBlockUUID
      : await getCurrentBlockUUID();
  if (!blockUUID) {
    resetNumber();
    return;
  }

  const block = await logseq.Editor.getBlock(blockUUID);
  if (!block) {
    resetNumber();
    return;
  }

  const cursor =
    searchStore.cursorMode && searchStore.cursorBlockUUID === blockUUID
      ? searchStore.cursorPosition
      : firstNonBlankPosition(block.content);
  const range = resolveOperatorRange(
    block.content,
    cursor,
    command.object,
    getNumber()
  );
  resetNumber();

  const result = applyTextOperator(
    block.content,
    range,
    command.operator
  );
  if (result.selected.length === 0) {
    return;
  }

  writeClipboard(result.selected);
  if (command.operator === "yank") {
    return;
  }

  if (command.operator === "change") {
    const changeContent =
      range.end === block.content.length
        ? deferTrailingWhitespace(result.content)
        : {
            persistedContent: result.content,
            deferredWhitespace: "",
          };
    await logseq.Editor.updateBlock(
      blockUUID,
      changeContent.persistedContent
    );
    searchStore.clearCursor();
    await logseq.Editor.editBlock(blockUUID, {
      pos: Math.min(range.start, changeContent.persistedContent.length),
    });
    if (changeContent.deferredWhitespace) {
      await logseq.Editor.insertAtEditingCursor(
        changeContent.deferredWhitespace
      );
    }
    return;
  }

  await persistNormalModeContent({
    editor: logseq.Editor,
    blockUUID,
    content: result.content,
    cursor: result.cursor,
    restoreCursor: (uuid, content, position) =>
      searchStore.restoreCursor(uuid, content, position),
  });
};

const toBlockNode = (
  block: BlockEntity,
  parentUUID?: string
): BlockNode => ({
  uuid: block.uuid,
  content: block.content ?? "",
  ...(block.properties
    ? { properties: { ...block.properties } }
    : {}),
  ...(parentUUID ? { parentUUID } : {}),
  children: (block.children ?? [])
    .filter(
      (child): child is BlockEntity =>
        typeof child === "object" && child !== null && "uuid" in child
    )
    .map((child) => toBlockNode(child, block.uuid)),
});

const currentModalPoint = (): NativeHistorySnapshot["cursor"] => {
  const searchStore = useSearchStore();
  return searchStore.cursorMode && searchStore.cursorBlockUUID
    ? {
        blockUUID: searchStore.cursorBlockUUID,
        offset: searchStore.cursorPosition,
      }
    : null;
};

const captureHistorySnapshot = async (
  scopeUUIDs: readonly string[],
  cursor: NativeHistorySnapshot["cursor"]
): Promise<NativeHistorySnapshot> => {
  const roots = (
    await Promise.all(
      [...new Set(scopeUUIDs)].map((uuid) =>
        logseq.Editor.getBlock(uuid, { includeChildren: true })
      )
    )
  ).flatMap((block) => {
    if (!block?.uuid) return [];
    const node = toBlockNode(block);
    return serializeSubtrees([node.uuid], [node]);
  });
  return { roots, cursor };
};

const recordNativeHistory = async (options: {
  before: NativeHistorySnapshot;
  scopeUUIDs: readonly string[];
  extraScopeUUIDs?: readonly string[];
  maxNativeSteps: number;
}): Promise<void> => {
  const scopeUUIDs = [
    ...new Set([
      ...options.scopeUUIDs,
      ...(options.extraScopeUUIDs ?? []),
    ]),
  ];
  const after = await captureHistorySnapshot(
    scopeUUIDs,
    currentModalPoint()
  );
  useModalStore().recordNativeHistoryGroup({
    before: options.before,
    after,
    maxNativeSteps: Math.max(1, options.maxNativeSteps),
    scopeUUIDs,
  });
};

const invokeNativeHistory = async (
  kind: "undo" | "redo"
): Promise<void> => {
  // @ts-ignore Logseq exposes editor history commands at runtime.
  await logseq.App.invokeExternalCommand(`logseq.editor/${kind}`);
};

const waitForHistorySnapshotChange = async (
  scopeUUIDs: readonly string[],
  cursor: NativeHistorySnapshot["cursor"],
  previous: NativeHistorySnapshot
): Promise<NativeHistorySnapshot> => {
  let current = await captureHistorySnapshot(scopeUUIDs, cursor);
  for (
    let attempt = 0;
    attempt < 30 && snapshotDistance(current, previous) === 0;
    attempt += 1
  ) {
    await new Promise<void>((resolve) => window.setTimeout(resolve, 10));
    current = await captureHistorySnapshot(scopeUUIDs, cursor);
  }
  return current;
};

const restoreHistoryCursor = async (
  point: NativeHistorySnapshot["cursor"],
  visibleUUIDs: readonly string[]
): Promise<void> => {
  const searchStore = useSearchStore();
  const candidates = [
    ...(point?.blockUUID ? [point.blockUUID] : []),
    ...visibleUUIDs,
  ];
  for (const uuid of new Set(candidates)) {
    const block = await logseq.Editor.getBlock(uuid);
    if (!block?.uuid) continue;
    await searchStore.restoreCursor(
      block.uuid,
      block.content ?? "",
      point?.blockUUID === block.uuid
        ? point.offset
        : firstNonBlankPosition(block.content ?? "")
    );
    return;
  }
  searchStore.clearCursor();
};

const executeNativeHistory = async (
  kind: "undo" | "redo",
  event: HostKeydownEvent
): Promise<void> => {
  const modalStore = useModalStore();
  const group = modalStore.nativeHistoryGroup;
  if (!group) {
    await invokeNativeHistory(kind);
    return;
  }

  const source = kind === "undo" ? group.after : group.before;
  const target = kind === "undo" ? group.before : group.after;
  const current = await captureHistorySnapshot(
    group.scopeUUIDs,
    source.cursor
  );
  if (snapshotDistance(current, source) !== 0) {
    modalStore.recordNativeHistoryGroup(null);
    await invokeNativeHistory(kind);
    return;
  }

  const result = await runNativeHistoryToward({
    target,
    maxNativeSteps: group.maxNativeSteps,
    readSnapshot: () =>
      captureHistorySnapshot(group.scopeUUIDs, target.cursor),
    readSnapshotAfterStep: (previous) =>
      waitForHistorySnapshotChange(
        group.scopeUUIDs,
        target.cursor,
        previous
      ),
    step: () => invokeNativeHistory(kind),
    compensate: () =>
      invokeNativeHistory(kind === "undo" ? "redo" : "undo"),
  });
  await restoreHistoryCursor(target.cursor, event.visibleBlockUUIDs);
  if (!result.matched) {
    modalStore.recordNativeHistoryGroup(null);
    logseq.UI.showMsg(
      result.compensated
        ? "Vimblocks stopped history because Logseq did not move toward the expected state."
        : "Vimblocks could not reach the expected Logseq history state.",
      "error"
    );
  }
};

const executePlannedTextOperator = async (
  command: Extract<ModalCommand, { kind: "operator" }>,
  event: HostKeydownEvent
): Promise<void> => {
  const searchStore = useSearchStore();
  if (!searchStore.cursorMode || !searchStore.cursorBlockUUID) return;

  const scopeUUIDs = [
    ...new Set([
      ...event.visibleBlockUUIDs,
      searchStore.cursorBlockUUID,
    ]),
  ];
  const fetched = await Promise.all(
    scopeUUIDs.map((uuid) =>
      logseq.Editor.getBlock(uuid, { includeChildren: true })
    )
  );
  const blocks = fetched
    .filter((block): block is BlockEntity => Boolean(block?.uuid))
    .map((block) => ({
      uuid: block.uuid,
      content: block.content ?? "",
    }));
  const nodes = fetched
    .filter((block): block is BlockEntity => Boolean(block?.uuid))
    .map((block) => toBlockNode(block));
  const before = await captureHistorySnapshot(
    scopeUUIDs,
    currentModalPoint()
  );
  const motion =
    command.operator === "change" && command.motion === "w"
      ? "e"
      : command.motion;
  if (
    motion === "f" ||
    motion === "F" ||
    motion === "t" ||
    motion === "T" ||
    motion === ";" ||
    motion === "," ||
    motion === "line"
  ) {
    return;
  }
  const plan = planOperatorMutation(
    { blocks },
    nodes,
    {
      blockUUID: searchStore.cursorBlockUUID,
      offset: searchStore.cursorPosition,
    },
    command.operator,
    motion,
    command.count,
    useModalStore().state.profile
  );
  const hasSelection =
    plan.register.kind === "linewise"
      ? plan.register.blocks.length > 0
      : plan.register.text.length > 0;
  if (!hasSelection) return;

  unnamedRegister.write(plan.register);
  if (command.operator === "yank") return;

  for (const update of plan.updates) {
    await logseq.Editor.updateBlock(update.uuid, update.content);
  }
  for (const root of [...plan.removeRoots].reverse()) {
    await logseq.Editor.removeBlock(root);
  }

  useModalStore().recordChange({
    kind: "operator",
    operator: command.operator,
    motion: command.motion,
    count: command.count,
  });
  if (command.operator === "change" && plan.cursor) {
    searchStore.clearCursor();
    await logseq.Editor.editBlock(plan.cursor.blockUUID, {
      pos: plan.cursor.offset,
    });
  } else if (plan.cursor) {
    const cursorBlock = await logseq.Editor.getBlock(
      plan.cursor.blockUUID
    );
    if (cursorBlock?.uuid) {
      await searchStore.restoreCursor(
        cursorBlock.uuid,
        cursorBlock.content ?? "",
        plan.cursor.offset
      );
    }
  }
  await recordNativeHistory({
    before,
    scopeUUIDs,
    maxNativeSteps: plan.updates.length + plan.removeRoots.length,
  });
};

const executeLinewiseOperator = async (
  command: Extract<ModalCommand, { kind: "operator" }>,
  event: HostKeydownEvent
): Promise<void> => {
  const searchStore = useSearchStore();
  if (!searchStore.cursorMode || !searchStore.cursorBlockUUID) return;

  const visible = [...new Set(event.visibleBlockUUIDs)];
  const startIndex = visible.indexOf(searchStore.cursorBlockUUID);
  const selectedUUIDs =
    startIndex >= 0 && command.motion === "k"
      ? visible.slice(
          Math.max(0, startIndex - command.count + 1),
          startIndex + 1
        )
      : startIndex >= 0
        ? visible.slice(startIndex, startIndex + command.count)
      : [searchStore.cursorBlockUUID];
  const fetched = await Promise.all(
    selectedUUIDs.map((uuid) =>
      logseq.Editor.getBlock(uuid, { includeChildren: true })
    )
  );
  const nodes = fetched
    .filter((block): block is BlockEntity => Boolean(block?.uuid))
    .map((block) => toBlockNode(block));
  const roots = canonicalizeSubtreeRoots(selectedUUIDs, nodes);
  const blocks = serializeSubtrees(roots, nodes);
  if (!blocks.length) return;

  unnamedRegister.write({ kind: "linewise", blocks });
  if (command.operator === "yank") return;
  const before = await captureHistorySnapshot(
    visible,
    currentModalPoint()
  );

  if (command.operator === "change") {
    const firstRoot = roots[0];
    await logseq.Editor.updateBlock(firstRoot, "");
    for (const root of roots.slice(1).reverse()) {
      await logseq.Editor.removeBlock(root);
    }
    useModalStore().recordChange({
      kind: "operator",
      operator: command.operator,
      motion: command.motion,
      count: command.count,
    });
    searchStore.clearCursor();
    await logseq.Editor.editBlock(firstRoot, { pos: 0 });
    await recordNativeHistory({
      before,
      scopeUUIDs: visible,
      maxNativeSteps: roots.length,
    });
    return;
  }

  for (const root of [...roots].reverse()) {
    await logseq.Editor.removeBlock(root);
  }
  const removed = new Set(collectSubtreeUUIDs(roots, nodes));
  const lastIndex = Math.max(
    ...roots.map((uuid) => visible.indexOf(uuid)).filter((index) => index >= 0)
  );
  const survivorCandidates = [
    ...visible.slice(lastIndex + 1),
    ...visible.slice(0, Math.max(0, startIndex)).reverse(),
  ].filter((uuid) => !removed.has(uuid));
  const survivingUUID = await firstSurvivingUUID(
    survivorCandidates,
    async (uuid) => Boolean(await logseq.Editor.getBlock(uuid))
  );
  if (survivingUUID) {
    const candidate = await logseq.Editor.getBlock(survivingUUID);
    if (candidate?.uuid) {
      await searchStore.restoreCursor(
        candidate.uuid,
        candidate.content ?? "",
        firstNonBlankPosition(candidate.content ?? "")
      );
    }
  } else {
    searchStore.clearCursor();
  }
  useModalStore().recordChange({
    kind: "operator",
    operator: command.operator,
    motion: command.motion,
    count: command.count,
  });
  await recordNativeHistory({
    before,
    scopeUUIDs: visible,
    maxNativeSteps: roots.length,
  });
};

const executeVisualOperator = async (
  operator: "delete" | "change" | "yank",
  event: HostKeydownEvent
): Promise<void> => {
  const searchStore = useSearchStore();
  const anchor = searchStore.visualAnchorPoint;
  const kind = searchStore.visualKind;
  if (
    !searchStore.cursorMode ||
    !searchStore.cursorBlockUUID ||
    !anchor ||
    !kind
  ) return;

  const visible = [...new Set([
    ...event.visibleBlockUUIDs,
    anchor.blockUUID,
    searchStore.cursorBlockUUID,
  ])];
  const fetched = await Promise.all(
    visible.map((uuid) =>
      logseq.Editor.getBlock(uuid, { includeChildren: true })
    )
  );
  const entities = fetched.filter(
    (block): block is BlockEntity => Boolean(block?.uuid)
  );
  const nodes = entities.map((block) => toBlockNode(block));
  const buffer = {
    blocks: entities
      .sort(
        (left, right) =>
          visible.indexOf(left.uuid) - visible.indexOf(right.uuid)
      )
      .map((block) => ({
        uuid: block.uuid,
        content: block.content ?? "",
      })),
  };
  const range = resolveVisualRange(
    buffer,
    nodes,
    anchor,
    {
      blockUUID: searchStore.cursorBlockUUID,
      offset: searchStore.cursorPosition,
    },
    kind,
    useModalStore().state.profile
  );
  const before = await captureHistorySnapshot(visible, currentModalPoint());

  if (kind === "linewise") {
    const roots = range.rootUUIDs;
    const blocks = serializeSubtrees(roots, nodes);
    if (!blocks.length) return;
    unnamedRegister.write({ kind: "linewise", blocks });
    searchStore.exitVisualMode();
    if (operator === "yank") {
      const block = await logseq.Editor.getBlock(range.start.blockUUID);
      if (block?.uuid) {
        await searchStore.restoreCursor(
          block.uuid,
          block.content ?? "",
          firstNonBlankPosition(block.content ?? "")
        );
      }
      return;
    }
    if (operator === "change") {
      const firstRoot = roots[0];
      await logseq.Editor.updateBlock(firstRoot, "");
      for (const root of roots.slice(1).reverse()) {
        await logseq.Editor.removeBlock(root);
      }
      searchStore.clearCursor();
      await logseq.Editor.editBlock(firstRoot, { pos: 0 });
    } else {
      for (const root of [...roots].reverse()) {
        await logseq.Editor.removeBlock(root);
      }
      const removed = new Set(collectSubtreeUUIDs(roots, nodes));
      const survivor = await firstSurvivingUUID(
        visible.filter((uuid) => !removed.has(uuid)),
        async (uuid) => Boolean(await logseq.Editor.getBlock(uuid))
      );
      if (survivor) {
        const block = await logseq.Editor.getBlock(survivor);
        if (block?.uuid) {
          await searchStore.restoreCursor(
            block.uuid,
            block.content ?? "",
            firstNonBlankPosition(block.content ?? "")
          );
        }
      } else {
        searchStore.clearCursor();
      }
    }
    await recordNativeHistory({
      before,
      scopeUUIDs: visible,
      maxNativeSteps: roots.length,
    });
    return;
  }

  const firstIndex = buffer.blocks.findIndex(
    (block) => block.uuid === range.start.blockUUID
  );
  const lastIndex = buffer.blocks.findIndex(
    (block) => block.uuid === range.end.blockUUID
  );
  const selected = buffer.blocks.slice(firstIndex, lastIndex + 1);
  const pieces = selected.map((block) => {
    const start =
      block.uuid === range.start.blockUUID ? range.start.offset : 0;
    const end =
      block.uuid === range.end.blockUUID
        ? range.end.offset + 1
        : block.content.length;
    return { block, start, end, text: block.content.slice(start, end) };
  });
  unnamedRegister.write({
    kind: "characterwise",
    text: pieces.map((piece) => piece.text).join("\n"),
  });
  searchStore.exitVisualMode();
  if (operator === "yank") {
    const block = await logseq.Editor.getBlock(range.start.blockUUID);
    if (block?.uuid) {
      await searchStore.restoreCursor(
        block.uuid,
        block.content ?? "",
        range.start.offset
      );
    }
    return;
  }
  for (const piece of pieces) {
    await logseq.Editor.updateBlock(
      piece.block.uuid,
      piece.block.content.slice(0, piece.start) +
        piece.block.content.slice(piece.end)
    );
  }
  const first = await logseq.Editor.getBlock(range.start.blockUUID);
  if (!first?.uuid) return;
  if (operator === "change") {
    searchStore.clearCursor();
    await logseq.Editor.editBlock(first.uuid, {
      pos: Math.min(range.start.offset, (first.content ?? "").length),
    });
  } else {
    await searchStore.restoreCursor(
      first.uuid,
      first.content ?? "",
      Math.min(range.start.offset, Math.max(0, (first.content ?? "").length - 1))
    );
  }
  await recordNativeHistory({
    before,
    scopeUUIDs: visible,
    maxNativeSteps: pieces.length,
  });
};

let disposeOperatorSequenceListener: (() => void) | null = null;

export const disposeOperatorSequences = (): void => {
  disposeOperatorSequenceListener?.();
  disposeOperatorSequenceListener = null;
};

export default (logseq: ILSPluginUser) => {
  const settings = getSettings();
  const sequences: OperatorSequence[] = [];
  const normalModeSequences: OperatorSequence[] = [];
  const commandsById = new Map(
    OPERATOR_COMMANDS.map((command) => [command.id, command])
  );

  for (const command of OPERATOR_COMMANDS) {
    if (!beforeActionRegister(command.settingKey)) {
      continue;
    }

    const configured = settings.keyBindings[command.settingKey];
    const bindings = Array.isArray(configured) ? configured : [configured];

    bindings.forEach((binding) => {
      sequences.push({
        commandId: command.id,
        tokens: expandOperatorBinding(
          binding,
          command.object === "inner-word" ||
            command.object === "around-word"
        ),
      });
    });

    logseq.App.registerCommandPalette(
      {
        key: `vim-shortcut-${command.id}`,
        label: command.label,
      },
      async () => {
        if (beforeActionExecute()) {
          await executeOperator(command);
        }
      }
    );
  }

  if (beforeActionRegister("pasteNext")) {
    const configuredPaste = settings.keyBindings.pasteNext;
    const pasteBindings = Array.isArray(configuredPaste)
      ? configuredPaste
      : [configuredPaste];
    pasteBindings.forEach((binding) => {
      sequences.push({
        commandId: "paste-next",
        tokens: expandOperatorBinding(binding, false),
      });
    });
  }
  if (beforeActionRegister("pastePrev")) {
    const configuredPaste = settings.keyBindings.pastePrev;
    const pasteBindings = Array.isArray(configuredPaste)
      ? configuredPaste
      : [configuredPaste];
    pasteBindings.forEach((binding) => {
      sequences.push({
        commandId: "paste-previous",
        tokens: expandOperatorBinding(binding, false),
      });
    });
  }
  if (beforeActionRegister("cut")) {
    const configuredCut = settings.keyBindings.cut;
    const cutBindings = Array.isArray(configuredCut)
      ? configuredCut
      : [configuredCut];
    cutBindings.forEach((binding) => {
      sequences.push({
        commandId: "cut-character",
        tokens: expandOperatorBinding(binding, false),
      });
    });
  }
  if (beforeActionRegister("copyCurrentBlockContent")) {
    const configuredYankLine =
      settings.keyBindings.copyCurrentBlockContent;
    const yankLineBindings = Array.isArray(configuredYankLine)
      ? configuredYankLine
      : [configuredYankLine];
    yankLineBindings.forEach((binding) => {
      sequences.push({
        commandId: "yank-line",
        tokens: expandOperatorBinding(binding, false),
      });
    });
  }
  if (beforeActionRegister("deleteCurrentBlock")) {
    const configuredDeleteLine =
      settings.keyBindings.deleteCurrentBlock;
    const deleteLineBindings = Array.isArray(configuredDeleteLine)
      ? configuredDeleteLine
      : [configuredDeleteLine];
    deleteLineBindings.forEach((binding) => {
      sequences.push({
        commandId: "delete-line",
        tokens: expandOperatorBinding(binding, false),
      });
    });
  }
  const structuralBindings = [
    [
      "change-current-block",
      "changeCurrentBlock",
    ],
    [
      "delete-current-and-next-blocks",
      "deleteCurrentAndNextSiblingBlocks",
    ],
    [
      "delete-current-and-prev-blocks",
      "deleteCurrentAndPrevSiblingBlocks",
    ],
  ] as const;
  for (const [commandId, settingKey] of structuralBindings) {
    if (!beforeActionRegister(settingKey)) continue;
    const configured = settings.keyBindings[settingKey];
    const bindings = Array.isArray(configured) ? configured : [configured];
    bindings.forEach((binding) => {
      sequences.push({
        commandId,
        tokens: expandOperatorBinding(binding, false),
      });
    });
  }

  const motionBindings = [
    ["move-left", "left"],
    ["move-down", "down"],
    ["move-up", "up"],
    ["move-right", "right"],
    ["move-word-forward", "wordForward"],
    ["move-word-backward", "wordBackward"],
    ["move-word-end", "wordEnd"],
    ["move-line-end", "lineEnd"],
    ["move-first-nonblank", "firstNonBlank"],
    ["move-half-page-down", "halfPageDown"],
    ["move-half-page-up", "halfPageUp"],
    ["move-rendered-top", "top"],
    ["move-rendered-bottom", "bottom"],
    ["change-case-upper", "changeCaseUpper"],
    ["change-case-lower", "changeCaseLower"],
    ["undo", "undo"],
    ["redo", "redo"],
  ] as const;
  for (const [commandId, settingKey] of motionBindings) {
    if (!beforeActionRegister(settingKey)) continue;
    const configured = settings.keyBindings[settingKey];
    const bindings = Array.isArray(configured) ? configured : [configured];
    bindings.forEach((binding) => {
      normalModeSequences.push({
        commandId,
        tokens: expandOperatorBinding(binding, false),
      });
    });
  }

  disposeOperatorSequences();
  configureHostCapture([
    ...sequences.flatMap((sequence) => sequence.tokens),
    ..."0123456789",
  ]);
  configureHostNormalModeCapture(
    [
      ...NORMAL_MODE_CAPTURE_TOKENS,
      ...normalModeSequences.flatMap((sequence) => sequence.tokens),
    ]
  );

  let pendingTokens: string[] = [];
  let pendingMotionTokens: string[] = [];
  const clearPending = () => {
    pendingTokens = [];
    pendingMotionTokens = [];
  };
  const dispatchModalCommand = async (
    command: ReturnType<ReturnType<typeof useModalStore>["step"]>["command"],
    event: HostKeydownEvent
  ): Promise<void> => {
    if (!command) return;
    const searchStore = useSearchStore();
    if (command.kind === "escape") {
      if (searchStore.visualMode) {
        searchStore.exitVisualMode();
        await searchStore.restoreCursor(
          searchStore.cursorBlockUUID,
          searchStore.cursorBlockContent,
          searchStore.cursorPosition
        );
        return;
      }
      const finishedInsert = await searchStore.finishInsert();
      if (finishedInsert) return;
      const entered = await searchStore.enterNormalMode(event.blockUUID);
      if (!entered) setHostNormalModeActive(false);
      return;
    }
    if (command.kind === "visual") {
      await searchStore.enterVisualMode(
        command.mode === "char" ? "characterwise" : "linewise",
        event.visibleBlockUUIDs
      );
      useModalStore().setVisualAnchor({
        blockUUID: searchStore.cursorBlockUUID,
        offset: searchStore.cursorPosition,
      });
      return;
    }
    if (command.kind === "visual-operator") {
      await executeVisualOperator(command.operator, event);
      useModalStore().setVisualAnchor(null);
      return;
    }
    if (command.kind === "insert") {
      await searchStore.beginInsert(
        command.command,
        command.count,
        event.blockUUID
      );
      return;
    }
    if (command.kind === "replay-insert") {
      if (!searchStore.cursorMode || !searchStore.cursorBlockUUID) return;
      const anchor = await logseq.Editor.getBlock(
        searchStore.cursorBlockUUID
      );
      if (!anchor?.uuid) return;
      const before = await captureHistorySnapshot(
        event.visibleBlockUUIDs,
        currentModalPoint()
      );

      if (command.command === "o" || command.command === "O") {
        const insertedUUIDs: string[] = [];
        let insertionAnchor = anchor.uuid;
        for (let index = 0; index < command.count; index += 1) {
          const inserted = await logseq.Editor.insertBlock(
            insertionAnchor,
            command.insertedText,
            openSiblingOptions(command.command)
          );
          if (!inserted?.uuid) break;
          insertedUUIDs.push(inserted.uuid);
          if (command.command === "o") insertionAnchor = inserted.uuid;
        }
        const lastUUID = insertedUUIDs.at(-1);
        if (lastUUID) {
          await searchStore.restoreCursor(
            lastUUID,
            command.insertedText,
            Math.max(command.insertedText.length - 1, 0)
          );
        }
        await recordNativeHistory({
          before,
          scopeUUIDs: event.visibleBlockUUIDs,
          extraScopeUUIDs: insertedUUIDs,
          maxNativeSteps: insertedUUIDs.length,
        });
        return;
      }

      const session = beginInsertSession(
        command.command,
        anchor.uuid,
        anchor.content ?? "",
        searchStore.cursorPosition,
        1
      );
      const result = applyInsertDelta(
        anchor.content ?? "",
        session.editPosition,
        {
          relativeStart: command.relativeStart,
          removedText: command.removedText,
          insertedText: command.insertedText.repeat(command.count),
        }
      );
      await logseq.Editor.updateBlock(anchor.uuid, result.content);
      await searchStore.restoreCursor(
        anchor.uuid,
        result.content,
        result.cursor
      );
      await recordNativeHistory({
        before,
        scopeUUIDs: event.visibleBlockUUIDs,
        maxNativeSteps: 1,
      });
      return;
    }
    if (command.kind === "motion") {
      if (
        command.motion !== "f" &&
        command.motion !== "F" &&
        command.motion !== "t" &&
        command.motion !== "T" &&
        command.motion !== ";" &&
        command.motion !== "," &&
        command.motion !== "iw" &&
        command.motion !== "aw" &&
        command.motion !== "line"
      ) {
        await searchStore.moveByMotion(
          command.motion,
          command.count,
          event.visibleBlockUUIDs,
          event.viewportBlockUUIDs
        );
      }
      return;
    }
    if (command.kind === "char-find") {
      if (command.motion === ";" || command.motion === ",") {
        await searchStore.repeatCharacterFind(
          command.motion === ",",
          command.count
        );
      } else if (command.character) {
        await searchStore.moveCharacterFind(
          command.motion,
          command.character,
          command.count
        );
      }
      return;
    }
    if (command.kind === "search") {
      searchStore.setRenderedBlockOrder(event.visibleBlockUUIDs);
      if (command.direction === "forward") {
        searchStore.emptyInput();
        searchStore.show();
        logseq.showMainUI({ autoFocus: true });
        const input = document.querySelector(
          ".search-input input"
        ) as HTMLInputElement | null;
        input?.focus();
      } else {
        await searchStore.moveRenderedSearch(
          command.direction,
          command.count
        );
      }
      return;
    }
    if (command.kind === "change-case") {
      if (!searchStore.cursorMode || !searchStore.cursorBlockUUID) return;
      const before = await captureHistorySnapshot(
        event.visibleBlockUUIDs,
        currentModalPoint()
      );
      const block = await logseq.Editor.getBlock(searchStore.cursorBlockUUID);
      if (!block?.content) return;
      const start = Math.min(
        Math.max(searchStore.cursorPosition, 0),
        block.content.length - 1
      );
      const end = Math.min(block.content.length, start + command.count);
      const selected = block.content.slice(start, end);
      const replacement =
        command.case === "upper"
          ? changeCase.upperCase(selected)
          : changeCase.lowerCase(selected);
      const content =
        block.content.slice(0, start) +
        replacement +
        block.content.slice(end);
      await logseq.Editor.updateBlock(block.uuid, content);
      await searchStore.restoreCursor(block.uuid, content, start);
      await recordNativeHistory({
        before,
        scopeUUIDs: event.visibleBlockUUIDs,
        maxNativeSteps: 1,
      });
      return;
    }
    if (command.kind === "delete-char") {
      const before = await captureHistorySnapshot(
        event.visibleBlockUUIDs,
        currentModalPoint()
      );
      for (let index = 0; index < command.count; index += 1) {
        await cutAtNormalCursor();
      }
      useModalStore().recordChange({
        kind: "delete-char",
        count: command.count,
      });
      await recordNativeHistory({
        before,
        scopeUUIDs: event.visibleBlockUUIDs,
        maxNativeSteps: command.count,
      });
      return;
    }
    if (command.kind === "put") {
      const before = await captureHistorySnapshot(
        event.visibleBlockUUIDs,
        currentModalPoint()
      );
      const extraScopeUUIDs: string[] = [];
      let maxNativeSteps = 0;
      for (let index = 0; index < command.count; index += 1) {
        const result = await putVimRegister(command.before);
        extraScopeUUIDs.push(...result.uuids);
        maxNativeSteps += result.nativeSteps;
      }
      useModalStore().recordChange({
        kind: "put",
        before: command.before,
        count: command.count,
      });
      await recordNativeHistory({
        before,
        scopeUUIDs: event.visibleBlockUUIDs,
        extraScopeUUIDs,
        maxNativeSteps,
      });
      return;
    }
    if (command.kind === "operator") {
      if (
        command.motion === "line" ||
        command.motion === "j" ||
        command.motion === "k"
      ) {
        await executeLinewiseOperator(command, event);
        return;
      }
      const object =
        command.motion === "iw" ? "inner-word" :
        command.motion === "aw" ? "around-word" :
        command.motion === "w" ? (command.operator === "change" ? "word-end" : "word-forward") :
        command.motion === "e" ? "word-end" :
        command.motion === "$" ? "line-end" :
        null;
      const definition = object
        ? OPERATOR_COMMANDS.find(
            (item) => item.operator === command.operator && item.object === object
          )
        : undefined;
      if (definition) {
        await executePlannedTextOperator(command, event);
      }
      return;
    }
    if (command.kind === "repeat-change") {
      const lastChange = useModalStore().state.lastChange;
      if (lastChange) {
        await dispatchModalCommand(
          replayChange(lastChange, command.count),
          event
        );
        useModalStore().recordChange(lastChange);
      }
      return;
    }
    if (command.kind === "undo" || command.kind === "redo") {
      for (let index = 0; index < command.count; index += 1) {
        await executeNativeHistory(command.kind, event);
      }
      return;
    }
  };
  const handleKeydown = async (event: HostKeydownEvent) => {
    const searchStore = useSearchStore();
    const modalStore = useModalStore();
    const step = modalStore.step(keyboardEventToken(event));
    const pending =
      step.state.mode === "operator-pending" ||
      step.state.mode === "char-pending";
    setHostCaptureAll(pending);
    if (step.command) {
      clearPending();
      await dispatchModalCommand(step.command, event);
      return;
    }
    if (pending || step.state.countDigits || step.state.pendingPrefix) return;

    if (
      pendingTokens.length === 0 &&
      !event.isComposing &&
      !event.repeat &&
      !isTextEntryEvent(event) &&
      !event.textEntryActive
    ) {
      const motionResult = advanceOperatorSequence(
        normalModeSequences,
        pendingMotionTokens,
        keyboardEventToken(event)
      );
      pendingMotionTokens = motionResult.pendingTokens;
      if (motionResult.status === "pending") {
        return;
      }
      if (motionResult.status === "matched") {
        pendingMotionTokens = [];
        if (motionResult.commandId === "move-left") {
          await searchStore.moveCursorLeft();
        } else if (motionResult.commandId === "move-down") {
          await searchStore.moveCursorDown(event.visibleBlockUUIDs);
        } else if (motionResult.commandId === "move-up") {
          await searchStore.moveCursorUp(event.visibleBlockUUIDs);
        } else if (motionResult.commandId === "move-right") {
          await searchStore.moveCursorRight();
        } else if (motionResult.commandId === "move-word-forward") {
          await searchStore.moveWordForward();
        } else if (motionResult.commandId === "move-half-page-down") {
          await searchStore.moveCursorHalfPage(
            event.visibleBlockUUIDs,
            event.viewportBlockUUIDs,
            "down"
          );
        } else if (motionResult.commandId === "move-half-page-up") {
          await searchStore.moveCursorHalfPage(
            event.visibleBlockUUIDs,
            event.viewportBlockUUIDs,
            "up"
          );
        }
        return;
      }
      pendingMotionTokens = [];
    }

    if (!shouldCaptureNormalModeKey({
      composing: event.isComposing,
      repeat: event.repeat,
      visualMode: searchStore.visualMode,
      textEntryActive: isTextEntryEvent(event) || event.textEntryActive,
    })) {
      clearPending();
      return;
    }

    if (!beforeActionExecute()) {
      clearPending();
      return;
    }

    const result = advanceOperatorSequence(
      sequences,
      pendingTokens,
      keyboardEventToken(event)
    );
    if (result.consume) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }

    pendingTokens = result.pendingTokens;
    if (result.status === "pending") {
      return;
    }
    clearPending();

    if (result.status === "matched" && result.commandId) {
      if (result.commandId === "paste-next") {
        const count = getNumber();
        resetNumber();
        await dispatchModalCommand(
          { kind: "put", before: false, count },
          event
        );
        return;
      }
      if (result.commandId === "paste-previous") {
        const count = getNumber();
        resetNumber();
        await dispatchModalCommand(
          { kind: "put", before: true, count },
          event
        );
        return;
      }
      if (result.commandId === "cut-character") {
        const count = getNumber();
        resetNumber();
        await dispatchModalCommand(
          { kind: "delete-char", count },
          event
        );
        return;
      }
      if (result.commandId === "yank-line") {
        const count = getNumber();
        resetNumber();
        await executeLinewiseOperator(
          {
            kind: "operator",
            operator: "yank",
            motion: "line",
            count,
          },
          event
        );
        return;
      }
      if (result.commandId === "delete-line") {
        const count = getNumber();
        resetNumber();
        await executeLinewiseOperator(
          {
            kind: "operator",
            operator: "delete",
            motion: "line",
            count,
          },
          event
        );
        return;
      }
      if (result.commandId === "change-current-block") {
        const count = getNumber();
        resetNumber();
        await executeLinewiseOperator(
          {
            kind: "operator",
            operator: "change",
            motion: "line",
            count,
          },
          event
        );
        return;
      }
      if (
        result.commandId === "delete-current-and-next-blocks" ||
        result.commandId === "delete-current-and-prev-blocks"
      ) {
        const count = getNumber() + 1;
        resetNumber();
        await executeLinewiseOperator(
          {
            kind: "operator",
            operator: "delete",
            motion:
              result.commandId === "delete-current-and-next-blocks"
                ? "j"
                : "k",
            count,
          },
          event
        );
        return;
      }
      const command = commandsById.get(result.commandId);
      if (command) {
        const motionByObject: Record<
          OperatorObject,
          Extract<ModalCommand, { kind: "operator" }>["motion"]
        > = {
          "inner-word": "iw",
          "around-word": "aw",
          "word-forward": "w",
          "word-end": "e",
          "line-end": "$",
          line: "line",
        };
        const count = getNumber();
        resetNumber();
        await dispatchModalCommand(
          {
            kind: "operator",
            operator: command.operator,
            motion: motionByObject[command.object],
            count,
          },
          event
        );
      }
    }
  };

  const removeListener = addHostKeydownListener(handleKeydown);
  disposeOperatorSequenceListener = () => {
    clearPending();
    removeListener();
  };
};
