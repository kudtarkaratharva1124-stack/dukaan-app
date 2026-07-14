// Wraps an async route handler so thrown errors reach Express's error middleware
// instead of crashing the process.
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
