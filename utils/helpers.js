const formatPrice = (price) => {
  return '$' + Number(price).toFixed(2);
};

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
};

const formatDateTime = (date) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

const paginate = (page, limit, total) => {
  const totalPages = Math.ceil(total / limit);
  return {
    page: Math.max(1, Math.min(page, totalPages)),
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
};

const truncate = (str, len = 100) => {
  if (!str) return '';
  return str.length > len ? str.substring(0, len) + '...' : str;
};

module.exports = { formatPrice, formatDate, formatDateTime, paginate, truncate };
