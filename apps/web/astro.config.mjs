import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://egenberedskapappen.no',
  vite: {
    build: {
      // The CSP has `script-src 'self'` with no 'unsafe-inline' (firebase.json), so a small <script> must still be
      // emitted as a file instead of inlined into the page. Everything else keeps Vite's default.
      assetsInlineLimit: (path) => (/\.[cm]?[jt]s$/.test(path) ? false : undefined),
    },
  },
});
