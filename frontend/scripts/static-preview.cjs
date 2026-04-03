const http = require('http');
const fs = require('fs');
const path = require('path');

const host = '127.0.0.1';
const port = Number(process.env.PORT || 4173);
const root = path.resolve(__dirname, '..', 'dist');

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
};

function sendFile(filePath, response) {
  fs.readFile(filePath, (error, data) => {
    if (error) {
      response.statusCode = 500;
      response.end('Internal Server Error');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    response.statusCode = 200;
    response.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
    response.end(data);
  });
}

const server = http.createServer((request, response) => {
  const requestUrl = new URL(request.url, `http://${request.headers.host}`);
  const pathname = decodeURIComponent(requestUrl.pathname);
  const relativePath = pathname.replace(/^\/+/, '');
  let filePath = path.join(root, relativePath);

  if (!filePath.startsWith(root)) {
    response.statusCode = 403;
    response.end('Forbidden');
    return;
  }

  if (!path.extname(filePath)) {
    filePath = path.join(root, 'index.html');
  }

  fs.stat(filePath, (error, stats) => {
    if (!error && stats.isFile()) {
      sendFile(filePath, response);
      return;
    }

    sendFile(path.join(root, 'index.html'), response);
  });
});

server.listen(port, host, () => {
  process.stdout.write(`static-preview listening on http://${host}:${port}\n`);
});
