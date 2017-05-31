'use strict';

const expect = require('chai').expect;
const mongoose = require('mongoose');
const chai = require('chai');
chai.use(require('chai-datetime'));

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
      Debit.remove({}, function() {
        done();
      });
    }
  );
});

after(function(done) {
  connection.close(done);
});

describe('Storage/models/Debit', function() {

  describe('@constructor', function() {
    it('should fail validation', function(done) {
      const debit = new Debit({
        user: 'nobody@',
        amount: 10000,
        type: DEBIT_TYPES.STORAGE
      });
      debit.save((err) => {
        expect(err).to.be.instanceOf(Error);
        expect(err.message).to.match(/^debit validation failed.*/i);
        done();
      });
    });
    it('should NOT fail validation', function(done) {
      const debit = new Debit({
        user: 'somebody@somewhere.com',
        amount: 10000,
        type: DEBIT_TYPES.STORAGE
      });
      debit.save(done);
    });
  });

  describe('#create', function() {

    it('should create debit with default props', function(done) {
      var newDebit = new Debit({
        user: 'user@domain.tld',
        type: DEBIT_TYPES.STORAGE,
        amount: 1234
      });

      var d = new Date();
      var date = new Date(d.getFullYear(), d.getMonth(), d.getDate());

      newDebit.save(function(err, debit) {
        if (err) {
          return done(err);
        }
        expect(debit.amount).to.equal(1234);
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

    it('should maintain 10000th debit amount accuracy', function(done) {
      var debitAmount = 1234.5678;
      var newDebit = new Debit({
        user: 'user@domain.tld',
        type: DEBIT_TYPES.STORAGE,
        amount: debitAmount
      });

      newDebit.save(function(err, debit) {
        if (err) {
          return done(err);
        }
        expect(debit.amount).to.equal(Math.round(debitAmount * 10000) / 10000);
        done();
      });
    });

    it('should reject type if not enum', function(done) {
      var newDebit = new Debit({
        user: 'user@domain.tld',
        type: 'NOT-A-DEBIT-ENUM',
        amount: 0
      });

      newDebit.save(function(err) {
        expect(err).to.be.instanceOf(Error);
        expect(err.message).to.match(/^debit validation failed.*/i);
        done();
      });
    });

    it('shouldn\'t save null for amount', function(done) {
      var newDebit = new Debit({
        user: 'user@domain.tld',
        type: DEBIT_TYPES.STORAGE,
        amount: null
      });

      newDebit.save(function(err) {
        expect(err).to.be.instanceOf(Error);
        expect(err.message).to.equal('Amount must be a number');
        done();
      });
    });

    it('should not undefined debit amount (no default)',
      function(done) {
        var newDebit = new Debit({
          user: 'user@domain.tld',
          type: DEBIT_TYPES.STORAGE,
          amount: undefined
        });

        newDebit.save(function(err) {
          expect(err).to.be.instanceOf(Error);
          expect(err.message).to.equal('Amount must be a number');
          done();
        });
    });

    it('should fail without amount', function(done) {
      var newDebit = new Debit({
        user: 'user@domain.tld',
        type: DEBIT_TYPES.STORAGE
      });

      newDebit.save(function(err) {
        expect(err).to.be.an.instanceOf(Error);
        expect(err.message).to.equal('Amount must be a number');
        done();
      });
    });

    it('should fail if bandwidth is not an integer', function(done) {
      var newDebit = new Debit({
        user: 'user@domain.tld',
        type: DEBIT_TYPES.STORAGE,
        bandwidth: 'I am not an integer',
        amount: 123
      });

      newDebit.save(function(err) {
        expect(err).to.be.an.instanceOf(Error);
        expect(err.message).to.match(/^debit validation failed.*/i);
        done();
      });
    });

    it('should fail if storage is not an integer', function(done) {
      var newDebit = new Debit({
        user: 'user@domain.tld',
        type: DEBIT_TYPES.STORAGE,
        amount: 123,
        storage: {}
      });

      newDebit.save(function(err) {
        expect(err).to.be.an.instanceOf(Error);
        expect(err.message).to.match(/^debit validation failed.*/i);
        done();
      });
    });

  });

  describe('#toJSON', function() {

    it('should remove specified fields', function(done) {
      const newDebit = new Debit({
        user: 'user@domain.tld',
        type: DEBIT_TYPES.STORAGE,
        bandwidth: 123,
        amount: 123
      });

      newDebit.save(function(err, debit) {
        const debitKeys = Object.keys(debit.toJSON());
        expect(debitKeys).to.not.contain('__v', '_id');
        done();
      });
    });

  });

  describe('#toObject', function() {

    it('should contain specified properties', function(done) {
      const newDebit = new Debit({
        user: 'user@domain.tld',
        type: DEBIT_TYPES.STORAGE,
        bandwidth: 123,
        amount: 123
      });

      newDebit.save(function(err, debit) {
        const debitKeys = Object.keys(debit.toObject());
        expect(debitKeys).to.not.contain('__v', '_id');
        done();
      });
    });

  });

});
