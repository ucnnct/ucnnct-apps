import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const baseByMode: Record<string, string> = {
    dev: '/dev/',
    staging: '/staging/',
    prod: '/',
  }
  const base = env.VITE_BASE_PATH || baseByMode[mode] || '/'

  return {
    base,
    plugins: [
      react({
        babel: {
          plugins: [['babel-plugin-react-compiler']],
        },
      }),
    ],
  }
})
