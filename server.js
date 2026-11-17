const http = require('http');
const fs = require('fs');
const path = require('path');

const root = __dirname;
const port = Number(process.env.PORT || 5500);
const mimeTypes = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' };

function readEnv() {
  const envPath = path.join(root, '.env');
  if (!fs.existsSync(envPath)) return {};
  return Object.fromEntries(fs.readFileSync(envPath, 'utf8').split(/\r?\n/).filter(Boolean).filter((line) => !line.trimStart().startsWith('#')).map((line) => {
    const index = line.indexOf('=');
    return index === -1 ? [line.trim(), ''] : [line.slice(0, index).trim(), line.slice(index + 1).trim()];
  }));
}

http.createServer((request, response) => {
  const requestPath = decodeURIComponent(new URL(request.url, `http://${request.headers.host}`).pathname);
  if (requestPath === '/runtime-config.js' || requestPath === '/api/runtime-config.js') {
    const env = readEnv();
    const config = { supabaseUrl: env.SUPABASE_URL || '', supabasePublishableKey: env.SUPABASE_PUBLISHABLE_KEY || '' };
    response.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8', 'Cache-Control': 'no-store' });
    return response.end(`window.LOQATE_RUNTIME_CONFIG = ${JSON.stringify(config)};`);
  }
  const filePath = path.resolve(root, requestPath === '/' ? 'index.html' : `.${requestPath}`);
  if (!filePath.startsWith(root) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    response.writeHead(404); return response.end('Not found');
  }
  response.writeHead(200, { 'Content-Type': mimeTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(response);
}).listen(port, '0.0.0.0', () => console.log(`LOQATE running at http://localhost:${port}`));
