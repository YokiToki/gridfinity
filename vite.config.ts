import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // относительные URL: один билд работает под любым подпутём (GitLab Pages), роутинг на hash-ах
  base: './',
  plugins: [react(), tailwindcss()],
  test: { setupFiles: ['./src/test-setup.ts'] },
})
