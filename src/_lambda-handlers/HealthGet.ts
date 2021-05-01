import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { container } from '../config/ioc.container';
import { handleUnexpectedError } from '../helpers/handleUnexpectedError.helper';
import { LoggerService } from '../services/logger.service';
import { HealthController } from '../controllers/health.controller';

// During container warm-up, resolve the dependencies once
// so these can be reused for each invocation of the handler
const healthController: HealthController = container.get('HealthController');
const loggerService: LoggerService = container.get('LoggerService');

// This handler will be invoked each time the Lambda function is invoked
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    // Specific to the health endpoint, we support a querystring parameter for 'forceCatastrophicFailure'
    // if (event && event.queryStringParameters && event.queryStringParameters['forceCatastrophicFailure'] !== undefined) {
    //   throw new Error('Forced Catastrophic Failure -- for testing only');
    // }

    loggerService.log('checkHealth() handler called', event, null, event.headers['X-Correlation-Id']);
    const result = await healthController.getHealth(event);
    loggerService.log('checkHealth() success response', result, null, event.headers['X-Correlation-Id']);
    return result;
  } catch (error) {
    // A controller class should always handle its own errors
    // If we get here, something bad went wrong.
    // Here we handle the error and return an appropriate response to API Gateway
    const handledErrorResult = handleUnexpectedError(error, event.headers, loggerService, 'checkHealth handler');
    loggerService.log('checkHealth() unexpected error response', handledErrorResult);
    return handledErrorResult;
  }
};
