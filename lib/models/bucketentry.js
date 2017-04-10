'use strict';

const ms = require('ms');
const mongoose = require('mongoose');
const mimetypes = require('mime-db');
const SchemaOptions = require('../options');
const storj = require('storj-lib');
const utils = storj.utils;
const errors = require('storj-service-error-types');

const hmactypes = ['sha512', 'sha256', 'ripemd160'];
const erasuretypes = ['reedsolomon'];

/**
 * Represents a bucket entry that points to a file
 * @constructor
 */
var BucketEntry = new mongoose.Schema({
  frame: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Frame'
  },
  bucket: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bucket'
  },
  mimetype: {
    type: String,
    enum: Object.keys(mimetypes),
    default: 'application/octet-stream',
    required: true
  },
  name: {
    type: String
  },
  renewal: {
    type: Date,
    default: function() {
      return Date.now() + ms('90d');
    }
  },
  created: {
    type: Date,
    default: Date.now
  },
  hmac: {
    value: {
      type: String
    },
    type: {
      type: String
    },
    required: false
  },
  erasure: {
    type: {
      type: String
    },
    required: false
  }
});

BucketEntry.virtual('filename').get(function() {
  return this.name || this.frame;
});

BucketEntry.index({ bucket: 1 });
BucketEntry.index({ created: 1 });

BucketEntry.plugin(SchemaOptions, {
  read: 'secondaryPreferred'
});

BucketEntry.set('toObject', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.__v;
    delete ret._id;
    delete ret.name;
  }
});

/**
 * Creates a BucketEntry
 * @param {String} bucket - Bucket id
 * @param {String} frame - Frame id
 * @param {String} mimetype - Mime type of file
 * @param {String} name - File name
 * @param {Function} callback
 */
/* jshint maxcomplexity: 20 */
BucketEntry.statics.create = function(data, callback) {
  var BucketEntry = this;

  var id = storj.utils.calculateFileId(data.bucket, data.frame);

  var query = {
    _id: id,
    bucket: data.bucket
  };

  var update = {
    _id: id,
    frame: data.frame,
    bucket: data.bucket,
    name: data.name
  };

  if (data.mimetype) {
    if (Object.keys(mimetypes).indexOf(data.mimetype) === -1) {
      return callback(new Error('Invalid mimetype supplied'));
    }

    update.mimetype = data.mimetype;
  }

  if (data.hmac) {
    if (!data.hmac.type ||
        data.hmac.type.length > 25 ||
        hmactypes.indexOf(data.hmac.type) === -1) {
      return callback(new errors.BadRequestError('Invalid hmac type'));

    }
    if (!data.hmac.value ||
        data.hmac.value.length > 128 ||
        !utils.isHexaString(data.hmac.value)) {
      return callback(new errors.BadRequestError('Invalid hmac value'));

    }
    update.hmac = data.hmac;
  }

  if (data.erasure) {
    if (!data.erasure.type ||
        data.erasure.type.length > 100 ||
        erasuretypes.indexOf(data.erasure.type) === -1) {
      return callback(new errors.BadRequestError('Invalid erasure type'));
    }
    update.erasure = {
      type: data.erasure.type
    };
  }

  var options = { upsert: true, 'new': true, setDefaultsOnInsert: true };

  BucketEntry.findOneAndUpdate(query, update, options, function(err, entry) {
    if (err) {
      return callback(err);
    }

    callback(null, entry);
  });

};

module.exports = function(connection) {
  return connection.model('BucketEntry', BucketEntry);
};
