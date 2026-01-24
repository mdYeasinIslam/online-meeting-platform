import { useEffect, useState } from 'react';

export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  xxl: 1536,
};

export type Breakpoint = keyof typeof breakpoints;

type Screens = Record<Breakpoint, boolean>;

type BelowFlags = {
  isBelowSm: boolean;
  isBelowMd: boolean;
  isBelowLg: boolean;
  isBelowXl: boolean;
  isBelowXxl: boolean;
};

export type BreakpointState = Screens & BelowFlags;

const getInitialStateFn = (): BreakpointState => ({
  sm: false,
  md: false,
  lg: false,
  xl: false,
  xxl: false,
  isBelowSm: true,
  isBelowMd: true,
  isBelowLg: true,
  isBelowXl: true,
  isBelowXxl: true,
});

export const useBreakpoint = (): BreakpointState => {
  const [state, setState] = useState<BreakpointState>(getInitialStateFn);

  useEffect(() => {
    const updateState = () => {
      const width = window.innerWidth;

      const screens: Screens = {
        sm: width >= breakpoints.sm,
        md: width >= breakpoints.md,
        lg: width >= breakpoints.lg,
        xl: width >= breakpoints.xl,
        xxl: width >= breakpoints.xxl,
      };

      setState({
        ...screens,
        isBelowSm: width < breakpoints.sm,
        isBelowMd: width < breakpoints.md,
        isBelowLg: width < breakpoints.lg,
        isBelowXl: width < breakpoints.xl,
        isBelowXxl: width < breakpoints.xxl,
      });
    };

    updateState();

    const mqls = Object.values(breakpoints).map((minWidth) => window.matchMedia(`(min-width: ${minWidth}px)`));

    mqls.forEach((mql) => mql.addEventListener('change', updateState));

    return () => {
      mqls.forEach((mql) => mql.removeEventListener('change', updateState));
    };
  }, []);

  return state;
};
