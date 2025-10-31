const crypto = require('crypto');
const { config } = require('../config/env');

function signToken(parts) {
  const h = crypto.createHmac('sha256', config.tokenHmacKey);
  h.update(parts.join('.'));
  return h.digest('hex').slice(0, 24);
}

function verifyToken(parts, sig) {
  const expected = signToken(parts);
  try {
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch (_) {
    return false;
  }
}

function buildToken(id, keyVersion) {
  const core = `pii.${keyVersion}.${id}`;
  const sig = signToken([core]);
  return `pii_${keyVersion}_${id}_${sig}`;
}

function parseToken(token) {
  if (typeof token !== 'string' || !token.startsWith('pii_')) return null;
  const parts = token.split('_');
  if (parts.length !== 4) return null;
  const [, keyVer, id, sig] = parts;
  const core = `pii.${keyVer}.${id}`;
  if (!verifyToken([core], sig)) return null;
  return { id, keyVer };
}

module.exports = { signToken, verifyToken, buildToken, parseToken };
