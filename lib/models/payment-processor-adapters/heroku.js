'use strict';

const herokuAdapter = {
  register: function() {
    return Promise.resolve();
  },
  serializeData: function() {
    return [];
  }
};

module.exports = herokuAdapter;
