import 'reflect-metadata';
import { describe, beforeEach, it } from 'mocha';
import { expect } from 'chai';
import sinon from 'sinon';

import { LoggerService } from './logger.service';

describe('LoggerService class', () => {
  const envConfig = {
    logLevel: 'info',
    region: process.env.AWS_REGION,
  };
  let loggerService: LoggerService;
  let lastLogOutput;
  let spy;

  beforeEach(() => {
    loggerService = new LoggerService(envConfig);

    spy = sinon.stub(loggerService as any, '_output').callsFake(message => {
      lastLogOutput = message;
    });
  });

  describe('maskSecret()', () => {
    it('adds the given parameter to the configSecrets array', () => {
      loggerService.maskSecret('my-secret');
      loggerService.log('Masked: my-secret', { test: 'Masked: my-secret' }, null, '1111');

      expect((loggerService as any).configSecrets).to.be.ok;
      expect((loggerService as any).configSecrets[0]).to.be.equal('my-secret');
      expect(lastLogOutput).to.be.string('Masked: *****');
    });
  });

  describe('log()', () => {
    it('logs output at the info log level', () => {
      loggerService.log('a', 'b', 'classname', '1111');

      expect(spy.called).to.be.true;
      expect(lastLogOutput).to.be.string('[1111]["b"]');
    });
  });

  describe('trace()', () => {
    it('logs output at the trace log level', () => {
      loggerService.trace('a', 'b', 'classname', '1111');

      expect(spy.called).to.be.false;
      expect(lastLogOutput).to.be.string('[1111]["b"]');
    });
  });

  describe('info()', () => {
    it('logs output at the info log level', () => {
      loggerService.info('a', 'b', 'classname', '1111');

      expect(spy.called).to.be.true;
      expect(lastLogOutput).to.be.string('[1111]["b"]');
    });
  });

  describe('warn()', () => {
    it('logs output at the warning log level', () => {
      loggerService.trace('a', 'b', 'classname', '1111');

      expect(spy.called).to.be.false;
      expect(lastLogOutput).to.be.string('[1111]["b"]');
    });
  });

  describe('error()', () => {
    it('logs output at the error log level', () => {
      loggerService.error('a', 'b', 'classname', '1111');

      expect(spy.called).to.be.true;
      expect(lastLogOutput).to.be.string('[1111]["b"]');
    });
  });

  describe('warn()', () => {
    it('logs output at the warn log level', () => {
      loggerService.warn('a', 'b', 'classname', '1111');

      expect(spy.called).to.be.true;
      expect(lastLogOutput).to.be.string('[1111]["b"]');
    });
  });

  describe('writeLog()', () => {
    it('handles instanceof Error', () => {
      loggerService.error('Error', new Error(), 'classname', '1111');

      expect(spy.called).to.be.true;
      expect(lastLogOutput).to.be.string('Error');
    });

    it('handles circular JSON references', () => {
      const objectA = { referenceToB: null };
      const objectB = { referenceToA: objectA };
      objectA.referenceToB = objectB;

      loggerService.error('circular', objectA, 'classname', '1111');

      expect(spy.called).to.be.true;
      expect(lastLogOutput).to.be.string('[1111][{"referenceToB":"1"},{"referenceToA":"0"}]');
    });

    it('outputs flatted formatted data object', () => {
      const objectA = { referenceToB: null };
      const objectB = { referenceToA: objectA };
      objectA.referenceToB = objectB;

      loggerService.error('flatted', objectA, 'classname', '1111');

      expect(spy.called).to.be.true;
      expect(lastLogOutput).to.string('[1111][{"referenceToB":"1"},{"referenceToA":"0"}');
    });

    it('outputs an empty object when data parameter is not defined', () => {
      loggerService.error('empty', undefined, 'classname', '1111');

      expect(spy.called).to.be.true;
      expect(lastLogOutput).to.string('[1111][{}]');
    });

    it(`doesn't output when the log level isn't high enough`, () => {
      envConfig.logLevel = 'error';
      loggerService.info('a', 'b', 'classname', '1111');

      expect(spy.called).to.be.false;
      envConfig.logLevel = 'all';
    });
  });
});
