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
