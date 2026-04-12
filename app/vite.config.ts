import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/proxy-int': {
        target: 'https://api2.meet2know.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/proxy-int/, ''),
      },
      '/proxy-prod': {
        target: 'https://api2.myclients.io',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/proxy-prod/, ''),
      },
    },
  },
})
