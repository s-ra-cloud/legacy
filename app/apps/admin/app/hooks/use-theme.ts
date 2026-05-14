import { useEffect } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type Theme = "light" | "dark" | "system";

interface ThemeStore {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  isDarkMode: () => boolean;
}

const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      theme: "system",
      setTheme: (newTheme: Theme) => {
        set({ theme: newTheme });
        applyTheme(newTheme);
      },
      toggleTheme: () => {
        const current = get().theme;
        const next = (() => {
          switch (current) {
            case "light":
              return "dark";
            case "dark":
              return "system";
            case "system":
              return "light";
            default:
              return "light";
          }
        })();
        get().setTheme(next);
      },
      isDarkMode: () => {
        if (typeof window === "undefined") return false;

        const theme = get().theme;
        if (theme === "system") {
          return window.matchMedia("(prefers-color-scheme: dark)").matches;
        }

        return theme === "dark";
      },
    }),
    {
      name: "theme",
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
);

const applyTheme = (newTheme: Theme) => {
  if (typeof window === "undefined") return;

  const root = window.document.documentElement;
  root.classList.remove("light", "dark");

  if (newTheme === "system") {
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
      .matches
      ? "dark"
      : "light";
    root.classList.add(systemTheme);
  } else {
    root.classList.add(newTheme);
  }
};

export function useTheme() {
  const { theme, setTheme, toggleTheme, isDarkMode } = useThemeStore();

  useEffect(() => {
    applyTheme(theme);

    // Listen for system theme changes when theme is set to system
    if (theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handleChange = () => applyTheme("system");

      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }
  }, [theme]);

  return {
    theme,
    setTheme,
    toggleTheme,
    isDarkMode: isDarkMode(),
  };
}
