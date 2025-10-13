export function getQueryParam(name: string): string | null {
  if (typeof window === 'undefined') return null;
  const url = new URL(window.location.href);
  const value = url.searchParams.get(name);
  return value;
}

export function setQueryParam(name: string, value: string | null, replace: boolean = false): void {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  if (value === null || value === '') {
    url.searchParams.delete(name);
  } else {
    url.searchParams.set(name, value);
  }
  if (replace) {
    window.history.replaceState({}, '', url.toString());
  } else {
    window.history.pushState({}, '', url.toString());
  }
}

export function syncStateWithQuery(
  key: string,
  get: () => string,
  set: (v: string) => void,
  validValues?: string[]
) {
  // Initialize from query
  const fromQuery = getQueryParam(key);
  if (fromQuery && (!validValues || validValues.includes(fromQuery))) {
    set(fromQuery);
  }
  // Keep URL updated on changes
  let last = get();
  const observer = new MutationObserver(() => {
    const current = get();
    if (current !== last) {
      setQueryParam(key, current, true);
      last = current;
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  return () => observer.disconnect();
}


