import SecretStream from "@hyperswarm/secret-stream";
/**
 * A compatibility layer for SecretStream to work like a standard Node.js
 * stream, in particular the callback on the write method, which is expected by
 * the node http server.
 */
export class SecretStreamCompat extends SecretStream {
  get writableHighWaterMark() {
    return (
      this.rawStream.writableHighWaterMark || this._writableState.highWaterMark
    );
  }
  get readableHighWaterMark() {
    return (
      this.rawStream.readableHighWaterMark || this._readableState.highWaterMark
    );
  }
  get writable() {
    return !super.destroyed;
  }
  write(chunk, enc, cb) {
    const canWrite = super.write.call(this, chunk);
    if (typeof cb !== "function") return canWrite;
    if (canWrite) {
      process.nextTick(cb);
    } else {
      super.once("drain", () => cb());
    }
    return canWrite;
  }
}
