'use strict';

const assert = require('assert');
const mongoose = require('mongoose');
const merge = require('merge');

require('mongoose-currency').loadType(mongoose);
require('mongoose-types').loadTypes(mongoose);

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

  assert(typeof mongoOptions === 'object', 'Invalid storage options supplied');

  var self = this;

  this._uri = mongoURI;
  this._options = mongoOptions;
  this._log = storageOptions ? (storageOptions.logger || console) : console;
  this.connection = this._connect();
  this.models = this._createBoundModels();

  this.connection.on('error', function(err) {
    self._log.error('failed to connect to database:', err.message);
  });

  this.connection.on('disconnected', function() {
    self._log.warn('database connection closed, reconnecting...');
    self.connection = self._connect();
  });

  this.connection.on('connected', function() {
    self._log.info('connected to database');
  });
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

  this._log.info('opening database connection to %s', this._uri);

  return mongoose.createConnection(this._uri, opts);
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
