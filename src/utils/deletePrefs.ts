const KEY = 'srcbox-skip-delete-confirm';

export function shouldSkipDeleteConfirm(): boolean {
  return localStorage.getItem(KEY) === 'true';
}

export function setSkipDeleteConfirm(skip: boolean): void {
  if (skip) localStorage.setItem(KEY, 'true');
  else localStorage.removeItem(KEY);
}
