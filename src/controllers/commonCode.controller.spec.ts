import 'reflect-metadata';
import { describe, beforeEach, it } from 'mocha';
import { expect } from 'chai';
import sinon from 'sinon';

import { CommonCodeController } from './commonCode.controller';
import { LoggerService } from '../services/logger.service';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { CommonCode } from '../models/commonCode.model';
import { StatusCode } from '../errors/statusCode';


describe('CommonCodeController', () => {
  const logger = new LoggerService({
    environmentName: 'unit-test',
    logLevel: 'info',
    region: 'us-west-2',
    releaseVersion: '0.0.1',
  });
  const mockCommonCodeService: any = {};
  let commonCodeController: CommonCodeController;

  describe('getCommonCode()', function () {
    const mockGroupCodeId = 'visit';
    const mockLanguageCode = 'ko';

    describe('getCommonCode() successfull call', function () {
      let mockAPIGatewayProxyEvent: APIGatewayProxyEvent;
      let mockResult: CommonCode[];

      beforeEach(() => {
        mockAPIGatewayProxyEvent = {
          body: '',
          headers: {
            'Content-Type': 'application/json',
            'X-Correlation-Id': JSON.stringify({
              correlationId: '12345',
            }),
            'X-Language-Code': 'ko',
            'X-Session-Id': '20200131033124:de607ad9-0774-4d4e-8ebb-75262fb70c72',
            'X-Session-Info': JSON.stringify({
              memberId: 2001,
              memberTypeCode: "EMP",
              memberName: "test_user"
            })
          },
          multiValueHeaders: {},
          httpMethod: 'GET',
          isBase64Encoded: false,
          path: '/common/v1/commonCode',
          pathParameters: {},
          queryStringParameters: {
            groupCodeId: mockGroupCodeId,
            languageCode: mockLanguageCode,
          },
          multiValueQueryStringParameters: {},
          stageVariables: {},
          requestContext: null,
          resource: '',
        };
        mockResult = [
          {
            codeName: '회의',
            codeId: 'C0042',
          },
          {
            codeName: '업무,프로젝트',
            codeId: 'C0043',
          },
          {
            codeName: '물품 반출입',
            codeId: 'C0045',
          },
        ];

        mockCommonCodeService.getCommonCode = sinon.fake.resolves(mockResult);
        commonCodeController = new CommonCodeController(logger, mockCommonCodeService);
      });

      it('returns a defined response', done => {
        commonCodeController
          .getCommonCode(mockAPIGatewayProxyEvent)
          .then(response => {
            expect(response).to.be.not.undefined;
            done();
          })
          .catch(error => {
            done(error);
          });
      });

      it('returns a 200 status code when valid group code id is given', done => {
        commonCodeController
          .getCommonCode(mockAPIGatewayProxyEvent)
          .then(response => {
            const body = JSON.parse(response.body);

            expect(response.statusCode).to.be.equal(200);
            expect(body.successOrNot).to.be.equal('Y');
            expect(body.statusCode).to.be.string(StatusCode.SUCCESS);
            done();
          })
          .catch(error => {
            done(error);
          });
      });

      it('calls getCommonCode() one time', done => {
        commonCodeController
          .getCommonCode(mockAPIGatewayProxyEvent)
          .then(response => {
            expect(mockCommonCodeService.getCommonCode.calledOnce);
            done();
          })
          .catch(error => {
            done(error);
          });
      });
    });

    describe('getCommonCode() unsuccessful call', function () {
      let mockAPIGatewayProxyEvent: APIGatewayProxyEvent;

      it('returns 200 status code with business error body', done => {
        mockCommonCodeService.getCommonCode = sinon.fake.throws(new Error());
        commonCodeController
          .getCommonCode(mockAPIGatewayProxyEvent)
          .then(response => {
            const body = JSON.parse(response.body);

            expect(response.statusCode).to.be.equal(200);
            expect(body.successOrNot).to.be.equal('N');
            expect(body.statusCode).to.be.string(StatusCode.FAIL);
            done();
          })
          .catch(error => {
            done(error);
          });
      });

      it('returns 200 status code with business error body when result is empty', done => {
        mockAPIGatewayProxyEvent = {
          body: '',
          headers: {
            'Content-Type': 'application/json',
            'X-Correlation-Id': JSON.stringify({
              correlationId: '12345',
            }),
            'X-Language-Code': 'ko',
            'X-Session-Id': '20200131033124:de607ad9-0774-4d4e-8ebb-75262fb70c72',
            'X-Session-Info': JSON.stringify({
              memberId: 2001,
              memberTypeCode: "EMP",
              memberName: "test_user"
            })
          },
          multiValueHeaders: {},
          httpMethod: 'GET',
          isBase64Encoded: false,
          path: '/common/v1/commonCode',
          pathParameters: {},
          queryStringParameters: {
            groupCodeId: mockGroupCodeId,
            languageCode: mockLanguageCode,
          },
          multiValueQueryStringParameters: {},
          stageVariables: {},
          requestContext: null,
          resource: '',
        };
        mockCommonCodeService.getCommonCode = sinon.fake.resolves([]);
        commonCodeController
          .getCommonCode(mockAPIGatewayProxyEvent)
          .then(response => {
            const body = JSON.parse(response.body);

            expect(response.statusCode).to.be.equal(200);
            expect(body.successOrNot).to.be.equal('Y');
            done();
          })
          .catch(error => {
            done(error);
          });
      });

      it('returns 200 status code with business error body when group code id parameter is not given', done => {
        mockAPIGatewayProxyEvent = {
          body: '',
          headers: {
            'Content-Type': 'application/json',
            'X-Correlation-Id': JSON.stringify({
              correlationId: '12345',
            }),
            'X-Language-Code': 'ko',
            'X-Session-Id': '20200131033124:de607ad9-0774-4d4e-8ebb-75262fb70c72',
            'X-Session-Info': JSON.stringify({
              memberId: 2001,
              memberTypeCode: "EMP",
              memberName: "test_user"
            })
          },
          multiValueHeaders: {},
          httpMethod: 'GET',
          isBase64Encoded: false,
          path: '/common/v1/commonCode',
          pathParameters: {},
          queryStringParameters: {},
          multiValueQueryStringParameters: {},
          stageVariables: {},
          requestContext: null,
          resource: '',
        };

        commonCodeController
          .getCommonCode(mockAPIGatewayProxyEvent)
          .then(response => {
            const body = JSON.parse(response.body);

            expect(response.statusCode).to.be.equal(200);
            expect(body.successOrNot).to.be.equal('N');
            expect(body.statusCode).to.be.string(StatusCode.INVALID_PARAMETER);
            done();
          })
          .catch(error => {
            done(error);
          });
      });
    });
  });
});
