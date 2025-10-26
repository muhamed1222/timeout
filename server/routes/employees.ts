import { Router } from "express";
import { z } from "zod";
import { storage } from "../storage.js";
import { insertEmployeeSchema } from "../../shared/schema.js";
import { logger } from "../lib/logger.js";
import { cache } from "../lib/cache.js";

const router = Router();

// Create employee
router.post("/", async (req, res) => {
  try {
    const validatedData = insertEmployeeSchema.parse(req.body);
    const employee = await storage.createEmployee(validatedData);
    // Invalidate company stats cache
    cache.delete(`company:${employee.company_id}:stats`);
    res.json(employee);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: error.errors });
    }
    logger.error("Error creating employee", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get employee by ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const employee = await storage.getEmployee(id);
    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }
    res.json(employee);
  } catch (error) {
    logger.error("Error fetching employee", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update employee
router.put("/:id", async (req, res) => {
  try {
    const { id} = req.params;
    const validatedData = insertEmployeeSchema.partial().parse(req.body);
    const employee = await storage.updateEmployee(id, validatedData);
    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }
    res.json(employee);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: error.errors });
    }
    logger.error("Error updating employee", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get employee by Telegram ID
router.get("/telegram/:telegramUserId", async (req, res) => {
  try {
    const { telegramUserId } = req.params;
    const employee = await storage.getEmployeeByTelegramId(telegramUserId);
    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }
    res.json(employee);
  } catch (error) {
    logger.error("Error fetching employee by telegram ID", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

