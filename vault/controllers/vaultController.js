const { z } = require('zod');
const { config } = require('../config/env');
const { encryptAesGcm, decryptAesGcm } = require('../crypto/aesGcm');
const { buildToken, parseToken } = require('../services/tokenService');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

const tokenizeSchema = z.object({ pii: z.string().min(1) });

/**
 * Genera un token único y consistente para un PII dado usando hash
 * @param {string} pii - El PII original
 * @param {string} type - Tipo de PII: 'NAME', 'EMAIL', 'PHONE'
 * @returns {string} Token en formato TYPE_hash (ej: NAME_elbe92e2b3a5)
 */
function generateAnonymizationToken(pii, type) {
  // Generar hash consistente del PII (mismo PII siempre produce mismo hash)
  const hash = crypto.createHash('sha256').update(pii.toLowerCase().trim()).digest('hex');
  // Usar primeros 12 caracteres del hash para el token
  const tokenId = hash.substring(0, 12);
  return `${type}_${tokenId}`;
}

/**
 * Anonimiza un mensaje detectando y reemplazando PII con tokens almacenables
 * Detecta nombres, emails y teléfonos, genera tokens y los almacena en el store
 * @param {string} text - Mensaje original con PII
 * @param {Object} store - Store para guardar tokens de anonimización
 * @returns {string} Mensaje anonimizado con tokens
 */
async function anonymizeMessage(text, store) {
  let anonymized = text;
  const replacements = [];

  // 1. Detectar emails
  const emailRegex = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
  const emailMatches = [...text.matchAll(emailRegex)];
  
  for (const match of emailMatches) {
    const email = match[0];
    const token = generateAnonymizationToken(email, 'EMAIL');
    
    // Almacenar el token con su PII original
    await store.saveAnonymizationToken(token, email);
    
    replacements.push({
      original: email,
      token: token,
      index: match.index,
    });
  }

  // 2. Detectar teléfonos (secuencias de 7-15 dígitos, puede tener espacios, guiones, puntos)
  const phoneRegex = /\b(?:\+?\d[\d\s.-]{6,}\d)\b/g;
  const phoneMatches = [...text.matchAll(phoneRegex)];
  
  for (const match of phoneMatches) {
    const phone = match[0];
    // Normalizar: extraer solo dígitos para verificar longitud válida
    const digits = phone.replace(/\D/g, '');
    if (digits.length >= 7 && digits.length <= 15) {
      const token = generateAnonymizationToken(phone, 'PHONE');
      
      // Almacenar el token con su PII original
      await store.saveAnonymizationToken(token, phone);
      
      replacements.push({
        original: phone,
        token: token,
        index: match.index,
      });
    }
  }

  // 3. Detectar nombres completos (secuencias de 2-3 palabras capitalizadas consecutivas)
  // Buscar patrones como "Nombre Apellido" o "Nombre Apellido1 Apellido2"
  // Evitar palabras comunes que no son nombres
  const commonWords = new Set(['para', 'con', 'de', 'la', 'el', 'y', 'o', 'a', 'en', 'por', 'del', 'las', 'los', 'un', 'una', 'desde', 'hasta', 'trabajo', 'oferta']);
  
  // Regex para encontrar secuencias de 2-3 palabras que empiezan con mayúscula
  const nameRegex = /\b([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){1,2})\b/g;
  const nameMatches = [...text.matchAll(nameRegex)];
  
  for (const match of nameMatches) {
    const potentialName = match[0];
    const words = potentialName.split(/\s+/);
    
    // Verificar que no sean palabras comunes
    const isValidName = words.every(word => !commonWords.has(word.toLowerCase()));
    
    // Verificar que tenga al menos 2 palabras y no más de 3
    if (isValidName && words.length >= 2 && words.length <= 3) {
      // Verificar que no esté dentro de un email o teléfono ya detectado
      const isAlreadyReplaced = replacements.some(r => {
        const start = match.index;
        const end = start + potentialName.length;
        return start >= r.index && end <= r.index + r.original.length;
      });
      
      if (!isAlreadyReplaced) {
        const token = generateAnonymizationToken(potentialName, 'NAME');
        
        // Almacenar el token con su PII original
        await store.saveAnonymizationToken(token, potentialName);
        
        replacements.push({
          original: potentialName,
          token: token,
          index: match.index,
        });
      }
    }
  }

  // Ordenar reemplazos de mayor a menor índice para evitar problemas al reemplazar
  replacements.sort((a, b) => b.index - a.index);

  // Aplicar reemplazos en orden inverso para mantener los índices correctos
  for (const replacement of replacements) {
    anonymized = anonymized.substring(0, replacement.index) + 
                 replacement.token + 
                 anonymized.substring(replacement.index + replacement.original.length);
  }

  return anonymized;
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

  /**
   * Anonimiza un mensaje o un PII individual
   * Si recibe 'message', detecta PII dentro del texto y lo reemplaza con tokens almacenables
   * Si recibe 'pii', aplica métodos de anonimización (hash, mask, generalize)
   */
  anonymize = async (req, res) => {
    const body = req.body || {};

    // Si viene message, anonimizamos PII dentro de texto libre generando tokens
    if (typeof body.message === 'string' && body.message.length > 0) {
      try {
        const anonymizedMessage = await anonymizeMessage(body.message, this.store);
        return res.json({ anonymizedMessage });
      } catch (error) {
        console.error('Error al anonimizar mensaje:', error);
        return res.status(500).json({ error: 'Error al anonimizar mensaje' });
      }
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
