/**
 * Safe Web Storage access: every call is wrapped in try/catch because storage can be missing
 * (SSR), disabled (privacy settings), full (QuotaExceededError) or throw in private windows.
 * When it fails the app keeps working in memory.
 */
export type StorageKind = 'local' | 'session';

function getStorage(kind: StorageKind): Storage | null {
  try {
    const storage = kind === 'local' ? globalThis.localStorage : globalThis.sessionStorage;
    return storage ?? null;
  } catch {
    return null;
  }
}

export function readJson<T>(key: string, kind: StorageKind = 'local'): T | null {
  try {
    const raw = getStorage(kind)?.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writeJson(key: string, value: unknown, kind: StorageKind = 'local'): boolean {
  try {
    const storage = getStorage(kind);
    if (!storage) return false;
    storage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function removeKey(key: string, kind: StorageKind = 'local'): void {
  try {
    getStorage(kind)?.removeItem(key);
  } catch {
    /* ignore */
  }
}
