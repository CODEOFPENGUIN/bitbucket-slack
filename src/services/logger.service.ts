import { inject, injectable } from 'inversify';
import { stringify } from 'flatted';

@injectable()
export class LoggerService {
  private _output: Function;
  private envConfig: any;
  private logLevels: any;
  private configSecrets: any;

  constructor(@inject('envConfig') envConfig: any) {
    this.envConfig = envConfig;

    this._output = console.log; // eslint-disable-line

    // Log levels standard defined by Log4j
    this.logLevels = {
      off: 0,
      error: 200,
      warn: 300,
      info: 400,
      trace: 600,
    };

    this.configSecrets = [
      /* Add secret values from envConfig here */
    ];
  }

  maskSecret(secret) {
    this.configSecrets.push(secret);
  }

  // The log() function is an alias to allow our Logger class to be used as a logger for AWS sdk calls
  log(message, data, className?, correlationId?) {
    this.writeLog('info', message, data, className, correlationId);
  }
  error(message, data, className?, correlationId?) {
    this.writeLog('error', message, data, className, correlationId);
  }
  warn(message, data, className?, correlationId?) {
    this.writeLog('warn', message, data, className, correlationId);
  }
  info(message, data, className?, correlationId?) {
    this.writeLog('info', message, data, className, correlationId);
  }
  trace(message, data, className?, correlationId?) {
    this.writeLog('trace', message, data, className, correlationId);
  }

  writeLog(level: string, message: string, data, className: string, correlationId: string): void {
    if (this.envConfig && this.envConfig.logLevel && this.logLevels[level] <= this.logLevels[this.envConfig.logLevel]) {
      const correlationIdOutput = correlationId ? correlationId : process.env.correaltionid;
      let outString;
      const dataOutput = data !== undefined ? data : {};
      const classOutput = className ? '[' + className + ']' : '';

      this._output('[' + level + ']' + '[' + correlationIdOutput + ']' + classOutput + message);
      if (dataOutput instanceof Error) {
        // Improved serialization for Error objects
        outString = 'Error message: ' + dataOutput.message + '; Stack: ' + dataOutput.stack;
      } else if (dataOutput) {
        outString = '[' + correlationIdOutput + ']' + stringify(dataOutput);
      }

      // Mask secrets from being written to the logs
      this.configSecrets.forEach(secret => {
        outString = outString && outString.replace(secret, '*****');
      });

      if (outString) {
        this._output(outString);
      }
    }
  }
}
