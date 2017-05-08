'use strict';

/*jshint expr: true*/

const async = require('async');
const expect = require('chai').expect;
const mongoose = require('mongoose');
const crypto = require('crypto');

require('mongoose-types').loadTypes(mongoose);

const FrameSchema = require('../lib/models/frame');
const UserSchema = require('../lib/models/user');
const PointerSchema = require('../lib/models/pointer');

var Frame;
var User;
var Pointer;
var connection;

before(function(done) {
  connection = mongoose.createConnection(
    'mongodb://127.0.0.1:27017/__storj-bridge-test',
    function() {
      Frame = FrameSchema(connection);
      User = UserSchema(connection);
      Frame.remove({}, function() {
        User.remove({}, function() {
          Pointer = PointerSchema(connection);
          Pointer.remove({}, function() {
            done();
          });
        });
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

describe('Storage/models/Frame', function() {

  describe('@constructor', function() {
    it('should fail validation', function(done) {
      const frame = new Frame({
        user: 'nobody@'
      });
      frame.save((err) => {
        expect(err).to.be.instanceOf(Error);
        expect(err.message).to.equal('Frame validation failed');
        done();
      });
    });
    it('should NOT fail validation', function(done) {
      const frame = new Frame({
        user: 'somebody@somewhere.com',
      });
      frame.save(done);
    });
  });

  describe('#create', function() {

    it('should create a frame with default props', function(done) {
      User.create('user@domain.tld', sha256('password'), function(err, user) {
        Frame.create(user, function(err, frame) {
          expect(err).to.not.be.an.instanceOf(Error);
          expect(frame.created).to.be.an.instanceOf(Date);
          expect(frame.user).to.be.a('string');
          expect(frame.locked).to.be.false;
          expect(frame.size).to.equal(0);
          expect(frame.shards).to.be.an('array');

          // cleanup
          User.findOneAndRemove({ _id: user._id }, function(err) {
            expect(err).to.not.be.an.instanceOf(Error);
            done();
          });
        });
      });
    });

  });

  describe('#lock', function() {

    it('should set frame.lock to true', function(done) {
      Frame.create({}, function(err, frame) {
        expect(err).to.not.be.an.instanceOf(Error);
        expect(frame.locked).to.be.false;
        frame.lock(function(err, frame) {
          expect(err).to.not.be.an.instanceOf(Error);
          expect(frame.locked).to.be.true;
          done();
        });
      });
    });

  });

  describe('#addShard', function() {
    it('will increment sizes with concurrency', function(done) {
      Frame.create({}, function(err, frame) {
        if (err) {
          return done(err);
        }
        async.times(10, (n, next) => {
          var shard = {
            index: n,
            hash: crypto.randomBytes(20).toString('hex'),
            size: 8 * 1024 * 1024,
            tree: ['tree1', 'tree2'],
            challenges: ['challenge1', 'challenge2'],
            parity: n > 6 ? true : false
          };
          Pointer.create(shard, function(err, pointer) {
            if (err) {
              return next(err);
            }
            frame.addShard(pointer, next);
          });
        }, (err) => {
          if (err) {
            return done(err);
          }

          Frame.findOne(frame._id, (err, _frame) => {
            if (err) {
              return done(err);
            }
            expect(_frame.size).to.equal(7 * 8 * 1024 * 1024);
            expect(_frame.storageSize).to.equal(10 * 8 * 1024 * 1024);
            done();
          });
        });
      });
    });
  });

  describe('#unlock', function() {

    it('should set frame.lock to false', function(done) {
      Frame.create({}, function(err, frame) {
        expect(err).to.not.be.an.instanceOf(Error);
        expect(frame.locked).to.be.false;
        frame.lock(function(err, frame) {
          expect(err).to.not.be.an.instanceOf(Error);
          expect(frame.locked).to.be.true;
          frame.unlock(function(err, frame) {
            expect(err).to.not.be.an.instanceOf(Error);
            expect(frame.locked).to.be.false;
            done();
          });
        });
      });
    });

  });

  describe('#toObject', function() {

    it('should contain specified properties', function(done) {
      Frame.create({}, function(err, frame) {
        expect(err).to.not.be.an.instanceOf(Error);
        const keys = Object.keys(frame.toObject());
        expect(keys).to.not.contain('__v', '_id');
        expect(keys).to.contain('id');
        done();
      });
    });

  });

});
