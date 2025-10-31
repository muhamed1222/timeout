// Value Object для денежных сумм
import { DomainException } from '../exceptions/DomainException';

export enum Currency {
  RUB = 'RUB',
  USD = 'USD',
  EUR = 'EUR',
  GBP = 'GBP'
}

export interface MoneyComponents {
  amount: number;
  currency: Currency;
}

export class Money {
  private readonly amount: number;
  private readonly currency: Currency;

  constructor(amount: number, currency: Currency = Currency.RUB) {
    if (typeof amount !== 'number' || isNaN(amount)) {
      throw new DomainException('Amount must be a valid number', 'INVALID_MONEY_AMOUNT');
    }

    if (!Object.values(Currency).includes(currency)) {
      throw new DomainException(`Invalid currency: ${currency}`, 'INVALID_MONEY_CURRENCY');
    }

    if (amount < 0) {
      throw new DomainException('Amount cannot be negative', 'NEGATIVE_MONEY_AMOUNT');
    }

    // Округляем до 2 знаков после запятой
    this.amount = Math.round(amount * 100) / 100;
    this.currency = currency;
  }

  getAmount(): number {
    return this.amount;
  }

  getCurrency(): Currency {
    return this.currency;
  }

  equals(other: Money): boolean {
    return this.amount === other.amount && this.currency === other.currency;
  }

  toString(): string {
    return this.getFormatted();
  }

  // Сложение денежных сумм
  add(other: Money): Money {
    if (this.currency !== other.currency) {
      throw new DomainException('Cannot add money with different currencies', 'CURRENCY_MISMATCH');
    }

    return new Money(this.amount + other.amount, this.currency);
  }

  // Вычитание денежных сумм
  subtract(other: Money): Money {
    if (this.currency !== other.currency) {
      throw new DomainException('Cannot subtract money with different currencies', 'CURRENCY_MISMATCH');
    }

    const result = this.amount - other.amount;
    if (result < 0) {
      throw new DomainException('Result cannot be negative', 'NEGATIVE_MONEY_RESULT');
    }

    return new Money(result, this.currency);
  }

  // Умножение на число
  multiply(factor: number): Money {
    if (typeof factor !== 'number' || isNaN(factor)) {
      throw new DomainException('Factor must be a valid number', 'INVALID_MULTIPLICATION_FACTOR');
    }

    if (factor < 0) {
      throw new DomainException('Factor cannot be negative', 'NEGATIVE_MULTIPLICATION_FACTOR');
    }

    return new Money(this.amount * factor, this.currency);
  }

  // Деление на число
  divide(divisor: number): Money {
    if (typeof divisor !== 'number' || isNaN(divisor)) {
      throw new DomainException('Divisor must be a valid number', 'INVALID_DIVISION_DIVISOR');
    }

    if (divisor <= 0) {
      throw new DomainException('Divisor must be positive', 'INVALID_DIVISION_DIVISOR');
    }

    return new Money(this.amount / divisor, this.currency);
  }

  // Сравнение денежных сумм
  isGreaterThan(other: Money): boolean {
    if (this.currency !== other.currency) {
      throw new DomainException('Cannot compare money with different currencies', 'CURRENCY_MISMATCH');
    }

    return this.amount > other.amount;
  }

  isLessThan(other: Money): boolean {
    if (this.currency !== other.currency) {
      throw new DomainException('Cannot compare money with different currencies', 'CURRENCY_MISMATCH');
    }

    return this.amount < other.amount;
  }

  isGreaterThanOrEqual(other: Money): boolean {
    return this.isGreaterThan(other) || this.equals(other);
  }

  isLessThanOrEqual(other: Money): boolean {
    return this.isLessThan(other) || this.equals(other);
  }

  // Проверка на ноль
  isZero(): boolean {
    return this.amount === 0;
  }

  // Проверка на положительное значение
  isPositive(): boolean {
    return this.amount > 0;
  }

  // Форматирование для отображения
  getFormatted(): string {
    const formatter = new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: this.currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

    return formatter.format(this.amount);
  }

  // Форматирование без символа валюты
  getFormattedAmount(): string {
    const formatter = new Intl.NumberFormat('ru-RU', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

    return formatter.format(this.amount);
  }

  // Получение символа валюты
  getCurrencySymbol(): string {
    const symbols: Record<Currency, string> = {
      [Currency.RUB]: '₽',
      [Currency.USD]: '$',
      [Currency.EUR]: '€',
      [Currency.GBP]: '£'
    };

    return symbols[this.currency];
  }

  // Получение кода валюты
  getCurrencyCode(): string {
    return this.currency;
  }

  // Конвертация в другую валюту (упрощенная версия)
  convertTo(targetCurrency: Currency, exchangeRate: number): Money {
    if (this.currency === targetCurrency) {
      return new Money(this.amount, this.currency);
    }

    if (typeof exchangeRate !== 'number' || isNaN(exchangeRate) || exchangeRate <= 0) {
      throw new DomainException('Invalid exchange rate', 'INVALID_EXCHANGE_RATE');
    }

    const convertedAmount = this.amount * exchangeRate;
    return new Money(convertedAmount, targetCurrency);
  }

  // Получение абсолютного значения
  abs(): Money {
    return new Money(Math.abs(this.amount), this.currency);
  }

  // Округление до указанного количества знаков
  roundTo(decimals: number): Money {
    if (typeof decimals !== 'number' || decimals < 0 || decimals > 10) {
      throw new DomainException('Invalid number of decimals', 'INVALID_DECIMALS');
    }

    const factor = Math.pow(10, decimals);
    const roundedAmount = Math.round(this.amount * factor) / factor;
    
    return new Money(roundedAmount, this.currency);
  }

  // Статический метод для создания из строки
  static fromString(moneyString: string, currency: Currency = Currency.RUB): Money {
    const cleaned = moneyString.replace(/[^\d.,]/g, '');
    const amount = parseFloat(cleaned.replace(',', '.'));
    
    if (isNaN(amount)) {
      throw new DomainException(`Invalid money string: ${moneyString}`, 'INVALID_MONEY_STRING');
    }

    return new Money(amount, currency);
  }

  // Создание из объекта
  static fromObject(obj: MoneyComponents): Money {
    return new Money(obj.amount, obj.currency);
  }

  // Преобразование в объект
  toObject(): MoneyComponents {
    return {
      amount: this.amount,
      currency: this.currency
    };
  }

  // Создание нулевой суммы
  static zero(currency: Currency = Currency.RUB): Money {
    return new Money(0, currency);
  }

  // Валидация денежной суммы
  static isValid(amount: number, currency: Currency): boolean {
    try {
      new Money(amount, currency);
      return true;
    } catch {
      return false;
    }
  }

  // Получение курсов валют (заглушка)
  static getExchangeRates(): Record<string, number> {
    return {
      'RUB_USD': 0.011,
      'RUB_EUR': 0.009,
      'RUB_GBP': 0.008,
      'USD_RUB': 90.0,
      'EUR_RUB': 110.0,
      'GBP_RUB': 125.0
    };
  }
}



