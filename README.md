# taller-2-uso-ia-cursor

## Data Privacy Vault (Node.js)

Servicio mínimo para tokenizar (reversible) y anonimizar (irreversible) PII.

### Requisitos
- Node.js 18+

### Instalación
```bash
npm install
# Opción A: usar archivo .env
# (si tienes .env.example)
# cp .env.example .env
# Edita .env con claves hex de 32 bytes (64 chars)

# Opción B: generar llaves dinámicamente con openssl y exportarlas
export PORT=4001
export VAULT_AES_KEY_HEX=$(openssl rand -hex 32)
export VAULT_TOKEN_HMAC_HEX=$(openssl rand -hex 32)

# Verifica longitud = 64 chars
# echo -n "$VAULT_AES_KEY_HEX" | wc -c
# echo -n "$VAULT_TOKEN_HMAC_HEX" | wc -c
```

### Ejecución
```bash
npm run dev
# o
npm start
```

Por defecto escucha en `http://localhost:4001`.

### Endpoints
- `POST /tokenize`
  - body: `{ "pii": "email@ejemplo.com" }`
  - resp: `{ "token": "pii_v1_<uuid>_<sig>" }`
- `POST /detokenize`
  - body: `{ "token": "pii_v1_<uuid>_<sig>" }`
  - resp: `{ "pii": "email@ejemplo.com" }`
- `POST /anonymize`
  - body: `{ "pii": "email@ejemplo.com", "method": "hash|mask|generalize" }`
  - también admite `{ "message": "texto libre con PII" }` para redactar emails/teléfonos.

### Ejemplos con curl
```bash
# Tokenizar
curl -s -X POST localhost:4001/tokenize \
  -H 'Content-Type: application/json' \
  -d '{"pii":"email@ejemplo.com"}'

# Detokenizar (reemplaza TOKEN)
curl -s -X POST localhost:4001/detokenize \
  -H 'Content-Type: application/json' \
  -d '{"token":"TOKEN"}'

# Anonimizar (hash)
curl -s -X POST localhost:4001/anonymize \
  -H 'Content-Type: application/json' \
  -d '{"pii":"email@ejemplo.com","method":"hash"}'

# Redactar PII en texto libre
curl -s -X POST localhost:4001/anonymize \
  -H 'Content-Type: application/json' \
  -d '{"message":"oferta para Dago con email dborda@gmail.com y teléfono 3152319157"}'
```

### Notas de seguridad
- Las claves de `AES-256-GCM` y HMAC deben gestionarse en un KMS/secret manager.
- La implementación usa memoria en lugar de DB para simplicidad; en producción usa una base de datos y auditoría.
- Implementa mTLS y control de acceso en el despliegue real.