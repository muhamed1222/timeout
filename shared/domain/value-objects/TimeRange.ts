// Value Object для временного интервала
export class TimeRange {
  constructor(
    public readonly start: Date,
    public readonly end: Date
  ) {
    if (start >= end) {
      throw new Error('Start time must be before end time');
    }
  }

  static fromISOString(startISO: string, endISO: string): TimeRange {
    return new TimeRange(new Date(startISO), new Date(endISO));
  }

  static fromHours(startHour: number, endHour: number, date: Date = new Date()): TimeRange {
    const start = new Date(date);
    start.setHours(startHour, 0, 0, 0);
    
    const end = new Date(date);
    end.setHours(endHour, 0, 0, 0);
    
    return new TimeRange(start, end);
  }

  getDurationInMinutes(): number {
    return Math.floor((this.end.getTime() - this.start.getTime()) / (1000 * 60));
  }

  getDurationInHours(): number {
    return this.getDurationInMinutes() / 60;
  }

  overlaps(other: TimeRange): boolean {
    return this.start < other.end && this.end > other.start;
  }

  contains(time: Date): boolean {
    return time >= this.start && time <= this.end;
  }

  isBefore(time: Date): boolean {
    return this.end < time;
  }

  isAfter(time: Date): boolean {
    return this.start > time;
  }

  toString(): string {
    return `${this.start.toISOString()} - ${this.end.toISOString()}`;
  }

  toJSON(): { start: string; end: string } {
    return {
      start: this.start.toISOString(),
      end: this.end.toISOString()
    };
  }
}



