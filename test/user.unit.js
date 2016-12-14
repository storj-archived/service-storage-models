'use strict';

const crypto = require('crypto');
const errors = require('storj-service-error-types');
const expect = require('chai').expect;
const mongoose = require('mongoose');
const sinon = require('sinon');
const ms = require('ms');

require('mongoose-types').loadTypes(mongoose);

const UserSchema = require('../lib/models/user');

var User;
var connection;

before(function(done) {
  connection = mongoose.createConnection(
    'mongodb://127.0.0.1:27017/__storj-bridge-test',
    function() {
      User = UserSchema(connection);
      done();
    }
  );
});

after(function(done) {
  User.remove({}, function() {
    connection.close(done);
  });
});

function sha256(i) {
  return crypto.createHash('sha256').update(i).digest('hex');
}

describe('Storage/models/User', function() {

  describe('#create', function() {

    it('should create the user account in inactive state', function(done) {
      User.create('user@domain.tld', sha256('password'), function(err, user) {
        expect(err).to.not.be.instanceOf(Error);
        expect(user.activated).to.equal(false);
        done();
      });
    });

    it('should not create a duplicate user account', function(done) {
      User.create('user@domain.tld', sha256('password'), function(err) {
        expect(err.message).to.equal('Email is already registered');
        done();
      });
    });

    it('should not create a invalid email', function(done) {
      User.create('wrong@domain', sha256('password'), function(err) {
        expect(err.message).to.equal('User validation failed');
        done();
      });
    });

    it('should not create a user account with bad password', function(done) {
      User.create('wrong@domain.tld', 'password', function(err) {
        expect(err.message).to.equal('Password must be hex encoded SHA-256 hash');
        done();
      });
    });

  });

  describe('#recordUploadBytes', function() {

    it('should record the bytes and increment existing', function(done) {
      var user = new User({
        _id: 'test@user.tld',
        hashpass: 'hashpass'
      });
      var clock = sinon.useFakeTimers();
      user.recordUploadBytes(4096, () => {
        expect(user.bytesUploaded.lastHourBytes).to.equal(4096);
        expect(user.bytesUploaded.lastDayBytes).to.equal(4096);
        expect(user.bytesUploaded.lastMonthBytes).to.equal(4096);
        user.recordUploadBytes(1000, () => {
          expect(user.bytesUploaded.lastHourBytes).to.equal(5096);
          expect(user.bytesUploaded.lastDayBytes).to.equal(5096);
          expect(user.bytesUploaded.lastMonthBytes).to.equal(5096);
          clock.tick(ms('1h'));
          user.recordUploadBytes(2000, () => {
            expect(user.bytesUploaded.lastHourBytes).to.equal(2000);
            expect(user.bytesUploaded.lastDayBytes).to.equal(7096);
            expect(user.bytesUploaded.lastMonthBytes).to.equal(7096);
            clock.tick(ms('24h'));
            user.recordUploadBytes(1000, () => {
              expect(user.bytesUploaded.lastHourBytes).to.equal(1000);
              expect(user.bytesUploaded.lastDayBytes).to.equal(1000);
              expect(user.bytesUploaded.lastMonthBytes).to.equal(8096);
              clock.tick(ms('30d'));
              user.recordUploadBytes(5000, () => {
                expect(user.bytesUploaded.lastHourBytes).to.equal(5000);
                expect(user.bytesUploaded.lastDayBytes).to.equal(5000);
                expect(user.bytesUploaded.lastMonthBytes).to.equal(5000);
                clock.restore();
                done();
              });
            });
          });
        });
      });
    });

  });

  describe('#isUploadRateLimited', function() {

    it('should return false in not free tier', function() {

    });

    it('should return false if under the limits', function() {

    });

    it('should return true if over the limits', function() {

    });

  });

  describe('#activate', function() {

    it('should activate the user account', function(done) {
      User.findOne({}, function(err, user) {
        expect(err).to.not.be.instanceOf(Error);
        expect(user.activated).to.equal(false);
        user.activate(function() {
          expect(user.activated).to.equal(true);
          done();
        });
      });
    });

  });

  describe('#deactivate', function() {

    it('should activate the user account', function(done) {
      User.findOne({}, function(err, user) {
        expect(err).to.not.be.instanceOf(Error);
        expect(user.activated).to.equal(true);
        user.deactivate(function() {
          expect(user.activated).to.equal(false);
          done();
        });
      });
    });

  });

  describe('#lookup', function() {

    it('should return the user account', function(done) {
      User.lookup('user@domain.tld', sha256('password'), function(err, user) {
        expect(err).to.not.be.instanceOf(Error);
        expect(user.id).to.equal('user@domain.tld');
        done();
      });
    });

    it('should give a not authorized error if user not found', function(done) {
      User.lookup('user@domain.tld', sha256('password2'), function(err, user) {
        expect(err).to.be.instanceOf(errors.NotAuthorizedError);
        done();
      });
    });

  });

});
