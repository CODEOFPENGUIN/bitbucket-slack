export class ProxyError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ProxyError';
    this.stack = new Error().stack;

    Object.setPrototypeOf(this, ProxyError.prototype);
  }
}
