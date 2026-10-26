import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { schemaTypes } from './schemaTypes';

export default defineConfig({
  name: 'default',
  title: 'Egenberedskapsappen',
  projectId: '8ej8zl2c',
  dataset: 'production',
  plugins: [structureTool()],
  schema: { types: schemaTypes },
});
