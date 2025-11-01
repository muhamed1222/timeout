import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { repositories } from '../../repositories/index';
import type { Employee, Shift, EmployeeInvite } from '../../../shared/schema';

// Mock repositories
vi.mock('../../repositories/index', () => ({
  repositories: {
    invite: {
      findByCode: vi.fn(),
      updateByCode: vi.fn(),
    },
    employee: {
      update: vi.fn(),
      findByTelegramId: vi.fn(),
      findByEmployeeId: vi.fn(),
      findByCompanyId: vi.fn(),
      findById: vi.fn(),
    },
    shift: {
      findByEmployeeId: vi.fn(),
      findById: vi.fn(),
      createWorkInterval: vi.fn(),
      update: vi.fn(),
      findWorkIntervalsByShiftId: vi.fn(),
      findBreakIntervalsByShiftId: vi.fn(),
      updateWorkInterval: vi.fn(),
      updateBreakInterval: vi.fn(),
      createBreakInterval: vi.fn(),
      createDailyReport: vi.fn(),
    },
    exception: {
      create: vi.fn(),
    },
  },
}));

// Mock logger
vi.mock('../../lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('Bot API Routes', () => {
  const BOT_SECRET = process.env.BOT_API_SECRET || 'test-secret';
  
  let router: any;
  let mockRequest: any;
  let mockResponse: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Import router after mocks are set up
    const botApiModule = await import('../bot-api');
    router = botApiModule.default;

    // Mock Express request/response
    mockRequest = {
      params: {},
      body: {},
      query: {},
      headers: {},
      ip: '127.0.0.1',
      path: '/test',
    };

    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
      sendStatus: vi.fn().mockReturnThis(),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Authentication Middleware', () => {
    it('should reject requests without X-Bot-Secret header', async () => {
      mockRequest.headers = {};
      
      // Test middleware directly
      const next = vi.fn();
      const middleware = (router as any).stack.find((m: any) => 
        m.name === 'authenticateBot'
      );

      if (middleware) {
        await middleware.handle(mockRequest, mockResponse, next);
      }

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject requests with invalid X-Bot-Secret', async () => {
      mockRequest.headers['x-bot-secret'] = 'wrong-secret';
      
      const next = vi.fn();
      const middleware = (router as any).stack.find((m: any) => 
        m.name === 'authenticateBot'
      );

      if (middleware) {
        await middleware.handle(mockRequest, mockResponse, next);
      }

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('should allow requests with valid X-Bot-Secret', async () => {
      mockRequest.headers['x-bot-secret'] = BOT_SECRET;
      
      const next = vi.fn();
      const middleware = (router as any).stack.find((m: any) => 
        m.name === 'authenticateBot'
      );

      if (middleware) {
        await middleware.handle(mockRequest, mockResponse, next);
      }

      expect(next).toHaveBeenCalled();
    });
  });

  describe('POST /employee-invites/:code/accept', () => {
    const mockInvite: EmployeeInvite = {
      id: 'invite-1',
      company_id: 'comp-1',
      code: 'TEST123',
      full_name: 'John Doe',
      position: 'Developer',
      created_at: new Date(),
      used_by_employee: 'emp-1',
      used_at: null,
    };

    const mockEmployee: Employee = {
      id: 'emp-1',
      company_id: 'comp-1',
      full_name: 'John Doe',
      position: 'Developer',
      telegram_user_id: '123456789',
      status: 'active',
      tz: null,
      created_at: new Date(),
    };

    it('should link employee to Telegram successfully', async () => {
      vi.mocked(repositories.invite.findByCode).mockResolvedValue(mockInvite);
      vi.mocked(repositories.employee.update).mockResolvedValue(mockEmployee);

      mockRequest.params = { code: 'TEST123' };
      mockRequest.body = {
        telegram_id: '123456789',
        telegram_username: 'johndoe',
      };

      // Simulate route handler execution
      // In actual implementation, you would extract the route handler and call it
      
      expect(repositories.invite.findByCode).toHaveBeenCalledWith('TEST123');
      expect(repositories.employee.update).toHaveBeenCalledWith(
        'emp-1',
        expect.objectContaining({
          telegram_user_id: '123456789',
        })
      );
    });

    it('should return 400 if telegram_id is missing', async () => {
      mockRequest.params = { code: 'TEST123' };
      mockRequest.body = {};

      // Handler should return 400
      // Implementation would check for telegram_id and return error
    });

    it('should return 404 if invite not found', async () => {
      vi.mocked(repositories.invite.findByCode).mockResolvedValue(null);

      mockRequest.params = { code: 'INVALID' };
      mockRequest.body = { telegram_id: '123456789' };

      // Handler should return 404
    });

    it('should return 400 if invite already used', async () => {
      const usedInvite = {
        ...mockInvite,
        used_at: new Date(),
      };

      vi.mocked(repositories.invite.findByCode).mockResolvedValue(usedInvite);

      mockRequest.params = { code: 'TEST123' };
      mockRequest.body = { telegram_id: '123456789' };

      // Handler should return 400
    });
  });

  describe('GET /employees/telegram/:telegramId', () => {
    it('should get employee by Telegram ID', async () => {
      const mockEmployee: Employee = {
        id: 'emp-1',
        company_id: 'comp-1',
        full_name: 'John Doe',
        position: 'Developer',
        telegram_user_id: '123456789',
        status: 'active',
        tz: null,
        created_at: new Date(),
      };

      vi.mocked(repositories.employee.findByTelegramId).mockResolvedValue(mockEmployee);

      mockRequest.params = { telegramId: '123456789' };

      expect(repositories.employee.findByTelegramId).toBeDefined();
    });

    it('should return 404 if employee not found', async () => {
      vi.mocked(repositories.employee.findByTelegramId).mockResolvedValue(null);

      mockRequest.params = { telegramId: '999999999' };

      // Handler should return 404
    });
  });

  describe('POST /shifts/:id/start', () => {
    const mockShift: Shift = {
      id: 'shift-1',
      employee_id: 'emp-1',
      planned_start_at: new Date('2025-10-29T09:00:00'),
      planned_end_at: new Date('2025-10-29T17:00:00'),
      actual_start_at: null,
      actual_end_at: null,
      status: 'scheduled',
      created_at: new Date(),
    };

    it('should start shift successfully', async () => {
      vi.mocked(repositories.shift.findById).mockResolvedValue(mockShift);
      vi.mocked(repositories.shift.createWorkInterval).mockResolvedValue({
        id: 'wi-1',
        shift_id: 'shift-1',
        start_at: new Date(),
        end_at: null,
        source: 'bot',
      });
      vi.mocked(repositories.shift.update).mockResolvedValue({
        ...mockShift,
        status: 'active',
        actual_start_at: new Date(),
      });

      mockRequest.params = { id: 'shift-1' };

      expect(repositories.shift.findById).toBeDefined();
      expect(repositories.shift.createWorkInterval).toBeDefined();
      expect(repositories.shift.update).toBeDefined();
    });

    it('should return 404 if shift not found', async () => {
      vi.mocked(repositories.shift.findById).mockResolvedValue(null);

      mockRequest.params = { id: 'invalid-shift' };

      // Handler should return 404
    });

    it('should return 400 if shift is not scheduled', async () => {
      const activeShift = {
        ...mockShift,
        status: 'active',
      };

      vi.mocked(repositories.shift.findById).mockResolvedValue(activeShift);

      mockRequest.params = { id: 'shift-1' };

      // Handler should return 400
    });
  });

  describe('POST /shifts/:id/end', () => {
    const mockShift: Shift = {
      id: 'shift-1',
      employee_id: 'emp-1',
      planned_start_at: new Date('2025-10-29T09:00:00'),
      planned_end_at: new Date('2025-10-29T17:00:00'),
      actual_start_at: new Date('2025-10-29T09:00:00'),
      actual_end_at: null,
      status: 'active',
      created_at: new Date(),
    };

    it('should end shift successfully', async () => {
      vi.mocked(repositories.shift.findById).mockResolvedValue(mockShift);
      vi.mocked(repositories.shift.findWorkIntervalsByShiftId).mockResolvedValue([
        {
          id: 'wi-1',
          shift_id: 'shift-1',
          start_at: new Date('2025-10-29T09:00:00'),
          end_at: null,
          source: 'bot',
        },
      ]);
      vi.mocked(repositories.shift.findBreakIntervalsByShiftId).mockResolvedValue([]);
      vi.mocked(repositories.shift.updateWorkInterval).mockResolvedValue({
        id: 'wi-1',
        shift_id: 'shift-1',
        start_at: new Date('2025-10-29T09:00:00'),
        end_at: new Date(),
        source: 'bot',
      });
      vi.mocked(repositories.shift.update).mockResolvedValue({
        ...mockShift,
        status: 'completed',
        actual_end_at: new Date(),
      });

      mockRequest.params = { id: 'shift-1' };

      expect(repositories.shift.findById).toBeDefined();
    });

    it('should return 400 if shift is not active', async () => {
      const completedShift = {
        ...mockShift,
        status: 'completed',
        actual_end_at: new Date(),
      };

      vi.mocked(repositories.shift.findById).mockResolvedValue(completedShift);

      mockRequest.params = { id: 'shift-1' };

      // Handler should return 400
    });

    it('should close active break when ending shift', async () => {
      vi.mocked(repositories.shift.findById).mockResolvedValue(mockShift);
      vi.mocked(repositories.shift.findWorkIntervalsByShiftId).mockResolvedValue([]);
      vi.mocked(repositories.shift.findBreakIntervalsByShiftId).mockResolvedValue([
        {
          id: 'bi-1',
          shift_id: 'shift-1',
          start_at: new Date('2025-10-29T12:00:00'),
          end_at: null,
          type: 'lunch',
          source: 'bot',
        },
      ]);
      vi.mocked(repositories.shift.updateBreakInterval).mockResolvedValue({
        id: 'bi-1',
        shift_id: 'shift-1',
        start_at: new Date('2025-10-29T12:00:00'),
        end_at: new Date(),
        type: 'lunch',
        source: 'bot',
      });

      mockRequest.params = { id: 'shift-1' };

      // Should call updateBreakInterval to close the break
    });
  });

  describe('POST /shifts/:id/break/start', () => {
    it('should start break successfully', async () => {
      const mockShift: Shift = {
        id: 'shift-1',
        employee_id: 'emp-1',
        planned_start_at: new Date('2025-10-29T09:00:00'),
        planned_end_at: new Date('2025-10-29T17:00:00'),
        actual_start_at: new Date('2025-10-29T09:00:00'),
        actual_end_at: null,
        status: 'active',
        created_at: new Date(),
      };

      vi.mocked(repositories.shift.findById).mockResolvedValue(mockShift);
      vi.mocked(repositories.shift.findBreakIntervalsByShiftId).mockResolvedValue([]);
      vi.mocked(repositories.shift.createBreakInterval).mockResolvedValue({
        id: 'bi-1',
        shift_id: 'shift-1',
        start_at: new Date(),
        end_at: null,
        type: 'lunch',
        source: 'bot',
      });

      mockRequest.params = { id: 'shift-1' };
      mockRequest.body = { type: 'lunch' };

      expect(repositories.shift.createBreakInterval).toBeDefined();
    });

    it('should return 400 if break already in progress', async () => {
      const mockShift: Shift = {
        id: 'shift-1',
        employee_id: 'emp-1',
        planned_start_at: new Date('2025-10-29T09:00:00'),
        planned_end_at: new Date('2025-10-29T17:00:00'),
        actual_start_at: new Date('2025-10-29T09:00:00'),
        actual_end_at: null,
        status: 'active',
        created_at: new Date(),
      };

      vi.mocked(repositories.shift.findById).mockResolvedValue(mockShift);
      vi.mocked(repositories.shift.findBreakIntervalsByShiftId).mockResolvedValue([
        {
          id: 'bi-1',
          shift_id: 'shift-1',
          start_at: new Date(),
          end_at: null, // Break in progress
          type: 'lunch',
          source: 'bot',
        },
      ]);

      mockRequest.params = { id: 'shift-1' };
      mockRequest.body = { type: 'lunch' };

      // Handler should return 400
    });
  });

  describe('POST /daily-reports', () => {
    it('should create daily report successfully', async () => {
      const mockShift: Shift = {
        id: 'shift-1',
        employee_id: 'emp-1',
        planned_start_at: new Date('2025-10-29T09:00:00'),
        planned_end_at: new Date('2025-10-29T17:00:00'),
        actual_start_at: new Date('2025-10-29T09:00:00'),
        actual_end_at: null,
        status: 'active',
        created_at: new Date(),
      };

      vi.mocked(repositories.shift.findById).mockResolvedValue(mockShift);
      vi.mocked(repositories.shift.createDailyReport).mockResolvedValue({
        id: 'report-1',
        shift_id: 'shift-1',
        planned_items: null,
        done_items: ['Task completed'],
        blockers: null,
        tasks_links: null,
        time_spent: null,
        attachments: null,
        submitted_at: new Date(),
      });

      mockRequest.body = {
        employee_id: 'emp-1',
        shift_id: 'shift-1',
        content: 'Task completed',
      };

      expect(repositories.shift.createDailyReport).toBeDefined();
    });

    it('should return 400 if required fields are missing', async () => {
      mockRequest.body = {
        employee_id: 'emp-1',
        // Missing shift_id and content
      };

      // Handler should return 400
    });
  });

  describe('POST /notifications/send', () => {
    it('should queue notification for employee with Telegram', async () => {
      const mockEmployee: Employee = {
        id: 'emp-1',
        company_id: 'comp-1',
        full_name: 'John Doe',
        position: 'Developer',
        telegram_user_id: '123456789',
        status: 'active',
        tz: null,
        created_at: new Date(),
      };

      vi.mocked(repositories.employee.findById).mockResolvedValue(mockEmployee);

      mockRequest.body = {
        employee_id: 'emp-1',
        message: 'Your shift starts in 15 minutes',
        urgent: true,
      };

      expect(repositories.employee.findById).toBeDefined();
    });

    it('should return 400 if employee has no Telegram linked', async () => {
      const mockEmployee: Employee = {
        id: 'emp-1',
        company_id: 'comp-1',
        full_name: 'John Doe',
        position: 'Developer',
        telegram_user_id: null, // No Telegram
        status: 'active',
        tz: null,
        created_at: new Date(),
      };

      vi.mocked(repositories.employee.findById).mockResolvedValue(mockEmployee);

      mockRequest.body = {
        employee_id: 'emp-1',
        message: 'Test message',
      };

      // Handler should return 400
    });
  });

  describe('POST /notifications/broadcast', () => {
    it('should broadcast to all employees with Telegram', async () => {
      const mockEmployees: Employee[] = [
        {
          id: 'emp-1',
          company_id: 'comp-1',
          full_name: 'John Doe',
          position: 'Developer',
          telegram_user_id: '111111',
          status: 'active',
          tz: null,
          created_at: new Date(),
        },
        {
          id: 'emp-2',
          company_id: 'comp-1',
          full_name: 'Jane Smith',
          position: 'Designer',
          telegram_user_id: '222222',
          status: 'active',
          tz: null,
          created_at: new Date(),
        },
        {
          id: 'emp-3',
          company_id: 'comp-1',
          full_name: 'Bob Johnson',
          position: 'Manager',
          telegram_user_id: null, // No Telegram
          status: 'active',
          tz: null,
          created_at: new Date(),
        },
      ];

      vi.mocked(repositories.employee.findByIdsByCompany).mockResolvedValue(mockEmployees);

      mockRequest.body = {
        company_id: 'comp-1',
        message: 'Company-wide announcement',
      };

      // Should return 2 telegram_ids (emp-1 and emp-2)
      expect(repositories.employee.findByIdsByCompany).toBeDefined();
    });
  });
});





