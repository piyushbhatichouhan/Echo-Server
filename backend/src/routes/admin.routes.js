const router = require("express").Router();

const authenticate = require("../middleware/auth.middleware");
const requireAdmin = require("../middleware/requireOwner");

const controller = require("../controllers/admin.controller");

router.use(authenticate);
router.use(requireAdmin);

router.get("/users", controller.getUsers);

router.patch("/users/:id/disable", controller.disableUser);

router.patch("/users/:id/enable", controller.enableUser);

router.delete("/users/:id", controller.deleteUser);
router.post(
  "/users/:id/restore",

  controller.restoreUser,
);

router.patch("/users/:id/storage-limit", controller.updateStorageLimit);

module.exports = router;
