import { Router } from "express";
import { z } from "zod";
import { randomBytes } from "crypto";
import { repositories } from "../repositories/index.js";
import { insertEmployeeInviteSchema } from "../../shared/schema.js";
import { logger } from "../lib/logger.js";
import { NotFoundError, ValidationError, ConflictError, asyncHandler } from "../lib/errorHandler.js";

const router = Router();

// Create employee invite
router.post("/", asyncHandler(async (req, res) => {
  const data = { ...req.body };
  // Generate unique invite code
  data.code = randomBytes(16).toString('hex');
  let validatedData;
  try {
    validatedData = insertEmployeeInviteSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError("Validation failed", { errors: error.errors });
    }
    throw error;
  }
  const invite = await repositories.invite.create(validatedData as any);
  res.json(invite);
}));

// Get invites by company
router.get("/company/:companyId", asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  const invites = await repositories.invite.findByCompanyId(companyId);
  res.json(invites);
}));

// Get invite by code
router.get("/:code", asyncHandler(async (req, res) => {
  const { code } = req.params;
  const invite = await repositories.invite.findByCode(code);
  if (!invite) {
    throw new NotFoundError("Invite");
  }
  res.json(invite);
}));

// Use invite
router.post("/:code/use", asyncHandler(async (req, res) => {
  const { code } = req.params;
  const { employee_id } = req.body;
  if (!employee_id) {
    throw new ValidationError("employee_id is required");
  }
  const invite = await repositories.invite.useInvite(code, employee_id);
  if (!invite) {
    throw new NotFoundError("Invite (not found or already used)");
  }
  res.json(invite);
}));

// Accept invite (for Telegram bot)
router.post("/:code/accept", asyncHandler(async (req, res) => {
  const { code } = req.params;
  const { telegram_user_id, telegram_username } = req.body;
  
  if (!telegram_user_id) {
    throw new ValidationError("telegram_user_id is required");
  }

  // Получаем инвайт
  const invite = await repositories.invite.findByCode(code);
  if (!invite) {
    throw new NotFoundError("Invite");
  }

  if (invite.used_at) {
    throw new ConflictError("Invite already used");
  }

  // Проверяем, есть ли уже сотрудник с этим Telegram ID
  let employee = await repositories.employee.findByTelegramId(telegram_user_id);
  
  if (employee) {
    // Обновляем существующего сотрудника
    employee = await repositories.employee.update(employee.id, {
      company_id: invite.company_id,
      full_name: invite.full_name || employee.full_name,
      position: invite.position || employee.position,
      telegram_user_id,
      status: 'active'
    } as any);
  } else {
    // Создаем нового сотрудника
    employee = await repositories.employee.create({
      company_id: invite.company_id,
      full_name: invite.full_name || 'Сотрудник',
      position: invite.position,
      telegram_user_id,
      status: 'active'
    } as any);
  }

  // Отмечаем инвайт как использованный
  await repositories.invite.useInvite(code, employee!.id);

  res.json(employee);
}));

// Generate Telegram deep link for invite
router.get("/:code/link", asyncHandler(async (req, res) => {
  const { code } = req.params;
  
  if (!code) {
    throw new ValidationError("Invite code is required");
  }
  
  let invite;
  try {
    invite = await repositories.invite.findByCode(code);
  } catch (storageError) {
    // Log storage error but return user-friendly 404
    logger.error("Error fetching invite from storage", storageError);
    throw new NotFoundError("Invite");
  }
  
  if (!invite) {
    throw new NotFoundError("Invite");
  }
  
  if (invite.used_at) {
    throw new ConflictError("Invite already used");
  }
  
  const botUsername = process.env.TELEGRAM_BOT_USERNAME;
  if (!botUsername) {
    // Return 404 instead of 500 to prevent UI errors
    throw new NotFoundError("Invite (bot not configured)");
  }
  
  // Remove @ symbol if present
  const cleanBotUsername = botUsername.replace('@', '');
  const deepLink = `https://t.me/${cleanBotUsername}?start=${code}`;
  
  res.json({ 
    code,
    deep_link: deepLink,
    qr_code_url: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(deepLink)}`
  });
}));

// Delete invite
router.delete("/:id", asyncHandler(async (req, res) => {
  const { id } = req.params;
  await repositories.invite.delete(id);
  res.json({ message: "Invite deleted successfully" });
}));

// Cleanup expired invites
router.post("/cleanup", asyncHandler(async (req, res) => {
  const deletedCount = await repositories.invite.cleanupExpired();
  res.json({ message: `Deleted ${deletedCount} expired invites` });
}));

export default router;

