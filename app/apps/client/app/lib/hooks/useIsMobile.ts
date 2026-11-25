import { useEffect, useState } from "react";

interface BreakpointConfig {
  sm?: number;
  md?: number;
  lg?: number;
  xl?: number;
}

const defaultBreakpoints: BreakpointConfig = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
};

export function useIsMobile(
  breakpoint: number | keyof BreakpointConfig = "md",
): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const breakpointValue =
      typeof breakpoint === "number"
        ? breakpoint
        : defaultBreakpoints[breakpoint] || defaultBreakpoints.md;

    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < (breakpointValue ?? 0));
    };

    checkScreenSize();

    window.addEventListener("resize", checkScreenSize);

    return () => window.removeEventListener("resize", checkScreenSize);
  }, [breakpoint]);

  return isMobile;
}
