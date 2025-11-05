import { Router } from "express";
import { repositories } from "../repositories/index.js";
import { logger } from "../lib/logger.js";

const router = Router();

// Employee schedule assignment
router.post("/employee-schedule", async (req, res): Promise<void> => {
  try {
    const { employee_id, schedule_id, valid_from, valid_to } = req.body;
    if (!employee_id || !schedule_id || !valid_from) {
      res.status(400).json({ error: "employee_id, schedule_id, and valid_from are required" });
      return;
    }
    await repositories.schedule.assignToEmployee(
      employee_id, 
      schedule_id, 
      new Date(valid_from),
      valid_to ? new Date(valid_to) : undefined,
    );
    res.json({ success: true });
  } catch (error) {
    logger.error("Error assigning schedule to employee", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;




