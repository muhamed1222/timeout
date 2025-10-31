// Value Object для Email адреса
import { DomainException } from '../exceptions/DomainException';

export class Email {
  private readonly value: string;

  constructor(email: string) {
    if (!email || typeof email !== 'string') {
      throw new DomainException('Email is required', 'INVALID_EMAIL');
    }

    const trimmedEmail = email.trim().toLowerCase();
    
    if (!this.isValidEmail(trimmedEmail)) {
      throw new DomainException(`Invalid email format: ${email}`, 'INVALID_EMAIL_FORMAT');
    }

    this.value = trimmedEmail;
  }

  private isValidEmail(email: string): boolean {
    // Базовая валидация email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailRegex.test(email)) {
      return false;
    }

    // Проверяем длину
    if (email.length > 254) {
      return false;
    }

    // Проверяем локальную часть (до @)
    const [localPart, domain] = email.split('@');
    
    if (localPart.length > 64) {
      return false;
    }

    // Проверяем домен
    if (domain.length > 253) {
      return false;
    }

    // Проверяем, что домен содержит хотя бы одну точку
    if (!domain.includes('.')) {
      return false;
    }

    // Проверяем, что домен не начинается и не заканчивается точкой
    if (domain.startsWith('.') || domain.endsWith('.')) {
      return false;
    }

    return true;
  }

  getValue(): string {
    return this.value;
  }

  getLocalPart(): string {
    return this.value.split('@')[0];
  }

  getDomain(): string {
    return this.value.split('@')[1];
  }

  equals(other: Email): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }

  // Статический метод для создания из строки
  static fromString(email: string): Email {
    return new Email(email);
  }

  // Проверка, является ли email корпоративным
  isCorporate(): boolean {
    const corporateDomains = [
      'gmail.com',
      'yahoo.com',
      'hotmail.com',
      'outlook.com',
      'mail.ru',
      'yandex.ru'
    ];

    return !corporateDomains.includes(this.getDomain());
  }

  // Получение домена для группировки
  getDomainGroup(): string {
    const domain = this.getDomain();
    
    // Группируем по основному домену
    if (domain.includes('.')) {
      const parts = domain.split('.');
      if (parts.length >= 2) {
        return parts.slice(-2).join('.');
      }
    }
    
    return domain;
  }

  // Маскирование email для безопасности
  getMasked(): string {
    const [localPart, domain] = this.value.split('@');
    
    if (localPart.length <= 2) {
      return `${localPart[0]}***@${domain}`;
    }
    
    const maskedLocal = `${localPart[0]}${'*'.repeat(localPart.length - 2)}${localPart[localPart.length - 1]}`;
    return `${maskedLocal}@${domain}`;
  }

  // Валидация для конкретных доменов
  static validateDomain(email: string, allowedDomains: string[]): boolean {
    try {
      const emailObj = new Email(email);
      return allowedDomains.includes(emailObj.getDomain());
    } catch {
      return false;
    }
  }

  // Создание из объекта
  static fromObject(obj: { email: string }): Email {
    return new Email(obj.email);
  }

  // Преобразование в объект
  toObject(): { email: string } {
    return { email: this.value };
  }
}



