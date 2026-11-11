import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig(({ command, mode }) => {
  if (command === 'build') {
    const env = loadEnv(mode, process.cwd(), 'VITE_')
    const required = [
      'VITE_API_BASE_URL',
      'VITE_FIREBASE_API_KEY',
      'VITE_FIREBASE_AUTH_DOMAIN',
      'VITE_FIREBASE_PROJECT_ID',
      'VITE_FIREBASE_STORAGE_BUCKET',
      'VITE_FIREBASE_MESSAGING_SENDER_ID',
      'VITE_FIREBASE_APP_ID',
    ]
    const missing = required.filter((key) => !env[key]?.trim())
    if (missing.length) {
      throw new Error(`Configuration de production incomplète : ${missing.join(', ')}`)
    }
    if (
      !/^https:\/\/[^/]+\/api\/?$/i.test(env.VITE_API_BASE_URL.trim()) ||
      env.VITE_FIREBASE_PROJECT_ID.startsWith('demo-') ||
      env.VITE_USE_FIREBASE_EMULATORS === 'true'
    ) {
      throw new Error('Build refusé : API HTTPS et projet Firebase réel requis en production.')
    }
  }

  return {
    plugins: [vue()],
    server: {
      proxy: {
        '/api': {
          target: mode === 'emulator' ? 'http://127.0.0.1:3002' : 'http://127.0.0.1:3001',
          changeOrigin: true,
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  }
})
