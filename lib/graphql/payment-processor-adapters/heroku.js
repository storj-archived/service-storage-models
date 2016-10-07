'use strict';

const herokuAdapter = {
  register: function(signature, email) {

    // NB I think this is what we need from BitCore
    // NB https://bitcore.io/api/lib/public-key

    // find user, get user's public key

    // verify using bitcore library

    // make up a public key for now

    // service-integrations-public key

    // signature = user's public key signed by the service-integration key

    return Promise.resolve()
  },
  serializeData: function() {
    return [];
  }
};

module.exports = herokuAdapter;
