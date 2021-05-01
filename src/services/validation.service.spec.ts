import 'reflect-metadata';
import { describe, it } from 'mocha';
import { expect } from 'chai';

import { ValidationService } from './validation.service';
import { LoggerService } from './logger.service';

import { Target, ActionType } from '../models/validationType.enum';

describe('ValidationService', () => {
  const logger = new LoggerService({
    environmentName: 'unit-test',
    logLevel: 'info',
    region: 'us-west-2',
    releaseVersion: '0.0.1',
  });

  const validationService: ValidationService = new ValidationService(logger);

  describe('isValid()', () => {
    describe('isValid() successfull call', () => {
      it('return true for requested data that getting common code', done => {
        const target = Target.COMMON_CODE;
        const validationType = ActionType.GET;
        const mockData = {
          groupCodeId: 'visit',
          languageCode: 'ko',
        };

        const result = validationService.isValid(target, validationType, mockData);
        expect(result).to.equal(true);
        done();
      });

      it('returns false when invalid data that getting common code given', done => {
        const target = Target.COMMON_CODE;
        const validationType = ActionType.GET;
        const mockData = {
          groupCodeId:
            '01234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890',
          languageCode: 'ko',
        };

        const result = validationService.isValid(target, validationType, mockData);
        expect(result).to.equal(false);
        done();
      });
    });

    describe('isValid() unsuccessful call', () => {
      it('returns false when invalid action type given', done => {
        const target: Target = Target.COMMON_CODE;
        const validationType: ActionType = undefined;
        const mockData = {
          groupCodeId: 'visit',
          languageCode: 'ko',
        };

        const result = validationService.isValid(target, validationType, mockData);
        expect(result).to.equal(false);
        done();
      });

      it('returns false when empty value', done => {
        const target: Target = Target.COMMON_CODE;
        const validationType: ActionType = ActionType.GET;
        const mockData = {};

        const result = validationService.isValid(target, validationType, mockData);
        expect(result).to.equal(false);
        done();
      });
    });
  });
});
