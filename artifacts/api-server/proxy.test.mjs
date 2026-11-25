import assert from "node:assert/strict";
import http from "node:http";
import { spawn } from "node:child_process";
import { once } from "node:events";
import test from "node:test";

async function listen(server) {
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  return server.address().port;
}

test("workspace API bridge preserves paths, bodies, auth cookies, and streams", async (t) => {
  let received;
  const upstream = http.createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    received = {
      method: req.method, url: req.url, cookie: req.headers.cookie,
      origin: req.headers.origin, host: req.headers.host,
      body: Buffer.concat(chunks).toString(),
    };
    res.writeHead(201, {
      "content-type": "text/event-stream",
      "set-cookie": ["first=1; HttpOnly", "second=2; Secure"],
    });
    res.write("data: first\n\n");
    res.end("data: second\n\n");
  });
  const upstreamPort = await listen(upstream);
  const reservation = http.createServer();
  const port = await listen(reservation);
  await new Promise((resolve) => reservation.close(resolve));
  const child = spawn(process.execPath, ["proxy.mjs"], {
    cwd: import.meta.dirname,
    env: { ...process.env, PORT: String(port), LEGACY_WEB_PORT: String(upstreamPort) },
    stdio: ["ignore", "ignore", "pipe"],
  });
  t.after(async () => {
    child.kill("SIGTERM");
    if (child.exitCode === null) await once(child, "exit");
    upstream.closeAllConnections();
    await new Promise((resolve) => upstream.close(resolve));
  });
  const origin = `http://127.0.0.1:${port}`;
  let ready = false;
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(`${origin}/api/healthz`)).ok) { ready = true; break; }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  assert.ok(ready, "proxy must start");
  const response = await fetch(`${origin}/api/v1/example?q=preserved`, {
    method: "POST",
    headers: { cookie: "session=test-fixture", origin: "https://example.test" },
    body: "request body",
  });
  assert.equal(response.status, 201);
  assert.deepEqual(response.headers.getSetCookie(), ["first=1; HttpOnly", "second=2; Secure"]);
  assert.equal(await response.text(), "data: first\n\ndata: second\n\n");
  assert.deepEqual(received, {
    method: "POST", url: "/api/v1/example?q=preserved",
    cookie: "session=test-fixture", origin: "https://example.test",
    host: `127.0.0.1:${port}`, body: "request body",
  });

  upstream.closeAllConnections();
  await new Promise((resolve) => upstream.close(resolve));
  const unavailable = await fetch(`${origin}/api/v1/example`);
  assert.equal(unavailable.status, 503);
  assert.deepEqual(await unavailable.json(), {
    error: "Legacy services are starting or unavailable",
  });
});
