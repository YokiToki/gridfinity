import { configDefaults, defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // относительные URL: один билд работает под любым подпутём (GitHub Pages), роутинг на hash-ах
  base: './',
  plugins: [react(), tailwindcss()],
  // .claude/worktrees — чужие рабочие копии (сессии приложения): их тесты не наши
  test: { setupFiles: ['./src/test-setup.ts'], exclude: [...configDefaults.exclude, '.claude/**'] },
})
