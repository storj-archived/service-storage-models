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

    it('should not create a invalid email (no tld)', function(done) {
      User.create('wrong@domain', sha256('password'), function(err) {
        expect(err).to.be.instanceOf(Error);
        expect(err.message).to.equal('Invalid email');
        done();
      });
    });

    it('should not create a user account with bad password', function(done) {
      User.create('wrong@domain.tld', 'password', function(err) {
        expect(err.message).to.equal(
          'Password must be hex encoded SHA-256 hash'
        );
        done();
      });
    });

    it('should support modern TLDs', function(done) {
      User.create(
        'user@domain.lawyer',
        sha256('password'),
        function(err, user) {
          expect(err).to.not.be.instanceOf(Error);
          expect(user).to.be.instanceOf(Object);
          done();
      });
    });

    it('should create email with `+$#^*` symbols in address', function(done) {
      User.create(
        "test+!#$%&'*+-/=?^_`{|}~!$%^&*test@test.com", // jshint ignore:line
        sha256('password'),
        function(err, user) {
          expect(err).to.not.be.instanceOf(Error);
          expect(user).to.be.instanceOf(Object);
          done();
        });
    });

    it('should create user with email that uses IP address', function(done) {
      User.create(
        'test@192.168.0.1',
        sha256('password'),
        function(err, user) {
          expect(err).to.not.be.instanceOf(Error);
          expect(user).to.be.instanceOf(Object);
          done();
        });
    });

    it('should not create email with invalid symbols', function(done) {
      User.create(
        'test()test@gmail.com',
        sha256('password'),
        function(err) {
          expect(err).to.be.instanceOf(Error);
          expect(err.message).to.equal('Invalid email');
          done();
        });
    });

    it('should not create an email of value `null`', function(done) {
      User.create(
        null,
        sha256('password'),
        function(err) {
          expect(err).to.be.instanceOf(Error);
          expect(err.message).to.equal('Must supply an email');
          done();
        });
    });

    it('should not create email > 254 chars', function(done) {
      var longEmail =
      'PJaNS9k2M0xx0LFyMt2jxSUQEzpN27sHEXwNDiUcYmRc9QJBX28hECkzynbbUskfd@'+
      'up7MohQrlzLEpUtnQMAvsY8HroBza2ifJotuyz2FD1y1X7paGw40eGxj4TIhM5pCTl' +
      'gxu6XPRNBRu8qqkv6LNgibPPWK2Il20GKilCFSRTraN67cFJWsCfCOfzZjymS6YPze' +
      'DPXZugTGl4vMPwAMI3gi7TbwLPcwV64Do6R2Qz3H6My8yWKwepls7J8DK8FisEkIW1N' +
      'chTop0NqWADTlguHuEi230npemRbNwWQpr0ErcWaRRYZZrIzQ2kwfCiA.com';

      User.create(longEmail, sha256('password'), function(err) {
        expect(err).to.be.instanceOf(Error);
        expect(err.message).to.equal('Invalid email');
        done();
      });
    });
  });


  /* jshint ignore: start */
  /* ignoring: too many statements */
  describe('#recordDownloadBytes', function() {
    it('should record the bytes and increment existing', function(done) {
      var user = new User({
        _id: 'test@user.tld',
        hashpass: 'hashpass'
      });
      var clock = sinon.useFakeTimers();
      user.recordDownloadBytes(4096);
      expect(user.bytesDownloaded.lastHourBytes).to.equal(4096);
      expect(user.bytesDownloaded.lastDayBytes).to.equal(4096);
      expect(user.bytesDownloaded.lastMonthBytes).to.equal(4096);
      user.recordDownloadBytes(1000);
      expect(user.bytesDownloaded.lastHourBytes).to.equal(5096);
      expect(user.bytesDownloaded.lastDayBytes).to.equal(5096);
      expect(user.bytesDownloaded.lastMonthBytes).to.equal(5096);
      clock.tick(ms('1h'));
      user.recordDownloadBytes(2000);
      expect(user.bytesDownloaded.lastHourBytes).to.equal(2000);
      expect(user.bytesDownloaded.lastDayBytes).to.equal(7096);
      expect(user.bytesDownloaded.lastMonthBytes).to.equal(7096);
      clock.tick(ms('24h'));
      user.recordDownloadBytes(1000);
      expect(user.bytesDownloaded.lastHourBytes).to.equal(1000);
      expect(user.bytesDownloaded.lastDayBytes).to.equal(1000);
      expect(user.bytesDownloaded.lastMonthBytes).to.equal(8096);
      clock.tick(ms('30d'));
      user.recordDownloadBytes(5000);
      expect(user.bytesDownloaded.lastHourBytes).to.equal(5000);
      expect(user.bytesDownloaded.lastDayBytes).to.equal(5000);
      expect(user.bytesDownloaded.lastMonthBytes).to.equal(5000);
      clock.restore();
      done();
    });
  });

  describe('#isDownloadRateLimited', function() {
    let userFree = null;
    let userPaid = null;
    let clock = null;

    before(() => {
      clock = sinon.useFakeTimers();
      userFree = new User({
        _id: 'user@free.tld',
        hashpass: 'hashpass'
      });
      userPaid = new User({
        _id: 'user@paid.tld',
        hashpass: 'hashpass',
        isFreeTier: false
      });
    });
    after(() => clock.restore());

    it('should return false in paid tier', function() {
      expect(userPaid.isDownloadRateLimited(10, 20, 30)).to.equal(false);
      userPaid.recordDownloadBytes(700);
      expect(userPaid.isDownloadRateLimited(10, 20, 30)).to.equal(false);
    });

    it('should return false if under the limits', function() {
      expect(userFree.isDownloadRateLimited(10, 20, 30)).to.equal(false);
      userFree.recordDownloadBytes(10);
      clock.tick(ms('1hr'));
      expect(userFree.isDownloadRateLimited(10, 20, 30)).to.equal(false);
    });

    it('should return true if over the hourly limits', function() {
      userFree.recordDownloadBytes(10);
      expect(userFree.isDownloadRateLimited(10, 20, 30)).to.equal(true);
    });

    it('should return true if over the daily limits', function() {
      clock.tick(ms('2hr'));
      userFree.recordDownloadBytes(10);
      expect(userFree.isDownloadRateLimited(10, 20, 30)).to.equal(true);
    });

    it('should return true if over the monthly limits', function() {
      clock.tick(ms('20h'));
      userFree.recordDownloadBytes(10);
      expect(userFree.isDownloadRateLimited(10, 20, 30)).to.equal(true);
    });
  });

  describe('#recordUploadBytes', function() {

    it('should record the bytes and increment existing', function(done) {
      var user = new User({
        _id: 'test@user.tld',
        hashpass: 'hashpass'
      });
      var clock = sinon.useFakeTimers();
      user.recordUploadBytes(4096);
      expect(user.bytesUploaded.lastHourBytes).to.equal(4096);
      expect(user.bytesUploaded.lastDayBytes).to.equal(4096);
      expect(user.bytesUploaded.lastMonthBytes).to.equal(4096);
      user.recordUploadBytes(1000);
      expect(user.bytesUploaded.lastHourBytes).to.equal(5096);
      expect(user.bytesUploaded.lastDayBytes).to.equal(5096);
      expect(user.bytesUploaded.lastMonthBytes).to.equal(5096);
      clock.tick(ms('1h'));
      user.recordUploadBytes(2000);
      expect(user.bytesUploaded.lastHourBytes).to.equal(2000);
      expect(user.bytesUploaded.lastDayBytes).to.equal(7096);
      expect(user.bytesUploaded.lastMonthBytes).to.equal(7096);
      clock.tick(ms('24h'));
      user.recordUploadBytes(1000);
      expect(user.bytesUploaded.lastHourBytes).to.equal(1000);
      expect(user.bytesUploaded.lastDayBytes).to.equal(1000);
      expect(user.bytesUploaded.lastMonthBytes).to.equal(8096);
      clock.tick(ms('30d'));
      user.recordUploadBytes(5000);
      expect(user.bytesUploaded.lastHourBytes).to.equal(5000);
      expect(user.bytesUploaded.lastDayBytes).to.equal(5000);
      expect(user.bytesUploaded.lastMonthBytes).to.equal(5000);
      clock.restore();
      done();
    });

  });
  /* jshint ignore: end */

  describe('#isUploadRateLimited', function() {

    let userFree = null;
    let userPaid = null;
    let clock = null;

    before(() => {
      clock = sinon.useFakeTimers();
      userFree = new User({
        _id: 'user@free.tld',
        hashpass: 'hashpass'
      });
      userPaid = new User({
        _id: 'user@paid.tld',
        hashpass: 'hashpass',
        isFreeTier: false
      });
    });
    after(() => clock.restore());

    it('should return false in paid tier', function() {
      expect(userPaid.isUploadRateLimited(10, 20, 30)).to.equal(false);
      userPaid.recordUploadBytes(700);
      expect(userPaid.isUploadRateLimited(10, 20, 30)).to.equal(false);
    });

    it('should return false if under the limits', function() {
      expect(userFree.isUploadRateLimited(10, 20, 30)).to.equal(false);
      userFree.recordUploadBytes(10);
      clock.tick(ms('1hr'));
      expect(userFree.isUploadRateLimited(10, 20, 30)).to.equal(false);
    });

    it('should return true if over the hourly limits', function() {
      userFree.recordUploadBytes(10);
      expect(userFree.isUploadRateLimited(10, 20, 30)).to.equal(true);
    });

    it('should return true if over the daily limits', function() {
      clock.tick(ms('2hr'));
      userFree.recordUploadBytes(10);
      expect(userFree.isUploadRateLimited(10, 20, 30)).to.equal(true);
    });

    it('should return true if over the monthly limits', function() {
      clock.tick(ms('20h'));
      userFree.recordUploadBytes(10);
      expect(userFree.isUploadRateLimited(10, 20, 30)).to.equal(true);
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

    it('should give error if missing passwd', function(done) {
      User.lookup('user@domain.tld', null, function(err) {
        expect(err).to.be.instanceOf(errors.NotAuthorizedError);
        done();
      });
    });

    it('should give a not authorized error if user not found', function(done) {
      User.lookup('user@domain.tld', sha256('password2'), function(err) {
        expect(err).to.be.instanceOf(errors.NotAuthorizedError);
        done();
      });
    });

  });

});
