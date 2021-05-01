import 'reflect-metadata';
import { describe, it } from 'mocha';
import { expect } from 'chai';
import sinon from 'sinon';

import { HealthService } from './health.service';
import { LoggerService } from './logger.service';
import { Health } from '../models/health.model';

describe('HealthService', () => {
  const logger = new LoggerService({
    environmentName: 'unit-test',
    logLevel: 'info',
    region: 'us-west-2',
    releaseVersion: '0.0.1',
  });
  const envConfig = {
    logLevel: 'info',
    region: process.env.AWS_REGION,
  };
  const healthRepository: any = {};
  healthRepository.testHealthConnection = sinon.stub();

  const healthService: HealthService = new HealthService(logger, envConfig, healthRepository);

  const options = { forceComponentFailure: false };

  describe('getHealth()', () => {
    describe('getHealth() successfull call', () => {
      it('returns a defined response', done => {
        const result: Health = {
          RESULT: 'Y',
        };
        healthRepository.testHealthConnection.returns([result]);

        healthService
          .getHealth(options)
          .then(response => {
            expect(response.status).to.equal('pass');
            done();
          })
          .catch(error => {
            done(error);
          });
      });
    });

    describe('getHealth() unsuccessful call', () => {
      it('returns a defined response', done => {
        healthRepository.testHealthConnection.returns([]);
        healthService
          .getHealth(healthService)
          .then(response => {
            expect(response.status).to.equal('fail');
            expect(response.errors[0]).to.equal('length 0');
            done();
          })
          .catch(error => {
            done(error);
          });
      });

      it('result not matched', done => {
        const result: Health = {
          RESULT: 'X',
        };
        healthRepository.testHealthConnection.returns([result]);
        healthService
          .getHealth(healthService)
          .then(response => {
            expect(response.status).to.equal('fail');
            expect(response.errors[0]).to.equal('result not matched');
            done();
          })
          .catch(error => {
            done(error);
          });
      });
    });
  });
});
