import { Agent, fetch as undiciFetch } from "undici";
import { connect } from "node:net";
import SecretStream from "@hyperswarm/secret-stream";
import { SecretStreamSocket } from "./secret-stream-socket.js";

/**
 * Global agent - requests generally use global agents
 */
const agent = new Agent({
  // Limit number of connections - will be shared across all requests
  connections: 10,
  connect({ hostname, port }, callback) {
    const socket = connect({ host: hostname, port: port ? +port : 80 }, () => {
      const secretStream = new SecretStream(true, socket);
      const secretSocket = new SecretStreamSocket(secretStream);
      // @ts-expect-error - not a socket, but close enough
      callback(null, secretSocket);
    });
  },
});

/** @type {typeof undiciFetch} */
export function secretStreamFetch(url, options) {
  return undiciFetch(url, {
    ...options,
    dispatcher: agent,
  });
}
