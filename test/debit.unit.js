'use strict';

// const storj = require('storj-lib');
const expect = require('chai').expect;
const mongoose = require('mongoose');

require('mongoose-types').loadTypes(mongoose);

const DebitSchema = require('../lib/models/debit');
const constants = require('../lib/constants');
const DEBIT_TYPES = constants.DEBIT_TYPES;

var Debit;
var connection;

before(function(done) {
  connection = mongoose.createConnection(
    'mongodb://127.0.0.1:27017/__storj-bridge-test',
    function() {
      Debit = DebitSchema(connection);
      done();
    }
  );
});

after(function(done) {
  Debit.remove({}, function() {
    connection.close(done);
  });
});

describe('Storage/models/Debit', function() {
  describe('#create', function() {

    it('should create debit with default props', function(done) {
      var newDebit = new Debit({
        user: 'user@domain.tld',
        type: DEBIT_TYPES.AUDIT
      });

      var d = new Date();
      var date = new Date(d.getFullYear(), d.getMonth(), d.getDate());

      newDebit.save(function(err, debit) {
        expect(err).to.not.be.an.instanceOf(Error);
        expect(debit.amount).to.equal(0);
        expect(debit.user).to.equal('user@domain.tld');
        expect(debit.created).to.equalDate(date);
        expect(debit.type).to.be.oneOf(
          Object.keys(DEBIT_TYPES).map((key) => DEBIT_TYPES[key])
        );
        expect(debit.bandwidth).to.equal(0).and.to.be.a('number');
        expect(debit.storage).to.equal(0).and.to.be.a('number');
        done();
      });
    });

    it('should reject type if not enum', function(done) {
      var newDebit = new Debit({
        user: 'user@domain.tld',
        type: 'NOT-A-DEBIT-ENUM'
      });

      newDebit.save(function(err, debit) {
        expect(err).to.be.instanceOf(Error);
        done();
      });
    });

    it('should reject null for amount', function(done) {
      var newDebit = new Debit({
        user: 'user@domain.tld',
        type: DEBIT_TYPES.AUDIT,
        amount: null
      });

      newDebit.save(function(err, debit) {
        expect(err).to.be.an.instanceOf(Error);
        done();
      });
    });

    it('should convert non-null, non-currency to 0 for currency types', function(done) {
      var newDebit = new Debit({
        user: 'user@domain.tld',
        type: DEBIT_TYPES.AUDIT,
        amount: undefined
      });

      newDebit.save(function(err, debit) {
        expect(err).to.not.be.an.instanceOf(Error);
        expect(debit.amount).to.equal(0);

        Debit.findOneAndUpdate(
          { _id: debit._id },
          { amount: '' },
          { new: true },
          function(err, debit) {
            expect(err).to.not.be.an.instanceOf(Error);
            expect(debit.amount).to.equal(0);
            done();
          }
        );
      });
    });

    it('should fail if bandwidth is not an integer', function(done) {
      var newDebit = new Debit({
        user: 'user@domain.tld',
        type: DEBIT_TYPES.AUDIT,
        bandwidth: 'I am not an integer'
      });

      newDebit.save(function(err, debit) {
        expect(err).to.be.an.instanceOf(Error);
        done();
      });
    });

    it('should fail if storage is not an integer', function(done) {
      var newDebit = new Debit({
        user: 'user@domain.tld',
        type: DEBIT_TYPES.AUDIT,
        storage: {}
      });

      newDebit.save(function(err, debit) {
        expect(err).to.be.an.instanceOf(Error);
        done();
      });
    });

  });
});
