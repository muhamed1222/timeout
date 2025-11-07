import { Router } from "express";
import { repositories } from "../repositories/index.js";
import { asyncHandler } from "../lib/errorHandler.js";
import { validateParams } from "../middleware/validate.js";
import { companyIdInParamsSchema } from "../lib/schemas/index.js";
import { getOrSet } from "../lib/utils/cache.js";
import { useMockApiData, getMockActiveShifts } from "../lib/mock/index.js";
import { logger } from "../lib/logger.js";

const router = Router();

// Get employee invites by company
router.get("/:companyId/employee-invites", validateParams(companyIdInParamsSchema), asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  const invites = await repositories.invite.findByCompanyId(companyId);
  res.json(invites);
}));

// Get schedule templates by company
router.get("/:companyId/schedule-templates", validateParams(companyIdInParamsSchema), asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  const templates = await repositories.schedule.findByCompanyId(companyId);
  res.json(templates);
}));

// Get active shifts by company (with caching)
router.get("/:companyId/shifts/active", validateParams(companyIdInParamsSchema), asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  
  try {
    const shifts = await getOrSet(
      `company:${companyId}:active-shifts`,
      async () => await repositories.shift.findActiveByCompanyId(companyId),
      60 // Cache for 1 minute (active shifts change frequently)
    );
    
    res.json(shifts);
  } catch (error) {
    if (useMockApiData && !res.headersSent) {
      logger.error("Active shifts query failed, returning mock data", error instanceof Error ? { error: error.message } : undefined);
      res.json(getMockActiveShifts(companyId));
      return;
    }
    throw error;
  }
}));

export default router;
