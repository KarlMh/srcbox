import { useSyncExternalStore } from 'react';

// 'ROOT' = root sidebar area, box path = a specific box, null = nothing
let activePath: string | null = null;
const listeners = new Set<() => void>();

export const dragState = {
  set(path: string | null) {
    if (activePath !== path) {
      activePath = path;
      listeners.forEach(fn => fn());
    }
  },
  get(): string | null {
    return activePath;
  },
  subscribe(fn: () => void): () => void {
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  },
};

if (typeof document !== 'undefined') {
  document.addEventListener('dragend', () => dragState.set(null));
}

export function useActiveDragPath(): string | null {
  return useSyncExternalStore(dragState.subscribe, dragState.get, dragState.get);
}
