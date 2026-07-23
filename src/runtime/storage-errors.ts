export const isMissingStorageItemError = (error: unknown): boolean => {
  return String(error).toLowerCase().includes("file not existed");
};
