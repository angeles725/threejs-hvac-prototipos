import { useEffect, useState } from 'react';

const MOBILE_MAX = 767;
const TABLET_MAX = 1023;

function read() {
  if (typeof window === 'undefined') {
    return { width: 1440, isMobile: false, isTablet: false, isDesktop: true };
  }
  const w = window.innerWidth;
  return {
    width: w,
    isMobile: w <= MOBILE_MAX,
    isTablet: w > MOBILE_MAX && w <= TABLET_MAX,
    isDesktop: w > TABLET_MAX,
  };
}

export function useViewport() {
  const [v, setV] = useState(read);

  useEffect(() => {
    let frame = null;
    const onResize = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setV(read()));
    };
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return v;
}
