const multer = require("multer");
const path = require("path");
const { v4: uuid } = require("uuid");
const { TEMP_ROOT, MAX_UPLOAD_SIZE } = require("../config/app.config");

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, TEMP_ROOT);
  },

  filename(req, file, cb) {
    const extension = path.extname(file.originalname);

    cb(null, uuid() + extension);
  },
});

const upload = multer({
  storage,

  limits: {
    fileSize: MAX_UPLOAD_SIZE,
  },
});

module.exports = upload;
