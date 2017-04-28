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

function isValidIndex(index) {
  // XXX DEPRECATION IN NEXT MAJOR RELEASE
  // XXX The determinitic id will be deprecated and the index field will
  // XXX become required for any new bucket entries. This is to make sure
  // XXX that each bucket entry will have a unique id.
  if (index) {
    return index.length === 64 && utils.isHexaString(index);
  }
  return true;
}

/**
 * Represents a bucket entry that points to a file
 * @constructor
 */
var BucketEntry = new mongoose.Schema({
  index: {
    type: String,
    validate: {
      validator: (value) => isValidIndex(value),
      message: 'Invalid index'
    }
  },
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
BucketEntry.index({ index: 1 }, { unique: true, sparse: true});
BucketEntry.index({ bucket: 1, name: 1 }, { unique: true });

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

  // XXX DEPRECATION IN NEXT MAJOR RELEASE
  // XXX The determinitic id will be deprecated and the index field will
  // XXX become required for any new bucket entries. This is to make sure
  // XXX that each bucket entry will have a unique id.
  const id = storj.utils.calculateFileId(data.bucket, data.name);

  let doc = {
    _id: id,
    frame: data.frame,
    bucket: data.bucket,
    name: data.name
  };

  if (!isValidIndex(data.index)) {
    return callback(new Error('Invalid index, expected to be 256 hex string'));
  } else {
    doc.index = data.index;
  }

  if (data.mimetype) {
    if (Object.keys(mimetypes).indexOf(data.mimetype) === -1) {
      return callback(new Error('Invalid mimetype supplied'));
    }

    doc.mimetype = data.mimetype;
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
    doc.hmac = data.hmac;
  }

  if (data.erasure) {
    if (!data.erasure.type ||
        data.erasure.type.length > 100 ||
        erasuretypes.indexOf(data.erasure.type) === -1) {
      return callback(new errors.BadRequestError('Invalid erasure type'));
    }
    doc.erasure = {
      type: data.erasure.type
    };
  }

  const entry = new BucketEntry(doc);
  entry.save(callback);
};

module.exports = function(connection) {
  return connection.model('BucketEntry', BucketEntry);
};
