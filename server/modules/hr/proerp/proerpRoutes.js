const express = require("express");
const controller = require("./proerpController");

const router = express.Router();

router.get("/overview", controller.overview);
router.get("/employees", controller.employees);
router.post("/employees", controller.createEmployee);
router.get("/employees/:id", controller.employee);
router.get("/departments", controller.departments);
router.get("/documents", controller.documents);
router.get("/assets", controller.assets);

module.exports = router;
