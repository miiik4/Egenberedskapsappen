import { defineCliConfig } from 'sanity/cli';

export default defineCliConfig({
  api: { projectId: '8ej8zl2c', dataset: 'production' },
  // A hosted Studio is optional (`sanity deploy` gives it a public URL); run it locally with `npm run dev`.
  deployment: { autoUpdates: true },
});
