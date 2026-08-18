import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// `BASE_PATH` is set by the GitHub Actions deploy workflow to "/<repo-name>/" since GitHub Pages
// serves project sites from a sub-path; it defaults to "/" for local development.
export default defineConfig({
  plugins: [react()],
  base: process.env.BASE_PATH ?? '/',
})
