
type LocalStorageKey = 'authToken';

const localStorageKeys = {
  authToken: 'authToken',
} as const;

interface LocalStorageValues {
  authToken: string | null;
}

const localStorageManager = {
  get: <K extends LocalStorageKey>(key: K): LocalStorageValues[K] => {
    if (typeof window === 'undefined') return null as LocalStorageValues[K];
    const item = localStorage.getItem(localStorageKeys[key]);
    return item as LocalStorageValues[K]; // Adjust parsing if needed
  },

  set: <K extends LocalStorageKey>(key: K, value: LocalStorageValues[K]): void => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(localStorageKeys[key], value as string);
    } catch (error) {
      console.error(`Error setting localStorage item "${key}":`, error);
    }
  },

  remove: (key: LocalStorageKey): void => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(localStorageKeys[key]);
  },

  clear: (): void => {
    if (typeof window === 'undefined') return;
    // Optionally only clear app-specific keys
    Object.values(localStorageKeys).forEach((key) => {
      localStorage.removeItem(key);
    });
  },

  isAvailable: (): boolean => {
    try {
      const testKey = '__localStorageTest';
      localStorage.setItem(testKey, testKey);
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  },
};

export default localStorageManager;