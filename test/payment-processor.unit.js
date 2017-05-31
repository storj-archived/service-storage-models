'use strict';

const expect = require('chai').expect;
const mongoose = require('mongoose');

const PaymentProcessorSchema = require('../lib/models/payment-processor');

let PaymentProcessor;
let connection;

require('mongoose-types').loadTypes(mongoose);

before(function(done) {
  connection = mongoose.createConnection(
    'mongodb://127.0.0.1:27017/__storj-bridge-test',
    function() {
      PaymentProcessor = PaymentProcessorSchema(connection);
      PaymentProcessor.remove({}, done);
    }
  );
});

after(function(done) {
  connection.close(done);
});

describe('Storage/models/PaymentProcessor', function() {

  describe('@constructor', function() {
    it('should fail validation', function(done) {
      const pp = new PaymentProcessor({
        user: 'nobody@',
        name: 'stripe'
      });
      pp.save((err) => {
        expect(err).to.be.instanceOf(Error);
        expect(err.message).to.match(/^paymentprocessor validation failed.*/i);
        done();
      });
    });
    it('should NOT fail validation', function(done) {
      const pp = new PaymentProcessor({
        user: 'somebody@somewhere.com',
        name: 'stripe'
      });
      pp.save(done);
    });
  });

});
