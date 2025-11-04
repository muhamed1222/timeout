import { Router } from "express";
import { repositories } from "../repositories/index.js";
import { logger } from "../lib/logger.js";
import { NotFoundError, ValidationError, asyncHandler } from "../lib/errorHandler.js";
import { validateBody, validateParams } from "../middleware/validate.js";
import { createEmployeeSchema, updateEmployeeSchema, employeeIdParamSchema, telegramUserIdParamSchema } from "../lib/schemas/index.js";
import { invalidateCompanyStatsByEmployeeId, invalidateCompanyStats } from "../lib/utils/index.js";
import { supabaseAdmin } from "../lib/supabase.js";
import { getSecret } from "../lib/secrets.js";

const router = Router();

// Create employee
router.post("/", validateBody(createEmployeeSchema), asyncHandler(async (req, res) => {
  const employee = await repositories.employee.create(req.body);
  await invalidateCompanyStatsByEmployeeId(employee.id);
  res.json(employee);
}));

// Get employee by ID
router.get("/:id", validateParams(employeeIdParamSchema), asyncHandler(async (req, res) => {
  try {
    const employee = await repositories.employee.findById(req.params.id);
    if (!employee) {
      throw new NotFoundError("Employee");
    }
    // Ensure avatar fields are present
    const employeeWithDefaults = {
      ...employee,
      avatar_id: employee.avatar_id ?? null,
      photo_url: employee.photo_url ?? null,
    };
    res.json(employeeWithDefaults);
  } catch (error) {
    logger.error("Error fetching employee by ID", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      employeeId: req.params.id,
    });
    throw error;
  }
}));

// Update employee
router.put("/:id", validateParams(employeeIdParamSchema), validateBody(updateEmployeeSchema), asyncHandler(async (req, res) => {
  try {
    logger.info("Updating employee", { 
      id: req.params.id, 
      body: req.body,
      avatar_id: req.body.avatar_id,
      full_name: req.body.full_name, 
    });
    
    const employee = await repositories.employee.update(req.params.id, req.body);
    if (!employee) {
      throw new NotFoundError("Employee");
    }
    
    // Ensure avatar fields are present
    const employeeWithDefaults = {
      ...employee,
      avatar_id: employee.avatar_id ?? null,
      photo_url: employee.photo_url ?? null,
    };
    
    logger.info("Employee updated", { 
      id: employeeWithDefaults.id,
      full_name: employeeWithDefaults.full_name,
      avatar_id: employeeWithDefaults.avatar_id,
      photo_url: employeeWithDefaults.photo_url,
    });
    
    res.json(employeeWithDefaults);
  } catch (error) {
    logger.error("Error updating employee", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      employeeId: req.params.id,
      body: req.body,
    });
    throw error;
  }
}));

// Delete employee
router.delete("/:id", validateParams(employeeIdParamSchema), asyncHandler(async (req, res) => {
  const employee = await repositories.employee.findById(req.params.id);
  if (!employee) {
    throw new NotFoundError("Employee");
  }
  const companyId = employee.company_id;
  await repositories.employee.delete(req.params.id);
  await invalidateCompanyStats(companyId);
  res.json({ success: true });
}));

// Get employee statistics
router.get("/:id/stats", validateParams(employeeIdParamSchema), asyncHandler(async (req, res) => {
  try {
    const employee = await repositories.employee.findById(req.params.id);
    if (!employee) {
      throw new NotFoundError("Employee");
    }

    // Get all shifts for this employee
    const shifts = await repositories.shift.findByEmployeeId(req.params.id, 1000);
  
    // Calculate statistics
    const totalShifts = shifts.length;
    const completedShifts = shifts.filter(s => s.status === "completed").length;
  
    // Calculate late count (shifts where actual_start > planned_start + 15 minutes)
    const lateCount = shifts.filter(s => {
      if (!s.actual_start_at || !s.planned_start_at) {
        return false;
      }
      const actualStart = new Date(s.actual_start_at).getTime();
      const plannedStart = new Date(s.planned_start_at).getTime();
      const fifteenMinutes = 15 * 60 * 1000;
      return actualStart > plannedStart + fifteenMinutes;
    }).length;

    // Calculate absence count (planned shifts that were never started)
    const absenceCount = shifts.filter(s => 
      s.status === "planned" && 
    new Date(s.planned_start_at) < new Date(),
    ).length;

    // Calculate average work hours
    const totalWorkHours = shifts.reduce((sum, s) => {
      if (s.actual_start_at && s.actual_end_at) {
        const start = new Date(s.actual_start_at).getTime();
        const end = new Date(s.actual_end_at).getTime();
        return sum + (end - start) / (1000 * 60 * 60); // Convert to hours
      }
      return sum;
    }, 0);
    const avgWorkHours = completedShifts > 0 ? totalWorkHours / completedShifts : 0;

    // Calculate efficiency index
    // Formula: (completed - late * 0.5 - absence * 2) / total * 100
    const efficiencyScore = Math.max(0, completedShifts - lateCount * 0.5 - absenceCount * 2);
    const efficiencyIndex = totalShifts > 0 ? (efficiencyScore / totalShifts) * 100 : 0;

    res.json({
      efficiency_index: Math.min(100, Math.max(0, efficiencyIndex)),
      total_shifts: totalShifts,
      completed_shifts: completedShifts,
      late_count: lateCount,
      absence_count: absenceCount,
      avg_work_hours: avgWorkHours,
    });
  } catch (error) {
    logger.error("Error fetching employee stats", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      employeeId: req.params.id,
    });
    throw error;
  }
}));

// Get employee by Telegram ID
router.get("/telegram/:telegramUserId", validateParams(telegramUserIdParamSchema), asyncHandler(async (req, res) => {
  const employee = await repositories.employee.findByTelegramId(req.params.telegramUserId);
  if (!employee) {
    throw new NotFoundError("Employee");
  }
  res.json(employee);
}));

// Upload employee photo
// Accepts base64 encoded image in JSON body: { image: "data:image/jpeg;base64,...", mimeType?: "image/jpeg" }
router.post("/:id/photo", validateParams(employeeIdParamSchema), asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // Check if employee exists
  const employee = await repositories.employee.findById(id);
  if (!employee) {
    throw new NotFoundError("Employee");
  }

  // Expect base64 encoded image in JSON body
  if (!req.body || typeof req.body !== "object" || !req.body.image) {
    throw new ValidationError("Missing 'image' field in request body. Expected base64 encoded image.");
  }

  // Extract base64 data
  const imageDataString = req.body.image;
  const base64Match = imageDataString.match(/^data:image\/(\w+);base64,(.+)$/);
  
  if (!base64Match) {
    throw new ValidationError("Invalid image format. Expected data URI: data:image/<type>;base64,<data>");
  }

  const mimeType = `image/${base64Match[1]}`;
  const base64Data = base64Match[2];

  // Validate MIME type
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  if (!allowedTypes.includes(mimeType)) {
    throw new ValidationError(`Invalid file type: ${mimeType}. Allowed types: ${allowedTypes.join(", ")}`);
  }

  // Decode base64 to Buffer
  let imageData: Buffer;
  try {
    imageData = Buffer.from(base64Data, "base64");
  } catch (_error) {
    throw new ValidationError("Invalid base64 image data");
  }

  // Validate file size (max 5MB)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (imageData.length > maxSize) {
    throw new ValidationError(`File size exceeds maximum allowed size of ${maxSize / 1024 / 1024}MB`);
  }

  // Determine file extension
  const extension = mimeType.split("/")[1] === "jpeg" ? "jpg" : mimeType.split("/")[1];
  const fileName = `employees/${id}/photo_${Date.now()}.${extension}`;

  try {
    // Upload to Supabase Storage
    const supabaseUrl = getSecret("SUPABASE_URL");
    if (!supabaseUrl) {
      throw new Error("SUPABASE_URL is not configured");
    }

    // Upload file to Supabase Storage bucket 'employee-photos'
    const { error: uploadError } = await supabaseAdmin.storage
      .from("employee-photos")
      .upload(fileName, imageData, {
        contentType: mimeType,
        upsert: false, // Don't overwrite existing files
      });

    if (uploadError) {
      logger.error("Error uploading photo to Supabase Storage", uploadError);
      throw new Error(`Failed to upload photo: ${uploadError.message}`);
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from("employee-photos")
      .getPublicUrl(fileName);

    const photoUrl = urlData.publicUrl;

    // Update employee photo_url in database
    const updatedEmployee = await repositories.employee.update(id, {
      photo_url: photoUrl,
    } as any);

    if (!updatedEmployee) {
      throw new NotFoundError("Employee");
    }

    await invalidateCompanyStatsByEmployeeId(id);

    logger.info("Employee photo uploaded successfully", {
      employeeId: id,
      fileName,
      photoUrl,
    });

    res.json({
      success: true,
      photo_url: photoUrl,
      employee: updatedEmployee,
    });
  } catch (error) {
    logger.error("Error uploading employee photo", error, {
      employeeId: id,
    });
    throw error;
  }
}));

export default router;

