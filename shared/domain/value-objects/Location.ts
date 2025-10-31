// Value Object для геолокации
export class Location {
  constructor(
    public readonly latitude: number,
    public readonly longitude: number
  ) {
    if (latitude < -90 || latitude > 90) {
      throw new Error(`Invalid latitude: ${latitude}. Must be between -90 and 90`);
    }
    if (longitude < -180 || longitude > 180) {
      throw new Error(`Invalid longitude: ${longitude}. Must be between -180 and 180`);
    }
  }

  static fromObject(location: { latitude: number; longitude: number }): Location {
    return new Location(location.latitude, location.longitude);
  }

  static fromGeolocationPosition(position: GeolocationPosition): Location {
    return new Location(position.coords.latitude, position.coords.longitude);
  }

  distanceTo(other: Location): number {
    // Формула гаверсинуса для расчета расстояния между двумя точками
    const R = 6371; // Радиус Земли в километрах
    const dLat = this.toRadians(other.latitude - this.latitude);
    const dLon = this.toRadians(other.longitude - this.longitude);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(this.latitude)) * Math.cos(this.toRadians(other.latitude)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  isWithinRadius(other: Location, radiusKm: number): boolean {
    return this.distanceTo(other) <= radiusKm;
  }

  toString(): string {
    return `${this.latitude}, ${this.longitude}`;
  }

  toJSON(): { latitude: number; longitude: number } {
    return {
      latitude: this.latitude,
      longitude: this.longitude
    };
  }
}



