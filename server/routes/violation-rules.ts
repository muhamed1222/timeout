import { Router } from "express";
import { repositories } from "../repositories/index.js";
import { logger } from "../lib/logger.js";
import { NotFoundError, asyncHandler } from "../lib/errorHandler.js";
import { validateBody, validateParams } from "../middleware/validate.js";
import { createViolationRuleSchema, updateViolationRuleSchema, violationRuleIdParamSchema } from "../lib/schemas/index.js";

const router = Router();

// Create violation rule
router.post("/", validateBody(createViolationRuleSchema), asyncHandler(async (req, res) => {
  const created = await repositories.violation.create(req.body as any);
  res.json(created);
}));

// Update violation rule
router.put("/:id", validateParams(violationRuleIdParamSchema), validateBody(updateViolationRuleSchema), asyncHandler(async (req, res) => {
  const updated = await repositories.violation.update(req.params.id, req.body as any);
  if (!updated) {
    throw new NotFoundError("Violation rule");
  }
  res.json(updated);
}));

// Delete violation rule
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const rule = await repositories.violation.findById(id);
    if (!rule) {
      return res.status(404).json({ error: "Violation rule not found" });
    }
    await repositories.violation.delete(id);
    res.json({ success: true });
  } catch (error) {
    logger.error("Error deleting violation rule", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;


