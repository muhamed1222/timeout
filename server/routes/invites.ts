import { Router } from "express";
import { z } from "zod";
import { randomBytes } from "crypto";
import { storage } from "../storage.js";
import { insertEmployeeInviteSchema } from "../../shared/schema.js";
import { logger } from "../lib/logger.js";

const router = Router();

// Create employee invite
router.post("/", async (req, res) => {
  try {
    const data = { ...req.body };
    // Generate unique invite code
    data.code = randomBytes(16).toString('hex');
    const validatedData = insertEmployeeInviteSchema.parse(data);
    const invite = await storage.createEmployeeInvite(validatedData);
    res.json(invite);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: error.errors });
    }
    logger.error("Error creating employee invite", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get invites by company
router.get("/company/:companyId", async (req, res) => {
  try {
    const { companyId } = req.params;
    const invites = await storage.getEmployeeInvitesByCompany(companyId);
    res.json(invites);
  } catch (error) {
    logger.error("Error getting employee invites", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get invite by code
router.get("/:code", async (req, res) => {
  try {
    const { code } = req.params;
    const invite = await storage.getEmployeeInviteByCode(code);
    if (!invite) {
      return res.status(404).json({ error: "Invite not found" });
    }
    res.json(invite);
  } catch (error) {
    logger.error("Error fetching employee invite", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Use invite
router.post("/:code/use", async (req, res) => {
  try {
    const { code } = req.params;
    const { employee_id } = req.body;
    if (!employee_id) {
      return res.status(400).json({ error: "employee_id is required" });
    }
    const invite = await storage.useEmployeeInvite(code, employee_id);
    if (!invite) {
      return res.status(404).json({ error: "Invite not found or already used" });
    }
    res.json(invite);
  } catch (error) {
    logger.error("Error using employee invite", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Generate Telegram deep link for invite
router.get("/:code/link", async (req, res) => {
  try {
    const { code } = req.params;
    const invite = await storage.getEmployeeInviteByCode(code);
    
    if (!invite) {
      return res.status(404).json({ error: "Invite not found" });
    }
    
    if (invite.used_at) {
      return res.status(400).json({ error: "Invite already used" });
    }
    
    const botUsername = process.env.TELEGRAM_BOT_USERNAME;
    if (!botUsername) {
      return res.status(500).json({ error: "Telegram bot not configured. Please set TELEGRAM_BOT_USERNAME in environment variables." });
    }
    // Remove @ symbol if present
    const cleanBotUsername = botUsername.replace('@', '');
    const deepLink = `https://t.me/${cleanBotUsername}?start=${code}`;
    
    res.json({ 
      code,
      deep_link: deepLink,
      qr_code_url: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(deepLink)}`
    });
  } catch (error) {
    logger.error("Error generating invite link", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete invite
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await storage.deleteEmployeeInvite(id);
    res.json({ message: "Invite deleted successfully" });
  } catch (error) {
    logger.error("Error deleting employee invite", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Cleanup expired invites
router.post("/cleanup", async (req, res) => {
  try {
    const deletedCount = await storage.cleanupExpiredInvites();
    res.json({ message: `Deleted ${deletedCount} expired invites` });
  } catch (error) {
    logger.error("Error cleaning up expired invites", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

