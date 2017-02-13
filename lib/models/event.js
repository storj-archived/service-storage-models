'use strict';

const mongoose = require('mongoose');
const SchemaOptions = require('../options');

const Event = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  data: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  capped: { size: 1024, max: 1000 }
});

module.exports = function(connection) {
  return connection.model('Event', Event)
}
