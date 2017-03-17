'use strict';

let PaymentProcessorModel;

const mongoose = require('mongoose');
const moment = require('moment');
const errors = require('storj-service-error-types');
const SchemaOptions = require('../options');
const constants = require('../constants');
const utils = require('../utils');
const PAYMENT_PROCESSORS = constants.PAYMENT_PROCESSORS;
const paymentProcessorAdapters = require('./payment-processor-adapters');
const UserModel = require('./user');

const getBillingPeriodFor = function(referenceMoment, billingDate){
  const endOfBillingMonth = moment
    .utc([referenceMoment.year(), referenceMoment.month()])
    .add(1, 'month')
    .subtract(1, 'day')
    .date();

  const adjustedBillingMoment = (billingDate > endOfBillingMonth) ?
    endOfBillingMonth : billingDate;

  const startMoment = moment.utc([
    referenceMoment.year(),
    referenceMoment.month() - 1,
    adjustedBillingMoment]);
  const endMoment = moment.utc(startMoment).add(1, 'month');

  return {
    startMoment: startMoment,
    endMoment: endMoment
  };
};

const PaymentProcessorSchema = new mongoose.Schema({
  user: {
    type: String,
    ref: 'User',
    required: true,
    validate: {
      validator: value => utils.isValidEmail(value),
      message: 'Invalid user email address'
    }
  },
  name: {
    type: String,
    enum: Object.keys(PAYMENT_PROCESSORS).map((key) => {
      return PAYMENT_PROCESSORS[key];
    }),
    required: true
  },
  rawData: [{
    type: mongoose.Schema.Types.Mixed,
    default: []
  }],
  default: {
    type: Boolean
  },
  created: {
    type: Date,
    default: Date.now
  }
});

PaymentProcessorSchema.plugin(SchemaOptions);

PaymentProcessorSchema.set('toObject', {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret.__v;
    delete ret._id;
    delete ret.rawData;
    delete ret.data;
    delete ret.adapter;
  }
});

PaymentProcessorSchema.pre('validate', function(next) {
  return PaymentProcessorModel
    .find({ user: this.user, payment_processor: this.payment_processor })
    .then((paymentProcessors) => {
      const err = new errors.BadRequestError(
        `There can only be one payment processor per vendor per user;
        payment_processor: ${this.payment_processor}
        user: ${this.user}`
      );

      return (paymentProcessors.length > 1) ? next(err) : next(null);
    });
});

PaymentProcessorSchema.pre('save', function(next) {
  this.adapter.validate()
  // TODO: make sure there is only one processer marked as default per user
  // .then(ensureSingleDefault)
    .then(() => {
      this.markModified('rawData');
      next(null);
    })
    .catch(next);
});

PaymentProcessorSchema.virtual('adapter').get(function() {
  return paymentProcessorAdapters[this.name](this);
});

PaymentProcessorSchema.virtual('data')
  .get(function() {
    return this.adapter.parseData();
  })
  .set(function(data) {
    this.rawData = this.adapter.serializeData(data);
    // TODO: remove - use the one in the pre save
    // this.markModified('rawData');
  });

PaymentProcessorSchema.virtual('defaultPaymentMethod').get(function() {
  return this.adapter.defaultPaymentMethod();
});

PaymentProcessorSchema.virtual('billingDate').get(function() {
  return this.adapter.billingDate();
});

PaymentProcessorSchema.virtual('currentBillingPeriod').get(function() {
  const referenceMoment = moment.utc();
  return getBillingPeriodFor(referenceMoment, this.data.billingDate);
});

PaymentProcessorSchema.virtual('nextBillingPeriod').get(function() {
  const referenceMoment = moment.utc().add(1, 'month');
  return getBillingPeriodFor(referenceMoment, this.data.billingDate);
});

PaymentProcessorSchema.virtual('paymentMethods').get(function() {
  return this.adapter.paymentMethods();
});

PaymentProcessorSchema.methods.refresh = function() {
  return UserModel
    .findOne({ _id: this.__parent._id })
    .then((user) => {
      this.__parent.paymentProcessors.splice(
        0,
        this.__parent.paymentProcessors.length,
        user.paymentProcessors
      );
      return this.__parent.paymentProcessors;
    });
};

PaymentProcessorSchema.methods.addPaymentMethod = function(data) {
  return this.adapter
    .addPaymentMethod(data)
    .then(() => this);
};

PaymentProcessorSchema.statics.findByForeignId = function(id, name) {
  return paymentProcessorAdapters[name](this).find(id);
};

module.exports = function(connection) {
  PaymentProcessorModel = connection
    .model('PaymentProcessor', PaymentProcessorSchema);
  return PaymentProcessorModel;
};

module.exports.Schema = PaymentProcessorSchema;
