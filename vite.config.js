import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/solarvision-ai/',
  build: {
    outDir: 'dist',
  },
})