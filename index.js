import { createServer as createHttpServer } from "./lib/http-server.js";
import { SecretStreamFetcher } from "./lib/secret-stream-fetcher.js";
import { createServer as createSecretStreamServer } from "./lib/secret-stream-http-server.js";
import { once } from "node:events";

const httpServer = createHttpServer();
const secretStreamServer = createSecretStreamServer(httpServer);
secretStreamServer.listen(3000, "0.0.0.0");
await once(secretStreamServer, "listening");
const baseUrl = new URL("http://localhost:3000");

const fetcher = new SecretStreamFetcher();

console.log(await fetchJson(fetcher.fetch, baseUrl));
console.log(await fetchJson(fetcher.fetch, new URL("/hello", baseUrl)));

secretStreamServer.close();

async function fetchJson(fetch, url) {
  const response = await fetch(url);
  return response.json();
}
