import { inject, injectable } from 'inversify';
import { LoggerService } from '../services/logger.service';
import { Pool, PoolConnection } from 'mariadb';
import mariadb from 'mariadb';

@injectable()
export class DBConnectionFactory {
  private static pool: Pool;
  private static instance: PoolConnection;
  constructor(@inject('LoggerService') private logger: LoggerService) {}
  public async getConnection(): Promise<PoolConnection> {
    const options = {
      host: process.env.mairaDBhost,
      port: parseInt(process.env.mairaDBport),
      user: process.env.mairaDBuser,
      password: process.env.mairaDBpassword,
      database: process.env.mairaDBdatabase,
      connectionLimit: 3, //1,
    };
    try {
      this.logger.info('DB Connection Factory Get Connection Start', null, this.constructor.name, null);
      if (!DBConnectionFactory.pool) {
        this.logger.info('Create New Pool', null, this.constructor.name, null);
        DBConnectionFactory.pool = mariadb.createPool(options);
      }
      console.log(DBConnectionFactory.pool.activeConnections());
      console.log(DBConnectionFactory.pool.idleConnections());
      console.log(DBConnectionFactory.pool.taskQueueSize());
      console.log(DBConnectionFactory.pool.totalConnections());

      this.logger.info('Get Connection Start', null, this.constructor.name, null);
      if (!DBConnectionFactory.instance) {
        this.logger.info('Create New Connection', null, this.constructor.name, null);
        DBConnectionFactory.instance = await DBConnectionFactory.pool.getConnection();
      }
      console.log(DBConnectionFactory.instance.isValid());

      if (!DBConnectionFactory.instance.isValid()) {
        this.logger.info('Get New Connection', null, this.constructor.name, null);
        DBConnectionFactory.instance = await DBConnectionFactory.pool.getConnection();
      }
      console.log(DBConnectionFactory.instance.isValid());
      this.logger.info('Get Connection End', null, this.constructor.name, null);
    } catch (error) {
      this.logger.error('Get Connection End', error, this.constructor.name, null);
      throw error;
    }
    this.logger.info(
      'DB Connection Factory Get Connection Start',
      DBConnectionFactory.instance,
      this.constructor.name,
      null
    );
    return DBConnectionFactory.instance;
  }
}
