# taller-2-uso-ia-cursor

## Data Privacy Vault (Node.js)

Servicio mínimo para tokenizar (reversible) y anonimizar (irreversible) PII.

### Requisitos
- Node.js 18+

### Instalación
```bash
npm install
cp .env.example .env
# Edita .env con tus claves hex de 32 bytes (64 chars)
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
```

### Notas de seguridad
- Las claves de `AES-256-GCM` y HMAC deben gestionarse en un KMS/secret manager.
- La implementación usa memoria en lugar de DB para simplicidad; en producción usa una base de datos y auditoría.
- Implementa mTLS y control de acceso en el despliegue real.