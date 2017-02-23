'use strict';

const storj = require('storj-lib');
const expect = require('chai').expect;
const mongoose = require('mongoose');

require('mongoose-types').loadTypes(mongoose);

const FrameSchema = require('../lib/models/frame');
const BucketSchema = require('../lib/models/bucket');
const BucketEntrySchema = require('../lib/models/bucketentry');

var Frame;
var Bucket;
var BucketEntry;
var connection;

before(function(done) {
  connection = mongoose.createConnection(
    'mongodb://127.0.0.1:27017/__storj-bridge-test',
    function() {
      Frame = FrameSchema(connection);
      Bucket = BucketSchema(connection);
      BucketEntry = BucketEntrySchema(connection);
      Frame.remove({}, function() {
        Bucket.remove({}, function() {
          BucketEntry.remove({}, function(){
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

describe('Storage/models/BucketEntry', function() {

  var expectedBucketId =
    storj.utils.calculateBucketId('user@domain.tld', 'New Bucket2');
  var expectedFileId =
    storj.utils.calculateFileId(expectedBucketId, 'test.txt');

  it('should create the bucket entry metadata', function(done) {
    Bucket.create({ _id: 'user@domain.tld' }, { name: 'New Bucket2' },
    function(err, bucket) {
      var frame = new Frame({});
      frame.save(function(err) {
        expect(err).to.not.be.instanceOf(Error);
        BucketEntry.create({
          frame: frame._id,
          bucket: bucket._id,
          name: 'test.txt',
          mimetype: 'text/plain'
        }, function(err, entry) {
          expect(entry.filename).to.equal('test.txt');
          expect(entry.id).to.equal(expectedFileId);
          done();
        });
      });
    });
  });

  it('should replace a duplicate name in this same bucket', function(done) {
    var frame = new Frame({

    });
    frame.save(function(err) {
      expect(err).to.not.be.instanceOf(Error);
      BucketEntry.create({
        frame: frame._id,
        bucket: expectedBucketId,
        name: 'test.txt',
        mimetype: 'text/javascript'
      }, function(err, entry){
        expect(err).to.equal(null);
        expect(entry.mimetype).to.equal('text/javascript');
        done();
      });
    });
  });

  it('should fail with invalid mimetype', function(done) {
    Bucket.create({ _id: 'user@domain.tld' }, {}, function(err, bucket) {
      var frame = new Frame({});
      frame.save(function(err) {
        expect(err).to.not.be.instanceOf(Error);
        BucketEntry.create({
          frame: frame._id,
          mimetype: 'invalid/mimetype',
          bucket: bucket._id,
          name: 'test.txt'
        }, function(err) {
          expect(err).to.be.instanceOf(Error);
          done();
        });
      });
    });
  });

  it('should contain specified properties', function(done) {
    Bucket.create({ _id: 'user@domain.tld' }, {}, function(err, bucket) {
      var frame = new Frame({});
      frame.save(function(err) {
        expect(err).to.not.be.instanceOf(Error);
        BucketEntry.create({
          frame: frame._id,
          mimetype: 'text/javascript',
          bucket: bucket._id,
          name: 'test.txt'
        }, function(err, entry) {
          if (err) {
            return done(err);
          }
          const entryKeys = Object.keys(entry.toObject());
          expect(entryKeys).to.not.contain('__v', '_id', 'name');
          expect(entryKeys).to.contain(
            'frame', 'bucket', 'mimetype', 'name', 'renewal', 'created'
          );
          done();
        });
      });
    });
  });

});
