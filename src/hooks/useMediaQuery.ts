import { useEffect, useState } from 'react';

/**
 * Synchronous media query (reads matchMedia on first render, so there is no
 * false→true flip after mount). Only for client-rendered (signed-in) screens.
 */
export function useMediaQuery(query: string) {
  const get = () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query).matches : false);
  const [matches, setMatches] = useState(get);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener?.('change', onChange);
    return () => mql.removeEventListener?.('change', onChange);
  }, [query]);

  return matches;
}

export const useIsDesktop = () => useMediaQuery('(min-width: 768px)');

export const usePrefersReducedMotion = () => useMediaQuery('(prefers-reduced-motion: reduce)');
