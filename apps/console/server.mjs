import { createReadStream, promises as fs } from 'node:fs';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';

const port = Number(process.env.PORT ?? 4173);
const apiBaseUrl = new URL(process.env.AEGIS_API_URL ?? 'http://api:3000');
const assetRoot = resolve('apps/console/dist');
const securityHeaders = {
  'content-security-policy':
    "default-src 'self'; base-uri 'self'; connect-src 'self'; font-src 'self'; form-action 'self'; frame-ancestors 'none'; img-src 'self' data:; object-src 'none'; script-src 'self'; style-src 'self'",
  'cross-origin-opener-policy': 'same-origin',
  'permissions-policy': 'camera=(), geolocation=(), microphone=(), payment=(), usb=()',
  'referrer-policy': 'no-referrer',
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
};
const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
};

const server = createServer(async (request, response) => {
  try {
    const requestUrl = new URL(request.url ?? '/', 'http://console.local');
    if (requestUrl.pathname === '/health') {
      return send(
        response,
        200,
        'application/json; charset=utf-8',
        JSON.stringify({ status: 'ok' }),
      );
    }
    if (requestUrl.pathname.startsWith('/api/')) return await proxy(request, response, requestUrl);
    return await serveAsset(response, requestUrl.pathname);
  } catch {
    return send(
      response,
      502,
      'application/json; charset=utf-8',
      JSON.stringify({ error: 'console gateway unavailable' }),
    );
  }
});

server.listen({ host: '0.0.0.0', port });

async function proxy(request, response, requestUrl) {
  try {
    const body = await readBody(request, 1_048_576);
    const upstreamUrl = new URL(apiBaseUrl);
    upstreamUrl.pathname = requestUrl.pathname.slice('/api'.length);
    upstreamUrl.search = requestUrl.search;
    const upstream = await fetch(upstreamUrl, {
      method: request.method,
      headers: forwardHeaders(request.headers),
      ...(body.byteLength ? { body } : {}),
    });
    response.writeHead(upstream.status, {
      ...securityHeaders,
      'cache-control': 'no-store',
      ...(upstream.headers.get('content-type')
        ? { 'content-type': upstream.headers.get('content-type') }
        : {}),
    });
    response.end(Buffer.from(await upstream.arrayBuffer()));
  } catch (error) {
    if (error instanceof Error && error.message === 'Request body is too large') {
      return send(response, 413, 'text/plain; charset=utf-8', 'Request body is too large.');
    }
    return send(response, 502, 'text/plain; charset=utf-8', 'The Aegis API is unavailable.');
  }
}

async function serveAsset(response, pathname) {
  const candidate = resolve(assetRoot, `.${pathname === '/' ? '/index.html' : pathname}`);
  const filePath = candidate.startsWith(`${assetRoot}${sep}`)
    ? candidate
    : resolve(assetRoot, 'index.html');
  const stat = await fs.stat(filePath).catch(() => undefined);
  if (!stat?.isFile()) return send(response, 404, 'text/plain; charset=utf-8', 'Not found');
  response.writeHead(200, {
    ...securityHeaders,
    'cache-control': filePath.endsWith('index.html')
      ? 'no-store'
      : 'public, max-age=31536000, immutable',
    'content-type': contentTypes[extname(filePath)] ?? 'application/octet-stream',
  });
  createReadStream(filePath).pipe(response);
}

function forwardHeaders(headers) {
  return Object.fromEntries(
    Object.entries(headers).filter(
      ([name, value]) =>
        value !== undefined && !['connection', 'host', 'origin'].includes(name.toLowerCase()),
    ),
  );
}

function readBody(request, limit) {
  return new Promise((resolveBody, reject) => {
    const chunks = [];
    let size = 0;
    let tooLarge = false;
    request.on('data', (chunk) => {
      size += chunk.length;
      if (size > limit) {
        tooLarge = true;
        return;
      }
      if (!tooLarge) chunks.push(chunk);
    });
    request.on('end', () => {
      if (tooLarge) return reject(new Error('Request body is too large'));
      return resolveBody(Buffer.concat(chunks));
    });
    request.on('error', reject);
  });
}

function send(response, status, contentType, body) {
  response.writeHead(status, {
    ...securityHeaders,
    'content-type': contentType,
    'cache-control': 'no-store',
  });
  response.end(body);
}
