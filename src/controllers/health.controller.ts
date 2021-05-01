import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { BaseController } from './base.controller';
import { inject, injectable } from 'inversify';
import { HealthService } from '../services/health.service';
import { LoggerService } from '../services/logger.service';

@injectable()
export class HealthController extends BaseController {
  private healthService: HealthService;

  constructor(
    @inject('LoggerService') loggerService: LoggerService,
    @inject('HealthService') healthService: HealthService
  ) {
    super(loggerService);
    this.healthService = healthService;
  }

  async getHealth(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    this.logger.trace('getHealth called', null, this.constructor.name, null);

    const options = { forceComponentFailure: false };

    // The health endpoint supports a query string parameter for 'forceComponentFailure'
    if (event && event.queryStringParameters && event.queryStringParameters['forceComponentFailure'] !== undefined) {
      options.forceComponentFailure = true;
    }

    try {
      const result = await this.healthService.getHealth(options);
      const response = this.createSuccessResponse(result);
      // Specific to the health endpoint, we set an error code if the health status is not 'pass'
      if (result.status !== 'pass') {
        response.statusCode = this.HTTP_CODE_SERVICE_UNAVAILABLE;
      }

      return response;
    } catch (error) {
      return this.handleServiceErrors(error);
    }
  }
}
