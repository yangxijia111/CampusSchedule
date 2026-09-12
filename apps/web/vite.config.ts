import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// 开发/构建时直接消费各包源码，避免先构建 dist
const packageNames = ['core', 'adapters', 'storage', 'importer-protocol'];

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: Object.fromEntries(
      packageNames.map((name) => [
        `@campusschedule/${name}`,
        fileURLToPath(new URL(`../../packages/${name}/src/index.ts`, import.meta.url)),
      ]),
    ),
  },
});
