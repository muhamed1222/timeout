// Медиатор для CQRS паттерна
import { DomainException } from '../../../shared/domain/exceptions/DomainException';

// Базовые интерфейсы
export interface ICommand {
  readonly type: string;
}

export interface IQuery {
  readonly type: string;
}

export interface ICommandHandler<TCommand extends ICommand, TResult = void> {
  handle(command: TCommand): Promise<TResult>;
}

export interface IQueryHandler<TQuery extends IQuery, TResult = void> {
  handle(query: TQuery): Promise<TResult>;
}

// Медиатор
export class Mediator {
  private commandHandlers = new Map<string, ICommandHandler<any, any>>();
  private queryHandlers = new Map<string, IQueryHandler<any, any>>();

  // Регистрация обработчиков команд
  registerCommandHandler<TCommand extends ICommand, TResult>(
    commandType: string,
    handler: ICommandHandler<TCommand, TResult>
  ): void {
    this.commandHandlers.set(commandType, handler);
  }

  // Регистрация обработчиков запросов
  registerQueryHandler<TQuery extends IQuery, TResult>(
    queryType: string,
    handler: IQueryHandler<TQuery, TResult>
  ): void {
    this.queryHandlers.set(queryType, handler);
  }

  // Выполнение команды
  async send<TCommand extends ICommand, TResult>(
    command: TCommand
  ): Promise<TResult> {
    const handler = this.commandHandlers.get(command.type);
    
    if (!handler) {
      throw new DomainException(
        `No handler found for command: ${command.type}`,
        'NO_COMMAND_HANDLER',
        { commandType: command.type }
      );
    }

    try {
      return await handler.handle(command);
    } catch (error) {
      if (error instanceof DomainException) {
        throw error;
      }
      throw new DomainException(
        `Command execution failed: ${command.type}`,
        'COMMAND_EXECUTION_FAILED',
        { originalError: error, command }
      );
    }
  }

  // Выполнение запроса
  async query<TQuery extends IQuery, TResult>(
    query: TQuery
  ): Promise<TResult> {
    const handler = this.queryHandlers.get(query.type);
    
    if (!handler) {
      throw new DomainException(
        `No handler found for query: ${query.type}`,
        'NO_QUERY_HANDLER',
        { queryType: query.type }
      );
    }

    try {
      return await handler.handle(query);
    } catch (error) {
      if (error instanceof DomainException) {
        throw error;
      }
      throw new DomainException(
        `Query execution failed: ${query.type}`,
        'QUERY_EXECUTION_FAILED',
        { originalError: error, query }
      );
    }
  }

  // Проверка наличия обработчика команды
  hasCommandHandler(commandType: string): boolean {
    return this.commandHandlers.has(commandType);
  }

  // Проверка наличия обработчика запроса
  hasQueryHandler(queryType: string): boolean {
    return this.queryHandlers.has(queryType);
  }

  // Получение списка зарегистрированных команд
  getRegisteredCommands(): string[] {
    return Array.from(this.commandHandlers.keys());
  }

  // Получение списка зарегистрированных запросов
  getRegisteredQueries(): string[] {
    return Array.from(this.queryHandlers.keys());
  }
}

// Singleton instance
export const mediator = new Mediator();



