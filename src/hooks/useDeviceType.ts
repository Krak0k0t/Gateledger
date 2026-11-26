import { useEffect, useState } from 'react';

export function isMobileDevice(width: number, hasTouch: boolean): boolean {
  return width < 1024 && hasTouch;
}

function detectCurrentMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  const hasCoarsePointer =
    typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
  const hasTouch =
    'ontouchstart' in window ||
    (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0) ||
    hasCoarsePointer;
  const w = window.innerWidth;
  const h = window.innerHeight;
  const compactPhoneLandscape = w < 960 && h < 560;
  return isMobileDevice(w, hasTouch) || w < 768 || compactPhoneLandscape;
}

export function useDeviceType(): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(detectCurrentMobileDevice);

  useEffect(() => {
    const update = () => {
      setIsMobile(detectCurrentMobileDevice());
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  return isMobile;
}
