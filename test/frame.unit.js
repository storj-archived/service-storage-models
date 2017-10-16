'use strict';

/*jshint expr: true*/

const async = require('async');
const expect = require('chai').expect;
const mongoose = require('mongoose');
const crypto = require('crypto');
const errors = require('storj-service-error-types');

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
        expect(err.message).to.match(/^frame validation failed.*/i);
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

  describe('#validShardSizes', function() {
    it('return true (small single shard)', function() {
      const shards = [
        {
          index: 0,
          size: 1024
        }
      ];
      expect(Frame.validShardSizes(shards)).to.equal(true);
    });

    it('return true (unsorted shards greater than 10)', function() {
      const shards = [
        {
          index: 0,
          size: 2097152,
          parity: false
        },
        {
          index: 1,
          size: 2097152,
          parity: false
        },
        {
          index: 2,
          size: 2097152,
          parity: false
        },
        {
          index: 3,
          size: 2097152,
          parity: false
        },
        {
          index: 4,
          size: 2097152,
          parity: false
        },
        {
          index: 5,
          size: 2097152,
          parity: false
        },
        {
          index: 6,
          size: 2097152,
          parity: false
        },
        {
          index: 7,
          size: 2097152,
          parity: false
        },
        {
          index: 8,
          size: 2097152,
          parity: false
        },
        {
          index: 9,
          size: 2097152,
          parity: false
        },
        {
          index: 10,
          size: 2097152,
          parity: false
        },
        {
          index: 11,
          size: 1484223,
          parity: false
        },
        {
          index: 12,
          size: 2097152,
          parity: true
        },
        {
          index: 13,
          size: 2097152,
          parity: true
        },
        {
          index: 14,
          size: 2097152,
          parity: true
        },
        {
          index: 15,
          size: 2097152,
          parity: true
        },
        {
          index: 16,
          size: 2097152,
          parity: true
        },
        {
          index: 17,
          size: 2097152,
          parity: true
        },
        {
          index: 18,
          size: 2097152,
          parity: true
        },
        {
          index: 19,
          size: 2097152,
          parity: true
        }
      ];
      expect(Frame.validShardSizes(shards)).to.equal(true);
    });

    it('return true (several 2MiB shards)', function() {
      const shards = [
        {
          index: 0,
          size: 2097152
        },
        {
          index: 1,
          size: 2097152
        },
        {
          index: 2,
          size: 2097152
        }
      ];
      expect(Frame.validShardSizes(shards)).to.equal(true);
    });

    it('return true', function() {
      const shards = [
        {
          index: 10,
          size: 1024
        },
        {
          index: 11,
          size: 2097152,
          parity: true
        }
      ];
      expect(Frame.validShardSizes(shards)).to.equal(true);
    });

    it('return true on unsorted shards', function() {
      const shards = [
        {
          index: 0,
          size: 2097152
        },
        {
          index: 2,
          size: 100
        },
        {
          index: 1,
          size: 2097152
        }
      ];
      expect(Frame.validShardSizes(shards)).to.equal(true);
    });

    it('return true (several 2MiB shards with small last shard)', function() {
      const shards = [
        {
          index: 0,
          size: 2097152
        },
        {
          index: 1,
          size: 2097152
        },
        {
          index: 2,
          size: 2097152
        },
        {
          index: 3,
          size: 1024
        }
      ];
      expect(Frame.validShardSizes(shards)).to.equal(true);
    });

    it('return true (2MiB, small last shard, w/ parity shards)', function() {
      const shards = [
        {
          index: 0,
          size: 2097152
        },
        {
          index: 1,
          size: 2097152
        },
        {
          index: 2,
          size: 2097152
        },
        {
          index: 3,
          size: 1024
        },
        {
          index: 4,
          size: 2097152,
          parity: true
        },
        {
          index: 5,
          size: 2097152,
          parity: true
        }
      ];
      expect(Frame.validShardSizes(shards)).to.equal(true);
    });

    it('return false (5KiB shards)', function() {
      const shards = [
        {
          index: 0,
          size: 5120
        },
        {
          index: 1,
          size: 5120
        },
        {
          index: 2,
          size: 5120
        },
        {
          index: 3,
          size: 5120
        }
      ];
      expect(Frame.validShardSizes(shards)).to.equal(false);
    });

    it('return false (various size shards)', function() {
      const shards = [
        {
          index: 0,
          size: 5120
        },
        {
          index: 1,
          size: 3072
        },
        {
          index: 2,
          size: 4096
        }
      ];
      expect(Frame.validShardSizes(shards)).to.equal(false);
    });

    it('return false (various size parity shards)', function() {
      const shards = [
        {
          index: 0,
          size: 5120
        },
        {
          index: 1,
          size: 5120
        },
        {
          index: 2,
          size: 3072
        },
        {
          index: 3,
          size: 23552,
          parity: true
        },
        {
          index: 4,
          size: 2048,
          parity: true
        }
      ];
      expect(Frame.validShardSizes(shards)).to.equal(false);
    });

  });

  describe('#addShard', function() {
    it('will increment sizes with concurrency', function(done) {
      const replacementHash = crypto.randomBytes(20).toString('hex');
      let hashes = [];
      var frame = null;

      function createFrame(next) {
        Frame.create({}, (err, _frame) => {
          if (err) {
            return next(err);
          }
          frame = _frame;
          next();
        });
      }

      function addShards(finished) {
        async.times(10, (n, next) => {
          let hash = crypto.randomBytes(20).toString('hex');
          hashes.push(hash);
          var shard = {
            index: n,
            hash: hash,
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
        }, finished);
      }

      function replaceShard(next) {
        Frame.findOne({
          _id: frame._id
        }).populate('shards').exec((err, _frame) => {
          if (err) {
            return done(err);
          }
          frame = _frame;
          var shard = {
            index: 3,
            hash: replacementHash,
            size: 8 * 1024 * 1024,
            tree: ['tree1', 'tree2'],
            challenges: ['challenge1', 'challenge2'],
            parity: false
          };
          Pointer.create(shard, function(err, pointer) {
            if (err) {
              return next(err);
            }
            frame.addShard(pointer, next);
          });
        });
      }

      async.series([
        createFrame,
        addShards,
        replaceShard
      ], (err) => {
        if (err) {
          return done(err);
        }
        Frame.findOne(frame._id).populate('shards').exec((err, _frame) => {
          if (err) {
            return done(err);
          }
          expect(_frame.size).to.equal(7 * 8 * 1024 * 1024);
          expect(_frame.storageSize).to.equal(10 * 8 * 1024 * 1024);
          _frame.shards.sort((a, b) => a.index > b.index);
          for (var i = 0; i < _frame.shards.length; i++) {
            expect(_frame.shards[i].index).to.equal(i);
            expect(_frame.shards[i].hash).to.not.equal(hashes[3]);
            if (i === 3) {
              expect(_frame.shards[i].hash).to.equal(replacementHash);
            }
          }
          done();
        });
      });
    });

    it('will fail if there are multiple shards under the min', function(done) {
      const replacementHash = crypto.randomBytes(20).toString('hex');
      let hashes = [];
      var frame = null;

      function createFrame(next) {
        Frame.create({}, (err, _frame) => {
          if (err) {
            return next(err);
          }
          frame = _frame;
          next();
        });
      }

      function addShards(finished) {
        async.times(3, (n, next) => {
          let hash = crypto.randomBytes(20).toString('hex');
          hashes.push(hash);
          var shard = {
            index: n,
            hash: hash,
            size: 1024,
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
        }, finished);
      }

      function replaceShard(next) {
        Frame.findOne({
          _id: frame._id
        }).populate('shards').exec((err, _frame) => {
          if (err) {
            return done(err);
          }
          frame = _frame;
          var shard = {
            index: 2,
            hash: replacementHash,
            size: 1024,
            tree: ['tree1', 'tree2'],
            challenges: ['challenge1', 'challenge2'],
            parity: false
          };
          Pointer.create(shard, function(err, pointer) {
            if (err) {
              return next(err);
            }
            frame.addShard(pointer, next);
          });
        });
      }

      async.series([
        createFrame,
        addShards,
        replaceShard
      ], (err) => {
        expect(err).to.be.instanceOf(errors.BadRequestError);
        expect(err.message).to.equal('Invalid shard sizes');
        done();
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
