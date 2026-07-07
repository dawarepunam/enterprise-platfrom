const service = require("./proerpService");

function wrap(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

module.exports = {
  overview: wrap(async (req, res) => {
    res.json({ success: true, data: await service.getOverview() });
  }),
  employees: wrap(async (req, res) => {
    res.json({ success: true, data: await service.listEmployees(req.query) });
  }),
  employee: wrap(async (req, res) => {
    const data = await service.getEmployeeProfile(req.params.id);
    if (!data) return res.status(404).json({ success: false, message: "Employee not found" });
    res.json({ success: true, data });
  }),
  createEmployee: wrap(async (req, res) => {
    const data = await service.createEmployee(req.body);
    res.status(201).json({ success: true, message: "Employee Created Successfully", data });
  }),
  departments: wrap(async (req, res) => {
    res.json({ success: true, data: await service.getDepartments() });
  }),
  documents: wrap(async (req, res) => {
    res.json({ success: true, data: await service.getDocuments() });
  }),
  assets: wrap(async (req, res) => {
    res.json({ success: true, data: await service.getAssets() });
  }),
};
