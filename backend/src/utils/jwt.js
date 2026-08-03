const jwt = require("jsonwebtoken");

const generateToken1 = (user) => {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      email: user.email,
      is_owner: user.is_owner,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN,
    },
  );
};

module.exports = {
  generateToken1,
};
