export interface SerializedBlock {
  content: string;
  properties?: Record<string, unknown>;
  children: SerializedBlock[];
}

export interface BlockNode {
  uuid: string;
  content: string;
  properties?: Record<string, unknown>;
  parentUUID?: string;
  children: BlockNode[];
}

interface NodeIndex {
  ordered: BlockNode[];
  byUUID: Map<string, BlockNode>;
  parentByUUID: Map<string, string>;
}

const indexNodes = (nodes: readonly BlockNode[]): NodeIndex => {
  const ordered: BlockNode[] = [];
  const byUUID = new Map<string, BlockNode>();
  const parentByUUID = new Map<string, string>();

  const visit = (node: BlockNode, parentUUID?: string): void => {
    if (!node.uuid || byUUID.has(node.uuid)) return;
    ordered.push(node);
    byUUID.set(node.uuid, node);
    const parent = node.parentUUID ?? parentUUID;
    if (parent) parentByUUID.set(node.uuid, parent);
    for (const child of node.children ?? []) visit(child, node.uuid);
  };
  for (const node of nodes) visit(node);
  return { ordered, byUUID, parentByUUID };
};

export const canonicalizeSubtreeRoots = (
  selectedUUIDs: readonly string[],
  nodes: readonly BlockNode[]
): string[] => {
  const index = indexNodes(nodes);
  const selected = new Set(
    selectedUUIDs.filter((uuid) => index.byUUID.has(uuid))
  );

  return index.ordered
    .map((node) => node.uuid)
    .filter((uuid) => {
      if (!selected.has(uuid)) return false;
      let parent = index.parentByUUID.get(uuid);
      while (parent) {
        if (selected.has(parent)) return false;
        parent = index.parentByUUID.get(parent);
      }
      return true;
    });
};

const serializeNode = (node: BlockNode): SerializedBlock => ({
  content: node.content,
  ...(node.properties ? { properties: { ...node.properties } } : {}),
  children: (node.children ?? []).map(serializeNode),
});

export const serializeSubtrees = (
  rootUUIDs: readonly string[],
  nodes: readonly BlockNode[]
): SerializedBlock[] => {
  const { byUUID } = indexNodes(nodes);
  return rootUUIDs.flatMap((uuid) => {
    const node = byUUID.get(uuid);
    return node ? [serializeNode(node)] : [];
  });
};

export const collectSubtreeUUIDs = (
  rootUUIDs: readonly string[],
  nodes: readonly BlockNode[]
): string[] => {
  const { byUUID } = indexNodes(nodes);
  const collected: string[] = [];
  const seen = new Set<string>();

  const visit = (uuid: string): void => {
    if (seen.has(uuid)) return;
    const node = byUUID.get(uuid);
    if (!node) return;
    seen.add(uuid);
    collected.push(uuid);
    for (const child of node.children ?? []) visit(child.uuid);
  };

  for (const uuid of rootUUIDs) visit(uuid);
  return collected;
};

export const firstSurvivingUUID = async (
  candidates: readonly string[],
  exists: (uuid: string) => Promise<boolean>
): Promise<string | null> => {
  for (const uuid of candidates) {
    if (await exists(uuid)) {
      return uuid;
    }
  }
  return null;
};
