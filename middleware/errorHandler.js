/**
 * Centralized error handling middleware.
 * Must be registered last in app.js (after all routes).
 */
const errorHandler = (err, req, res, next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || 'Internal server error';

    // Don't leak stack traces in production
    const body = {
        error: message,
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
    };

    res.status(status).json(body);
};

module.exports = errorHandler;
