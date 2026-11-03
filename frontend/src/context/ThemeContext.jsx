import { createContext, useContext, useState, useEffect } from "react";

export const THEMES = [
  {
    id: "dark-grey",
    name: "Dark Grey",
    subtitle: "Modern Minimalist",
    description: "Sleek slate obsidian with cool indigo/violet accents",
    badge: "Default",
    accentColor: "#6366f1",
    primaryColor: "#0f1117",
    cardColor: "#1c202c",
    textColor: "#f8fafc",
    previewGradient: "linear-gradient(135deg, #0f1117 0%, #1c202c 50%, #6366f1 100%)",
  },
  {
    id: "amber-brown",
    name: "Amber Brown",
    subtitle: "Classic EchoHub",
    description: "Signature warm obsidian with radiant flame amber",
    badge: "Warm",
    accentColor: "#ff8a00",
    primaryColor: "#18120d",
    cardColor: "#2a1d14",
    textColor: "#fff8f2",
    previewGradient: "linear-gradient(135deg, #18120d 0%, #2a1d14 50%, #ff8a00 100%)",
  },
  {
    id: "light-white",
    name: "Light White",
    subtitle: "Daylight Studio",
    description: "Crisp porcelain canvas with sapphire cobalt accents",
    badge: "Daylight",
    accentColor: "#2563eb",
    primaryColor: "#f8fafc",
    cardColor: "#ffffff",
    textColor: "#0f172a",
    previewGradient: "linear-gradient(135deg, #f8fafc 0%, #ffffff 50%, #2563eb 100%)",
  },
  {
    id: "neon-blue",
    name: "Neon Blue",
    subtitle: "Cyberpunk Matrix",
    description: "Deep space void with high-voltage neon cyan glow",
    badge: "Cyber",
    accentColor: "#00f0ff",
    primaryColor: "#080c14",
    cardColor: "#111c34",
    textColor: "#f0fdf4",
    previewGradient: "linear-gradient(135deg, #080c14 0%, #111c34 50%, #00f0ff 100%)",
  },
];

const THEME_STORAGE_KEY = "echohub_theme";
const DEFAULT_THEME = "dark-grey";

const ThemeContext = createContext({
  theme: DEFAULT_THEME,
  setTheme: () => {},
  themes: THEMES,
  currentThemeInfo: THEMES[0],
});

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      if (stored && THEMES.some((t) => t.id === stored)) {
        return stored;
      }
    } catch {
      // localStorage may fail in private mode
    }
    return DEFAULT_THEME;
  });

  const setTheme = (newTheme) => {
    if (!THEMES.some((t) => t.id === newTheme)) return;
    setThemeState(newTheme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    document.body.setAttribute("data-theme", theme);
  }, [theme]);

  const currentThemeInfo = THEMES.find((t) => t.id === theme) || THEMES[0];

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        themes: THEMES,
        currentThemeInfo,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

export default ThemeContext;
