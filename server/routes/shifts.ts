import { Router } from "express";
import { repositories } from "../repositories/index.js";
import { logger } from "../lib/logger.js";
import { NotFoundError, asyncHandler } from "../lib/errorHandler.js";
import { validateBody, validateParams } from "../middleware/validate.js";
import { 
  createShiftSchema, 
  updateShiftSchema, 
  createWorkIntervalSchema,
  updateWorkIntervalSchema,
  createBreakIntervalSchema,
  updateBreakIntervalSchema,
  createDailyReportSchema,
  shiftIdParamSchema,
  uuidParamSchema
} from "../lib/schemas/index.js";
import { invalidateCompanyStatsByShift } from "../lib/utils/index.js";
import { shiftsCounter } from "../lib/metrics.js";

const router = Router();

// ===== SHIFTS API =====
router.post("/", validateBody(createShiftSchema), asyncHandler(async (req, res) => {
  const shift = await repositories.shift.create(req.body as any);
  
  // Track shift creation in Prometheus metrics
  shiftsCounter.labels(shift.status || 'scheduled', shift.employee_id || 'unknown').inc();
  
  await invalidateCompanyStatsByShift(shift);
  res.json(shift);
}));

router.get("/:id", validateParams(shiftIdParamSchema), asyncHandler(async (req, res) => {
  const shift = await repositories.shift.findById(req.params.id);
  if (!shift) {
    throw new NotFoundError("Shift");
  }
  res.json(shift);
}));

router.put("/:id", validateParams(shiftIdParamSchema), validateBody(updateShiftSchema), asyncHandler(async (req, res) => {
  const shift = await repositories.shift.update(req.params.id, req.body as any);
  if (!shift) {
    throw new NotFoundError("Shift");
  }
  
  // Track shift status update in Prometheus metrics
  if (req.body.status) {
    shiftsCounter.labels(req.body.status, shift.employee_id || 'unknown').inc();
  }
  
  res.json(shift);
}));

router.post("/:id/start", validateParams(shiftIdParamSchema), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const shift = await repositories.shift.update(id, { status: "active" } as any);
  if (!shift) {
    throw new NotFoundError("Shift");
  }
  
  await repositories.shift.createWorkInterval({
      shift_id: id,
      start_at: new Date(),
      source: "bot"
    } as any);
  
  await invalidateCompanyStatsByShift(shift);
  
  res.json({ message: "Shift started successfully", shift });
}));

router.post("/:id/end", validateParams(shiftIdParamSchema), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const shift = await repositories.shift.update(id, { status: "completed" } as any);
  if (!shift) {
    throw new NotFoundError("Shift");
  }
  
  const intervals = await repositories.shift.findWorkIntervalsByShiftId(id);
  const activeInterval = intervals.find(i => !i.end_at);
  if (activeInterval) {
    await repositories.shift.updateWorkInterval(activeInterval.id, { end_at: new Date() } as any);
  }
  
  await invalidateCompanyStatsByShift(shift);
  
  res.json({ message: "Shift ended successfully", shift });
}));

router.post("/:id/break/start", async (req, res) => {
  try {
    const { id } = req.params;
    const { type = "lunch" } = req.body;
    
    const intervals = await repositories.shift.findWorkIntervalsByShiftId(id);
    const activeInterval = intervals.find(i => !i.end_at);
    if (activeInterval) {
      await repositories.shift.updateWorkInterval(activeInterval.id, { end_at: new Date() } as any);
    }
    
      const breakInterval = await repositories.shift.createBreakInterval({
        shift_id: id,
        start_at: new Date(),
        type,
        source: "bot"
      } as any);
    
    res.json({ message: "Break started successfully", breakInterval });
  } catch (error) {
    logger.error("Error starting break", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/:id/break/end", async (req, res) => {
  try {
    const { id } = req.params;
    
    const breaks = await repositories.shift.findBreakIntervalsByShiftId(id);
    const activeBreak = breaks.find(b => !b.end_at);
    if (!activeBreak) {
      return res.status(400).json({ error: "No active break found" });
    }
    
    await repositories.shift.updateBreakInterval(activeBreak.id, { end_at: new Date() } as any);
    
      const workInterval = await repositories.shift.createWorkInterval({
        shift_id: id,
        start_at: new Date(),
        source: "bot"
      } as any);
    
    res.json({ message: "Break ended successfully", workInterval });
  } catch (error) {
    logger.error("Error ending break", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ===== WORK INTERVALS API =====
router.post("/work-intervals", validateBody(createWorkIntervalSchema), asyncHandler(async (req, res) => {
  const interval = await repositories.shift.createWorkInterval(req.body as any);
  res.json(interval);
}));

router.get("/:shiftId/work-intervals", async (req, res) => {
  try {
    const { shiftId } = req.params;
    const intervals = await repositories.shift.findWorkIntervalsByShiftId(shiftId);
    res.json(intervals);
  } catch (error) {
    logger.error("Error fetching work intervals", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/work-intervals/:id", validateParams(uuidParamSchema), validateBody(updateWorkIntervalSchema), asyncHandler(async (req, res) => {
  const interval = await repositories.shift.updateWorkInterval(req.params.id, req.body as any);
  if (!interval) {
    throw new NotFoundError("Work interval");
  }
  res.json(interval);
}));

// ===== BREAK INTERVALS API =====
router.post("/break-intervals", validateBody(createBreakIntervalSchema), asyncHandler(async (req, res) => {
  const interval = await repositories.shift.createBreakInterval(req.body as any);
  res.json(interval);
}));

router.get("/:shiftId/break-intervals", async (req, res) => {
  try {
    const { shiftId } = req.params;
    const intervals = await repositories.shift.findBreakIntervalsByShiftId(shiftId);
    res.json(intervals);
  } catch (error) {
    logger.error("Error fetching break intervals", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

