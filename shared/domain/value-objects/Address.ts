// Value Object для адреса
import { DomainException } from '../exceptions/DomainException';

export interface AddressComponents {
  street?: string;
  city: string;
  state?: string;
  postalCode?: string;
  country: string;
  building?: string;
  apartment?: string;
}

export class Address {
  private readonly components: AddressComponents;
  private readonly fullAddress: string;

  constructor(components: AddressComponents) {
    this.validateComponents(components);
    this.components = { ...components };
    this.fullAddress = this.buildFullAddress();
  }

  private validateComponents(components: AddressComponents): void {
    if (!components.city || typeof components.city !== 'string' || components.city.trim().length === 0) {
      throw new DomainException('City is required', 'INVALID_ADDRESS_CITY');
    }

    if (!components.country || typeof components.country !== 'string' || components.country.trim().length === 0) {
      throw new DomainException('Country is required', 'INVALID_ADDRESS_COUNTRY');
    }

    if (components.street && components.street.trim().length === 0) {
      throw new DomainException('Street cannot be empty', 'INVALID_ADDRESS_STREET');
    }

    if (components.state && components.state.trim().length === 0) {
      throw new DomainException('State cannot be empty', 'INVALID_ADDRESS_STATE');
    }

    if (components.postalCode && components.postalCode.trim().length === 0) {
      throw new DomainException('Postal code cannot be empty', 'INVALID_ADDRESS_POSTAL_CODE');
    }

    if (components.building && components.building.trim().length === 0) {
      throw new DomainException('Building cannot be empty', 'INVALID_ADDRESS_BUILDING');
    }

    if (components.apartment && components.apartment.trim().length === 0) {
      throw new DomainException('Apartment cannot be empty', 'INVALID_ADDRESS_APARTMENT');
    }
  }

  private buildFullAddress(): string {
    const parts: string[] = [];

    if (this.components.street) {
      parts.push(this.components.street);
    }

    if (this.components.building) {
      parts.push(`д. ${this.components.building}`);
    }

    if (this.components.apartment) {
      parts.push(`кв. ${this.components.apartment}`);
    }

    parts.push(this.components.city);

    if (this.components.state) {
      parts.push(this.components.state);
    }

    if (this.components.postalCode) {
      parts.push(this.components.postalCode);
    }

    parts.push(this.components.country);

    return parts.join(', ');
  }

  getComponents(): AddressComponents {
    return { ...this.components };
  }

  getFullAddress(): string {
    return this.fullAddress;
  }

  getCity(): string {
    return this.components.city;
  }

  getCountry(): string {
    return this.components.country;
  }

  getStreet(): string | undefined {
    return this.components.street;
  }

  getState(): string | undefined {
    return this.components.state;
  }

  getPostalCode(): string | undefined {
    return this.components.postalCode;
  }

  getBuilding(): string | undefined {
    return this.components.building;
  }

  getApartment(): string | undefined {
    return this.components.apartment;
  }

  equals(other: Address): boolean {
    return this.fullAddress === other.fullAddress;
  }

  toString(): string {
    return this.fullAddress;
  }

  // Получение краткого адреса (город, страна)
  getShortAddress(): string {
    return `${this.components.city}, ${this.components.country}`;
  }

  // Получение адреса для отображения
  getDisplayAddress(): string {
    const parts: string[] = [];

    if (this.components.street) {
      parts.push(this.components.street);
    }

    if (this.components.building) {
      parts.push(`д. ${this.components.building}`);
    }

    if (this.components.apartment) {
      parts.push(`кв. ${this.components.apartment}`);
    }

    parts.push(this.components.city);

    return parts.join(', ');
  }

  // Проверка, является ли адрес полным
  isComplete(): boolean {
    return !!(
      this.components.street &&
      this.components.building &&
      this.components.city &&
      this.components.country
    );
  }

  // Проверка, является ли адрес российским
  isRussian(): boolean {
    return this.components.country.toLowerCase() === 'россия' || 
           this.components.country.toLowerCase() === 'russia' ||
           this.components.country.toLowerCase() === 'ru';
  }

  // Получение региона (для российских адресов)
  getRegion(): string | null {
    if (!this.isRussian()) {
      return null;
    }

    return this.components.state || null;
  }

  // Маскирование адреса для безопасности
  getMasked(): string {
    const parts: string[] = [];

    if (this.components.street) {
      const street = this.components.street;
      const maskedStreet = street.length > 4 
        ? `${street.substring(0, 2)}***${street.substring(street.length - 2)}`
        : '***';
      parts.push(maskedStreet);
    }

    if (this.components.building) {
      parts.push('д. ***');
    }

    if (this.components.apartment) {
      parts.push('кв. ***');
    }

    parts.push(this.components.city);

    if (this.components.state) {
      parts.push(this.components.state);
    }

    if (this.components.postalCode) {
      parts.push('***');
    }

    parts.push(this.components.country);

    return parts.join(', ');
  }

  // Статический метод для создания из строки
  static fromString(addressString: string): Address {
    // Простой парсер адреса
    const parts = addressString.split(',').map(part => part.trim());
    
    if (parts.length < 2) {
      throw new DomainException('Invalid address format', 'INVALID_ADDRESS_FORMAT');
    }

    const country = parts[parts.length - 1];
    const city = parts[parts.length - 2];
    
    let street: string | undefined;
    let building: string | undefined;
    let apartment: string | undefined;
    let state: string | undefined;
    let postalCode: string | undefined;

    // Пытаемся извлечь компоненты
    for (let i = 0; i < parts.length - 2; i++) {
      const part = parts[i];
      
      if (part.startsWith('д.')) {
        building = part.substring(2).trim();
      } else if (part.startsWith('кв.')) {
        apartment = part.substring(3).trim();
      } else if (/^\d{6}$/.test(part)) {
        postalCode = part;
      } else if (!street) {
        street = part;
      } else {
        state = part;
      }
    }

    return new Address({
      street,
      city,
      state,
      postalCode,
      country,
      building,
      apartment
    });
  }

  // Создание из объекта
  static fromObject(obj: AddressComponents): Address {
    return new Address(obj);
  }

  // Преобразование в объект
  toObject(): AddressComponents {
    return { ...this.components };
  }

  // Валидация адреса
  static isValid(components: AddressComponents): boolean {
    try {
      new Address(components);
      return true;
    } catch {
      return false;
    }
  }
}



