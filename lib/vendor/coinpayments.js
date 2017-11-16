const Coinpayments = require('coinpayments');

const options = {
  key: process.env.CP_PUBLIC_KEY,
  secret: process.env.CP_PRIVATE_KEY
};

let client;

const getClient = function () {
    if (client) {
        return client;
    }

    client = new Coinpayments(options);
};

module.exports = getClient;
