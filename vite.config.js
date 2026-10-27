import { resolve } from 'node:path'
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        isabella: resolve(__dirname, 'isabella/index.html'),
        a: resolve(__dirname, 'a/index.html'),
        b: resolve(__dirname, 'b/index.html'),
      },
    },
  },
})
