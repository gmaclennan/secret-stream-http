import { Agent, fetch } from "undici";
import { connect } from "node:net";
import { SecretStreamCompat } from "./secret-stream-compat.js";

/**
 * Global agent, which should be ok - this is what regular fetch does in Node
 */
const agent = new Agent({
  pipelining: true,
  connect({ hostname, port }, callback) {
    const socket = connect({ host: hostname, port }, () => {
      const secretStream = new SecretStreamCompat(true, socket);
      callback(null, secretStream);
    });
  },
});

export function secretStreamFetch(url, options) {
  return fetch(url, {
    ...options,
    dispatcher: agent,
  });
}
