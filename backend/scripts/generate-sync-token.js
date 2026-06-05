#!/usr/bin/env node

const {randomBytes} = require('crypto');

const args = new Set(process.argv.slice(2));
const rawLength = process.argv.find(arg => arg.startsWith('--bytes='));
const byteLength = rawLength ? Number(rawLength.split('=')[1]) : 32;

if (!Number.isInteger(byteLength) || byteLength < 32) {
  console.error('Use at least 32 random bytes for sync bearer tokens.');
  process.exit(1);
}

const token = randomBytes(byteLength).toString('base64url');

if (args.has('--env')) {
  console.log(`SYNC_AUTH_TOKENS=${token}`);
} else {
  console.log(token);
}
