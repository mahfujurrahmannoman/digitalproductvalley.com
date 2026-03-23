const success = (res, data, statusCode = 200, pagination = null) => {
  const response = { success: true, data };
  if (pagination) response.pagination = pagination;
  return res.status(statusCode).json(response);
};

const error = (res, code, message, statusCode = 400) => {
  return res.status(statusCode).json({
    success: false,
    error: { code, message },
  });
};

module.exports = { success, error };
