import { inject, injectable } from 'inversify';
import { LoggerService } from './logger.service';
import { HealthRepositoryInterface } from '../repositories/health.repository.interface';
import { Health, HealthResult } from '../models/health.model';

@injectable()
export class HealthService {
  constructor(
    @inject('LoggerService') private logger: LoggerService,
    @inject('envConfig') private envConfig: any,
    @inject('HealthRepositoryInterface')
    private healthRepositoryInterface: HealthRepositoryInterface
  ) {}

  getHealth = async (options): Promise<HealthResult> => {
    this.logger.trace('getHealth called', null, this.constructor.name, null);

    const startTime = Date.now();

    // Setup the result object
    const result: HealthResult = {
      status: '',
      executionTime: null,
      errors: [],
    };

    const res = await this.healthRepositoryInterface.testHealthConnection<Health>();
    if (res.length == 0) {
      result.status = 'fail';
      result.errors.push('length 0');
    } else if (res[0].RESULT === 'Y') {
      result.status = 'pass';
    } else {
      result.status = 'fail';
      result.errors.push('result not matched');
    }

    // Record the total execution time
    result.executionTime = Date.now() - startTime;

    return result;
  };
}
