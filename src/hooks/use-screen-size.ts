import { useEffect, useState } from 'react';

const MOBILE_BREAKPOINT = 768;
const TABLET_BREAKPOINT = 1280;

type ScreenSize = 'mobile' | 'desktop' | 'tablet';

function getScreenSize(width: number): ScreenSize {
  if (width < MOBILE_BREAKPOINT) return 'mobile';
  if (width < TABLET_BREAKPOINT) return 'tablet';
  return 'desktop';
}

export function useScreenSize() {
  const [screenSize, setScreenSize] = useState<ScreenSize | undefined>(
    undefined,
  );

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const tabletMql = window.matchMedia(
      `(max-width: ${TABLET_BREAKPOINT - 1}px)`,
    );
    const onChange = () => {
      setScreenSize(getScreenSize(window.innerWidth));
    };
    mql.addEventListener('change', onChange);
    tabletMql.addEventListener('change', onChange);
    setScreenSize(getScreenSize(window.innerWidth));
    return () => {
      mql.removeEventListener('change', onChange);
      tabletMql.removeEventListener('change', onChange);
    };
  }, []);

  return screenSize;
}
