'use strict';

const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
const chaiDate = require('chai-datetime');
const mongoose = require('mongoose');

chai.use(chaiDate);
require('mongoose-types').loadTypes(mongoose);

const CronSchema = require('../lib/models/cron');

var Cron;
var connection;

before(function(done) {
  connection = mongoose.createConnection(
    'mongodb://127.0.0.1:27017/__storj-bridge-test',
    function() {
      Cron = CronSchema(connection);
      Cron.remove({}, function() {
        done();
      });
    }
  );
});

after(function(done) {
  connection.close(done);
});

describe('/Storage/models/Cron', function() {
  const sandbox = sinon.sandbox.create();
  afterEach(() => sandbox.restore());

  describe('@constructor', function() {

    it('should create new work', function (done) {
      const now = new Date();
      const end = new Date(now.getTime() + 1000);
      const job = new Cron({
        name: 'StorageEventsFinality',
        locked: true,
        lockedEnd: end,
        started: now
      });

      job.save(function(err, job) {
        if (err) {
          return done(err);
        }

        expect(job.name).to.equal('StorageEventsFinality');
        expect(job.locked).to.equal(true);
        expect(job.lockedEnd).to.equal(end);
        expect(job.started).to.equal(now);
        done();
      });
    });
  });

  describe('#lock', function () {

    it('should get lock without document', function(done) {

      Cron.lock('SingletonOne', 1000, function(err) {
        if (err) {
          return done(err);
        }
        done();
      });

    });

    it('should not get lock with existing locked document', function(done) {

      Cron.lock('SingletonTwo', 10000, function(err, locked) {
        if (err) {
          return done(err);
        }
        expect(locked).to.equal(true);

        Cron.lock('SingletonTwo', 10000, function(err, locked) {
          if (err) {
            return done(err);
          }
          expect(locked).to.equal(false);
          done();
        });
      });

    });

    it('should get lock with expired locked document', function(done) {
      const now = new Date();
      const clock = sandbox.useFakeTimers();
      clock.tick(now.getTime());
      const expires = 10000;

      Cron.lock('SingletonThree', expires, function(err, locked, res) {
        if (err) {
          return done(err);
        }
        expect(locked).to.equal(true);
        expect(res);
        clock.tick(expires);

        Cron.lock('SingletonThree', expires, function(err, locked, res) {
          if (err) {
            return done(err);
          }
          expect(locked).to.equal(true);
          expect(res);
          done();
        });
      });
    });

  });

});
