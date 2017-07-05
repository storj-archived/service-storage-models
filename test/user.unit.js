'use strict';

/* jshint maxstatements: 100 */

const async = require('async');
const crypto = require('crypto');
const errors = require('storj-service-error-types');
const { expect } = require('chai');
const mongoose = require('mongoose');
const sinon = require('sinon');
const ms = require('ms');
const validateUUID = require('uuid-validate');

require('mongoose-types').loadTypes(mongoose);

const UserSchema = require('../lib/models/user');

var User;
var connection;

before(function(done) {
  connection = mongoose.createConnection(
    'mongodb://127.0.0.1:27017/__storj-bridge-test',
    function() {
      User = UserSchema(connection);
      User.remove({}, function() {
        done();
      });
    }
  );
});

after(function(done) {
  connection.close(done);
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

    it('should create user with opts object passed in', function(done) {
      User.create({
        email: 'user22@domain.tld',
        password: sha256('password'),
        referralPartner: '5925ec5eee5642661d4a43a4'
      }, function(err, user) {
        if (err) {
          return done(err);
        }
        expect(user.email).to.equal('user22@domain.tld');
        expect(user.referralPartner.toString())
          .to.equal('5925ec5eee5642661d4a43a4');
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

    it('should not create a invalid email (no domain)', function(done) {
      User.create('wrong@', sha256('password'), function(err) {
        expect(err).to.be.instanceOf(Error);
        expect(err.message).to.equal('Invalid email');
        done();
      });
    });

    it('should create a valid UUID', function(done) {
      User.create('uuid@domain.tld', sha256('password'), function(err, user) {
        expect(validateUUID(user.uuid)).to.equal(true);
        done();
      });
    });

    it('should add a dnt preference', function(done) {
      User.create('dnt@domain.tld', sha256('password'), function(err, user) {
        expect(user.preferences.dnt).to.equal(false);
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

    it('should not create email with no user', function(done) {
      User.create(
        '@gmail.com',
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

  describe('#toObject', function() {

    it('should contain specified properties + virtuals', function(done) {
      User.findOne({ _id: 'user@domain.tld' }, function(err, user) {
        if (err) {
          return done(err);
        }
        const keys = Object.keys(user.toObject());
        expect(keys).to.contain(
          'isFreeTier', 'activated', 'created', 'email', 'id', 'uuid'
        );
        expect(keys).to.not.contain(
          '__v', '_id', 'hashpass', 'activator', 'deactivator', 'resetter',
          'pendingHashPass', 'bytesDownloaded', 'bytesUploaded'
        );
        done();
      });
    });

  });

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

    it('will increment the value with concurrency', function(done) {
      const email = 'multiprocess2@absentminded.com';
      const pass = '06b76ad257f1e2f873c40e909392e76793322f7436d755d4896c5af96' +
            'cb56af4';
      User.create(email, pass, (err) => {
        if (err) {
          return done(err);
        }
        async.times(10, (n, next) => {
          User.findOne({_id: email}, (err, user) => {
            if (err) {
              return done(err);
            }
            if (!user) {
              return done(new Error('User not found'));
            }
            user.recordDownloadBytes(4096, next);
          });
        }, (err) => {
          if (err) {
            return done(err);
          }
          User.findOne({_id: email}, (err, user2) => {
            if (err) {
              return done(err);
            }
            if (!user2) {
              return done(new Error('User not found'));
            }
            expect(user2.bytesDownloaded.lastHourBytes).to.equal(4096 * 10);
            expect(user2.bytesDownloaded.lastDayBytes).to.equal(4096 * 10);
            expect(user2.bytesDownloaded.lastMonthBytes).to.equal(4096 * 10);

            expect(user2.bytesDownloaded.lastHourStarted)
              .to.be.below(Date.now());
            expect(user2.bytesDownloaded.lastDayStarted)
              .to.be.below(Date.now());
            expect(user2.bytesDownloaded.lastMonthStarted)
              .to.be.below(Date.now());
            done();
          });
        });
      });
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
    const sandbox = sinon.sandbox.create();
    afterEach(() => sandbox.restore());

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

    it('will increment the value with concurrency', function(done) {
      const email = 'multiprocess@absentminded.com';
      const pass = '06b76ad257f1e2f873c40e909392e76793322f7436d755d4896c5af96' +
            'cb56af4';
      User.create(email, pass, (err) => {
        if (err) {
          return done(err);
        }
        async.times(10, (n, next) => {
          User.findOne({_id: email}, (err, user) => {
            if (err) {
              return done(err);
            }
            if (!user) {
              return done(new Error('User not found'));
            }
            user.recordUploadBytes(4096, next);
          });
        }, (err) => {
          if (err) {
            return done(err);
          }
          User.findOne({_id: email}, (err, user2) => {
            if (err) {
              return done(err);
            }
            if (!user2) {
              return done(new Error('User not found'));
            }
            expect(user2.bytesUploaded.lastHourBytes).to.equal(4096 * 10);
            expect(user2.bytesUploaded.lastDayBytes).to.equal(4096 * 10);
            expect(user2.bytesUploaded.lastMonthBytes).to.equal(4096 * 10);

            expect(user2.bytesUploaded.lastHourStarted)
              .to.be.below(Date.now());
            expect(user2.bytesUploaded.lastDayStarted)
              .to.be.below(Date.now());
            expect(user2.bytesUploaded.lastMonthStarted)
              .to.be.below(Date.now());
            done();
          });
        });
      });
    });

    it('will reset the bytes to zero', function(done) {
      const email = 'increment@absentminded.com';
      var clock = sandbox.useFakeTimers();
      User.create(email, sha256('hashpass'), (err, user) => {
        if (err) {
          return done(err);
        }
        user.recordUploadBytes(4096, (err) => {
          if (err) {
            return done(err);
          }
          User.findOne({_id: email}, (err, user) => {
            if (err) {
              return done(err);
            }
            expect(user.bytesUploaded.lastHourBytes).to.equal(4096);
            expect(user.bytesUploaded.lastDayBytes).to.equal(4096);
            expect(user.bytesUploaded.lastMonthBytes).to.equal(4096);

            expect(user.isUploadRateLimited(1000, 8000, 16000)).to.equal(true);
            expect(user.isUploadRateLimited(8000, 1000, 16000)).to.equal(true);
            expect(user.isUploadRateLimited(8000, 8000, 1000)).to.equal(true);

            clock.tick(ms('2h'));

            expect(user.isUploadRateLimited(1000, 8000, 16000)).to.equal(false);
            expect(user.isUploadRateLimited(8000, 1000, 16000)).to.equal(true);
            expect(user.isUploadRateLimited(8000, 8000, 1000)).to.equal(true);

            async.series([
              function(next) {
                user.recordUploadBytes(1, (err) => {
                  if (err) {
                    return next(err);
                  }

                  User.findOne({_id: email}, (err, user) => {
                    if (err) {
                      return next(err);
                    }
                    expect(user.bytesUploaded.lastHourBytes).to.equal(1);
                    expect(user.bytesUploaded.lastDayBytes).to.equal(4097);
                    expect(user.bytesUploaded.lastMonthBytes).to.equal(4097);
                    next();
                  });
                });
              },
              function(next) {
                clock.tick(ms('24h'));

                expect(user.isUploadRateLimited(1000, 1000, 16000))
                  .to.equal(false);

                user.recordUploadBytes(1, (err) => {
                  if (err) {
                    return next(err);
                  }

                  User.findOne({_id: email}, (err, user) => {
                    if (err) {
                      return next(err);
                    }
                    expect(user.bytesUploaded.lastHourBytes).to.equal(1);
                    expect(user.bytesUploaded.lastDayBytes).to.equal(1);
                    expect(user.bytesUploaded.lastMonthBytes).to.equal(4098);
                    next();
                  });
                });
              },
              function(next) {
                clock.tick(ms('30d'));

                expect(user.isUploadRateLimited(1000, 1000, 1000))
                  .to.equal(false);

                user.recordUploadBytes(1, (err) => {
                  if (err) {
                    return next(err);
                  }

                  User.findOne({_id: email}, (err, user) => {
                    if (err) {
                      return next(err);
                    }
                    expect(user.bytesUploaded.lastHourBytes).to.equal(1);
                    expect(user.bytesUploaded.lastDayBytes).to.equal(1);
                    expect(user.bytesUploaded.lastMonthBytes).to.equal(1);
                    next();
                  });
                });
              }
            ], done);
          });
        });
      });
    });
  });

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
