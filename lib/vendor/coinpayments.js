const Coinpayments = require('coinpayments');

const options = {
  key: process.env.CP_PUBLIC_KEY,
  secret: process.env.CP_PRIVATE_KEY
};

let client;

try {
  client = new Coinpayments(options);
} catch (err) {
  if (err.message === 'Missing public key and/or secret') {
    console.error(err.message);
    return;
  } else {
    throw(err);
  }
}


module.exports = client;
