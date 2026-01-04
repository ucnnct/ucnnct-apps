import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const baseByMode: Record<string, string> = {
    dev: '/dev/',
    staging: '/staging/',
    prod: '/',
    local: '/',
  }

  return {
    base: baseByMode[mode] ?? '/',
    plugins: [
      react({
        babel: {
          plugins: [['babel-plugin-react-compiler']],
        },
      }),
    ],
  }
})
