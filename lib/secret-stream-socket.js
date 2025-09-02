import SecretStream from "@hyperswarm/secret-stream";
import { Duplex } from "stream";
import { Readable as StreamxReadable } from "streamx";

/** @import {Socket} from 'node:net' */

const EXPOSED_SECRET_STREAM_PROPS = /** @type {const} */ ([
  "publicKey",
  "remotePublicKey",
  "handshakeHash",
]);

/**
 * A compatibility layer for SecretStream to work like a standard Node Socket.
 * Requires SecretStream running over a socket, because it delegates to the underlying socket.
 */
export class SecretStreamSocket extends Duplex {
  #secretStream;
  #isReading = false;
  /** @param {Error} err */
  #onError = (err) => this.destroy(err);
  #onClose = () => this.destroy();
  #onEnd = () => this.push(null);
  /** @param {any} data */
  #onData = (data) => {
    if (!this.push(data)) {
      this.#secretStream.pause();
    }
  };

  /**
   * @param {SecretStream<Socket>} secretStream
   * @param {import('stream').DuplexOptions} [opts]
   */
  constructor(secretStream, opts) {
    super(opts);
    this.#secretStream = secretStream;

    for (const prop of EXPOSED_SECRET_STREAM_PROPS) {
      Object.defineProperty(this, prop, {
        get: () => this.#secretStream[prop],
      });
    }

    this.#secretStream.on("error", this.#onError);
    this.#secretStream.on("close", this.#onClose);
    this.#secretStream.on("end", this.#onEnd);
  }

  // SecretStream implements this too, but as our rawStream is a socket we can delegate to that.
  get bytesRead() {
    return this.#secretStream.rawStream.bytesRead;
  }

  // SecretStream implements this too, but as our rawStream is a socket we can delegate to that.
  get bytesWritten() {
    return this.#secretStream.rawStream.bytesWritten;
  }

  get connecting() {
    return this.#secretStream.rawStream && !this.#secretStream.handshakeHash;
  }

  get pending() {
    return !this.#secretStream.rawStream;
  }

  get readyState() {
    if (this.connecting) return "opening";
    return "open";
  }

  /**
   * @override
   */
  _read() {
    if (!this.#isReading) {
      this.#isReading = true;
      this.#secretStream.on("data", this.#onData);
    }
    if (
      StreamxReadable.isPaused(
        // @ts-expect-error - the types are incorrect either for secret-stream or streamx
        this.#secretStream
      )
    ) {
      this.#secretStream.resume();
    }
  }

  /**
   * @override
   * @param {Buffer|string} chunk
   * @param {string} encoding
   * @param {() => void} callback
   */
  _write(chunk, encoding, callback) {
    const canWrite = this.#secretStream.write(chunk);
    if (canWrite) {
      process.nextTick(callback);
    } else {
      this.#secretStream.once("drain", callback);
    }
  }

  /**
   * @override
   * @param {() => void} callback
   */
  _final(callback) {
    this.#secretStream.off("data", this.#onData);
    this.#secretStream.end();
    this.#secretStream.once("finish", callback);
  }

  /**
   * @override
   * @param {Error} err
   * @param {() => void} callback
   */
  _destroy(err, callback) {
    this.#secretStream.destroy(err);
    process.nextTick(callback, err);
  }

  /** @type {Socket['destroySoon']} */
  destroySoon() {
    this.#secretStream.rawStream.destroySoon();
  }

  /** @type {Socket['setTimeout']} */
  setTimeout(timeout, callback) {
    this.#secretStream.rawStream.setTimeout(timeout, callback);
    return /** @type {Socket} */ (/** @type {unknown} */ (this));
  }

  /** @type {Socket['resetAndDestroy']} */
  resetAndDestroy() {
    this.#secretStream.rawStream.resetAndDestroy();
    return /** @type {Socket} */ (/** @type {unknown} */ (this));
  }

  /** @type {Socket['setNoDelay']} */
  setNoDelay(noDelay) {
    this.#secretStream.rawStream.setNoDelay(noDelay);
    return /** @type {Socket} */ (/** @type {unknown} */ (this));
  }

  /** @type {Socket['setKeepAlive']} */
  setKeepAlive(enable, initialDelay) {
    this.#secretStream.rawStream.setKeepAlive(enable, initialDelay);
    return /** @type {Socket} */ (/** @type {unknown} */ (this));
  }

  /** @type {Socket['ref']} */
  ref() {
    this.#secretStream.rawStream.ref();
    return /** @type {Socket} */ (/** @type {unknown} */ (this));
  }

  /** @type {Socket['unref']} */
  unref() {
    this.#secretStream.rawStream.unref();
    return /** @type {Socket} */ (/** @type {unknown} */ (this));
  }
}
