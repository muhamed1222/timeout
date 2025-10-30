import { Router } from "express";
import { z } from "zod";
import { storage } from "../storage.js";
import { logger } from "../lib/logger.js";

const router = Router();

const createSchema = z.object({
  company_id: z.string().min(1),
  code: z.string().min(1),
  name: z.string().min(1),
  penalty_percent: z.string().regex(/^\d+$/),
  auto_detectable: z.boolean().default(false),
  is_active: z.boolean().default(true),
});

const updateSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  penalty_percent: z.string().regex(/^\d+$/),
  auto_detectable: z.boolean(),
  is_active: z.boolean(),
});

// Create violation rule
router.post("/", async (req, res) => {
  try {
    const data = createSchema.parse(req.body);
    const created = await storage.createViolationRule({
      company_id: data.company_id,
      code: data.code,
      name: data.name,
      penalty_percent: data.penalty_percent,
      auto_detectable: data.auto_detectable,
      is_active: data.is_active,
    } as any);
    res.json(created);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: error.errors });
    }
    logger.error("Error creating violation rule", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update violation rule
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const data = updateSchema.parse(req.body);
    const updated = await storage.updateViolationRule(id, data as any);
    if (!updated) {
      return res.status(404).json({ error: "Violation rule not found" });
    }
    res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: error.errors });
    }
    logger.error("Error updating violation rule", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete violation rule
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const rule = await storage.getViolationRule(id);
    if (!rule) {
      return res.status(404).json({ error: "Violation rule not found" });
    }
    await storage.deleteViolationRule(id);
    res.json({ success: true });
  } catch (error) {
    logger.error("Error deleting violation rule", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;


