export default defineConfig({
  output: 'static',
  build: {
    inlineStylesheets: 'always',  // CSS inline ipv losse files
    assets: '_assets',
  },
  vite: {
    build: {
      cssCodeSplit: false,         // 1 CSS file ipv vele
      rollupOptions: {
        output: {
          manualChunks: undefined, // geen JS splitting
        }
      }
    }
  }
});