const REQUIRED = {
  AES_KEY_HEX: 'VAULT_AES_KEY_HEX',
  TOKEN_HMAC_HEX: 'VAULT_TOKEN_HMAC_HEX',
};

function getBufferFromHex(envVar, expectedLength) {
  const hex = process.env[envVar];
  if (!hex) throw new Error(`Falta variable de entorno: ${envVar}`);
  const buf = Buffer.from(hex, 'hex');
  if (buf.length !== expectedLength) {
    throw new Error(`${envVar} debe ser ${expectedLength} bytes en hex (${expectedLength * 2} chars)`);
  }
  return buf;
}

const config = {
  port: Number(process.env.PORT || 4001),
  activeKeyVersion: 'v1',
  aesKeys: {},
  tokenHmacKey: null,
  // Configuración de MongoDB
  mongodb: {
    uri: process.env.MONGODB_URI || '',
    dbName: process.env.MONGODB_DB_NAME || 'mait-privacy-vault',
    collectionName: process.env.MONGODB_COLLECTION_NAME || 'pairs',
  },
};

config.aesKeys[config.activeKeyVersion] = getBufferFromHex(REQUIRED.AES_KEY_HEX, 32);
config.tokenHmacKey = getBufferFromHex(REQUIRED.TOKEN_HMAC_HEX, 32);

module.exports = { config };
