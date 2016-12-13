'use strict';

const expect = require('chai').expect;
const mongoose = require('mongoose');

require('mongoose-types').loadTypes(mongoose);

const PointerSchema = require('../lib/models/pointer');

var Pointer;
var connection;

before(function(done) {
  connection = mongoose.createConnection(
    'mongodb://127.0.0.1:27017/__storj-bridge-test',
    function() {
      Pointer = PointerSchema(connection);
      done();
    }
  );
});

after(function(done) {
  Pointer.remove({}, function() {
    connection.close(done);
  });
});

describe('Storage/models/Pointer', function() {

  describe('#create', function() {

    it('should create pointer with correct props', function(done) {
      var shard = {
        index: 1,
        hash: 'fjla93fs9-23892-2sdl@#ds-932049203',
        size: 1,
        tree: ['tree1', 'tree2'],
        challenges: ['challenge1', 'challenge2']
      };
      Pointer.create(shard, function(err, pointer) {
        expect(err).to.not.be.an.instanceOf(Error);
        expect(pointer.index).to.equal(shard.index);
        expect(pointer.index).to.be.a('number');
        expect(pointer.hash).to.equal(shard.hash);
        expect(pointer.hash).to.be.a('string');
        expect(pointer.size).to.equal(shard.size);
        expect(pointer.size).to.be.a('number');
        expect(pointer.tree).to.be.an('array');
        expect(pointer.challenges).to.be.an('array');
        done();
      });
    });

  });

});
