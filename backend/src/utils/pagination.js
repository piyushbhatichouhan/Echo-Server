const getPagination = (page = 1, limit = 20) => {
  page = parseInt(page, 10);
  limit = parseInt(limit, 10);

  if (isNaN(page) || page < 1) {
    page = 1;
  }

  if (isNaN(limit) || limit < 1) {
    limit = 20;
  }

  if (limit > 100) {
    limit = 100;
  }

  return {
    page,
    limit,
    offset: (page - 1) * limit,
  };
};

module.exports = {
  getPagination,
};
