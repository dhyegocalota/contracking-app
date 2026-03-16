import homepage from './index.html';

Bun.serve({
  port: 3001,
  routes: {
    '/*': homepage,
  },
  development: {
    hmr: true,
    console: true,
  },
});
