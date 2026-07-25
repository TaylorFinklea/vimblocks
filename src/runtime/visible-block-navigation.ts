export type VerticalDirection = "up" | "down";

export const resolveAdjacentVisibleBlockUUID = (
  visibleBlockUUIDs: readonly string[],
  currentBlockUUID: string,
  direction: VerticalDirection,
  distance = 1
): string | undefined => {
  const uniqueUUIDs = [...new Set(visibleBlockUUIDs)];
  const currentIndex = uniqueUUIDs.indexOf(currentBlockUUID);
  if (currentIndex === -1) {
    return undefined;
  }

  const normalizedDistance = Math.max(1, Math.floor(distance));
  const adjacentIndex =
    direction === "down"
      ? currentIndex + normalizedDistance
      : currentIndex - normalizedDistance;
  return uniqueUUIDs[adjacentIndex];
};
