export function errorHandler(err, req, res, next) {
  console.error('API Error:', err)

  if (err.name === 'ZodError') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request payload',
        details: err.errors,
      },
    })
  }

  const statusCode = err.statusCode || 500
  const message = err.message || 'Internal server error'
  const code = err.code || 'INTERNAL_ERROR'

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
    },
  })
}
