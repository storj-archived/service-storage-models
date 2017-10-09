'use strict';

const assert = require('assert');
const mongoose = require('mongoose');
const merge = require('merge');
require('dotenv').config({ silent: true });

require('mongoose-types').loadTypes(mongoose);

mongoose.Promise = require('bluebird');

/**
 * MongoDB storage interface
 * @constructor
 * @param {Object} mongoConf
 * @param {Object} options
 */
function Storage(mongoURI, mongoOptions, storageOptions) {
  if (!(this instanceof Storage)) {
    return new Storage(mongoURI, mongoOptions, storageOptions);
  }

  assert(typeof mongoOptions === 'object', 'Invalid mongo options supplied');

  this._uri = mongoURI;
  this._options = mongoOptions;

  const defaultLogger = {
    info: console.log,
    debug: console.log,
    error: console.error,
    warn: console.warn
  };
  this._log = defaultLogger;
  if (storageOptions && storageOptions.logger) {
    this._log = storageOptions.logger;
  }

  // connect to the database
  this._connect();
}

Storage.models = require('./lib/models');
Storage.constants = require('./lib/constants');

/**
 * Connects to the database
 * @returns {mongoose.Connection}
 */
Storage.prototype._connect = function() {
  var self = this;

  var defaultOpts = {
    mongos: false,
    ssl: false,
    server: {
      auto_reconnect: true,
      reconnectTries: Number.MAX_VALUE,
      reconnectInterval: 5000
    }
  };

  var opts = merge.recursive(true, defaultOpts, this._options);

  this._log.info('opening database connection at %s', this._uri);

  this.connection = mongoose.createConnection(this._uri, opts);

  this.connection.on('error', function(err) {
    self._log.error('database connection error:', err.message);
  });

  this.connection.on('disconnected', function() {
    self._log.warn('disconnected from database');
  });

  this.connection.on('connected', function() {
    self._log.info('connected to database');
  });

  this.models = this._createBoundModels();
};

/**
 * Return a dictionary of models bound to this connection
 * @returns {Object}
 */
Storage.prototype._createBoundModels = function() {
  var bound = {};

  for (let model in Storage.models) {
    bound[model] = Storage.models[model](this.connection);
  }

  return bound;
};

module.exports = Storage;
