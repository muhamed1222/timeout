import { Router } from "express";
import { repositories } from "../repositories/index.js";
import { logger } from "../lib/logger.js";

const router = Router();

// Get employees by company (company-specific endpoint)
router.get("/companies/:companyId/employees", async (req, res): Promise<void> => {
  try {
    const { companyId } = req.params;
    const employees = await repositories.employee.findByCompanyId(companyId);
    res.json(employees);
  } catch (error) {
    logger.error("Error fetching employees", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get employee shifts
router.get("/:employeeId/shifts", async (req, res): Promise<void> => {
  try {
    const { employeeId } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    const shifts = await repositories.shift.findByEmployeeId(employeeId, limit);
    res.json(shifts);
  } catch (error) {
    logger.error("Error fetching employee shifts", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get employee schedules
router.get("/:employeeId/schedules", async (req, res): Promise<void> => {
  try {
    const { employeeId } = req.params;
    const schedules = await repositories.schedule.findEmployeeSchedules(employeeId);
    res.json(schedules);
  } catch (error) {
    logger.error("Error fetching employee schedules", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get active employee schedule
router.get("/:employeeId/active-schedule", async (req, res): Promise<void> => {
  try {
    const { employeeId } = req.params;
    const date = req.query.date ? new Date(req.query.date as string) : new Date();
    const schedule = await repositories.schedule.findActiveEmployeeSchedule(employeeId, date);
    res.json(schedule ?? null);
  } catch (error) {
    logger.error("Error fetching active employee schedule", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;




