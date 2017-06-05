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
  assert(typeof storageOptions === 'object',
         'Invalid storage options supplied');

  this._uri = mongoURI;
  this._options = mongoOptions;

  const defaultLogger = {
    info: console.log,
    debug: console.log,
    error: console.error,
    warn: console.warn
  };
  this._log = storageOptions ?
    (storageOptions.logger || defaultLogger) : defaultLogger;

  // connect to the database
  this._connect();
}

Storage.models = require('./lib/models');

/**
 * Connects to the database
 * @returns {mongoose.Connection}
 */
Storage.prototype._connect = function() {
  var self = this;

  var defaultOpts = {
    mongos: false,
    ssl: false
  };

  var opts = merge.recursive(true, defaultOpts, this._options);

  this._log.info('opening database connection');
  this._log.debug('database uri is  %s', this._uri);

  this.connection = mongoose.createConnection(this._uri, opts);

  this.connection.on('error', function(err) {
    self._log.error('failed to connect to database:', err.message);
  });

  this.connection.on('disconnected', function() {
    self._log.warn('database connection closed...');
    // wait 5 seconds and retry connecting to the database
    setTimeout(function() {
      self._log.warn('reconnecting to database...');
      self._connect();
    }, 5000);
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
