import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import tailwindcss from 'bun-plugin-tailwind';

const gitHash = Bun.spawnSync(['git', 'rev-parse', '--short', 'HEAD']).stdout.toString().trim();
const buildVersion = gitHash || new Date().toISOString();

const requiredEnvVars = ['API_BASE_URL', 'TURNSTILE_SITE_KEY'];
const missingEnvVars = requiredEnvVars.filter((key) => !process.env[key]);
if (missingEnvVars.length > 0) {
  console.error(`Missing env vars: ${missingEnvVars.join(', ')}. Create apps/dashboard/.env or set them.`);
  process.exit(1);
}

await Bun.build({
  entrypoints: ['./index.html'],
  outdir: './dist',
  minify: true,
  env: 'inline',
  publicPath: '/',
  target: 'browser',
  format: 'esm',
  plugins: [tailwindcss],
  define: {
    'process.env.BUILD_VERSION': JSON.stringify(buildVersion),
    'process.env.BUILD_TIMESTAMP': JSON.stringify(new Date().toISOString()),
    'process.env.API_BASE_URL': JSON.stringify(process.env.API_BASE_URL),
    'process.env.TURNSTILE_SITE_KEY': JSON.stringify(process.env.TURNSTILE_SITE_KEY),
  },
});

writeFileSync('./dist/version.json', JSON.stringify({ version: buildVersion }));

cpSync('./public/_redirects', './dist/_redirects');
cpSync('./public/manifest.json', './dist/manifest.json');
cpSync('./public/service-worker.js', './dist/service-worker.js');

if (!existsSync('./dist/icons')) mkdirSync('./dist/icons', { recursive: true });
cpSync('./public/icons', './dist/icons', { recursive: true });

const indexPath = './dist/index.html';
const indexContent = readFileSync(indexPath, 'utf-8');
const withAbsolutePaths = indexContent.replaceAll('src="./', 'src="/');
const withPwaLinks = withAbsolutePaths.replace(
  '<title>Contracking</title>',
  '<link rel="manifest" href="/manifest.json"><link rel="apple-touch-icon" href="/icons/icon-192.svg"><title>Contracking</title>',
);
writeFileSync(indexPath, withPwaLinks);
