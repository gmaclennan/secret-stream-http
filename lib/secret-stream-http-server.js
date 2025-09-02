import { createServer as createTcpServer } from "node:net";
import SecretStream from "@hyperswarm/secret-stream";
import { SecretStreamSocket } from "./secret-stream-socket.js";

/**
 * @param {import("node:http").Server} httpServer
 */
export function createServer(httpServer) {
  const server = createTcpServer();
  server.on("connection", (socket) => {
    const secretStream = new SecretStream(false, socket);
    const secretSocket = new SecretStreamSocket(secretStream);
    httpServer.emit("connection", secretSocket);
  });
  return server;
}
