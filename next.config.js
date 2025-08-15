// next.config.js (JS) — se o seu for TS, crie next.config.ts igualzinho
const withPWA = require('@ducanh2912/next-pwa').default({
  dest: 'public',
  register: true,
  skipWaiting: true,
  // desabilita o SW no dev para não te atrapalhar
  disable: process.env.NODE_ENV === 'development',
});

module.exports = withPWA({
  // Outras configs do Next, se houver
});
