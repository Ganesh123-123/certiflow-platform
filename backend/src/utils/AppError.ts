/**
 * Application-level error with an HTTP status code.
 * Throw this from services/controllers for expected business errors.
 * The global errorHandler will return the status code + message to the client.
 */
export class AppError extends Error {
  constructor(
    public readonly message: string,
    public readonly statusCode: number = 400
  ) {
    super(message);
    this.name = 'AppError';
    Object.setPrototypeOf(this, AppError.prototype);
  }
}
