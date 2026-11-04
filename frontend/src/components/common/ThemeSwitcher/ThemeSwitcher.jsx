import React from "react";
import { Moon, Flame, Sun, Zap, Check } from "lucide-react";
import { useTheme } from "../../../context/ThemeContext";
import "./ThemeSwitcher.css";

const THEME_ICONS = {
  "dark-grey": Moon,
  "amber-brown": Flame,
  "light-white": Sun,
  "neon-blue": Zap,
};

export default function ThemeSwitcher({ compact = false, showLabels = false }) {
  const { theme, setTheme, themes } = useTheme();

  return (
    <div
      className={`theme-switcher ${compact ? "theme-switcher--compact" : ""}`}
      role="radiogroup"
      aria-label="Color Theme Selection"
    >
      {themes.map((t) => {
        const IconComponent = THEME_ICONS[t.id] || Moon;
        const isActive = theme === t.id;

        return (
          <button
            key={t.id}
            type="button"
            role="radio"
            aria-checked={isActive}
            className={`theme-switcher__btn ${isActive ? "active" : ""}`}
            onClick={() => setTheme(t.id)}
            title={`${t.name} (${t.subtitle})`}
            style={{
              "--theme-accent": t.accentColor,
            }}
          >
            <span
              className="theme-switcher__dot"
              style={{ backgroundColor: t.accentColor }}
            />
            <IconComponent size={compact ? 12 : 14} className="theme-switcher__icon" />
            {showLabels && (
              <span className="theme-switcher__label">{t.name}</span>
            )}
            {isActive && compact && (
              <span className="theme-switcher__active-indicator" />
            )}
          </button>
        );
      })}
    </div>
  );
}
