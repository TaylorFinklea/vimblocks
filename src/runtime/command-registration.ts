export interface CommandRegistrar<T> {
  id: string;
  register: (host: T) => void;
}

export const registerCommandRegistrars = <T>(
  host: T,
  registry: readonly CommandRegistrar<T>[]
): void => {
  const ids = new Set<string>();
  for (const entry of registry) {
    if (ids.has(entry.id)) {
      throw new Error(`Duplicate command registrar: ${entry.id}`);
    }
    ids.add(entry.id);
  }

  for (const entry of registry) {
    entry.register(host);
  }
};
