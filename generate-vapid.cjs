const { generateVAPIDKeys } = require('web-push');
const keys = generateVAPIDKeys();
console.log('PUBLIC_KEY=' + keys.publicKey);
console.log('PRIVATE_KEY=' + keys.privateKey);
