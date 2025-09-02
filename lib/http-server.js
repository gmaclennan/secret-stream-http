import { createServerAdapter } from "@whatwg-node/server";
import { AutoRouter } from "itty-router";
import { createServer as createHttpServer } from "node:http";

const router = AutoRouter();

router.get("/", () => ({ message: "Index page" }));
router.get("/hello", () => ({ message: "Hello, from itty-router" }));

export function createServer() {
  return createHttpServer(createServerAdapter(router.fetch));
}
