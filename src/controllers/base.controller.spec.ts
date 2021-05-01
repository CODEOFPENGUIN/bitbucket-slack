import 'reflect-metadata';
import { describe, beforeEach, it } from 'mocha';
import { expect } from 'chai';
import sinon from 'sinon';

import { BaseController } from './base.controller';
import { BadRequestError } from '../errors/badRequest.error';
import { NotFoundError } from '../errors/notFound.error';
import { ProxyError } from '../errors/proxy.error';
import { UnauthorizedError } from '../errors/unauthorized.error';
import { LoggerService } from '../services/logger.service';
import { MandatoryParamError } from '../errors/mandatoryParam.error';

const envConfig = {
  logLevel: 'info',
  region: process.env.AWS_REGION,
};

describe('BaseController', () => {
  const loggerService = new LoggerService(envConfig);
  let baseController: BaseController;

  beforeEach(() => {
    baseController = new BaseController(loggerService);
  });

  describe('createResponseModel()', () => {
    it('returns a complete ResponseModel object', () => {
      const statusCode = 201;
      const bodyObject = { result: 'Success!' };

      const result = baseController.createResponseModel(statusCode, bodyObject);

      expect(result).not.to.be.undefined; // .toBeDefined();
      expect(result.statusCode).to.be.equal(statusCode); // toBe(statusCode);
      expect(result.headers['Access-Control-Allow-Origin']).not.to.be.undefined; // .toBeDefined();
      expect(result.body).to.be.equal(`{"result":"Success!"}`); // toBe(`{"result":"Success!"}`);
    });
  });

  describe('createSuccessResponse()', () => {
    it('returns a ResponseModel object with success code', () => {
      const resultObject = 'Success!';

      const result = baseController.createSuccessResponse(resultObject);

      expect(result).not.to.be.undefined;
      expect(result.statusCode).to.be.equal(200);
      expect(result.headers['Access-Control-Allow-Origin']).not.to.be.undefined;
      expect(result.body).to.be.equal(`{"result":"Success!"}`);
    });
  });

  describe('createSuccessResponseWithStatusCode() w/ array result', () => {
    it('returns a ResponseModel object with success code', () => {
      const statusCode = 'S';
      const resultObject = ['Success!'];

      const result = baseController.createSuccessResponseWithStatusCode(statusCode, resultObject);

      expect(result).not.to.be.undefined;
      expect(result.statusCode).to.be.equal(200);
      expect(result.headers['Access-Control-Allow-Origin']).not.to.be.undefined;
      expect(result.body).to.be.equal(`{"successOrNot":"Y","statusCode":"S","data":["Success!"],"data_count":1}`);
    });
  });

  describe('createSuccessResponseWithStatusCode() w/ string result', () => {
    it('returns a ResponseModel object with success code', () => {
      const statusCode = 'S';
      const resultObject = 'Success!';

      const result = baseController.createSuccessResponseWithStatusCode(statusCode, resultObject);

      expect(result).not.to.be.undefined;
      expect(result.statusCode).to.be.equal(200);
      expect(result.headers['Access-Control-Allow-Origin']).not.to.be.undefined;
      expect(result.body).to.be.equal(`{"successOrNot":"Y","statusCode":"S","data":"Success!"}`);
    });
  });

  describe('createSuccessResponseWithStatusCode() w/o result', () => {
    it('returns a ResponseModel object with success code', () => {
      const statusCode = 'S';
      const resultObject = null;

      const result = baseController.createSuccessResponseWithStatusCode(statusCode, resultObject);

      expect(result).not.to.be.undefined;
      expect(result.statusCode).to.be.equal(200);
      expect(result.headers['Access-Control-Allow-Origin']).not.to.be.undefined;
      expect(result.body).to.be.equal(`{"successOrNot":"Y","statusCode":"S"}`);
    });
  });

  describe('createErrorResponse()', () => {
    it('returns a ResponseModel object with standard error format', () => {
      const errorCode = 500;
      const message = 'Error!';
      const data: Error = { name: 'test', message: 'test', stack: 'error context' };

      const result = baseController.createErrorResponse(errorCode, message, data);

      expect(result).not.to.be.undefined;
      expect(result.statusCode).to.be.equal(errorCode);
      expect(result.headers['Access-Control-Allow-Origin']).not.to.be.undefined;
      expect(result.body).to.be.equal(`{"successOrNot":"N","statusCode":"test","data":{"msg":"Error!"}}`);
    });

    it('returns a ResponseModel object with standard error format when typeof data === string', () => {
      const errorCode = 500;
      const message = 'Error!';
      const data: Error = { name: 'test', message: 'test', stack: 'error context' };

      const result = baseController.createErrorResponse(errorCode, message, data);

      expect(result).not.to.be.undefined;
      expect(result.statusCode).to.be.equal(errorCode);
      expect(result.headers['Access-Control-Allow-Origin']).not.to.be.undefined;
      expect(result.body).to.be.equal(`{"successOrNot":"N","statusCode":"test","data":{"msg":"Error!"}}`);
    });
  });

  describe('createSuccessWithBusinessErrorResponse()', () => {
    it('returns a ResponseModel object with standard server error code', () => {
      const expectedErrorCode = 200;
      const data = 'NO_MEMBER';

      const result = baseController.createSuccessWithBusinessErrorResponse(data, null);

      expect(result).not.to.be.undefined;
      expect(result.statusCode).to.be.equal(expectedErrorCode);
      expect(result.body).to.be.equal(`{"successOrNot":"N","statusCode":"NO_MEMBER"}`);
    });
  });

  describe('createSuccessWithBusinessErrorResponse() w/ array result', () => {
    it('returns a ResponseModel object with success code', () => {
      const statusCode = 'NO_MEMBER';
      const resultObject = ['BUSINESS_ERROR!'];

      const result = baseController.createSuccessWithBusinessErrorResponse(statusCode, resultObject);

      expect(result).not.to.be.undefined;
      expect(result.statusCode).to.be.equal(200);
      expect(result.headers['Access-Control-Allow-Origin']).not.to.be.undefined;
      expect(result.body).to.be.equal(
        `{"successOrNot":"N","statusCode":"NO_MEMBER","data":["BUSINESS_ERROR!"],"data_count":1}`
      );
    });
  });

  describe('handleServiceErrors()', () => {
    it('returns a 400 error code for a "Bad Request" error', () => {
      const expectedErrorCode = 400;
      const error = new BadRequestError('BadRequestError');

      const result = baseController.handleServiceErrors(error);

      expect(result.statusCode).to.be.equal(expectedErrorCode);
    });

    it('returns a 200 error code for a "Mandatory Param" error', () => {
      const expectedErrorCode = 200;
      const error = new MandatoryParamError('MandatoryParamError');

      const result = baseController.handleServiceErrors(error);

      expect(result.statusCode).to.be.equal(expectedErrorCode);
    });

    it(`returns a 401 error code for an "Unauthorized" error`, () => {
      const expectedErrorCode = 401;
      const error = new UnauthorizedError('UnauthorizedError');

      const result = baseController.handleServiceErrors(error);

      expect(result.statusCode).to.be.equal(expectedErrorCode);
    });

    it(`returns a 404 error code for a "Not Found" error`, () => {
      const expectedErrorCode = 404;
      const error = new NotFoundError('NotFoundError');

      const result = baseController.handleServiceErrors(error);

      expect(result.statusCode).to.be.equal(expectedErrorCode);
    });

    it(`returns a 504 error code for a "Gateway Timeout" error`, () => {
      const expectedErrorCode = 504;
      const error = new ProxyError('ProxyError');

      const result = baseController.handleServiceErrors(error);

      expect(result.statusCode).to.be.equal(expectedErrorCode);
    });

    it('returns a 500 error code for an unexpected error', () => {
      const expectedErrorCode = 200;
      const error = new Error('unexpected error');

      const result = baseController.handleServiceErrors(error);

      expect(result.statusCode).to.be.equal(expectedErrorCode);
    });
  });

  describe('verifyRequiredParameters()', () => {
    let mockEvent;

    beforeEach(() => {
      sinon.spy(baseController, 'verifyRequiredParameters');

      mockEvent = {
        queryStringParameters: {
          a: 'valueA',
          b: 'valueB',
        },
        body: JSON.stringify({
          c: 'valueC',
          d: 'valueD',
        }),
        headers: {
          'Content-Type': 'application/json',
          'X-Correlation-Id': '12345',
        },
        requestContext: {
          authorizer: {
            'X-Session-Info': "\"{'memberId': '1'}\"",
          },
        },
      };
    });

    it('confirms that all required params are present', () => {
      const testFunction = () => baseController.verifyRequiredParameters(mockEvent, ['a', 'b'], ['c', 'd'], null);

      expect(testFunction).to.not.throw();
    });

    it('recognizes an ALL CAPS "X-CORRELATION-ID" header', () => {
      mockEvent.headers['X-CORRELATION-ID'] = mockEvent.headers['X-Correlation-Id'];
      delete mockEvent.headers['X-Correlation-Id'];

      const testFunction = () => baseController.verifyRequiredParameters(mockEvent, ['a', 'b'], ['c', 'd'], null);

      expect(testFunction).to.not.throw();
    });

    it('recognizes a lowercase "x-correlation-id" header', () => {
      mockEvent.headers['x-correlation-id'] = mockEvent.headers['X-Correlation-Id'];
      delete mockEvent.headers['X-Correlation-Id'];

      const testFunction = () => baseController.verifyRequiredParameters(mockEvent, ['a', 'b'], ['c', 'd'], null);

      expect(testFunction).to.not.throw();
    });

    it('recognizes a mixed-case "X-CoRrElAtIoN-iD" header', () => {
      mockEvent.headers['X-CoRrElAtIoN-iD'] = mockEvent.headers['X-Correlation-Id'];
      delete mockEvent.headers['X-Correlation-Id'];

      const testFunction = () => baseController.verifyRequiredParameters(mockEvent, ['a', 'b'], ['c', 'd'], null);

      expect(testFunction).to.not.throw();
    });

    it('empty "X-Correlation-Id" header', () => {
      mockEvent.headers['X-Correlation-Id'] = '';

      const testFunction = () => baseController.verifyRequiredParametersByType(mockEvent, ['a', 'b'], ['c', 'd'], null);

      expect(testFunction).to.throw();
    });

    it('recognizes a lowercase "X-Language-Code" header', () => {
      mockEvent.headers['X-Language-Code'] = 'en';

      const testFunction = () =>
        baseController.verifyRequiredParameters(mockEvent, ['a', 'b'], ['c', 'd'], null);

      expect(testFunction).to.not.throw();
    });

    it('throws an error when the body is not proper JSON', () => {
      mockEvent.body = `{badJson: "invalid"}`;

      const testFunction = () => baseController.verifyRequiredParameters(mockEvent, ['a', 'b'], ['c', 'd'], null);

      expect(testFunction).to.throw(BadRequestError);
    });

    it('throws an error when the event is missing the queryStringParameters', () => {
      const expectedErrorMessage = `Request event is malformed. The "queryStringParameters" object is missing.`;
      delete mockEvent.queryStringParameters;

      const testFunction = () => baseController.verifyRequiredParameters(mockEvent, ['a', 'b'], ['c', 'd'], null);

      expect(testFunction).to.throw(MandatoryParamError, expectedErrorMessage);
    });

    it('throws an error when the event is missing the body', () => {
      const expectedErrorMessage = `Request event is malformed. The "body" object is missing.`;
      delete mockEvent.body;

      const testFunction = () => baseController.verifyRequiredParameters(mockEvent, ['a', 'b'], ['c', 'd'], null);

      expect(testFunction).to.throw(MandatoryParamError, expectedErrorMessage);
    });

    it('throws an error when the event is missing the header', () => {
      const expectedErrorMessage = `Event headers are missing or malformed.`;
      delete mockEvent.headers;

      const testFunction = () => baseController.verifyRequiredParametersByType(mockEvent, ['a', 'b'], ['c', 'd'], null);

      expect(testFunction).to.throw(BadRequestError, expectedErrorMessage);
    });

    it('throws an error when the query string is missing required params', () => {
      const expectedErrorMessage = `The parameter "e" is required in the request's queryStringParameters.`;

      const testFunction = () => baseController.verifyRequiredParameters(mockEvent, ['a', 'b', 'e'], ['c', 'd'], null);

      expect(testFunction).to.throw(MandatoryParamError, expectedErrorMessage);
    });

    it('throws an error when the body is missing required params', () => {
      const expectedErrorMessage = `The parameter "f" is required in the request's body.`;

      const testFunction = () => baseController.verifyRequiredParameters(mockEvent, null, ['f'], null);

      expect(testFunction).to.throw(MandatoryParamError, expectedErrorMessage);
    });
  });

  describe('verifyRequiredParametersByType()', () => {
    let mockEvent;

    beforeEach(() => {
      sinon.spy(baseController, 'verifyRequiredParametersByType');

      mockEvent = {
        queryStringParameters: {
          keyA: 'valueA',
          keyB: 'valueB',
        },
        body: JSON.stringify({
          keyString: 'key',
          valueString: 'value',
        }),
        headers: {
          'Content-Type': 'application/json',
          'X-Correlation-Id': '12345',
        },
        requestContext: {
          authorizer: {
            'X-Session-Info': "\"{'memberId': '1'}\"",
          },
        },
      };
    });

    it('confirms that all required params are present', () => {
      const result = baseController.verifyRequiredParametersByType(
        mockEvent,
        ['keyA', 'keyB'],
        ['keyString', 'valueString'],
        null
      );

      expect(result).not.to.be.an('error');
    });

    it('throws an error when the event is missing the body', () => {
      const expectedErrorMessage = `Request event is malformed. The "body" object is missing.`;
      delete mockEvent.body;

      try {
        baseController.verifyRequiredParametersByType(mockEvent, ['keyA', 'keyB'], ['keyString', 'valueString'], null);
      } catch (error) {
        expect(error).to.be.an.instanceof(MandatoryParamError, expectedErrorMessage);
      }
    });

    it('throws an error when the body is not proper JSON', () => {
      mockEvent.body = `{badJson: "invalid"}`;

      try {
        baseController.verifyRequiredParametersByType(mockEvent, ['keyA', 'keyB'], ['keyString', 'valueString'], null);
      } catch (error) {
        expect(error).to.be.an.instanceof(BadRequestError);
      }
    });
  });
});
