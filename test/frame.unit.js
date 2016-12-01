'use strict';

// const storj = require('storj-lib');
const expect = require('chai').expect;
const mongoose = require('mongoose');

require('mongoose-types').loadTypes(mongoose);

const FrameSchema = require('../lib/models/frame');

var Frame;
var connection;

before(function(done) {
  connection = mongoose.createConnection(
    'mongodb://127.0.0.1:27017/__storj-bridge-test',
    function() {
      Frame = FrameSchema(connection);
      done();
    }
  );
});

after(function(done) {
  Frame.remove({}, function() {
    connection.close(done);
  });
});

describe('Storage/models/Frame', function() {
  describe('#create', function() {

  })
});
