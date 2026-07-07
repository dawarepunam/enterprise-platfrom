const createCrudController = require("../utils/createCrudController");
const Quotation = require("../models/Quotation");
const { dispatchWorkflow, findUsersByRefs } = require("../services/workflowService");

const base = createCrudController("quotations");

async function hydrateQuotationFields(payload = {}) {
  const [client] = await findUsersByRefs([
    { userId: payload.clientId },
    { email: payload.clientEmail || payload.client },
    { name: payload.client },
    { role: payload.clientId || payload.clientEmail || payload.client ? undefined : "CLIENT" },
  ]);
  const [owner] = await findUsersByRefs([
    { userId: payload.ownerId },
    { email: payload.ownerEmail || payload.owner },
    { name: payload.owner },
  ]);

  return {
    ...payload,
    clientId: client?._id || payload.clientId || null,
    client: client?.name || payload.client || "",
    clientEmail: client?.email || payload.clientEmail || "",
    ownerId: owner?._id || payload.ownerId || null,
    owner: owner?.name || payload.owner || "",
    ownerEmail: owner?.email || payload.ownerEmail || "",
  };
}

async function triggerQuotationWorkflow(req, quotation, title, message) {
  await dispatchWorkflow({
    req,
    module: "quotations",
    event: "QUOTATION_UPDATE",
    title,
    message,
    priority: quotation.status === "Approved" ? "high" : "medium",
    actionUrl: "/modules/client-portal/quotations/quotations.html",
    entityType: "quotation",
    entityId: quotation._id,
    userRefs: [
      { userId: quotation.clientId },
      { email: quotation.clientEmail },
      { name: quotation.client },
      { userId: quotation.ownerId },
      { email: quotation.ownerEmail },
      { name: quotation.owner },
      { role: "ADMIN" },
    ],
    email: {
      subject: `${title}: ${quotation.title}`,
      template: quotation.status === "Approved" ? "quotationApproved" : "generic",
      variables: {
        title,
        quotationTitle: quotation.title,
        projectName: quotation.projectName || "Client Delivery",
        amount: quotation.amount,
        dueDate: quotation.dueDate ? new Date(quotation.dueDate).toLocaleString() : "Not set",
        currentStatus: quotation.status,
        actionLabel: "Open Quotation",
      },
    },
    metadata: {
      quotationTitle: quotation.title,
      quotationStatus: quotation.status,
      projectName: quotation.projectName,
    },
  });
}

async function list(req, res) {
  return base.list(req, res);
}

async function getById(req, res) {
  return base.getById(req, res);
}

async function create(req, res) {
  const payload = await hydrateQuotationFields(req.body);
  const quotation = await Quotation.create(payload);

  await triggerQuotationWorkflow(
    req,
    quotation,
    "Quotation created",
    `${quotation.title} has been prepared and is ready for review.`,
  );

  res.status(201).json({ success: true, message: "quotations created", data: quotation });
}

async function update(req, res) {
  const quotation = await Quotation.findById(req.params.id);
  if (!quotation) {
    return res.status(404).json({ success: false, message: "quotations record not found" });
  }

  const previousStatus = quotation.status;
  const payload = await hydrateQuotationFields(req.body);
  Object.assign(quotation, payload);
  await quotation.save();

  if (quotation.status !== previousStatus) {
    await triggerQuotationWorkflow(
      req,
      quotation,
      quotation.status === "Approved" ? "Quotation approved" : "Quotation updated",
      quotation.status === "Approved"
        ? `${quotation.title} has been approved and shared with the client.`
        : `${quotation.title} status is now ${quotation.status}.`,
    );
  }

  res.json({ success: true, message: "quotations updated", data: quotation });
}

async function remove(req, res) {
  return base.remove(req, res);
}

module.exports = {
  list,
  getById,
  create,
  update,
  remove,
};
