// Value Object для номера телефона
import { DomainException } from '../exceptions/DomainException';

export class PhoneNumber {
  private readonly value: string;
  private readonly countryCode: string;
  private readonly nationalNumber: string;

  constructor(phoneNumber: string, countryCode: string = '+7') {
    if (!phoneNumber || typeof phoneNumber !== 'string') {
      throw new DomainException('Phone number is required', 'INVALID_PHONE_NUMBER');
    }

    if (!countryCode || typeof countryCode !== 'string') {
      throw new DomainException('Country code is required', 'INVALID_COUNTRY_CODE');
    }

    const cleanedNumber = this.cleanPhoneNumber(phoneNumber);
    
    if (!this.isValidPhoneNumber(cleanedNumber, countryCode)) {
      throw new DomainException(`Invalid phone number: ${phoneNumber}`, 'INVALID_PHONE_FORMAT');
    }

    this.value = cleanedNumber;
    this.countryCode = countryCode;
    this.nationalNumber = this.extractNationalNumber(cleanedNumber, countryCode);
  }

  private cleanPhoneNumber(phoneNumber: string): string {
    // Удаляем все символы кроме цифр и +
    return phoneNumber.replace(/[^\d+]/g, '');
  }

  private isValidPhoneNumber(phoneNumber: string, countryCode: string): boolean {
    // Проверяем, что номер начинается с +
    if (!phoneNumber.startsWith('+')) {
      return false;
    }

    // Проверяем длину
    if (phoneNumber.length < 8 || phoneNumber.length > 15) {
      return false;
    }

    // Проверяем, что после + только цифры
    const digitsOnly = phoneNumber.substring(1);
    if (!/^\d+$/.test(digitsOnly)) {
      return false;
    }

    // Проверяем соответствие коду страны
    if (!phoneNumber.startsWith(countryCode)) {
      return false;
    }

    return true;
  }

  private extractNationalNumber(phoneNumber: string, countryCode: string): string {
    return phoneNumber.substring(countryCode.length);
  }

  getValue(): string {
    return this.value;
  }

  getCountryCode(): string {
    return this.countryCode;
  }

  getNationalNumber(): string {
    return this.nationalNumber;
  }

  equals(other: PhoneNumber): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }

  // Форматирование номера для отображения
  getFormatted(): string {
    const national = this.nationalNumber;
    
    if (this.countryCode === '+7' && national.length === 10) {
      // Российский формат: +7 (XXX) XXX-XX-XX
      return `+7 (${national.substring(0, 3)}) ${national.substring(3, 6)}-${national.substring(6, 8)}-${national.substring(8)}`;
    }
    
    if (this.countryCode === '+1' && national.length === 10) {
      // Американский формат: +1 (XXX) XXX-XXXX
      return `+1 (${national.substring(0, 3)}) ${national.substring(3, 6)}-${national.substring(6)}`;
    }
    
    // Общий формат
    return `${this.countryCode} ${national}`;
  }

  // Получение номера без кода страны
  getNationalFormatted(): string {
    const national = this.nationalNumber;
    
    if (this.countryCode === '+7' && national.length === 10) {
      return `(${national.substring(0, 3)}) ${national.substring(3, 6)}-${national.substring(6, 8)}-${national.substring(8)}`;
    }
    
    return national;
  }

  // Маскирование номера для безопасности
  getMasked(): string {
    const national = this.nationalNumber;
    
    if (national.length <= 4) {
      return `${this.countryCode} ***`;
    }
    
    const visibleDigits = Math.min(2, Math.floor(national.length / 4));
    const maskedDigits = national.length - visibleDigits;
    
    const visiblePart = national.substring(0, visibleDigits);
    const maskedPart = '*'.repeat(maskedDigits);
    
    return `${this.countryCode} ${visiblePart}${maskedPart}`;
  }

  // Проверка, является ли номер мобильным
  isMobile(): boolean {
    if (this.countryCode === '+7') {
      // Российские мобильные номера начинаются с 9
      return this.nationalNumber.startsWith('9');
    }
    
    if (this.countryCode === '+1') {
      // Американские мобильные номера
      return this.nationalNumber.startsWith('2') || this.nationalNumber.startsWith('3') || 
             this.nationalNumber.startsWith('4') || this.nationalNumber.startsWith('5') ||
             this.nationalNumber.startsWith('6') || this.nationalNumber.startsWith('7') ||
             this.nationalNumber.startsWith('8') || this.nationalNumber.startsWith('9');
    }
    
    return false;
  }

  // Получение оператора (для российских номеров)
  getOperator(): string | null {
    if (this.countryCode !== '+7' || !this.isMobile()) {
      return null;
    }

    const prefix = this.nationalNumber.substring(1, 4);
    
    const operators: Record<string, string> = {
      '900': 'МТС',
      '901': 'МТС',
      '902': 'МТС',
      '903': 'МТС',
      '904': 'МТС',
      '905': 'МТС',
      '906': 'МТС',
      '908': 'МТС',
      '909': 'МТС',
      '910': 'МТС',
      '911': 'МТС',
      '912': 'МТС',
      '913': 'МТС',
      '914': 'МТС',
      '915': 'МТС',
      '916': 'МТС',
      '917': 'МТС',
      '918': 'МТС',
      '919': 'МТС',
      '920': 'МТС',
      '921': 'МТС',
      '922': 'МТС',
      '923': 'МТС',
      '924': 'МТС',
      '925': 'МТС',
      '926': 'МТС',
      '927': 'МТС',
      '928': 'МТС',
      '929': 'МТС',
      '930': 'МТС',
      '931': 'МТС',
      '932': 'МТС',
      '933': 'МТС',
      '934': 'МТС',
      '935': 'МТС',
      '936': 'МТС',
      '937': 'МТС',
      '938': 'МТС',
      '939': 'МТС',
      '950': 'Билайн',
      '951': 'Билайн',
      '952': 'Билайн',
      '953': 'Билайн',
      '954': 'Билайн',
      '955': 'Билайн',
      '956': 'Билайн',
      '957': 'Билайн',
      '958': 'Билайн',
      '959': 'Билайн',
      '960': 'Билайн',
      '961': 'Билайн',
      '962': 'Билайн',
      '963': 'Билайн',
      '964': 'Билайн',
      '965': 'Билайн',
      '966': 'Билайн',
      '967': 'Билайн',
      '968': 'Билайн',
      '969': 'Билайн',
      '980': 'МегаФон',
      '981': 'МегаФон',
      '982': 'МегаФон',
      '983': 'МегаФон',
      '984': 'МегаФон',
      '985': 'МегаФон',
      '986': 'МегаФон',
      '987': 'МегаФон',
      '988': 'МегаФон',
      '989': 'МегаФон'
    };

    return operators[prefix] || null;
  }

  // Статический метод для создания из строки
  static fromString(phoneNumber: string, countryCode: string = '+7'): PhoneNumber {
    return new PhoneNumber(phoneNumber, countryCode);
  }

  // Создание из объекта
  static fromObject(obj: { phoneNumber: string; countryCode?: string }): PhoneNumber {
    return new PhoneNumber(obj.phoneNumber, obj.countryCode);
  }

  // Преобразование в объект
  toObject(): { phoneNumber: string; countryCode: string } {
    return { 
      phoneNumber: this.value, 
      countryCode: this.countryCode 
    };
  }

  // Валидация номера
  static isValid(phoneNumber: string, countryCode: string = '+7'): boolean {
    try {
      new PhoneNumber(phoneNumber, countryCode);
      return true;
    } catch {
      return false;
    }
  }
}



