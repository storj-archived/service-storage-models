'use strict';

const activator = require('hat').rack(256);
const crypto = require('crypto');
const mongoose = require('mongoose');
const SchemaOptions = require('../options');
const constants = require('../constants');
const PAYMENT_PROCESSORS = constants.PAYMENT_PROCESSORS;
const paymentProcessorAdapters = require('./payment-processor-adapters');
const errors = require('storj-service-error-types');
const usage = require('./queries/usage');

let UserModel;

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

PaymentProcessor
  .set('toObject', {
    virtuals: true,
    transform: (doc, ret) => {
      delete ret.__v;
      delete ret._id;
      delete ret.rawData;
    }
  });

PaymentProcessor.virtual('adapter').get(function() {
  return paymentProcessorAdapters[this.name](this);
});

PaymentProcessor.virtual('data')
  .get(function() {
    return this.adapter.parseData(this.rawData);
  })
  .set(function(data) {
    return this.adapter.serializeData(data);
  });

PaymentProcessor.virtual('defaultPaymentMethod').get(function() {
  return this.adapter.defaultPaymentMethod();
});

PaymentProcessor.virtual('billingDate').get(function() {
  return this.adapter.billingDate();
});

PaymentProcessor.virtual('paymentMethods').get(function() {
  return this.adapter.paymentMethods();
});

PaymentProcessor.methods.refresh = function() {
  console.log('USER REFRESHED.');
  return UserModel
    .findOne({ _id: this.__parent._id })
    .then((user) => {
      console.log('USER MODEL REFRESH: ', user.defaultPaymentProcessor.data.customer.sources.data);
      this.__parent.paymentProcessors.splice(
        0,
        this.__parent.paymentProcessors.length,
        user.paymentProcessors
      )
      console.log('__PARENT', this.__parent.paymentProcessors);
      return this.__parent.paymentProcessors;
    })
};

PaymentProcessor.methods.update = function(paymentProcessor) {
  return this.adapter.validate(paymentProcessor)
    .then((isValid) => {
      // console.log('this is: ', this);
      if (!isValid) {
        return Promise.reject(this);
      }

        return UserModel
          .update({
            _id: this.__parent._id,
            paymentProcessors: {
              $elemMatch: {
                _id: this._id
              }
            }
          }, { $set: {
              'paymentProcessors.$.rawData': paymentProcessor.rawData
            }
          })
          .then(() => {
            return paymentProcessor
          });
    })
    .catch((err) => {
      console.error(err);
      throw err;
    });
};

PaymentProcessor.methods.delete = function() {
  return this.adapter.delete(this)
    .then(() => {
      return this.remove();
    })
    .then(() => {
      return this.__parent.save();
    });
};

PaymentProcessor.methods.addPaymentMethod = function(data) {
  return this.adapter.addPaymentMethod(data)
  .then(() => this)
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
  ]
});

User.plugin(SchemaOptions);

User.index({
  resetter: 1
});

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
    // delete ret.paymentProcessors;
    // delete ret.defaultPaymentProcessor;
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
 *
 */
User.methods.getPaymentProcessor = function(processorName) {
  return this.paymentProcessors.find((p) => p.name === processorName);
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
 * Deactivates a user
 * @param {Function} callback
 */
User.methods.deactivate = function(callback) {
  this.activated = false;
  this.activator = activator();
  this.save(callback);
};

User.methods.addPaymentProcessor = function(name, data) {
  const adapter = paymentProcessorAdapters[name](this);

  const existingProcessor = this.paymentProcessors.find(p => (p.name === name));

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

  User.findOne({
    _id: email
  }, function(err, result) {
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
  return (UserModel = connection.model('User', User));
};
