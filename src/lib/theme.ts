/**
 * Theme storage keys and the pre-hydration theme script.
 *
 * The app stores the *preference* under `theme-mode` ("light" | "dark" |
 * "auto"); `theme` is the key the resolved theme used to live in, still read
 * so a choice made before `theme-mode` existed is honoured.
 */
export const THEME_MODE_KEY = "theme-mode";
export const LEGACY_THEME_KEY = "theme";
export const DARK_MEDIA_QUERY = "(prefers-color-scheme: dark)";

/** Values inside the script are quoted through `JSON.stringify`. */
const quoted = (value: string) => JSON.stringify(value);

/**
 * Runs in `<head>`, before the body is parsed, and puts the saved theme on
 * `<html>` so the very first paint is already correct.
 *
 * Without it the markup is served theme-less (the server has no access to
 * `localStorage`), the browser paints the light theme, and only the effect in
 * `ThemeProvider` — after hydration — flips it to dark. That is the white flash
 * seen when reloading in dark mode.
 *
 * Kept in sync with `ThemeProvider`: unknown or missing values fall back to
 * "light", which is also what the provider assumes on the server. The `try` is
 * there because `localStorage` throws in private/Safari modes and in sandboxed
 * frames, and a thrown script would abort the rest of the head.
 */
export const themeInitScript = `(function(){try{var mode=localStorage.getItem(${quoted(
  THEME_MODE_KEY,
)})||localStorage.getItem(${quoted(
  LEGACY_THEME_KEY,
)});if(mode!=="dark"&&mode!=="light"&&mode!=="auto"){mode="light";}var dark=mode==="dark"||(mode==="auto"&&window.matchMedia(${quoted(
  DARK_MEDIA_QUERY,
)}).matches);var root=document.documentElement;root.classList.toggle("dark",dark);root.setAttribute("data-color-scheme",dark?"dark":"light");}catch(error){}})();`;
