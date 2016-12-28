'use strict';

const ms = require('ms');
const errors = require('storj-service-error-types');
const activator = require('hat').rack(256);
const crypto = require('crypto');
const mongoose = require('mongoose');
const SchemaOptions = require('../options');
const constants = require('../constants');
const PAYMENT_PROCESSORS = constants.PAYMENT_PROCESSORS;
const DEBIT_TYPES = constants.DEBIT_TYPES;
const CENTS_PER_GB_HOUR = constants.CENTS_PER_GB_HOUR;
const CENTS_PER_GB_TRANSFER = constants.CENTS_PER_GB_TRANSFER;
const paymentProcessorAdapters = require('../graphql/payment-processor-adapters/payment-processor-adapters');
const errors = require('storj-service-error-types');
const usage = require('./queries/usage');

// NB: due to mongoose weirdness, `PaymentProcessor`s virtuals must be defined before
// it is assigned as a child schema
const PaymentProcessor = new mongoose.Schema({
  name: {
    type: String,
    enum: Object.keys(PAYMENT_PROCESSORS).map((key) => (PAYMENT_PROCESSORS[key])),
    unique: true
  },
  rawData: [{
    type: mongoose.Schema.Types.Mixed
  }],
  // TODO: add `pre` such that only one payment processor can be default
  default: {
    type: Boolean
  },
  created: {
    type: Date,
    default: Date.now
  }
});

PaymentProcessor.set('toObject', {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret.__v;
    delete ret._id;
    delete ret.rawData;
    // delete ret.data;
    // delete ret.adapter;
  }
});

PaymentProcessor.virtual('adapter').get(function() {
  return paymentProcessorAdapters[this.name];
});

PaymentProcessor.virtual('data')
    .get(function() {
      return this.adapter.parseData(this.rawData);
    })
    .set(function(data) {
      return this.adapter.serializeData(data);
    })
;

// TODO: maybe `defaultPaymentMethod` instead? (structure would change then...)
PaymentProcessor.virtual('defaultCard').get(function() {
  return this.adapter.defaultPaymentMethod(this);
});

PaymentProcessor.virtual('billingDate').get(function() {
  return this.adapter.billingDate(this);
});

PaymentProcessor.methods.update = function(data) {
  return this.adapter.validate()
      .then((isValid) => {
        if (!isValid) {
          return this.remove().then(() => {
            return this.__parent.addPaymentProcessor(this.name, data);
          });
        }

        return Promise.resolve(this);
      })
      .catch((err) => {
        console.error(err);
        throw err;
      })
      ;
};

PaymentProcessor.methods.delete = function() {
  return this.adapter.delete(this)
      .then(() => {
        return this.remove();
      })
      .then(() => {
        return this.__parent.save();
      })
      ;
};

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
  paymentProcessors: [
    PaymentProcessor
  ],
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
    delete ret.paymentProcessors;
    delete ret.defaultPaymentProcessor;
    delete ret.bytesUploaded;
    delete ret.bytesDownloaded;
  }
});

User.virtual('email').get(function() {
  return this._id;
});

User.virtual('defaultPaymentProcessor').get(function() {
  const defaultPaymentProcessor = this.paymentProcessors
      .find((processor) => (!!processor.default));

  return defaultPaymentProcessor || null;
});

/**
 * Activates a user
 *
 */
User.methods.calculateBalance = function() {
  console.log('calculateBalance hit');
};

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
 * @param {String} prop
 * @private
 */
User.methods._recordBytes = function(bytes, prop) {
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
User.methods.recordUploadBytes = function(bytes) {
  return this._recordBytes(bytes, 'bytesUploaded');
};

/**
 * Record upload transfer
 * @param {Number} bytes
 */
User.methods.recordDownloadBytes = function(bytes) {
  return this._recordBytes(bytes, 'bytesDownloaded');
};

/**
 * Check if the user is rate limited for the upload
 * @returns {Boolean}
 */
User.methods._isRateLimited = function(hourlyB, dailyB, monthlyB, prop) {
  return this.isFreeTier
    ? (this[prop].lastHourBytes >= hourlyB) ||
      (this[prop].lastDayBytes >= dailyB) ||
      (this[prop].lastMonthBytes >= monthlyB)
    : false;
};

/**
 * Check if the user is rate limited for the upload
 * @returns {Boolean}
 */
User.methods.isUploadRateLimited = function(hourlyB, dailyB, monthlyB) {
  this.recordUploadBytes(0); // NB: Trigger reset if needed
  return this._isRateLimited(hourlyB, dailyB, monthlyB, 'bytesUploaded');
};

/**
 * Check if the user is rate limited for the upload
 * @returns {Boolean}
 */
User.methods.isDownloadRateLimited = function(hourlyB, dailyB, monthlyB) {
  this.recordDownloadBytes(0); // NB: Trigger reset if needed
  return this._isRateLimited(hourlyB, dailyB, monthlyB, 'bytesDownloaded');
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

User.methods.addPaymentProcessor = function(name, data) {
  const adapter = paymentProcessorAdapters[name];

  const existingProcessor = this.paymentProcessors.filter(
      (processor) => (processor.name === name)
  )[0];

  if (!!existingProcessor) {
    return existingProcessor.update(data);
  }

  return adapter.register(data, this.email).then((processorData) => {
    this.paymentProcessors.push({
      name: name,
      // TODO: don't assume default here when we support
      // multiple payment methods/processors!
      default: true,
      // NB: can't use `data` virtual setter here because in the virtua,
      // `this.name` will be undefined
      rawData: adapter.serializeData(processorData)
    });

    // TODO: this won't work when the new processor isn't automatically the
    // default, i.e.: once we support multiple payment processors
    return this.save().then(() => this.defaultPaymentProcessor);
  });
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
    return callback(new Error('Password must be hex encoded SHA-256 hash'));
  }

  User.findOne({_id: email}, function(err, result) {
    if (err) {
      return callback(err);
    }

    if (result) {
      return callback(new Error('Email is already registered'));
    }

    user.save(function(err) {
      if (err) {
        if (err.code === 11000) {
          return callback(new Error('Email is already registered'));
        }

        return callback(err);
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
