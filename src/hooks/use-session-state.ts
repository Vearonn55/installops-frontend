import { useEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';

const PREFIX = 'installops:v1:';

function readSession<T>(key: string, fallback: T | (() => T)): T {
  const resolve = () =>
    typeof fallback === 'function' ? (fallback as () => T)() : fallback;
  try {
    const raw = window.sessionStorage.getItem(PREFIX + key);
    if (raw === null) return resolve();
    return JSON.parse(raw) as T;
  } catch {
    return resolve();
  }
}

/**
 * Like useState, but persisted to sessionStorage under a namespaced key so
 * list filters survive navigating away and back within the same tab/session.
 */
export function useSessionState<T>(
  key: string,
  initial: T | (() => T)
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => readSession(key, initial));

  const keyRef = useRef(key);
  keyRef.current = key;

  useEffect(() => {
    try {
      window.sessionStorage.setItem(PREFIX + keyRef.current, JSON.stringify(value));
    } catch {
      // Storage full or unavailable; state still works in-memory.
    }
  }, [value]);

  return [value, setValue];
}
