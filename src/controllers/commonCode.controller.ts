import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { BaseController } from './base.controller';
import { inject, injectable } from 'inversify';
import { LoggerService } from '../services/logger.service';
import { CommonCodeService } from '../services/commonCode.service';
import { CommonCode, CommonCodeRequest } from '../models/commonCode.model';
import { StatusCode } from '../errors/statusCode';
import { BadRequestError } from '../errors/badRequest.error';
import { MandatoryParamError } from '../errors/mandatoryParam.error';
import { Header } from '../models/enum/header.enums';

@injectable()
export class CommonCodeController extends BaseController {
  private requiredFields: string[];
  private commonCodeService: CommonCodeService;

  constructor(
    @inject('LoggerService') loggerService: LoggerService,
    @inject('CommonCodeService') commonCodeService: CommonCodeService
  ) {
    super(loggerService);
    this.commonCodeService = commonCodeService;
    this.requiredFields = [];
  }

  async getCommonCode(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    this.logger.trace('getCommonCode called', event, this.constructor.name, null);

    try {
      this.requiredFields = ['groupCodeId'];
      this.verifyRequiredParameters(event, this.requiredFields, null, null);

      const request: CommonCodeRequest = {
        groupCodeId: event.queryStringParameters.groupCodeId,
      };

      request.languageCode = event.headers[Header.LANGUAGE_CODE];

      const result = await this.commonCodeService.getCommonCode(request);

      return this.createSuccessResponseWithStatusCode<CommonCode[]>(StatusCode.SUCCESS, result);
    } catch (error) {
      if (error instanceof BadRequestError) {
        return this.createSuccessWithBusinessErrorResponse(StatusCode.INVALID_PARAMETER, null);
      } else if (error instanceof MandatoryParamError) {
        return this.createSuccessWithBusinessErrorResponse(StatusCode.INVALID_PARAMETER, null);
      } else {
        return this.createSuccessWithBusinessErrorResponse(StatusCode.FAIL, null);
      }
    }
  }
}
