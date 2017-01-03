'use strict';

const errors = require('storj-service-error-types');
const mongoose = require('mongoose');
const SchemaOptions = require('../options');
const constants = require('../constants');
const PAYMENT_PROCESSORS = constants.PAYMENT_PROCESSORS;
const paymentProcessorAdapters = require('../graphql/payment-processor-adapters/payment-processor-adapters');

const PaymentProcessor = new mongoose.Schema({
  name: {
    type: String,
    enum: Object.keys(PAYMENT_PROCESSORS).map((key) => (PAYMENT_PROCESSORS[key])),
    unique: true
  },
  rawData: [{
    type: mongoose.Schema.Types.Mixed
  }],
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
    delete ret.data;
    delete ret.adapter;
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
      reject(new errors.InternalError(err));
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

// NB: Because we're only using the schema, this shouldn't need to be exported
// out with SchemaOptions
module.exports = mongoose.model('PaymentProcessor', PaymentProcessor);

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
