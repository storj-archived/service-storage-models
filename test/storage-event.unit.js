'use strict';

const expect = require('chai').expect;
const mongoose = require('mongoose');

require('mongoose-types').loadTypes(mongoose);

const StorageEventSchema = require('../lib/models/storage-event');

var StorageEvent;
var connection;

before(function(done) {
  connection = mongoose.createConnection(
    'mongodb://127.0.0.1:27017/__storj-bridge-test',
    function() {
      StorageEvent = StorageEventSchema(connection);
      StorageEvent.remove({}, function() {
        done();
      });
    }
  );
});

after(function(done) {
  connection.close(done);
});

describe('Storage/models/Storage-Event', function() {

  it('should create storage event with default props', function(done) {
    var newStorageEvent = new StorageEvent({
      bucket: mongoose.Types.ObjectId(),
      bucketEntry: mongoose.Types.ObjectId(),
      user: 'user@gmail.com',
      downloadBandwidth: 0,
      storage: 1000000,
    });

    newStorageEvent.save(function(err, storEvent) {
      let ObjectIdType = mongoose.Types.ObjectId;
      expect(err).to.not.be.an.instanceOf(Error);
      expect(storEvent.bucket).to.be.an.instanceOf(ObjectIdType);
      expect(storEvent.bucketEntry).to.be.an.instanceOf(ObjectIdType);
      expect(storEvent.user).to.be.a('string');
      expect(storEvent.timestamp).to.be.an.instanceOf(Date);
      expect(storEvent.downloadBandwidth).to.be.a('number');
      expect(storEvent.storage).to.be.a('number');
      done();
    });
  });

  it('should not save without a bucket', function(done) {
    var newStorageEvent = new StorageEvent({
      bucketEntry: mongoose.Types.ObjectId(),
      user: 'user@gmail.com',
      downloadBandwidth: 0,
      storage: 1000000,
    });

    newStorageEvent.save(function(err) {
        expect(err).to.be.instanceOf(Error);
        done();
      });
  });

  it('should not save without a bucketEntry', function(done) {
    var newStorageEvent = new StorageEvent({
      bucket: mongoose.Types.ObjectId(),
      user: 'user@gmail.com',
      downloadBandwidth: 0,
      storage: 1000000,
    });

    newStorageEvent.save(function(err) {
        expect(err).to.be.instanceOf(Error);
        done();
      });
  });


  it('should not save without a user', function(done) {
    var newStorageEvent = new StorageEvent({
      bucket: mongoose.Types.ObjectId(),
      bucketEntry: mongoose.Types.ObjectId(),
      downloadBandwidth: 0,
      storage: 1000000,
    });

    newStorageEvent.save(function(err) {
        expect(err).to.be.instanceOf(Error);
        done();
      });
  });
});
