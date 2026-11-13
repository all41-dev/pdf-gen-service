export class ServiceError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = new.target.name; // "LatexError", "BadRequestError"… instead of just "Error"
  }
}

/** The request itself is wrong: missing field, invalid image name… */
export class BadRequestError extends ServiceError {
  constructor(message: string) {
    super(message, 400);
  }
}

/** The LaTeX document doesn't compile. */
export class LatexError extends ServiceError {
  constructor(
    message: string,
    public readonly log = '',
  ) {
    super(message, 422);
  }
}

/** No reply from the queue in time. */
export class PdfTimeoutError extends ServiceError {
  constructor() {
    super('PDF generation timed out', 504);
  }
}
