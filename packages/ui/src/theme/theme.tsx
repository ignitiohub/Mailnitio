"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from "react";
import { Button } from "../components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "../components/dropdown-menu";
import { Tooltip } from "../components/tooltip";

export type ThemePreference = "system" | "light" | "dark";
export type Density = "comfortable" | "compact";

const THEME_KEY = "mailnitio.theme";
const DENSITY_KEY = "mailnitio.density";

/**
 * Inline script for <head>: applies the persisted theme before first paint (no flash).
 * Storage access is wrapped because it can throw in private windows.
 */
export const themeInitScript = `(function(){try{var p=localStorage.getItem("${THEME_KEY}")||"system";var d=p==="dark"||(p==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.dataset.theme=d?"dark":"light";var c=localStorage.getItem("${DENSITY_KEY}");if(c==="compact")document.documentElement.dataset.density="compact";}catch(e){document.documentElement.dataset.theme="light";}})();`;

interface ThemeContextValue {
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
  density: Density;
  setDensity: (density: Density) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Preference simply is not persisted.
  }
}

function applyTheme(preference: ThemePreference) {
  const dark =
    preference === "dark" ||
    (preference === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>("system");
  const [density, setDensityState] = useState<Density>("comfortable");

  useEffect(() => {
    const stored = readStorage(THEME_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") setPreferenceState(stored);
    if (readStorage(DENSITY_KEY) === "compact") setDensityState("compact");
  }, []);

  useEffect(() => {
    applyTheme(preference);
    if (preference !== "system") return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [preference]);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    writeStorage(THEME_KEY, next);
  }, []);

  const setDensity = useCallback((next: Density) => {
    setDensityState(next);
    writeStorage(DENSITY_KEY, next);
    if (next === "compact") document.documentElement.dataset.density = "compact";
    else delete document.documentElement.dataset.density;
  }, []);

  return (
    <ThemeContext.Provider value={{ preference, setPreference, density, setDensity }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}

const OPTIONS: [
  { value: ThemePreference; label: string; icon: typeof Sun },
  ...{ value: ThemePreference; label: string; icon: typeof Sun }[],
] = [
  { value: "system", label: "System", icon: Monitor },
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
];

export function ThemeSwitcher({ align = "end" }: { align?: "start" | "end" }) {
  const { preference, setPreference } = useTheme();
  const current = OPTIONS.find((o) => o.value === preference) ?? OPTIONS[0];
  const Icon = current.icon;
  return (
    <DropdownMenu>
      <Tooltip content={`Theme: ${current.label}`}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={`Theme: ${current.label}. Change theme`}>
            <Icon aria-hidden />
          </Button>
        </DropdownMenuTrigger>
      </Tooltip>
      <DropdownMenuContent align={align}>
        <DropdownMenuLabel>Theme</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={preference} onValueChange={(v) => setPreference(v as ThemePreference)}>
          {OPTIONS.map((option) => (
            <DropdownMenuRadioItem key={option.value} value={option.value}>
              <option.icon aria-hidden className="size-4 stroke-[1.75]" />
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
