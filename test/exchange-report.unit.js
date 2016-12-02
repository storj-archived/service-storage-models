'use strict';

// const storj = require('storj-lib');
const expect = require('chai').expect;
const mongoose = require('mongoose');

require('mongoose-types').loadTypes(mongoose);

const ExchangeReportSchema = require('../lib/models/exchange-report');

var ExchangeReport;
var connection;

before(function(done) {
  connection = mongoose.createConnection(
    'mongodb://127.0.0.1:27017/__storj-bridge-test',
    function() {
      ExchangeReport = ExchangeReportSchema(connection);
      done();
    }
  );
});

after(function(done) {
  ExchangeReport.remove({}, function() {
    connection.close(done);
  });
});

describe('Storage/models/Exchange-Report', function() {
  describe('#create', function() {

  })
});
