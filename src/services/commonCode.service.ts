import { inject, injectable } from 'inversify';
import { LoggerService } from './logger.service';
import { ValidationService } from './validation.service';
import { Target, ActionType } from '../models/validationType.enum';
import { CommonCodeRepositoryInterface } from '../repositories/commonCode.repository.interface';
import { CommonCode, CommonCodeRequest } from '../models/commonCode.model';
import { CommonCodeQuery } from '../query/commonCode.query';
// import { Pool } from 'mariadb';
import { BadRequestError } from '../errors/badRequest.error';
// import { DBConnectionFactory } from '../utils/dbConnectionFactory.util';

@injectable()
export class CommonCodeService {
  constructor(
    @inject('LoggerService') private logger: LoggerService,
    @inject('ValidationService') private validationService: ValidationService,
    @inject('envConfig') private envConfig: any,
    // @inject('CommonCodeRepositoryInterface')
    // private commonCodeRepositoryInterface: CommonCodeRepositoryInterface,
    // @inject('mariadbPool') protected mariadbPool: DBConnectionFactory
  ) {}

  async getCommonCode(condition: CommonCodeRequest) {
    this.logger.trace('getCommonCode called', { condition }, this.constructor.name, null);

    let connection = null;
    let result: CommonCode[];
    try {
      if (!this.validationService.isValid(Target.COMMON_CODE, ActionType.GET, condition)) {
        this.logger.error('getCommonCode parameter is invalid.', condition, this.constructor.name, null);
        throw new BadRequestError('BadRequestError');
      }

      // connection = await this.mariadbPool.getConnection();

      const params: any[] = [];
      Object.keys(condition).map(key => params.push(condition[key]));

      const query = CommonCodeQuery.getCommonCode;

      // result = await this.commonCodeRepositoryInterface.query<CommonCode>(connection, query, params);
      result = [
        {
          codeName: "TEST",
          codeId: "TESTID"
        }
      ]
    } catch (err) {
      this.logger.error('getCommonCode fail', err, 'CommonCodeService', null);
      throw err;
    } finally {
      /* eslint-disable */
      // if (connection) await connection.release();
      /* eslint-enable */
    }
    return result;
  }
}
