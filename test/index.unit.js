'use strict';

const sinon = require('sinon');
const proxyquire = require('proxyquire');
const expect = require('chai').expect;
const EventEmitter = require('events').EventEmitter;
const merge = require('merge');

var mongooseStub = {};
var Storage = proxyquire('../index.js', {
  'mongoose': mongooseStub,
  'mongoose-types': {
    loadTypes: sinon.stub()
  }
});

describe('Storage', function() {

  describe('@constructor', function() {
    const sandbox = sinon.sandbox.create();
    var testMongoURI, testMongoOptions, testStorageOptions;
    beforeEach(() => {
      sandbox.stub(Storage.prototype, '_connect');
      testMongoURI = 'mongodb://127.0.0.1:27017/__storj-bridge-test';
      testMongoOptions = {};
      testStorageOptions = {};
    });
    afterEach(() => sandbox.restore());

    it('should successfully instantiate with the `new` keyword', function() {
      var storage = new Storage(testMongoURI, testMongoOptions,
                                testStorageOptions);

      expect(storage).to.be.instanceOf(Storage);
      expect(storage._uri).to.equal(testMongoURI);
      expect(storage._options).to.equal(testMongoOptions);
      expect(storage._connect.callCount).to.equal(1);
    });


    it('should successfully instantiate without the `new` keyword', function() {
      var storage = Storage(testMongoURI, testMongoOptions, testStorageOptions);

      expect(storage).to.be.instanceOf(Storage);
      expect(storage._uri).to.equal(testMongoURI);
      expect(storage._options).to.equal(testMongoOptions);
      expect(storage._connect.callCount).to.equal(1);
    });

    it('should throw an error if mongoOptions is not an object', function() {
      expect(function() {
        Storage(testMongoURI, 'testMongoOptions', testStorageOptions);
      }).to.throw('Invalid mongo options supplied');
    });

    it('should use the default logger if no logger is provided', function() {
      var storage = new Storage(testMongoURI, testMongoOptions,
                                testStorageOptions);

      expect(storage._log.info).to.equal(console.log);
      expect(storage._log.debug).to.equal(console.log);
      expect(storage._log.error).to.equal(console.error);
      expect(storage._log.warn).to.equal(console.warn);
    });

    it('should use the logger from storageOptions if provided', function() {
      testStorageOptions.logger = {
        'info': 'testInfoLogger',
        'debug': 'testDebugLogger',
        'error': 'testErrorLogger',
        'warn': 'testWarnLogger'
      };
      var storage = new Storage(testMongoURI, testMongoOptions,
                                testStorageOptions);

      expect(storage._log).to.equal(testStorageOptions.logger);
    });
  });

  describe('#_connect', function() {
    const sandbox = sinon.sandbox.create();
    var testMongoURI, testMongoOptions, testStorageOptions,
        storage, testConnection, testLogger;
    beforeEach(() => {
      testMongoURI = 'mongodb://127.0.0.1:27017/__storj-bridge-test';
      testMongoOptions = {option1: 3, option2: 4};
      testLogger = {
        info: sandbox.stub(),
        debug: sandbox.stub(),
        error: sandbox.stub(),
        warn: sandbox.stub()
      };
      testStorageOptions = {logger: testLogger};

      var oldConnect = Storage.prototype._connect;
      sandbox.stub(Storage.prototype, '_connect');
      sandbox.stub(Storage.prototype, '_createBoundModels');
      storage = new Storage(testMongoURI, testMongoOptions, testStorageOptions);
      Storage.prototype._connect = oldConnect;

      testConnection = new EventEmitter();
      mongooseStub.createConnection = sandbox.stub().returns(testConnection);
    });
    afterEach(() => sandbox.restore());

    it('should create a connection with the provided options', function() {
      storage._connect();

      var mergedOptions = merge.recursive(true, {
        mongos: false,
        ssl: false,
        server: {
          auto_reconnect: true,
          reconnectTries: Number.MAX_VALUE,
          reconnectInterval: 5000
        }
      }, testMongoOptions);

      expect(mongooseStub.createConnection.calledWith(
        testMongoURI, mergedOptions
      )).to.equal(true);
      expect(storage._createBoundModels.callCount).to.equal(1);
    });

    it('should log an error message if connection throws an error', function() {
      storage._connect();

      var testError = new Error('this is a test error');
      testConnection.emit('error', testError);

      expect(testLogger.error.calledWithMatch('database connection error',
                                           testError.message)).to.equal(true);
    });

    it('should log a success message if the connection succeeds', function() {
      storage._connect();

      testConnection.emit('connected');
      expect(testLogger.info.calledWithMatch(
        'connected to database')).to.equal(true);
    });

    it('should log a warning if the connection closes', function() {
      storage._connect();

      testConnection.emit('disconnected');
      expect(testLogger.warn.calledWithMatch(
        'disconnected from database')).to.equal(true);
    });
  });

  describe('#_createBoundModels', function() {
    const sandbox = sinon.sandbox.create();
    var testMongoURI, testMongoOptions, testStorageOptions, storage;
    beforeEach(() => {
      testMongoURI = 'mongodb://127.0.0.1:27017/__storj-bridge-test';
      testMongoOptions = {};
      testStorageOptions = {};

      var oldCreateBoundModels = Storage.prototype._createBoundModels;
      sandbox.stub(Storage.prototype, '_connect');
      sandbox.stub(Storage.prototype, '_createBoundModels');
      storage = new Storage(testMongoURI, testMongoOptions, testStorageOptions);
      Storage.prototype._createBoundModels = oldCreateBoundModels;
    });
    afterEach(() => sandbox.restore());

    it('should return a list of models bound to the connection', function() {
      var testModels = {
        testModel1: sandbox.stub().returns(1),
        testModel2: sandbox.stub().returns(2)
      };

      Storage.models = testModels;
      storage.connection = 'testConnection';

      var boundModels = storage._createBoundModels();
      expect(boundModels.testModel1).to.equal(1);
      expect(boundModels.testModel2).to.equal(2);
      expect(testModels.testModel1.calledWith(
        storage.connection)).to.equal(true);
      expect(testModels.testModel2.calledWith(
        storage.connection)).to.equal(true);
    });
  });
});
