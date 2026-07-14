const express = require("express");
const router = express.Router();
const { login } = require("../controllers/auth.controller");
const { register } = require("../controllers/auth.controller");
const { registerValidation } = require("../validators/auth.validator");
const validate = require("../middleware/validation.middleware");
const authenticate = require("../middleware/auth.middleware");

const { me } = require("../controllers/auth.controller");

router.post("/register", registerValidation, validate, register);
router.post("/login", login);
router.get("/me", authenticate, me);

module.exports = router;
