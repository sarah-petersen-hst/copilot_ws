// Polyfill for TextEncoder/TextDecoder in Node.js for Jest
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
