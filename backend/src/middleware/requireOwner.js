module.exports = (req, res, next) => {
  if (!req.user?.is_owner) {
    return res.status(403).json({
      success: false,

      message: "Owner access required.",
    });
  }

  next();
};
