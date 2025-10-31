import { Router } from "express";
import { z } from "zod";
import { storage } from "../storage.js";
import { insertScheduleTemplateSchema } from "../../shared/schema.js";
import { logger } from "../lib/logger.js";

const router = Router();

// Create schedule template
router.post("/", async (req, res) => {
  try {
    const validatedData = insertScheduleTemplateSchema.parse(req.body);
    const template = await storage.createScheduleTemplate(validatedData as any);
    res.json(template);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: error.errors });
    }
    logger.error("Error creating schedule template", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get schedule template by ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const template = await storage.getScheduleTemplate(id);
    if (!template) {
      return res.status(404).json({ error: "Schedule template not found" });
    }
    res.json(template);
  } catch (error) {
    logger.error("Error fetching schedule template", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update schedule template
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updates = insertScheduleTemplateSchema.partial().parse(req.body);
    const template = await storage.updateScheduleTemplate(id, updates as any);
    if (!template) {
      return res.status(404).json({ error: "Schedule template not found" });
    }
    res.json(template);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: error.errors });
    }
    logger.error("Error updating schedule template", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete schedule template
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await storage.deleteScheduleTemplate(id);
    res.json({ success: true });
  } catch (error) {
    logger.error("Error deleting schedule template", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Assign schedule to employee
router.post("/assign", async (req, res) => {
  try {
    const { employee_id, schedule_id, valid_from, valid_to } = req.body;
    if (!employee_id || !schedule_id || !valid_from) {
      return res.status(400).json({ error: "employee_id, schedule_id, and valid_from are required" });
    }
    await storage.assignScheduleToEmployee(
      employee_id, 
      schedule_id, 
      new Date(valid_from),
      valid_to ? new Date(valid_to) : undefined
    );
    res.json({ success: true });
  } catch (error) {
    logger.error("Error assigning schedule to employee", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get employee schedules
router.get("/employee/:employeeId", async (req, res) => {
  try {
    const { employeeId } = req.params;
    const schedules = await storage.getEmployeeSchedules(employeeId);
    res.json(schedules);
  } catch (error) {
    logger.error("Error fetching employee schedules", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get active employee schedule
router.get("/employee/:employeeId/active", async (req, res) => {
  try {
    const { employeeId } = req.params;
    const date = req.query.date ? new Date(req.query.date as string) : new Date();
    const schedule = await storage.getActiveEmployeeSchedule(employeeId, date);
    res.json(schedule || null);
  } catch (error) {
    logger.error("Error fetching active employee schedule", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

