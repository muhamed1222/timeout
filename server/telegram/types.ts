export interface SessionData {
  employeeId?: string;
  companyId?: string;
  currentShiftId?: string;
  waitingForReport?: string;
  lastAction?: string;
  lastActionTime?: Date;
}

export interface Employee {
  id: string;
  company_id: string;
  full_name: string;
  position?: string;
  telegram_user_id?: string;
  status: string;
  tz?: string;
  created_at: Date;
}

export interface Shift {
  id: string;
  employee_id: string;
  planned_start_at: Date;
  planned_end_at: Date;
  actual_start_at?: Date;
  actual_end_at?: Date;
  status: "planned" | "active" | "completed" | "cancelled";
  created_at: Date;
}

export interface WorkInterval {
  id: string;
  shift_id: string;
  start_at: Date;
  end_at?: Date;
  source: string;
}

export interface BreakInterval {
  id: string;
  shift_id: string;
  start_at: Date;
  end_at?: Date;
  type: string;
  source: string;
}

export interface DailyReport {
  id: string;
  shift_id: string;
  planned_items?: string[];
  done_items?: string[];
  blockers?: string;
  tasks_links?: string[];
  time_spent?: Record<string, number>; // Task ID -> time in minutes
  attachments?: Array<{ url: string; type: string; name?: string }>;
  submitted_at?: Date;
}
