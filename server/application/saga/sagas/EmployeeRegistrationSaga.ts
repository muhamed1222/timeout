// Saga для регистрации сотрудника
import { SagaDefinition, SagaStep, SagaContext, SagaStepResult } from '../SagaInterface';
import { DomainException } from '../../../../shared/domain/exceptions/DomainException';

// Шаг 1: Создание сотрудника
const createEmployeeStep: SagaStep = {
  id: 'create_employee',
  name: 'Create Employee',
  async execute(context: SagaContext): Promise<SagaStepResult> {
    try {
      const { employeeData } = context.data;
      
      if (!employeeData) {
        throw new DomainException('Employee data is required', 'INVALID_EMPLOYEE_DATA');
      }

      // Здесь должна быть логика создания сотрудника
      // Пока что симулируем успешное создание
      const employeeId = `emp_${Date.now()}`;
      
      context.data.employeeId = employeeId;
      
      return {
        success: true,
        data: { employeeId }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  },
  async compensate(context: SagaContext): Promise<SagaStepResult> {
    try {
      const { employeeId } = context.data;
      
      if (employeeId) {
        // Здесь должна быть логика удаления сотрудника
        console.log(`Compensating: deleting employee ${employeeId}`);
      }
      
      return {
        success: true,
        data: { compensated: true }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Compensation failed'
      };
    }
  }
};

// Шаг 2: Отправка приглашения
const sendInvitationStep: SagaStep = {
  id: 'send_invitation',
  name: 'Send Invitation',
  async execute(context: SagaContext): Promise<SagaStepResult> {
    try {
      const { employeeId, email } = context.data;
      
      if (!employeeId || !email) {
        throw new DomainException('Employee ID and email are required', 'INVALID_INVITATION_DATA');
      }

      // Здесь должна быть логика отправки приглашения
      // Пока что симулируем успешную отправку
      const invitationId = `inv_${Date.now()}`;
      
      context.data.invitationId = invitationId;
      
      return {
        success: true,
        data: { invitationId }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  },
  async compensate(context: SagaContext): Promise<SagaStepResult> {
    try {
      const { invitationId } = context.data;
      
      if (invitationId) {
        // Здесь должна быть логика отмены приглашения
        console.log(`Compensating: cancelling invitation ${invitationId}`);
      }
      
      return {
        success: true,
        data: { compensated: true }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Compensation failed'
      };
    }
  }
};

// Шаг 3: Создание учетной записи
const createAccountStep: SagaStep = {
  id: 'create_account',
  name: 'Create Account',
  async execute(context: SagaContext): Promise<SagaStepResult> {
    try {
      const { employeeId, email } = context.data;
      
      if (!employeeId || !email) {
        throw new DomainException('Employee ID and email are required', 'INVALID_ACCOUNT_DATA');
      }

      // Здесь должна быть логика создания учетной записи
      // Пока что симулируем успешное создание
      const accountId = `acc_${Date.now()}`;
      
      context.data.accountId = accountId;
      
      return {
        success: true,
        data: { accountId }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  },
  async compensate(context: SagaContext): Promise<SagaStepResult> {
    try {
      const { accountId } = context.data;
      
      if (accountId) {
        // Здесь должна быть логика удаления учетной записи
        console.log(`Compensating: deleting account ${accountId}`);
      }
      
      return {
        success: true,
        data: { compensated: true }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Compensation failed'
      };
    }
  }
};

// Шаг 4: Отправка уведомления
const sendNotificationStep: SagaStep = {
  id: 'send_notification',
  name: 'Send Notification',
  async execute(context: SagaContext): Promise<SagaStepResult> {
    try {
      const { employeeId, email } = context.data;
      
      if (!employeeId || !email) {
        throw new DomainException('Employee ID and email are required', 'INVALID_NOTIFICATION_DATA');
      }

      // Здесь должна быть логика отправки уведомления
      // Пока что симулируем успешную отправку
      console.log(`Sending notification to ${email} for employee ${employeeId}`);
      
      return {
        success: true,
        data: { notificationSent: true }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
};

// Определение Saga регистрации сотрудника
export const employeeRegistrationSaga: SagaDefinition = {
  id: 'employee_registration',
  name: 'Employee Registration Saga',
  steps: [
    createEmployeeStep,
    sendInvitationStep,
    createAccountStep,
    sendNotificationStep
  ],
  timeoutMs: 300000, // 5 минут
  retryPolicy: {
    maxAttempts: 3,
    delayMs: 1000,
    backoffMultiplier: 2,
    maxDelayMs: 10000
  }
};



