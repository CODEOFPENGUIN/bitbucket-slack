import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { BadRequestError } from '../errors/badRequest.error';
import { MandatoryParamError } from '../errors/mandatoryParam.error';
import { ProxyError } from '../errors/proxy.error';
import { UnauthorizedError } from '../errors/unauthorized.error';
import { NotFoundError } from '../errors/notFound.error';
import { LoggerService } from '../services/logger.service';
import { inject, injectable } from 'inversify';
import { StatusCode } from '../errors/statusCode';
import { Header } from '../models/enum/header.enums';
import { LanguageCode } from '../models/enum/languageCode.enum';

@injectable()
export class BaseController {
  protected HTTP_CODE_OK = 200;
  protected HTTP_CODE_CREATE_OK = 201;
  protected HTTP_CODE_BAD_REQUEST = 400;
  protected HTTP_CODE_UNAUTHORIZED = 401;
  protected HTTP_CODE_NOT_FOUND = 404;
  protected HTTP_CODE_INTERNAL_SERVER_ERROR = 500;
  protected HTTP_CODE_SERVICE_UNAVAILABLE = 503;
  protected HTTP_CODE_GATEWAY_TIMEOUT = 504;

  constructor(@inject('LoggerService') protected logger: LoggerService) { }

  createResponseModel<T>(statusCode: number, bodyObject: T): APIGatewayProxyResult {
    const logObject = { statusCode: statusCode, bodyObject: bodyObject };
    this.logger.trace('Creating response', logObject, this.constructor.name, null);

    return {
      statusCode: statusCode,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(bodyObject),
    };
  }

  createSuccessResponse<T>(resultObject: T): APIGatewayProxyResult {
    const bodyObject = {
      result: resultObject,
    };

    return this.createResponseModel(this.HTTP_CODE_OK, bodyObject);
  }

  createSuccessResponseWithStatusCode<T>(statusCode: number | string, resultObject: T): APIGatewayProxyResult {
    const bodyObject = {
      successOrNot: 'Y',
      statusCode: statusCode,
    };

    if (resultObject) {
      bodyObject['data'] = resultObject;
    }
    if (Array.isArray(resultObject)) {
      bodyObject['data_count'] = resultObject.length;
    }

    return this.createResponseModel(this.HTTP_CODE_OK, bodyObject);
  }

  createSuccessWithBusinessErrorResponse<T>(statusCode: number | string, resultObject: T): APIGatewayProxyResult {
    const bodyObject = {
      successOrNot: 'N',
      statusCode: statusCode,
    };

    if (resultObject) {
      bodyObject['data'] = resultObject;
    }
    if (Array.isArray(resultObject)) {
      bodyObject['data_count'] = resultObject.length;
    }

    return this.createResponseModel(this.HTTP_CODE_OK, bodyObject);
  }

  createErrorResponse(errorCode: number, message: string, error: Error): APIGatewayProxyResult {
    const bodyObject = {
      successOrNot: 'N',
      statusCode: error.name,
      data: { msg: message },
    };

    this.logger.error('Service Error Occured', error.message, this.constructor.name, null);

    return this.createResponseModel(errorCode, bodyObject);
  }

  handleServiceErrors(error: Error): APIGatewayProxyResult {
    // Handle errors
    if (error instanceof BadRequestError) {
      return this.createErrorResponse(this.HTTP_CODE_BAD_REQUEST, error.message, error);
    } else if (error instanceof MandatoryParamError) {
      const bodyObject = {
        successOrNot: 'N',
        statusCode: StatusCode.MANDATORY_PARAM_ERR,
        data: { msg: error.message },
      };
      return this.createResponseModel(this.HTTP_CODE_OK, bodyObject);
    } else if (error instanceof UnauthorizedError) {
      return this.createErrorResponse(this.HTTP_CODE_UNAUTHORIZED, error.message, error);
    } else if (error instanceof NotFoundError) {
      return this.createErrorResponse(this.HTTP_CODE_NOT_FOUND, error.message, error);
    } else if (error instanceof ProxyError) {
      return this.createErrorResponse(this.HTTP_CODE_GATEWAY_TIMEOUT, error.message, error);
    } else {
      return this.createErrorResponse(this.HTTP_CODE_OK, 'An unexpected error occurred!', error);
    }
  }

  // verifyRequiredParameters() collects errors about missing params and throws an Error if any are missing
  // This function also parses the event.body from JSON into an object
  verifyRequiredParameters(
    eventObject: APIGatewayProxyEvent,
    requiredQueryStringParams: string[],
    requiredRequestBodyParams: string[],
    requiredPathParams: string[]
  ): void {
    const queryStringPropertyName = 'queryStringParameters';
    const requestBodyPropertyName = 'body';
    const pathPropertyName = 'pathParameters';
    let errors = [];
    const defaultLanguageCode = 'ko';

    this.logger.trace(
      'verifyRequiredParameters() called',
      { qs: requiredQueryStringParams, body: requiredRequestBodyParams },
      this.constructor.name,
      {}
    );

    this.extractCorrelationObject(eventObject);
    const languageCode = eventObject.headers[Header.LANGUAGE_CODE];

    if (!languageCode || languageCode == '') {
      eventObject.headers[Header.LANGUAGE_CODE] = defaultLanguageCode;
    }

    if (eventObject.body) {
      try {
        // tslint:disable-next-line: no-console
        eventObject.body = JSON.parse(eventObject.body);
      } catch (parseError) {
        throw new BadRequestError(parseError.message);
      }
    }

    errors = errors.concat(this.processPropertySet(eventObject, pathPropertyName, requiredPathParams));
    errors = errors.concat(this.processPropertySet(eventObject, queryStringPropertyName, requiredQueryStringParams));
    errors = errors.concat(this.processPropertySet(eventObject, requestBodyPropertyName, requiredRequestBodyParams));

    // If there are any errors, throw an Error object with all of the messages
    if (errors.length > 0) {
      throw new MandatoryParamError(errors.join(' '));
    }
  }

  // verifyRequiredParameters() collects errors about missing params and throws an Error if any are missing
  // This function also parses the event.body from JSON into an object
  verifyRequiredParametersByType<T>(
    eventObject: APIGatewayProxyEvent,
    requiredQueryStringParams: string[],
    requiredRequestBodyParams: string[],
    requiredPathParams: string[]
  ): T {
    let result: T = null;
    this.logger.trace(
      'verifyRequiredParametersByType() called',
      { qs: requiredQueryStringParams, body: requiredRequestBodyParams },
      this.constructor.name,
      {}
    );

    if (eventObject.headers) {
      this.setHeaderForLowerCase(eventObject);
      const languageCode = eventObject.headers[Header.LANGUAGE_CODE];

      if (!languageCode || languageCode == '') {
        eventObject.headers[Header.LANGUAGE_CODE] = LanguageCode.ko;
      }
    }

    this.extractCorrelationId(eventObject);

    if (eventObject.body) {
      try {
        result = JSON.parse(eventObject.body) as T;
      } catch (parseError) {
        throw new BadRequestError(parseError.message);
      }
    }

    if (
      eventObject.requestContext &&
      eventObject.requestContext.authorizer &&
      eventObject.requestContext.authorizer[Header.SESSION_INFO]
    ) {
      eventObject.headers[Header.SESSION_INFO] = eventObject.requestContext.authorizer[Header.SESSION_INFO];
      this.logger.info('Header Data', JSON.stringify(eventObject.headers), this.constructor.name, {});
    }

    this.verifyRequiredParameters(
      eventObject,
      requiredQueryStringParams,
      requiredRequestBodyParams,
      requiredPathParams
    );

    return result;
  }

  private extractCorrelationId(eventObject: APIGatewayProxyEvent): any {
    // Require the 'X-Correlation-Id' header
    if (!eventObject.headers) {
      throw new BadRequestError('Event headers are missing or malformed.');
    }

    let correaltionId = '';

    if (eventObject.headers[Header.CORRELATION_ID]) {
      correaltionId = eventObject.headers[Header.CORRELATION_ID];
    }

    if (!correaltionId || correaltionId == '') {
      throw new BadRequestError('A X-Correlation-Id header is required in the request.');
    }

    process.env.correaltionid = correaltionId;
  }

  private setHeaderForLowerCase(eventObject: APIGatewayProxyEvent): any {
    Object.keys(eventObject.headers).forEach(headerName => {
      Object.keys(Header).map(key => {
        if (headerName.toLowerCase() === Header[key].toLowerCase()) {
          eventObject.headers[Header[key]] = eventObject.headers[headerName];
        }
      });
    });
  }

  private extractCorrelationObject(eventObject: APIGatewayProxyEvent) {
    // Require the 'X-Correlation-Id' header
    if (!eventObject.headers) {
      throw new BadRequestError('Event headers are missing or malformed.');
    } else {
      this.setHeaderForLowerCase(eventObject);
    }

    let correaltionId = '';

    if (eventObject.headers[Header.CORRELATION_ID]) {
      correaltionId = eventObject.headers[Header.CORRELATION_ID];
    }

    if (!correaltionId || correaltionId == '') {
      throw new BadRequestError('A X-Correlation-Id header is required in the request.');
    }

    process.env.correaltionid = correaltionId;
  }


  private processPropertySet(
    requestEvent: APIGatewayProxyEvent,
    propertySetName: string,
    requiredProperties: string[]
  ): string[] {
    const errors: string[] = [];
    const propertySet = requestEvent[propertySetName];

    if (requiredProperties && requiredProperties.length > 0) {
      // fail if the propertySet isn't defined
      if (propertySet === undefined || propertySet === null) {
        errors.push(`Request event is malformed. The "${propertySetName}" object is missing.`);
      } else {
        // Check for each of the required properties
        requiredProperties.forEach(propertyName => {
          const value = propertySet[propertyName];
          // If the value isn't there or is blank, then add it to the errors list
          if (value === undefined || value === null || value === '') {
            errors.push(`The parameter "${propertyName}" is required in the request's ${propertySetName}.`);
          }
        });
      }
    }
    return errors;
  }
}
