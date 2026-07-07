const Expense = require("../models/Expense");
const { dispatchWorkflow } = require("../services/workflowService");

async function list(req, res) {
    const role = String(req.user?.role || "").toUpperCase();
    const query = role === "MEMBER" ? { $or: [{ userId: req.user._id }, { employee: req.user.name }] } : {};
    const documents = await Expense.find(query).sort({ createdAt: -1 });
    res.json({ success: true, data: documents });
}

async function getById(req, res) {
    const document = await Expense.findById(req.params.id);
    if (!document) {
        return res.status(404).json({ success: false, message: "expense record not found" });
    }

    res.json({ success: true, data: document });
}

async function create(req, res) {
    const payload = {
        ...req.body,
        userId: req.user._id,
        employee: req.user.name,
        role: req.user.role,
        status: req.body.status || "Pending",
    };
    const document = await Expense.create(payload);

    await dispatchWorkflow({
        req,
        module: "expenses",
        event: "EXPENSE_SUBMITTED",
        title: "Expense submitted",
        message: `${req.user.name} submitted an expense claim of ${payload.amount || 0}.`,
        priority: "medium",
        actionUrl: "/employee/leave",
        entityType: "expense",
        entityId: document._id,
        userRefs: [{ role: "TEAM_LEAD" }, { role: "MANAGER" }, { role: "ADMIN" }, { userId: req.user._id }],
        email: {
            subject: `Expense submitted: ${req.user.name}`,
            template: "generic",
            variables: {
                title: "Expense claim submitted",
                employeeName: req.user.name,
                expenseTitle: payload.title || payload.category || "Expense",
                amount: payload.amount || 0,
                purpose: payload.purpose || "",
                receipt: payload.receipt || "Uploaded",
                actionLabel: "Review Expense",
            },
        },
        metadata: {
            memberName: req.user.name,
            amount: payload.amount || 0,
        },
    });

    res.status(201).json({ success: true, message: "expense created", data: document });
}

async function update(req, res) {
    const document = await Expense.findById(req.params.id);
    if (!document) {
        return res.status(404).json({ success: false, message: "expense record not found" });
    }

    Object.assign(document, req.body);
    await document.save();
    res.json({ success: true, message: "expense updated", data: document });
}

async function remove(req, res) {
    const document = await Expense.findByIdAndDelete(req.params.id);
    if (!document) {
        return res.status(404).json({ success: false, message: "expense record not found" });
    }

    res.json({ success: true, message: "expense deleted", id: req.params.id });
}

module.exports = { list, getById, create, update, remove };
