import { inject, injectable } from 'inversify';
import { LoggerService } from '../services/logger.service';
import { BaseMariaDBRepository } from './baseMariaDB.repository';

@injectable()
export class HealthRepository extends BaseMariaDBRepository {
  constructor(
    @inject('LoggerService') logger: LoggerService,
    @inject('envConfig') envConfig: any,
    @inject('mariadbPool') mariadbPool: any
  ) {
    // super(logger, mysql);
    super(logger, mariadbPool);
    this.init();
  }

  async testHealthConnection<T>(): Promise<T[]> {
    this.logger.trace('testHealthConnection() called', null, this.constructor.name, null);

    const queryStr = 'SELECT "Y" AS RESULT';

    return this.query<T>(queryStr);
  }
}
