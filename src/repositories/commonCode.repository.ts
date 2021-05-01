import { inject, injectable } from 'inversify';
import { LoggerService } from '../services/logger.service';
import { CommonCodeQuery, CommonCodeQueryString } from '../query/commonCode.query';

@injectable()
export class CommonCodeRepository {
  constructor(@inject('LoggerService') private logger: LoggerService) {}

  async query<T>(connection: any, query: CommonCodeQuery, params: any[]): Promise<T[]> {
    this.logger.trace('query() called', { query, params }, this.constructor.name, null);

    return await connection.query(CommonCodeQueryString[query], params);
  }
}
