export class MandatoryParamError extends Error {
  constructor(message) {
    super(message);
    this.name = 'MandatoryParamError';
    this.stack = new Error().stack;

    Object.setPrototypeOf(this, MandatoryParamError.prototype);
  }
}
