'use strict';

/*jshint expr: true*/

const expect = require('chai').expect;
const mongoose = require('mongoose');
const _ = require('lodash');

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

    it('should create a shard record with the correct hash', function(done) {
      var item = {
        hash: 'fjla93fs9-23892-2sdl@#ds-932049203'
      };
      Shard.create(item, function(err, shard) {
        expect(err).to.not.be.an.instanceOf(Error);
        expect(shard.hash).to.equal(item.hash);
        done();
      });
    });

    it('should create a shard record with modified contracts object',
      function(done) {
        var item = {
          hash: 'fjla93fs9-23892-2sdl@#ds-932049203',
          contracts: { 0: 'contract1', 1: 'contract2' },
          trees: {},
          challenges: {},
          meta: {}
        };
        Shard.create(item, function(err, shard) {
          expect(err).to.not.be.an.instanceOf(Error);
          expect(shard.contracts).to.be.an('object');
          expect(_.isEqual(item.contracts, shard.contracts)).to.be.true;
          done();
        });
    });

    it('should create a shard record with modified trees object',
      function(done) {
        var item = {
          hash: 'fjla93fs9-23892-2sdl@#ds-932049203',
          contracts: {},
          trees: { 0: 'leaf1', 1: 'leaf2' },
          challenges: {},
          meta: {}
        };
        Shard.create(item, function(err, shard) {
          expect(err).to.not.be.an.instanceOf(Error);
          expect(shard.trees).to.be.an('object');
          var i = 0;
          _.forEach(shard.trees, (tree, nodeID) => {
            expect(nodeID).to.equal(i.toString());
            expect(tree).to.be.an('array');
            expect(tree[0]).to.equal(item.trees[nodeID]);
            i++;
          });
          done();
        });
    });

    it('should create a shard record with modified challenges object',
      function(done) {
        var item = {
          hash: 'fjla93fs9-23892-2sdl@#ds-932049203',
          contracts: {},
          trees: {},
          challenges: { 0: 'challenge1', 1: 'challenge2' },
          meta: {}
        };
        Shard.create(item, function(err, shard) {
          expect(err).to.not.be.an.instanceOf(Error);
          expect(shard.challenges).to.be.an('object');
          expect(_.isEqual(item.challenges, shard.challenges)).to.be.true;
          done();
        });
    });

    it('should create a shard record with modified meta object',
      function(done) {
        var item = {
          hash: 'fjla93fs9-23892-2sdl@#ds-932049203',
          contracts: {},
          trees: {},
          challenges: {},
          meta: { 0: 'meta1', 1: 'meta2' }
        };
        Shard.create(item, function(err, shard) {
          expect(err).to.not.be.an.instanceOf(Error);
          expect(shard.meta).to.be.an('object');
          expect(_.isEqual(item.meta, shard.meta)).to.be.true;
          done();
        });
      });

  });

});
