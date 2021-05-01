import 'reflect-metadata';
import { describe, beforeEach, it } from 'mocha';
import { expect } from 'chai';
import sinon from 'sinon';

import { HealthController } from './health.controller';
import { LoggerService } from '../services/logger.service';
import { APIGatewayProxyEvent, APIGatewayEventRequestContext } from 'aws-lambda';
import { HealthResult } from '../models/health.model';

describe('HealthController', () => {
  let healthController: HealthController;
  const healthService: any = {};
  const logger = new LoggerService({
    environmentName: 'unit-test',
    logLevel: 'info',
    region: 'us-west-2',
    releaseVersion: '0.0.1',
  });
  describe('getHealth()', function() {
    describe('getHealth() successfull call', function() {
      let mockAPIGatewayProxyEvent: APIGatewayProxyEvent;
      let mockRequestContext: APIGatewayEventRequestContext;
      let mockHealthCheckResult: HealthResult;

      beforeEach(() => {
        mockRequestContext = {
          accountId: '',
          apiId: '',
          authorizer: {
            TEMP: 'None'
          },
          httpMethod: 'GET',
          identity: {
            accessKey: null,
            accountId: null,
            apiKey: null,
            apiKeyId: null,
            caller: null,
            cognitoAuthenticationProvider: null,
            cognitoAuthenticationType: null,
            cognitoIdentityId: null,
            cognitoIdentityPoolId: null,
            principalOrgId: null,
            sourceIp: '',
            user: null,
            userAgent: null,
            userArn: null,
          },
          protocol: '',
          messageDirection: '',
          messageId: null,
          path: '',
          stage: '',
          requestId: '',
          requestTimeEpoch: 0,
          resourceId: '',
          resourcePath: '',
        };
        mockAPIGatewayProxyEvent = {
          body: '',
          headers: {},
          multiValueHeaders: {},
          httpMethod: 'GET',
          isBase64Encoded: false,
          path: '/health',
          pathParameters: {},
          queryStringParameters: { forceComponentFailure: '' },
          multiValueQueryStringParameters: {},
          stageVariables: {},
          requestContext: mockRequestContext,
          resource: '',
        };
        mockHealthCheckResult = {
          status: 'pass',
          executionTime: 25,
          errors: [],
        };
        healthService.getHealth = sinon.fake.resolves(mockHealthCheckResult);
        healthController = new HealthController(logger, healthService);
      });

      it('returns a defined response', done => {
        healthController
          .getHealth(mockAPIGatewayProxyEvent)
          .then(response => {
            expect(response).to.be.not.undefined;
            done();
          })
          .catch(error => {
            done(error);
          });
      });

      it('returns a 200 status code when status:pass', done => {
        healthController
          .getHealth(mockAPIGatewayProxyEvent)
          .then(response => {
            expect(response.statusCode).to.be.equal(200);
            done();
          })
          .catch(error => {
            done(error);
          });
      });

      it('returns a 503 status code when status:fail', done => {
        const mockHealthCheckFailResult: HealthResult = {
          status: 'fail',
          executionTime: 25,
          errors: [],
        };
        healthService.getHealth = sinon.fake.resolves(mockHealthCheckFailResult);
        healthController
          .getHealth(mockAPIGatewayProxyEvent)
          .then(response => {
            expect(response.statusCode).to.be.equal(503);
            done();
          })
          .catch(error => {
            done(error);
          });
      });

      it('calls getHealth() one time', done => {
        sinon.spy(healthController, 'getHealth');
        healthController
          .getHealth(mockAPIGatewayProxyEvent)
          .then(response => {
            expect(healthService.getHealth.calledOnce);
            done();
          })
          .catch(error => {
            done(error);
          });
      });
    });

    describe('getHealth() unsuccessful call', function() {
      const errorResult = new Error('Could not DescribeTable for Visit MariaDB table');

      let mockAPIGatewayProxyEvent: APIGatewayProxyEvent;
      let mockRequestContext: APIGatewayEventRequestContext;
      beforeEach(() => {
        mockRequestContext = {
          accountId: '',
          apiId: '',
          authorizer: {
            TEMP: 'None'
          },
          httpMethod: 'GET',
          identity: {
            accessKey: null,
            accountId: null,
            apiKey: null,
            apiKeyId: null,
            caller: null,
            cognitoAuthenticationProvider: null,
            cognitoAuthenticationType: null,
            cognitoIdentityId: null,
            cognitoIdentityPoolId: null,
            principalOrgId: null,
            sourceIp: '',
            user: null,
            userAgent: null,
            userArn: null,
          },
          protocol: '',
          messageDirection: '',
          messageId: null,
          path: '',
          stage: '',
          requestId: '',
          requestTimeEpoch: 0,
          resourceId: '',
          resourcePath: '',
        };
        mockAPIGatewayProxyEvent = {
          body: '',
          headers: {},
          multiValueHeaders: {},
          httpMethod: 'GET',
          isBase64Encoded: false,
          path: '/health',
          pathParameters: {},
          queryStringParameters: {},
          multiValueQueryStringParameters: {},
          stageVariables: {},
          requestContext: mockRequestContext,
          resource: '',
        };

        healthService.getHealth = sinon.fake.rejects(errorResult);
        healthController = new HealthController(logger, healthService);
      });

      // eslint-disable-next-line
      it('returns a defined response', done => {
        healthController
          .getHealth(mockAPIGatewayProxyEvent)
          .then(response => {
            expect(response).to.be.not.undefined;
            done();
          })
          .catch(error => {
            done(error);
          });
      });

      it('returns 200 status code', done => {
        const fake500Error = new Error('Error!');
        healthService.getHealth = sinon.fake.rejects(fake500Error);
        healthController
          .getHealth(mockAPIGatewayProxyEvent)
          .then(response => {
            expect(response.statusCode).to.be.equal(200);
            done();
          })
          .catch(error => {
            done(error);
          });
      });

      // eslint-disable-next-line
      it('calls getHealth() one time', done => {
        sinon.spy(healthController, 'getHealth');
        healthController
          .getHealth(mockAPIGatewayProxyEvent)
          .then(response => {
            expect(healthService.getHealth.calledOnce);
            done();
          })
          .catch(error => {
            done(error);
          });
      });
    });
  });
});
