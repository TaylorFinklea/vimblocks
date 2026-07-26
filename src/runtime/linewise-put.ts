import type {
  BlockEntity,
  IBatchBlock,
} from "@logseq/libs/dist/LSPlugin";

export interface LinewisePutAnchor {
  uuid: string;
  parent?: number | string | { id?: number | string };
}

export interface LinewisePutEditor {
  insertBatchBlock(
    anchorUUID: string,
    batch: IBatchBlock[],
    options: {
      before: boolean;
      sibling: boolean;
    }
  ): Promise<BlockEntity[] | null>;
  getBlock(
    identity: number | string
  ): Promise<{ uuid: string } | null>;
  getPage(
    identity: number | string
  ): Promise<{ uuid: string } | null>;
  insertBlock(
    anchorUUID: string,
    content: string,
    options: {
      before?: boolean;
      sibling?: boolean;
      start?: boolean;
      properties?: Record<string, unknown>;
    }
  ): Promise<BlockEntity | null>;
  prependBlockInPage(
    pageUUID: string,
    content: string,
    options?: {
      properties?: Record<string, unknown>;
    }
  ): Promise<BlockEntity | null>;
}

export interface LinewiseInsertResult {
  blocks: BlockEntity[];
  nativeSteps: number;
}

const parentIdentity = (
  parent: LinewisePutAnchor["parent"]
): number | string | null => {
  if (typeof parent === "number" || typeof parent === "string") {
    return parent;
  }
  if (
    parent &&
    (typeof parent.id === "number" || typeof parent.id === "string")
  ) {
    return parent.id;
  }
  return null;
};

const isMissingBeforeAnchorError = (error: unknown): boolean =>
  Boolean(
    error &&
      typeof error === "object" &&
      "message" in error &&
      typeof error.message === "string" &&
      error.message.includes(
        "Expected number or lookup ref for entity id, got nil"
      )
  );

export const insertLinewiseBatch = async (
  editor: LinewisePutEditor,
  anchor: LinewisePutAnchor,
  batch: IBatchBlock[],
  before: boolean
): Promise<LinewiseInsertResult> => {
  try {
    return {
      blocks:
        (await editor.insertBatchBlock(anchor.uuid, batch, {
          before,
          sibling: true,
        })) ?? [],
      nativeSteps: 1,
    };
  } catch (error) {
    if (!before || !isMissingBeforeAnchorError(error)) {
      throw error;
    }

    const identity = parentIdentity(anchor.parent);
    if (identity === null) {
      throw error;
    }
    const parentBlock = await editor.getBlock(identity);
    const parentPage = parentBlock
      ? null
      : await editor.getPage(identity);
    const parent = parentBlock ?? parentPage;
    if (!parent?.uuid) {
      throw error;
    }

    let nativeSteps = 0;
    const insertNode = async (
      node: IBatchBlock,
      previousSibling: BlockEntity | null,
      parentUUID: string,
      parentIsPage: boolean
    ): Promise<BlockEntity> => {
      const properties =
        node.properties &&
        typeof node.properties === "object"
          ? node.properties
          : undefined;
      const inserted =
        previousSibling
          ? await editor.insertBlock(
              previousSibling.uuid,
              node.content,
              {
                before: false,
                sibling: true,
                properties,
              }
            )
          : parentIsPage
            ? await editor.prependBlockInPage(
                parentUUID,
                node.content,
                properties ? { properties } : undefined
              )
            : await editor.insertBlock(
                parentUUID,
                node.content,
                {
                  sibling: false,
                  start: true,
                  properties,
                }
              );
      if (!inserted?.uuid) {
        throw error;
      }
      nativeSteps += 1;

      const insertedChildren: BlockEntity[] = [];
      let previousChild: BlockEntity | null = null;
      for (const child of node.children ?? []) {
        const insertedChild = await insertNode(
          child,
          previousChild,
          inserted.uuid,
          false
        );
        insertedChildren.push(insertedChild);
        previousChild = insertedChild;
      }
      return {
        ...inserted,
        children: insertedChildren,
      };
    };

    const blocks: BlockEntity[] = [];
    let previousRoot: BlockEntity | null = null;
    for (const node of batch) {
      const inserted = await insertNode(
        node,
        previousRoot,
        parent.uuid,
        Boolean(parentPage)
      );
      blocks.push(inserted);
      previousRoot = inserted;
    }
    return {
      blocks,
      nativeSteps,
    };
  }
};
