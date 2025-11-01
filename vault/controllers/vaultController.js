const { z } = require('zod');
const { config } = require('../config/env');
const { encryptAesGcm, decryptAesGcm } = require('../crypto/aesGcm');
const { buildToken, parseToken } = require('../services/tokenService');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

const tokenizeSchema = z.object({ pii: z.string().min(1) });

function redactText(text) {
  // Email simple
  const emailRegex = /([A-Z0-9._%+-])([A-Z0-9._%+-]*)(@[A-Z0-9.-]+\.[A-Z]{2,})/gi;
  // Teléfonos: secuencias de 9-11 dígitos (flexible, adaptarlo a tu región)
  const phoneRegex = /(?<!\d)(\+?\d[\d\s.-]{7,}\d)(?!\d)/g;

  let out = text.replace(emailRegex, (m, first, middle, domain) => {
    return `${first}***${domain}`;
  });

  out = out.replace(phoneRegex, (m) => {
    const digits = m.replace(/\D/g, '');
    if (digits.length < 7) return m;
    const left = digits.slice(0, 3);
    const right = digits.slice(-2);
    const maskedDigits = `${left}***${right}`;
    // Mantener formato simple: reemplazo compacto
    return maskedDigits;
  });

  return out;
}

class VaultController {
  constructor(store) {
    this.store = store;
  }

  tokenize = async (req, res) => {
    const parsed = tokenizeSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'PII inválido' });

    const id = uuidv4();
    const key = config.aesKeys[config.activeKeyVersion];
    const enc = encryptAesGcm(parsed.data.pii, key);

    await this.store.save(id, { enc, keyVer: config.activeKeyVersion });
    const token = buildToken(id, config.activeKeyVersion);
    return res.json({ token });
  };

  detokenize = async (req, res) => {
    const token = req.body && req.body.token;
    const parsed = parseToken(token || '');
    if (!parsed) return res.status(400).json({ error: 'Token inválido' });

    const row = await this.store.get(parsed.id);
    if (!row || row.keyVer !== parsed.keyVer) return res.status(404).json({ error: 'No encontrado' });

    const key = config.aesKeys[parsed.keyVer];
    try {
      const pii = decryptAesGcm(row.enc, key);
      return res.json({ pii });
    } catch (_) {
      return res.status(400).json({ error: 'No se pudo descifrar' });
    }
  };

  anonymize = async (req, res) => {
    const body = req.body || {};

    // Si viene message, redactamos PII dentro de texto libre
    if (typeof body.message === 'string' && body.message.length > 0) {
      const anonymized = redactText(body.message);
      return res.json({ anonymized });
    }

    // Compatibilidad previa: anonimización directa de un valor PII
    const pii = body.pii;
    const method = body.method || 'hash';
    if (typeof pii !== 'string' || pii.length === 0) {
      return res.status(400).json({ error: 'PII requerido' });
    }

    if (method === 'hash') {
      const digest = crypto.createHmac('sha256', config.tokenHmacKey).update(pii).digest('hex');
      return res.json({ anonymized: digest });
    }

    if (method === 'mask') {
      const at = pii.indexOf('@');
      if (at > 1) {
        const masked = pii[0] + '***' + pii.slice(at - 1);
        return res.json({ anonymized: masked });
      }
      const left = Math.max(0, Math.min(2, pii.length));
      const right = Math.max(0, Math.min(2, pii.length - left));
      const masked = pii.slice(0, left) + '***' + (right ? pii.slice(-right) : '');
      return res.json({ anonymized: masked });
    }

    if (method === 'generalize') {
      return res.json({ anonymized: '[generalized]' });
    }

    return res.status(400).json({ error: 'Método no soportado' });
  };

  /**
   * Desanonimiza un mensaje que contiene tokens de anonimización (NAME_xxx, EMAIL_xxx, PHONE_xxx)
   * Reemplaza cada token con su PII original almacenado en el store
   */
  deanonymize = async (req, res) => {
    const body = req.body || {};
    const anonymizedMessage = body.anonymizedMessage;

    if (typeof anonymizedMessage !== 'string' || anonymizedMessage.length === 0) {
      return res.status(400).json({ error: 'anonymizedMessage requerido' });
    }

    // Regex para encontrar tokens de anonimización: NAME_xxx, EMAIL_xxx, PHONE_xxx
    const tokenRegex = /\b(NAME|EMAIL|PHONE)_([a-f0-9]+)\b/gi;
    let message = anonymizedMessage;
    const tokenMatches = [...anonymizedMessage.matchAll(tokenRegex)];

    // Buscar cada token en el store y reemplazarlo con su PII original
    for (const match of tokenMatches) {
      const fullToken = match[0]; // ej: "NAME_elbe92e2b3a5"
      const pii = await this.store.getByAnonymizationToken(fullToken);

      if (pii !== null) {
        // Reemplazar el token con el PII original
        message = message.replace(fullToken, pii);
      } else {
        // Si no se encuentra el token, mantener el token original
        // (o podrías devolver un error si prefieres fallar en ese caso)
        console.warn(`Token no encontrado: ${fullToken}`);
      }
    }

    return res.json({ message });
  };
}

module.exports = { VaultController };
