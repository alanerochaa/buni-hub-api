export class ApiError extends Error {
  readonly statusCode: number

  constructor(statusCode: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.statusCode = statusCode
  }

  static notFound(message: string): ApiError {
    return new ApiError(404, message)
  }
}
