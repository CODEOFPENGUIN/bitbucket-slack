// Required to be first import
import 'reflect-metadata';

import { SSM, TemporaryCredentials } from 'aws-sdk';
import { Container } from 'inversify';
import { ApiRequestService } from '../services/apiRequest.service';
import { LoggerService } from '../services/logger.service';
import { ValidationService } from '../services/validation.service';

import { HealthController } from '../controllers/health.controller';
import { HealthService } from '../services/health.service';
import { HealthRepositoryInterface } from '../repositories/health.repository.interface';
import { HealthRepository } from '../repositories/health.repository';

import { CommonCodeController } from '../controllers/commonCode.controller';
import { CommonCodeService } from '../services/commonCode.service';
// import { CommonCodeRepositoryInterface } from '../repositories/commonCode.repository.interface';
// import { CommonCodeRepository } from '../repositories/commonCode.repository';

// import { DBConnectionFactory } from '../utils/dbConnectionFactory.util';

import * as requestPromise from 'request-promise-native';
import moment from 'moment';

const apigClientFactory = require('aws-api-gateway-client').default;
// Create the IOC Container
const container = new Container();

try {
  // Bindings for common services from node modules
  container.bind('SsmService').toConstantValue(new SSM());
  container.bind('RequestService').toConstantValue(requestPromise);
  // container.bind<DBConnectionFactory>('mariadbPool').to(DBConnectionFactory);

  // Setup the envConfig with values from process.env
  // These must each be set as Lambda Environment Variables in the microservice.sam.yml file
  // Create and bind the Environment Config object, pulling values from the Node process.env
  const envConfig = Object.freeze({
    environmentName: process.env.environmentName,
    logLevel: process.env.logLevel,
    region: process.env.AWS_REGION,
    releaseVersion: process.env.releaseVersion,
  });

  container.bind('envConfig').toConstantValue(envConfig);
  container.bind<HealthController>('HealthController').to(HealthController);
  container.bind<HealthService>('HealthService').to(HealthService);
  container.bind<LoggerService>('LoggerService').to(LoggerService);
  container.bind<ValidationService>('ValidationService').to(ValidationService);
  container.bind<HealthRepositoryInterface>('HealthRepositoryInterface').to(HealthRepository);

  container.bind<CommonCodeController>('CommonCodeController').to(CommonCodeController);
  container.bind<CommonCodeService>('CommonCodeService').to(CommonCodeService);
  // container.bind<CommonCodeRepositoryInterface>('CommonCodeRepositoryInterface').to(CommonCodeRepository);

  // Declare Factories
  const credentialsFactory = (stsParams: TemporaryCredentials.TemporaryCredentialsOptions): TemporaryCredentials => {
    return new TemporaryCredentials(stsParams);
  };

  container.bind('ApiRequestFactory').toFactory(() => {
    return (apiBaseUrl, accountNum, roleName): ApiRequestService => {
      return new ApiRequestService(
        container.get('LoggerService'),
        container.get('envConfig'),
        apigClientFactory,
        credentialsFactory,
        apiBaseUrl,
        accountNum,
        roleName
      );
    };
  });
} catch (error) {
  // Can't rely on the LoggerService class here, since it might have failed during init
  const logOutput = {
    level: 'error',
    message: 'Error occurred during IOC initialization',
    data: (error && error.message) || error,
    timestamp: moment().format('YYYY-MM-DD HH:mm:ss'),
    location: 'ioc.container',
  };

  // tslint:disable-next-line no-console
  console.log(logOutput);
}

export { container };
