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
var User = new mongoose.Schema({
  _id: { // email
    type: mongoose.SchemaTypes.Email,
    required: true
  },
  hashpass: {
    type: String,
    required: true
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
  }
});

User.plugin(SchemaOptions);
User.index({ resetter: 1 });

User.set('toObject', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.__v;
    delete ret._id;
    delete ret.hashpass;
    delete ret.activator;
    delete ret.deactivator;
    delete ret.resetter;
    delete ret.pendingHashPass;
    delete ret.bytesUploaded;
  }
});

User.virtual('email').get(function() {
  return this._id;
});

/**
 * Activates a user
 * @param {Function} callback
 */
User.methods.activate = function(callback) {
  this.activated = true;
  this.activator = null;
  this.save(callback);
};

/**
 * Increments the bytes transferred
 * @param {Number} bytes
 */
User.methods.recordUploadBytes = function(bytes) {
  let now = Date.now();
  let {lastHourStarted, lastDayStarted, lastMonthStarted} = this.bytesUploaded;

  if (!lastHourStarted || now - lastHourStarted >= ms('1h')) {
    this.bytesUploaded.lastHourStarted = Date.now();
    this.bytesUploaded.lastHourBytes = 0;
  }

  if (!lastDayStarted || now - lastDayStarted >= ms('24h')) {
    this.bytesUploaded.lastDayStarted = Date.now();
    this.bytesUploaded.lastDayBytes = 0;
  }

  if (!lastMonthStarted || now - lastMonthStarted >= ms('30d')) {
    this.bytesUploaded.lastMonthStarted = Date.now();
    this.bytesUploaded.lastMonthBytes = 0;
  }

  this.bytesUploaded.lastHourBytes += bytes;
  this.bytesUploaded.lastDayBytes += bytes;
  this.bytesUploaded.lastMonthBytes += bytes;

  return this;
};

/**
 * Check if the user is rate limited for the upload
 * @returns {Boolean}
 */
User.methods.isUploadRateLimited = function(hourlyB, dailyB, monthlyB) {
  this.recordUploadBytes(0); // NB: Trigger reset if needed
  return this.isFreeTier
    ? (this.bytesUploaded.lastHourBytes >= hourlyB) ||
      (this.bytesUploaded.lastDayBytes >= dailyB) ||
      (this.bytesUploaded.lastMonthBytes >= monthlyB)
    : false;
};

/**
 * Deactivates a user
 * @param {Function} callback
 */
User.methods.deactivate = function(callback) {
  this.activated = false;
  this.activator = activator();
  this.save(callback);
};

/**
 * Creates a User
 * @param {String} email
 * @param {String} password (hashed on client)
 * @param {Function} callback
 */
User.statics.create = function(email, passwd, callback) {
  let User = this;
  let user = new User({
    _id: email,
    hashpass: crypto.createHash('sha256').update(passwd).digest('hex')
  });

  // Check to make sure the password is already SHA-256 (or at least is the
  // correct number of bits).
  if (Buffer(passwd, 'hex').length * 8 !== 256) {
    return callback(
      new errors.BadRequestError('Password must be hex encoded SHA-256 hash')
    );
  }

  User.findOne({ _id: email }, function(err, result) {
    if (err) {
      return callback(new errors.InternalError(err.message));
    }

    if (result) {
      return callback(new errors.BadRequestError('Email is already registered'));
    }

    user.save(function(err) {
      if (err) {
        if (err.code === 11000) {
          return callback(
            new errors.BadRequestError('Email is already registered')
          );
        }

        return callback(new errors.InternalError(err.message));
      }

      callback(null, user);
    });
  });
};

/**
 * Lookup a User
 * @param {String} email
 * @param {String} password (hashed on client)
 * @param {Function} callback
 */
User.statics.lookup = function(email, passwd, callback) {
  let User = this;

  User.findOne({
    _id: email,
    hashpass: crypto.createHash('sha256').update(passwd).digest('hex')
  }, function(err, user) {
    if (err) {
      return callback(err);
    }

    if (!user) {
      return callback(new errors.NotAuthorizedError('Invalid email or password'));
    }

    callback(null, user);
  });
};

module.exports = function(connection) {
  return connection.model('User', User);
};
