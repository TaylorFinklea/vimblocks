export type VerticalDirection = "up" | "down";

export const resolveAdjacentVisibleBlockUUID = (
  visibleBlockUUIDs: readonly string[],
  currentBlockUUID: string,
  direction: VerticalDirection
): string | undefined => {
  const uniqueUUIDs = [...new Set(visibleBlockUUIDs)];
  const currentIndex = uniqueUUIDs.indexOf(currentBlockUUID);
  if (currentIndex === -1) {
    return undefined;
  }

  const adjacentIndex =
    direction === "down" ? currentIndex + 1 : currentIndex - 1;
  return uniqueUUIDs[adjacentIndex];
};
