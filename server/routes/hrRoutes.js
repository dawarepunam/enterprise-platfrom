const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const controller = require("../controllers/hrController");

const router = express.Router();

function wrap(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

router.use(authMiddleware);
router.use(roleMiddleware("ADMIN", "HR", "MANAGER"));

router.get("/dashboard", wrap(controller.dashboard));
router.get("/attendance", wrap(controller.attendance));
router.post("/attendance-entry", wrap(controller.createAttendanceEntry));
router.get("/leaves", wrap(controller.leaves));
router.post("/leave-entry", wrap(controller.createLeaveEntry));
router.get("/payroll", wrap(controller.payroll));
router.get("/reports", wrap(controller.reports));
router.get("/interviews", wrap(controller.interviews));
router.get("/recruitment", wrap(controller.recruitment));
router.post("/recruitment/jobs", wrap(controller.createRecruitmentJob));
router.put("/recruitment/jobs/:id", wrap(controller.updateRecruitmentJob));
router.patch("/recruitment/jobs/:id/close", wrap(controller.closeRecruitmentJob));
router.post("/recruitment/candidates", wrap(controller.createCandidate));
router.get("/recruitment/candidates/:id", wrap(controller.candidateProfile));
router.patch("/recruitment/candidates/:id/stage", wrap(controller.updateCandidateStage));
router.post("/recruitment/candidates/:id/email", wrap(controller.candidateEmail));
router.post("/recruitment/candidates/:id/interview", wrap(controller.scheduleCandidateInterview));
router.patch("/recruitment/candidates/:id/reject", wrap(controller.rejectCandidateProfile));
router.post("/recruitment/candidates/:id/hire", wrap(controller.hireCandidateProfile));
router.post("/recruitment/candidates/:id/offer", wrap(controller.sendRecruitmentOffer));
router.patch("/recruitment/offers/:id/accept", wrap(controller.acceptRecruitmentOffer));
router.get("/settings", wrap(controller.getSettings));
router.patch("/settings", wrap(controller.updateSettings));
router.post("/offer-letter", wrap(controller.sendOfferLetter));
router.post("/reminder", wrap(controller.sendReminder));
router.post("/meeting", wrap(controller.scheduleMeeting));
router.post("/interviews/:id/calendar", wrap(controller.interviewCalendar));
router.get("/interviews/:id/join", wrap(controller.interviewJoin));
router.patch("/interviews/:id", wrap(controller.interviewStatus));

module.exports = router;
