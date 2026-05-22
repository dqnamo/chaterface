const LAST_FACTORY_ID_STORAGE_KEY = "factoryplane:last-factory-id";

export function getLastFactoryId() {
  try {
    return window.localStorage.getItem(LAST_FACTORY_ID_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function saveLastFactoryId(factoryId: string) {
  try {
    window.localStorage.setItem(LAST_FACTORY_ID_STORAGE_KEY, factoryId);
  } catch {
    // Ignore storage failures so navigation still works in private contexts.
  }
}

export function clearLastFactoryId(factoryId?: string) {
  try {
    if (!factoryId || getLastFactoryId() === factoryId) {
      window.localStorage.removeItem(LAST_FACTORY_ID_STORAGE_KEY);
    }
  } catch {
    // Ignore storage failures so navigation still works in private contexts.
  }
}
