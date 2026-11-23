import { useEffect } from 'react';

/**
 * Publishes the height of the on-screen keyboard as the CSS variable
 * `--kb-inset` on <html>, so bottom sheets can sit above it (iOS Safari does
 * not resize the layout viewport when the keyboard opens).
 */
export function useKeyboardInset() {
  useEffect(() => {
    const vv = typeof window !== 'undefined' ? window.visualViewport : null;
    if (!vv) return;
    const root = document.documentElement;
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const inset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
        root.style.setProperty('--kb-inset', `${inset > 80 ? Math.round(inset) : 0}px`);
      });
    };
    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      cancelAnimationFrame(frame);
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, []);
}
