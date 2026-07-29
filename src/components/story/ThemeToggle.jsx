import { memo } from "react";

import { Moon } from "@styled-icons/feather/Moon";
import { Sun } from "@styled-icons/feather/Sun";
import { useShallow } from "zustand/react/shallow";

import useStore from "../../store/store.js";

import style from "./ThemeToggle.style.js";

// why: rendered as a sibling of TrailerScreen's masked, scrolling container
// (not inside Story) — that container's "Apple Music" top-fade mask and its
// own overflow:auto compositing don't reliably respect position:fixed
// descendants on iOS Safari. Living outside it keeps this a proper
// viewport-fixed control instead of one that fades/mispositions under the
// notch along with scrolled content.
const ThemeToggle = memo(function ThemeToggle({ className }) {
  const { theme, toggleTheme } = useStore(
    useShallow((state) => ({
      theme: state.app.theme,
      toggleTheme: state.toggleTheme,
    })),
  );

  return (
    <button
      type="button"
      className={className}
      onClick={toggleTheme}
      aria-label={
        theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
      }
    >
      {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
});

const StyledThemeToggle = style(ThemeToggle);

export default StyledThemeToggle;
