import { defineConfig } from 'vite';

// GitHub Pages serves the game from https://herrshabi.github.io/SupaCapybara/,
// so the built files (and `npm run preview`) use that path. `npm run dev` still uses the normal address.
export default defineConfig(({ command, isPreview }) => ({
  base: command === 'build' || isPreview ? '/SupaCapybara/' : '/',
}));
