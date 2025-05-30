const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch((err) => {
      // Log the error for debugging
      console.error('Error caught in catchAsync:', err);
      // Pass the error to the global error handler
      next(err);
    });
  };
}

export default catchAsync;