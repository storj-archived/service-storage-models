'use strict';

// const storj = require('storj-lib');
const expect = require('chai').expect;
const mongoose = require('mongoose');

require('mongoose-types').loadTypes(mongoose);

const ShardSchema = require('../lib/models/shard');

var Shard;
var connection;

before(function(done) {
  connection = mongoose.createConnection(
    'mongodb://127.0.0.1:27017/__storj-bridge-test',
    function() {
      Shard = ShardSchema(connection);
      done();
    }
  );
});

after(function(done) {
  Shard.remove({}, function() {
    connection.close(done);
  });
});

describe('Storage/models/Shard', function() {

  describe('#create', function() {

    it('should create a shard record from the supplied item', function(done) {
      var item = {
        hash: 'fjla93fs9-23892-2sdl@#ds-932049203',
        contracts: [],
        trees: [],
        challenges: [],
        meta: []
      };
      Shard.create(item, function(err, shard) {
        expect(err).to.not.be.an.instanceOf(Error);
        expect(shard.hash).to.equal(item.hash);
        expect(shard.meta).to.be.an('array');
        expect(shard.challenges).to.be.an('array');
        expect(shard.trees).to.be.an('array');
        expect(shard.contracts).to.be.an('array');
        done();
      });
    });

    it('should create a shard record with modified contracts array', function(done) {
      var item = {
        hash: 'fjla93fs9-23892-2sdl@#ds-932049203',
        contracts: [{ type: 'contract1' }, { type: 'contract2' }],
        trees: [],
        challenges: [],
        meta: []
      };
      Shard.create(item, function(err, shard) {
        expect(err).to.not.be.an.instanceOf(Error);
        expect(shard.contracts).to.be.an('array');
        shard.contracts.forEach((contract, index) => {
          expect(contract.nodeID).to.equal(index.toString());
          expect(contract.contract).to.equal(item.contracts[index]);
        });
        done();
      });
    });

    it('should create a shard record with modified trees array', function(done) {
      var item = {
        hash: 'fjla93fs9-23892-2sdl@#ds-932049203',
        contracts: [],
        trees: ['tree1', 'tree2', 'tree3'],
        challenges: [],
        meta: []
      };
      Shard.create(item, function(err, shard) {
        expect(err).to.not.be.an.instanceOf(Error);
        expect(shard.trees).to.be.an('array');
        shard.trees.forEach((tree, index) => {
          expect(tree.nodeID).to.equal(index.toString());
          expect(tree.tree).to.be.an('array');
          expect(tree.tree[0]).to.equal(item.trees[index])
        });
        done();
      });
    });

    it('should create a shard record with modified challenges array', function(done) {
      var item = {
        hash: 'fjla93fs9-23892-2sdl@#ds-932049203',
        contracts: [],
        trees: [],
        challenges: [{ type: 'challenge1' }, { type: 'challenge2' }],
        meta: []
      };
      Shard.create(item, function(err, shard) {
        expect(err).to.not.be.an.instanceOf(Error);
        expect(shard.challenges).to.be.an('array');
        shard.challenges.forEach((challenge, index) => {
          expect(challenge.nodeID).to.equal(index.toString());
          expect(challenge.challenge).to.equal(item.challenges[index]);
        });
        done();
      });
    });

    it('should create a shard record with modified meta array', function(done) {
      var item = {
        hash: 'fjla93fs9-23892-2sdl@#ds-932049203',
        contracts: [],
        trees: [],
        challenges: [],
        meta: [{ type: 'meta1' }, { type: 'meta2' }]
      };
      Shard.create(item, function(err, shard) {
        expect(err).to.not.be.an.instanceOf(Error);
        expect(shard.meta).to.be.an('array');
        shard.meta.forEach((metaItem, index) => {
          expect(metaItem.nodeID).to.equal(index.toString());
          expect(metaItem.meta).to.equal(item.meta[index]);
        });
        done();
      });
    });

  });

});
