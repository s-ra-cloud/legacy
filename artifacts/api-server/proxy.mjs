// Preserve the legacy nginx/Hono routing behind the workspace's API path.
// The website service owns the original process group in both environments.
import http from "node:http";
import net from "node:net";

const port = Number(process.env.PORT);
if (!Number.isInteger(port) || port <= 0) throw new Error("PORT is required");
const upstreamPort = Number(process.env.LEGACY_WEB_PORT || 24282);

const server = http.createServer((req, res) => {
  if (req.url === "/api/healthz") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end('{"status":"ok"}');
    return;
  }
  const upstream = http.request({
    hostname: "127.0.0.1", port: upstreamPort,
    path: req.url, method: req.method, headers: req.headers,
  }, (response) => {
    res.writeHead(response.statusCode, response.headers);
    response.pipe(res);
  });
  upstream.on("error", () => {
    if (!res.headersSent) res.writeHead(503, { "content-type": "application/json" });
    res.end('{"error":"Legacy services are starting or unavailable"}');
  });
  req.on("aborted", () => upstream.destroy());
  res.on("close", () => upstream.destroy());
  req.pipe(upstream);
});

server.on("upgrade", (req, socket, head) => {
  const upstream = net.connect(upstreamPort, "127.0.0.1", () => {
    upstream.write(`${req.method} ${req.url} HTTP/${req.httpVersion}\r\n`);
    for (let i = 0; i < req.rawHeaders.length; i += 2) {
      upstream.write(`${req.rawHeaders[i]}: ${req.rawHeaders[i + 1]}\r\n`);
    }
    upstream.write("\r\n");
    upstream.write(head);
    socket.pipe(upstream).pipe(socket);
  });
  upstream.on("error", () => socket.destroy());
  socket.on("error", () => upstream.destroy());
  socket.on("close", () => upstream.destroy());
});
server.listen(port, "0.0.0.0");
for (const signal of ["SIGTERM", "SIGINT"]) {
  process.on(signal, () => { server.closeAllConnections(); server.close(() => process.exit(0)); });
}
