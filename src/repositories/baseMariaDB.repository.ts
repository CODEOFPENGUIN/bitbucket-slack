/*
  Docs for interacting with the DynamoDB Document Client:
  https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/dynamodb-example-document-client.html
*/

import { LoggerService } from '../services/logger.service';
import { inject, injectable } from 'inversify';
import { DBConnectionFactory } from '../utils/dbConnectionFactory.util';

@injectable()
export class BaseMariaDBRepository {
  constructor(
    @inject('LoggerService') protected logger: LoggerService,
    @inject('mariadbPool') protected mariadbPool: DBConnectionFactory
  ) {}

  protected init() {
    this.logger.trace('init() called', this.constructor.name, {});

    // Due to the limitations of the IOC tool, these properties must be passed into an init function, instead
    // of the constructor. Derived classes must call init() as part of their constructor
  }

  protected async query<T>(queryStr: string, parameters?: any[]): Promise<T[]> {
    let result: T[];
    let connection;
    try {
      this.logger.info('query-getConnection-start', null, this.constructor.name, null);
      connection = await this.mariadbPool.getConnection();
      this.logger.info('query-getConnection-end', null, this.constructor.name, null);

      const rows = await connection.query(queryStr, parameters);
      result = rows as T[];
    } catch (err) {
      this.logger.error('query', err, this.constructor.name, null);
      throw err;
    } finally {
      // eslint-disable-next-line
      await connection.release();
    }
    return result;
  }

  protected async execute<T>(queryStr: string, parameters?: any[]): Promise<T> {
    let result: T;
    let connection;
    try {
      this.logger.info('execute-getConnection-start', null, this.constructor.name, null);
      connection = await this.mariadbPool.getConnection();
      this.logger.info('execute-getConnection-end', null, this.constructor.name, null);
      const rows = await connection.query(queryStr, parameters);
      result = rows as T;
    } catch (err) {
      this.logger.error('execute', err, this.constructor.name, null);
      throw err;
    } finally {
      // eslint-disable-next-line
      await connection.release();
    }
    return result;
  }
}
