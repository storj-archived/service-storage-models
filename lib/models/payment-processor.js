'use strict';

const errors = require('storj-service-error-types');
const mongoose = require('mongoose');
const SchemaOptions = require('../options');
const constants = require('../constants');
const PAYMENT_PROCESSORS = constants.PAYMENT_PROCESSORS;
const paymentProcessorAdapters = require('./payment-processor-adapters');

const PaymentProcessor = new mongoose.Schema({
  name: {
    type: String,
    enum: Object.keys(PAYMENT_PROCESSORS).map((key) => (PAYMENT_PROCESSORS[key]))
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

PaymentProcessor.plugin(SchemaOptions);

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
  });

PaymentProcessor.virtual('defaultPaymentMethod').get(function() {
  return this.adapter.defaultPaymentMethod(this);
});

PaymentProcessor.virtual('billingDate').get(function() {
  return this.adapter.billingDate(this);
});

PaymentProcessor.virtual('paymentMethods').get(function() {
  return this.adapter.paymentMethods();
});

PaymentProcessor.methods.refresh = function() {
  return UserModel
    .findOne({ _id: this.__parent._id })
    .then((user) => {
      this.__parent.paymentProcessors.splice(
        0,
        this.__parent.paymentProcessors.length,
        user.paymentProcessors
      )
      return this.__parent.paymentProcessors;
    });
};

PaymentProcessor.methods.update = function(paymentProcessor) {
  return this.adapter.validate(paymentProcessor)
    .then((isValid) => {
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

module.exports = function(connection) {
  return connection.model('PaymentProcessor', PaymentProcessor);
};

module.exports.Schema = PaymentProcessor;
