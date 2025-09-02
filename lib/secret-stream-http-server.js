import { createServer as createTcpServer } from "node:net";
import { SecretStreamCompat } from "./secret-stream-compat.js";

export function createServer(httpServer) {
  const server = createTcpServer();
  server.on("connection", (socket) => {
    const secretStream = new SecretStreamCompat(false, socket);
    httpServer.emit("connection", secretStream);
  });
  return server;
}
