import { LoggerService } from './logger.service';
import { inject, injectable } from 'inversify';
import { Target, ActionType } from '../models/validationType.enum';
import { commonCodeSchema } from '../models/commonCode.model';

@injectable()
export class ValidationService {
  constructor(@inject('LoggerService') private logger: LoggerService) {}

  isValid(target: Target, validationType: ActionType, value: object) {
    this.logger.trace('isValid called.', value, this.constructor.name, null);

    if (typeof value !== 'object' || Object.keys(value).length === 0) {
      return false;
    }

    const schema = this.getValidationSchema(target, validationType);

    if (!schema) {
      return false;
    }

    return schema.isValidSync(value);
  }

  private getValidationSchema(target: Target, validationType: ActionType) {
    this.logger.trace('getValidationSchema called.', { target, validationType }, this.constructor.name, null);

    let schema = null;

    if (target === Target.COMMON_CODE) {
      schema = commonCodeSchema[validationType];
    }

    return schema;
  }
}
