'use strict';

const assert = require('assert');
const mongoose = require('mongoose');

require('mongoose-types').loadTypes(mongoose);

/**
 * MongoDB storage interface
 * @constructor
 * @param {Object} options
 */
function Storage(options) {
  if (!(this instanceof Storage)) {
    return new Storage(options);
  }

  assert(typeof options === 'object', 'Invalid storage options supplied');

  this._options = options;
  this.connection = this._connect();
  this.models = this._createBoundModels();

  this.connection.on('error', function(err) {
    // TODO
  });

  this.connection.on('connected', function() {
    // TODO
  });
}

Storage.models = require('./lib/models');

/**
 * Connects to the database
 * @returns {mongoose.Connection}
 */
Storage.prototype._connect = function() {
  var self = this;
  var uri;
  var mongos;
  var ssl = this._options.ssl;

  if (Array.isArray(this._options)) {
    uri = this._options.map(function(conf) {
      if (conf.mongos) {
        mongos = conf.mongos;
      }

      if (conf.ssl) {
        ssl = conf.ssl;
      }

      return self._getConnectionURI(conf);
    }).join(',');
  } else {
    uri = this._getConnectionURI(this._options);
  }

  log.info('opening database connection to %s', uri);

  return mongoose.createConnection(uri, {
    mongos: mongos,
    sslValidate: false,
    checkServerIdentity: false
  });
};

/**
 * Build the connection URI from options
 * @param {Object} _options
 * @returns {String}
 */
Storage.prototype._getConnectionURI = function(_options) {
  var proto = 'mongodb://';
  var address = _options.host + ':' + _options.port;
  var dbname = '/' + _options.name;
  var creds = _options.user && _options.pass ?
             _options.user + ':' + _options.pass + '@' : '';

  return [proto, creds, address, dbname].join('');
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
