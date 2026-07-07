const models = require("./modelRegistry");
const createResourceModel = require("./createResourceModel");
const { ensureTeamRoom } = require("./teamAccess");

function normalizeData(modelKey, document) {
  if (!document) return null;
  const plain = typeof document.toJSON === "function" ? document.toJSON() : document;

  if (modelKey === "users") {
    delete plain.password;
  }

  return plain;
}

function buildListQuery(req, Model) {
  const reservedParams = new Set(["limit", "page", "skip", "sort", "populate", "search", "q"]);
  const query = {};

  Object.entries(req.query || {}).forEach(([key, value]) => {
    if (reservedParams.has(key) || value === undefined || value === null || value === "") return;

    const values = Array.isArray(value)
      ? value
      : String(value)
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean);

    query[key] = values.length > 1 ? { $in: values } : values[0];
  });

  const searchTerm = String(req.query.search || req.query.q || "").trim();
  if (searchTerm) {
    const searchableFields = ["name", "email", "employeeId", "role", "department", "title", "designation", "status"]
      .filter((field) => Model.schema?.path(field));

    if (searchableFields.length) {
      query.$or = searchableFields.map((field) => ({
        [field]: { $regex: searchTerm, $options: "i" },
      }));
    }
  }

  return query;
}

function parsePositiveInt(value, fallback, max) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
}

function createCrudController(modelKey) {
  const Model = models[modelKey] || createResourceModel(String(modelKey || "Resource"));

  return {
    list: async (req, res) => {
      const query = buildListQuery(req, Model);
      const limit = parsePositiveInt(req.query.limit, 0, 1000);
      const page = parsePositiveInt(req.query.page, 1, 100000);
      const skip = req.query.skip !== undefined
        ? parsePositiveInt(req.query.skip, 0, 1000000)
        : limit
          ? (page - 1) * limit
          : 0;
      const sort = req.query.sort || "-createdAt";

      let request = Model.find(query).sort(sort);
      if (skip) request = request.skip(skip);
      if (limit) request = request.limit(limit);

      const documents = await request;
      res.json({ success: true, data: documents.map((item) => normalizeData(modelKey, item)) });
    },

    getById: async (req, res) => {
      const document = await Model.findById(req.params.id);
      if (!document) {
        return res.status(404).json({ success: false, message: `${modelKey} record not found` });
      }

      res.json({ success: true, data: normalizeData(modelKey, document) });
    },

    create: async (req, res) => {
      const payload = { ...req.body };
      const document = await Model.create(payload);
      if (modelKey === "teams") {
        await ensureTeamRoom(document, req.user);
      }
      res.status(201).json({ success: true, message: `${modelKey} created`, data: normalizeData(modelKey, document) });
    },

    update: async (req, res) => {
      const payload = { ...req.body };

      // Avoid accidental empty password overwrite on user edits.
      if (modelKey === "users" && !payload.password) {
        delete payload.password;
      }

      const document = await Model.findById(req.params.id).select(modelKey === "users" ? "+password" : "");
      if (!document) {
        return res.status(404).json({ success: false, message: `${modelKey} record not found` });
      }

      Object.assign(document, payload);
      await document.save();
      if (modelKey === "teams") {
        await ensureTeamRoom(document, req.user);
      }
      res.json({ success: true, message: `${modelKey} updated`, data: normalizeData(modelKey, document) });
    },

    remove: async (req, res) => {
      const document = await Model.findByIdAndDelete(req.params.id);
      if (!document) {
        return res.status(404).json({ success: false, message: `${modelKey} record not found` });
      }

      res.json({ success: true, message: `${modelKey} deleted`, id: req.params.id });
    },
  };
}

module.exports = createCrudController;
