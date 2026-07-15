export class ApiError extends Error {
  readonly statusCode: number
  readonly code: string

  constructor(statusCode: number, code: string, message: string) {
    super(message)
    this.name = 'ApiError'
    this.statusCode = statusCode
    this.code = code
  }

  static notFound(message: string, code = 'RESOURCE_NOT_FOUND'): ApiError {
    return new ApiError(404, code, message)
  }

  static badRequest(message: string, code = 'VALIDATION_ERROR'): ApiError {
    return new ApiError(400, code, message)
  }

  static conflict(message: string, code = 'RESOURCE_CONFLICT'): ApiError {
    return new ApiError(409, code, message)
  }

  static unprocessable(message: string, code = 'BUSINESS_RULE_ERROR'): ApiError {
    return new ApiError(422, code, message)
  }
}
