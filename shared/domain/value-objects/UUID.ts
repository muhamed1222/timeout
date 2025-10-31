export class UUID {
  private readonly value: string;

  constructor(value?: string) {
    if (value) {
      if (!this.isValid(value)) {
        throw new Error(`Invalid UUID: ${value}`);
      }
      this.value = value;
    } else {
      this.value = crypto.randomUUID();
    }
  }

  toString(): string {
    return this.value;
  }

  equals(other: UUID): boolean {
    return this.value === other.value;
  }

  static generate(): UUID {
    return new UUID();
  }

  static fromString(value: string): UUID {
    return new UUID(value);
  }

  static isValid(value: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value);
  }

  private isValid(value: string): boolean {
    return UUID.isValid(value);
  }
}
