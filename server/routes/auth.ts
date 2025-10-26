import { Router } from "express";
import { z } from "zod";
import { storage } from "../storage.js";
import { supabaseAdmin, hasServiceRoleKey } from "../lib/supabase.js";
import { logger } from "../lib/logger.js";
import rateLimit from "express-rate-limit";

const router = Router();

// Rate limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Max 5 requests per windowMs
  message: { error: "Too many authentication attempts, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

const registerAdminSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  company_name: z.string().min(1),
  full_name: z.string().min(1)
});

// Register new admin user with company
router.post("/register", authLimiter, async (req, res) => {
  try {
    const validatedData = registerAdminSchema.parse(req.body);
    const { email, password, company_name, full_name } = validatedData;
    
    if (!hasServiceRoleKey) {
      return res.status(500).json({ 
        error: "Server configuration error: SUPABASE_SERVICE_ROLE_KEY is required for admin registration" 
      });
    }
    
    const company = await storage.createCompany({ name: company_name });
    
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        company_id: company.id,
        full_name
      }
    });
    
    if (authError) {
      await storage.deleteCompany(company.id);
      if (authError.message.includes('already registered')) {
        return res.status(400).json({ error: "Пользователь с таким email уже зарегистрирован" });
      }
      logger.error("Supabase auth error", authError, { email, company_name });
      return res.status(500).json({ error: `Ошибка регистрации: ${authError.message}` });
    }
    
    if (!authData.user) {
      await storage.deleteCompany(company.id);
      return res.status(500).json({ error: "Не удалось создать пользователя" });
    }
    
    res.json({ success: true, company_id: company.id });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: "Ошибка валидации", 
        details: error.errors 
      });
    }
    logger.error("Error during registration", error);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
});

export default router;

