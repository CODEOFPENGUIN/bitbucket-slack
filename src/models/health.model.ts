export interface Health {
  RESULT: string;
}

export interface HealthResult {
  status: string;
  executionTime: number | null;
  errors: string[];
}
