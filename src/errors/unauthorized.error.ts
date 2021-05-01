export class UnauthorizedError extends Error {
  constructor(message) {
    super(message);
    this.name = 'UnauthorizedError';
    this.stack = new Error().stack;

    Object.setPrototypeOf(this, UnauthorizedError.prototype);
  }
}
