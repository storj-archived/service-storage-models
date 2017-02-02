'use strict';

const ms = require('ms');
const errors = require('storj-service-error-types');
const activator = require('hat').rack(256);
const crypto = require('crypto');
const mongoose = require('mongoose');
const SchemaOptions = require('../options');

/**
 * Represents a user
 * @constructor
 */
var UserSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true
  },
  hashpass: {
    type: String,
    validate: {
      validator: value => (value === null) ? true : (value.length === 64),
      message: '{VALUE} must either be 64 characters in length or null'
    }
  },
  pendingHashPass: {
    type: String,
    default: null
  },
  created: {
    type: Date,
    default: Date.now
  },
  activator: {
    type: mongoose.Schema.Types.Mixed,
    default: activator
  },
  deactivator: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  resetter: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  activated: {
    type: Boolean,
    default: false
  },
  isFreeTier: {
    type: Boolean,
    default: true
  },
  bytesUploaded: {
    lastHourStarted: {
      type: Date,
      required: false
    },
    lastHourBytes: {
      type: Number,
      default: 0
    },
    lastDayStarted: {
      type: Date,
      required: false
    },
    lastDayBytes: {
      type: Number,
      default: 0
    },
    lastMonthStarted: {
      type: Date,
      required: false
    },
    lastMonthBytes: {
      type: Number,
      default: 0
    }
  },
  bytesDownloaded: {
    lastHourStarted: {
      type: Date,
      required: false
    },
    lastHourBytes: {
      type: Number,
      default: 0
    },
    lastDayStarted: {
      type: Date,
      required: false
    },
    lastDayBytes: {
      type: Number,
      default: 0
    },
    lastMonthStarted: {
      type: Date,
      required: false
    },
    lastMonthBytes: {
      type: Number,
      default: 0
    }
  }
});

UserSchema.plugin(SchemaOptions);

UserSchema.index({
  resetter: 1
});

UserSchema.set('toObject', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.__v;
    delete ret._id;
    delete ret.hashpass;
    delete ret.activator;
    delete ret.deactivator;
    delete ret.resetter;
    delete ret.pendingHashPass;
    delete ret.bytesDownloaded;
    delete ret.bytesUploaded;
  }
});

UserSchema.virtual('email').get(function() {
  return this._id;
});

// TODO: same as above. check for .populate
UserSchema.methods.getPaymentProcessor = function(processorName) {
  return this.paymentProcessors.find((p) => p.name === processorName);
};

/**
 * Activates a user
 * @param {Function} callback
 */
UserSchema.methods.activate = function(callback) {
  this.activated = true;
  this.activator = null;
  this.save(callback);
};

/**
 * Increments the bytes transferred
 * @param {Number} bytes
 * @param {String} prop
 * @private
 */
/* jshint maxstatements:15, maxcomplexity:7 */
UserSchema.methods._recordBytes = function(bytes, prop) {
  let now = Date.now();
  let {lastHourStarted, lastDayStarted, lastMonthStarted} = this[prop];

  if (!lastHourStarted || now - lastHourStarted >= ms('1h')) {
    this[prop].lastHourStarted = Date.now();
    this[prop].lastHourBytes = 0;
  }

  if (!lastDayStarted || now - lastDayStarted >= ms('24h')) {
    this[prop].lastDayStarted = Date.now();
    this[prop].lastDayBytes = 0;
  }

  if (!lastMonthStarted || now - lastMonthStarted >= ms('30d')) {
    this[prop].lastMonthStarted = Date.now();
    this[prop].lastMonthBytes = 0;
  }

  this[prop].lastHourBytes += bytes;
  this[prop].lastDayBytes += bytes;
  this[prop].lastMonthBytes += bytes;

  return this;
};

/**
 * Record upload transfer
 * @param {Number} bytes
 */
UserSchema.methods.recordUploadBytes = function(bytes) {
  return this._recordBytes(bytes, 'bytesUploaded');
};

/**
 * Record upload transfer
 * @param {Number} bytes
 */
UserSchema.methods.recordDownloadBytes = function(bytes) {
  return this._recordBytes(bytes, 'bytesDownloaded');
};

/**
 * Check if the user is rate limited for the upload
 * @returns {Boolean}
 */
UserSchema.methods._isRateLimited = function(hourlyB, dailyB, monthlyB, prop) {
  return this.isFreeTier ?
      (this[prop].lastHourBytes >= hourlyB) ||
      (this[prop].lastDayBytes >= dailyB) ||
      (this[prop].lastMonthBytes >= monthlyB)
    : false;
};

/**
 * Check if the user is rate limited for the upload
 * @returns {Boolean}
 */
UserSchema.methods.isUploadRateLimited = function(hourlyB, dailyB, monthlyB) {
  this.recordUploadBytes(0); // NB: Trigger reset if needed
  return this._isRateLimited(hourlyB, dailyB, monthlyB, 'bytesUploaded');
};

/**
 * Check if the user is rate limited for the upload
 * @returns {Boolean}
 */
UserSchema.methods.isDownloadRateLimited = function(hourlyB, dailyB, monthlyB) {
  this.recordDownloadBytes(0); // NB: Trigger reset if needed
  return this._isRateLimited(hourlyB, dailyB, monthlyB, 'bytesDownloaded');
};

/**
 * Deactivates a user
 * @param {Function} callback
 */
UserSchema.methods.deactivate = function(callback) {
  this.activated = false;
  this.activator = activator();
  this.save(callback);
};

UserSchema.statics.create = function(email, passwd, callback) {
  let User = this;
  let user = new User({
    _id: email,
    hashpass: crypto.createHash('sha256').update(passwd).digest('hex'),
    paymentProcessors: []
  });

  if (!email) {
    return callback(new errors.BadRequestError('Must supply an email'));
  }

  // Check to make sure the password is already SHA-256 (or at least is the
  // correct number of bits).
  if (Buffer(passwd, 'hex').length * 8 !== 256) {
    return callback(new errors.BadRequestError(
      'Password must be hex encoded SHA-256 hash')
    );
  }

  User.findOne({
    _id: email
  }, function(err, result) {
    if (err) {
      return callback(new errors.InternalError(err.message));
    }

    if (result) {
      return callback(new errors.BadRequestError(
        'Email is already registered')
      );
    }

    if (email.length > 254) {
      return callback(new errors.BadRequestError('User validation failed'));
    }

    var tester = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@(([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3})|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/; // jshint ignore:line

    if (!tester.test(email)) {
      return callback(new errors.BadRequestError('User validation failed'));
    }

    user.save(function(err) {
      if (err) {
        return callback(new errors.InternalError(err.message));
      }

      return callback(null, user);
    });
  });
};

/**
 * Lookup a User
 * @param {String} email
 * @param {String} password (hashed on client)
 * @param {Function} callback
 */
UserSchema.statics.lookup = function(email, passwd, callback) {
  let User = this;

  if (!passwd) {
    return callback(new errors.NotAuthorizedError(
      'Invalid email or password')
    );
  }

  User.findOne({
    _id: email,
    hashpass: crypto.createHash('sha256').update(passwd).digest('hex')
  }, function(err, user) {
    if (err) {
      return callback(new errors.InternalError(err.message));
    }

    if (!user) {
      return callback(new errors.NotAuthorizedError(
        'Invalid email or password')
      );
    }

    callback(null, user);
  });
};

module.exports = function(connection) {
  return connection.model('User', UserSchema);
};

exports.Schema = UserSchema;
