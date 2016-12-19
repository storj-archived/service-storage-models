'use strict';

const herokuAdapter = {
  register: function(signature, email) {
    return Promise.resolve()
  },
  serializeData: function() {
    return [];
  }
};

module.exports = herokuAdapter;
