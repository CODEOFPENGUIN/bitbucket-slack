export interface HealthRepositoryInterface {
  testHealthConnection<T>(): Promise<T[]>;
}
