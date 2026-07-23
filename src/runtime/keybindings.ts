export interface DuplicateKeyBinding {
  key1: string;
  key2: string;
  binding: string;
}

export const validateKeyBinding = (
  binding: string
): { valid: boolean; error?: string } => {
  if (!binding || binding.trim() === "") {
    return { valid: false, error: "Key binding cannot be empty" };
  }

  for (const part of binding.trim().split(" ")) {
    if (part.split("+").some((key) => key === "")) {
      return {
        valid: false,
        error: "Invalid key binding format: empty key not allowed",
      };
    }
  }

  return { valid: true };
};

export const normalizeKeyBinding = (binding: string): string => {
  return binding.trim().toLowerCase().replace(/\s+/g, " ");
};

export const findDuplicateKeyBindings = (
  keyBindings: Record<string, string | string[]>
): DuplicateKeyBinding[] => {
  const duplicates: DuplicateKeyBinding[] = [];
  const bindingMap = new Map<string, string[]>();

  for (const [key, value] of Object.entries(keyBindings)) {
    const bindings = Array.isArray(value) ? value : [value];
    for (const binding of bindings) {
      const normalized = normalizeKeyBinding(binding);
      const keys = bindingMap.get(normalized) ?? [];
      keys.push(key);
      bindingMap.set(normalized, keys);
    }
  }

  for (const [binding, keys] of bindingMap) {
    for (let left = 0; left < keys.length; left += 1) {
      for (let right = left + 1; right < keys.length; right += 1) {
        duplicates.push({
          key1: keys[left],
          key2: keys[right],
          binding,
        });
      }
    }
  }

  return duplicates;
};
