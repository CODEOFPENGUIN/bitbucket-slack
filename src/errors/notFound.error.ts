export class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NotFoundError';
    this.stack = new Error().stack;

    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}
