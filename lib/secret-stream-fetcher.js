import { Agent, fetch } from "undici";
import { connect } from "node:net";
import { SecretStreamCompat } from "./secret-stream-compat.js";

export class SecretStreamFetcher {
  #agent = new Agent({
    pipelining: true,
    connect: connectSecretStream,
  });
  fetch = (url, options) => {
    return fetch(url, {
      ...options,
      dispatcher: this.#agent,
    });
  };
}

function connectSecretStream({ hostname, port }, callback) {
  const socket = connect({ host: hostname, port }, () => {
    const secretStream = new SecretStreamCompat(true, socket);
    callback(null, secretStream);
  });
}
