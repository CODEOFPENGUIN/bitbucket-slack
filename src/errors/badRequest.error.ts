export class BadRequestError extends Error {
  constructor(message) {
    super(message);
    this.name = 'BadRequestError';
    this.stack = new Error().stack;

    Object.setPrototypeOf(this, BadRequestError.prototype);
  }
}
