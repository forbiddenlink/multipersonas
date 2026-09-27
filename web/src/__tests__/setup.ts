import "@testing-library/jest-dom/vitest";

// Node >= 22.4 / 24+ defines an experimental `globalThis.localStorage` that errors
// without `--localstorage-file`. Provide a deterministic in-memory storage for jsdom tests.
if (typeof window !== "undefined") {
  const store = new Map<string, string>();
  const mockLocalStorage: Storage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, String(value));
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size;
    },
  };

  Object.defineProperty(globalThis, "localStorage", {
    value: mockLocalStorage,
    configurable: true,
    writable: true,
  });
  Object.defineProperty(window, "localStorage", {
    value: mockLocalStorage,
    configurable: true,
    writable: true,
  });
}
