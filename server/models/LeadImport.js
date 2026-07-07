const mongoose = require("mongoose");

const leadImportSchema = new mongoose.Schema(
  {
    fileName: { type: String, trim: true, default: "" },
    fileType: { type: String, trim: true, default: "" },
    source: { type: String, trim: true, default: "Import" },
    status: { type: String, trim: true, default: "Completed" },
    importedById: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    importedBy: { type: String, trim: true, default: "" },
    totalRows: { type: Number, default: 0 },
    validRows: { type: Number, default: 0 },
    duplicateRows: { type: Number, default: 0 },
    errorRows: { type: Number, default: 0 },
    importedLeadIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "MarketingLead" }],
    mapping: { type: mongoose.Schema.Types.Mixed, default: {} },
    importErrors: [{ type: String, trim: true }],
  },
  { timestamps: true, collection: "leadImports" },
);

module.exports = mongoose.models.LeadImport || mongoose.model("LeadImport", leadImportSchema);
