import { Router } from "express";
import { repositories } from "../repositories/index.js";
import { logger } from "../lib/logger.js";

const router = Router();

// Get employee invites by company
router.get("/:companyId/employee-invites", async (req, res) => {
  try {
    const { companyId } = req.params;
    const invites = await repositories.invite.findByCompanyId(companyId);
    res.json(invites);
  } catch (error) {
    logger.error("Error fetching employee invites", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get schedule templates by company
router.get("/:companyId/schedule-templates", async (req, res) => {
  try {
    const { companyId } = req.params;
    const templates = await repositories.schedule.findByCompanyId(companyId);
    res.json(templates);
  } catch (error) {
    logger.error("Error fetching schedule templates", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get active shifts by company
router.get("/:companyId/shifts/active", async (req, res) => {
  try {
    const { companyId } = req.params;
    const shifts = await repositories.shift.findActiveByCompanyId(companyId);
    res.json(shifts);
  } catch (error) {
    logger.error("Error fetching active shifts", error);
    // Soft fallback: return empty list to avoid breaking UI
    res.status(200).json([]);
  }
});

export default router;

