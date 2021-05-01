import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { container } from '../config/ioc.container';
import { handleUnexpectedError } from '../helpers/handleUnexpectedError.helper';
import { LoggerService } from '../services/logger.service';
import { CommonCodeController } from '../controllers/commonCode.controller';

// During container warm-up, resolve the dependencies once
// so these can be reused for each invocation of the handler
const commonCodeController: CommonCodeController = container.get('CommonCodeController');
const loggerService: LoggerService = container.get('LoggerService');

// This handler will be invoked each time the Lambda function is invoked
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    console.log('tst');
    loggerService.log('getCommonCode() handler called', event, null, event.headers['X-Correlation-Id']);
    const result = await commonCodeController.getCommonCode(event);
    loggerService.log('getCommonCode() success response', result, null, event.headers['X-Correlation-Id']);
    return result;
  } catch (error) {
    // A controller class should always handle its own errors
    // If we get here, something bad went wrong.
    // Here we handle the error and return an appropriate response to API Gateway
    const handledErrorResult = handleUnexpectedError(error, event.headers, loggerService, null);
    loggerService.log('getCommonCode() unexpected error response', handledErrorResult);
    return handledErrorResult;
  }
};
