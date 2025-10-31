// Базовый класс для всех доменных событий
import { UUID } from '../value-objects/UUID';

export abstract class BaseEvent {
  public readonly id: UUID;
  public readonly occurredAt: Date;
  public readonly version: number;

  constructor(version: number = 1) {
    this.id = UUID.generate();
    this.occurredAt = new Date();
    this.version = version;
  }

  abstract getEventType(): string;

  toJSON(): Record<string, unknown> {
    return {
      id: this.id.toString(),
      eventType: this.getEventType(),
      occurredAt: this.occurredAt.toISOString(),
      version: this.version
    };
  }
}



