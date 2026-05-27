export default defineNuxtConfig({
  devtools: { enabled: true },
  typescript: {
    strict: true
  },
  nitro: {
    devProxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  },
  css: ['~/assets/css/main.css'],
  app: {
    head: {
      title: '程序化地牢生成与寻路可视化器',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Procedural Dungeon Generator & Pathfinder Visualizer' }
      ]
    }
  }
});
