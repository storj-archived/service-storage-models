'use strict';

const expect = require('chai').expect;
const mongoose = require('mongoose');

const PaymentProcessorSchema = require('../lib/models/payment-processor');

let PaymentProcessor;
let connection;

require('mongoose-types').loadTypes(mongoose);

before(function (done) {
  connection = mongoose.createConnection(
    'mongodb://127.0.0.1:27017/__storj-bridge-test',
    function () {
      PaymentProcessor = PaymentProcessorSchema(connection);
      PaymentProcessor.remove({}, done);
    }
  );
});

after(function (done) {
  connection.close(done);
});

describe('Storage/models/PaymentProcessor', function () {

  describe('@constructor', function () {
    it('should fail validation', function (done) {
      const pp = new PaymentProcessor({
        user: 'nobody@',
        name: 'stripe'
      });
      pp.save((err) => {
        expect(err).to.be.instanceOf(Error);
        expect(err.message).to.match(/^paymentprocessor validation failed.*/i);
        done();
      })
      ;
    });
    it('should NOT fail validation', function (done) {
      const pp = new PaymentProcessor({
        user: 'somebody@somewhere.com',
        name: 'stripe'
      });
      pp.save(done);
    });
  });

  describe('#currentBillingPeriod', function () {
    it('should return a billing period range', function () {
      const pp = new PaymentProcessor({
        user: 'someone@somewhere.com',
        name: 'stripe',
        rawData: [{billingDate: 1}]
      });
      const actual = pp.currentBillingPeriod;
      expect(actual).to.have.property('startMoment');
      expect(actual).to.have.property('endMoment');
    });
  });

  describe('#toObject', function () {
    let pp;

    before(function () {
      pp = new PaymentProcessor({
        name: 'stripe',
        rawData: [{billingDate: 1}]
      });
    });

    it('should NOT include deleted members', function () {
      const actual = pp.toObject();
      expect(actual).to.not.have.property('__v');
      expect(actual).to.not.have.property('_id');
      expect(actual).to.not.have.property('rawData');
    });

    it('should include virtual members', function () {
      const actual = pp.toObject();
      expect(actual).to.have.property('data');
      expect(actual).to.have.property('adapter');
      expect(actual).to.have.property('defaultPaymentMethod');
    });
  });

  describe('#toJSON', function () {
    let pp;

    before(function () {
      pp = new PaymentProcessor({
        name: 'stripe',
        rawData: [{billingDate: 1}]
      });
    });

    it('should NOT include deleted members', function () {
      const actual = pp.toJSON();
      expect(actual).to.not.have.property('__v');
      expect(actual).to.not.have.property('_id');
      expect(actual).to.not.have.property('rawData');
    });

    it('should include virtual members', function () {
      const actual = pp.toJSON();
      expect(actual).to.have.property('data');
      expect(actual).to.have.property('adapter');
      expect(actual).to.have.property('defaultPaymentMethod');
    });
  });
});
