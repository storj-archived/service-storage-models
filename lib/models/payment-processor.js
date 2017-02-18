'use strict';

const mongoose = require('mongoose');
const moment = require('moment');
const SchemaOptions = require('../options');
const constants = require('../constants');
const PAYMENT_PROCESSORS = constants.PAYMENT_PROCESSORS;
const paymentProcessorAdapters = require('./payment-processor-adapters');
const UserModel = require('./user');

const PaymentProcessor = new mongoose.Schema({
  user: {
    type: mongoose.SchemaTypes.Email,
    ref: 'User',
    required: true
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

PaymentProcessor.pre('save', function(next){
  this.adapter.validate()
    // TODO: make sure there is only one processer marked as default per user
    // .then(ensureSingleDefault)
    .then(() => {
      this.markModified('rawData');
      next(null);
    })
    .catch(next);
});

PaymentProcessor.virtual('adapter').get(function() {
  return paymentProcessorAdapters[this.name](this);
});

PaymentProcessor.virtual('data')
  .get(function() {
    return this.adapter.parseData();
  })
  .set(function(data) {
    this.rawData = this.adapter.serializeData(data);
    // TODO: remove - use the one in the pre save
    // this.markModified('rawData');
  });

PaymentProcessor.virtual('defaultPaymentMethod').get(function() {
  return this.adapter.defaultPaymentMethod();
});

PaymentProcessor.virtual('billingDate').get(function() {
  return this.adapter.billingDate();
});

PaymentProcessor.virtual('currentBillingPeriod').get(function() {
  const billingDate = this.data.billingDate;
  const thisMoment = moment.utc();
  const endOfBillingMonth = moment
    .utc([thisMoment.year(), thisMoment.month()])
    .add(1, 'month')
    .subtract(1, 'day')
    .date();

  const adjustedBillingMoment = (billingDate > endOfBillingMonth) ?
    endOfBillingMonth : billingDate;

  const startMoment = moment.utc([
    thisMoment.year(),
    thisMoment.month() - 1,
    adjustedBillingMoment]);
  const endMoment = moment.utc(startMoment).add(1, 'month');

  return {
    startMoment: startMoment,
    endMoment: endMoment
  };
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
      );
      return this.__parent.paymentProcessors;
    });
};

PaymentProcessor.methods.addPaymentMethod = function(data) {
  return this.adapter
    .addPaymentMethod(data)
    .then(() => this);
};

module.exports = function(connection) {
  return connection.model('PaymentProcessor', PaymentProcessor);
};

module.exports.Schema = PaymentProcessor;
