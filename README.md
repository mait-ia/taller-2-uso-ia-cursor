# Data Privacy Vault con ChatGPT Seguro

## Descripción del Proyecto

Este proyecto implementa un **Vault de Privacidad de Datos (PII)** con Node.js que proporciona servicios de tokenización, anonimización y desanonimización de datos sensibles. La funcionalidad principal incluye:

- **Tokenización reversible**: Protege datos sensibles generando tokens únicos y seguros que pueden revertirse posteriormente
- **Anonimización**: Transforma datos sensibles en formato irreversible mediante hash, mask o generalización
- **Chat Seguro con ChatGPT**: Permite interactuar con ChatGPT sin exponer información personal identificable (PII), mediante el proceso de anonimización antes de enviar datos y desanonimización de la respuesta

### Características Principales

1. **Arquitectura en Capas**: Separación clara entre capas de control, servicio, repositorio y configuración
2. **Seguridad**: Uso de AES-256-GCM para encriptación y HMAC para firma de tokens
3. **Detección Automática de PII**: Identifica automáticamente nombres, emails y teléfonos en texto libre
4. **Integración con OpenAI**: Comunicación segura con ChatGPT preservando la privacidad de los datos
5. **Persistencia Flexible**: Soporte para almacenamiento en memoria o MongoDB

## Arquitectura del Sistema

### Estructura de Carpetas

```
vault/
├── config/
│   └── env.js              # Configuración centralizada de variables de entorno
├── controllers/
│   └── vaultController.js  # Lógica de negocio y manejo de endpoints
├── crypto/
│   └── aesGcm.js          # Funciones de encriptación AES-256-GCM
├── repositories/
│   ├── memoryStore.js     # Almacenamiento en memoria
│   └── mongodbStore.js    # Almacenamiento en MongoDB
├── routes/
│   └── vaultRoutes.js     # Definición de rutas y endpoints
├── services/
│   ├── tokenService.js    # Servicio de generación y validación de tokens
│   └── openaiService.js   # Servicio de comunicación con OpenAI
├── app.js                 # Configuración de la aplicación Express
└── server.js              # Punto de entrada del servidor
```

### Flujo de Datos - Chat Seguro con ChatGPT

```
Cliente → VaultController → Anonimización → OpenAIService → ChatGPT
                                                                    ↓
Cliente ← VaultController ← Desanonimización ← OpenAIService ← Respuesta
```

1. El cliente envía un prompt con información personal
2. El sistema detecta y anonimiza automáticamente PII (nombres, emails, teléfonos)
3. Se envía el prompt anonimizado a ChatGPT
4. Se recibe la respuesta de ChatGPT
5. Se desanonimiza la respuesta reemplazando tokens con datos originales
6. Se devuelve la respuesta segura al cliente

## Requisitos

- **Node.js** 18 o superior
- **npm** o **yarn** para gestión de dependencias
- **(Opcional) MongoDB** para persistencia en base de datos
- **OpenAI API Key** para funcionalidad de chat seguro

## Instalación

### 1. Clonar el Repositorio

```bash
git clone <repository-url>
cd taller-2-uso-ia-cursor
```

### 2. Instalar Dependencias

```bash
npm install
```

### 3. Configurar Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto con las siguientes variables:

```env
# Puerto del servidor
PORT=4001

# Claves de encriptación y firma (64 caracteres hex cada una)
# Generar con: openssl rand -hex 32
VAULT_AES_KEY_HEX=<tu_clave_aes_64_chars>
VAULT_TOKEN_HMAC_HEX=<tu_clave_hmac_64_chars>

# OpenAI Configuration
OPENAI_API_KEY=<tu_openai_api_key>
OPENAI_MODEL=gpt-3.5-turbo
OPENAI_MAX_TOKENS=1000

# MongoDB Configuration (Opcional)
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB_NAME=mait-privacy-vault
MONGODB_COLLECTION_NAME=pairs
```

#### Generar Claves de Seguridad

**En Linux/Mac:**
```bash
export VAULT_AES_KEY_HEX=$(openssl rand -hex 32)
export VAULT_TOKEN_HMAC_HEX=$(openssl rand -hex 32)

# Verificar longitud
echo -n "$VAULT_AES_KEY_HEX" | wc -c    # Debe ser 64
echo -n "$VAULT_TOKEN_HMAC_HEX" | wc -c # Debe ser 64
```

**En Windows (PowerShell):**
```powershell
$vaultAesKey = -join ((48..57) + (97..102) | Get-Random -Count 64 | % {[char]$_})
$vaultTokenHmac = -join ((48..57) + (97..102) | Get-Random -Count 64 | % {[char]$_})
Write-Host "VAULT_AES_KEY_HEX=$vaultAesKey"
Write-Host "VAULT_TOKEN_HMAC_HEX=$vaultTokenHmac"
```

### 4. Configurar MongoDB (Opcional)

Si deseas usar MongoDB para persistencia:

1. Instala MongoDB en tu sistema
2. Inicia el servicio de MongoDB
3. Configura las variables `MONGODB_URI`, `MONGODB_DB_NAME` y `MONGODB_COLLECTION_NAME` en tu `.env`

Si no configuras MongoDB, el sistema usará almacenamiento en memoria por defecto.

### 5. Ejecutar el Servidor

```bash
# Modo desarrollo
npm run dev

# Modo producción
npm start
```

El servidor estará disponible en `http://localhost:4001`

## Uso de los Endpoints

### 1. Tokenizar PII

Genera un token reversible para un valor de PII.

```bash
curl -X POST http://localhost:4001/tokenize \
  -H 'Content-Type: application/json' \
  -d '{"pii":"email@ejemplo.com"}'
```

**Respuesta:**
```json
{
  "token": "pii_v1_<uuid>_<signature>"
}
```

### 2. Detokenizar

Recupera el PII original a partir de un token.

```bash
curl -X POST http://localhost:4001/detokenize \
  -H 'Content-Type: application/json' \
  -d '{"token":"pii_v1_<uuid>_<signature>"}'
```

**Respuesta:**
```json
{
  "pii": "email@ejemplo.com"
}
```

### 3. Anonimizar PII Individual

Aplica anonimización irreversible a un PII.

```bash
curl -X POST http://localhost:4001/anonymize \
  -H 'Content-Type: application/json' \
  -d '{"pii":"email@ejemplo.com","method":"hash"}'
```

**Métodos disponibles:**
- `hash`: Genera hash SHA-256 HMAC
- `mask`: Enmascara parte del dato
- `generalize`: Reemplaza con valor generalizado

### 4. Anonimizar Mensaje con PII

Detecta y anonimiza automáticamente PII en texto libre.

```bash
curl -X POST http://localhost:4001/anonymize \
  -H 'Content-Type: application/json' \
  -d '{
    "message": "oferta para Juan Pérez con email juan.perez@ejemplo.com y teléfono 3152319157"
  }'
```

**Respuesta:**
```json
{
  "anonymizedMessage": "oferta para NAME_abc123... con email EMAIL_def456... y teléfono PHONE_789ghi..."
}
```

### 5. Desanonimizar Mensaje

Revierte un mensaje anonimizado reemplazando tokens con datos originales.

```bash
curl -X POST http://localhost:4001/deanonymize \
  -H 'Content-Type: application/json' \
  -d '{
    "anonymizedMessage": "oferta para NAME_abc123... con email EMAIL_def456... y teléfono PHONE_789ghi..."
  }'
```

**Respuesta:**
```json
{
  "message": "oferta para Juan Pérez con email juan.perez@ejemplo.com y teléfono 3152319157"
}
```

### 6. Chat Seguro con ChatGPT

Interactúa con ChatGPT preservando la privacidad de los datos.

```bash
curl -X POST http://localhost:4001/secureChatGPT \
  -H 'Content-Type: application/json' \
  -d '{
    "prompt": "Escribe un email profesional para contactar a María García en maria.garcia@empresa.com sobre su solicitud. Su teléfono es 3001234567."
  }'
```

**Respuesta:**
```json
{
  "response": "Respuesta de ChatGPT con los datos originales preservados...",
  "originalPrompt": "Escribe un email profesional para contactar a María García...",
  "anonymizedPrompt": "Escribe un email profesional para contactar a NAME_xyz...",
  "anonymizedResponse": "Respuesta anonimizada de ChatGPT..."
}
```

**Proceso interno:**
1. Anonimiza el prompt: `"María García"` → `"NAME_xyz..."`, `"maria.garcia@empresa.com"` → `"EMAIL_abc..."`
2. Envía prompt anonimizado a ChatGPT
3. Recibe respuesta anonimizada
4. Desanonimiza la respuesta reemplazando tokens
5. Devuelve resultado final al cliente

## Ejemplos de Uso Completos

### Ejemplo 1: Anonimizar y Desanonimizar

```bash
# Anonimizar
curl -X POST http://localhost:4001/anonymize \
  -H 'Content-Type: application/json' \
  -d '{"message":"El cliente Carlos Rodríguez con email c.rodriguez@cliente.com necesita atención prioritaria"}' \
  | jq

# Resultado anonimizado
# {
#   "anonymizedMessage": "El cliente NAME_abc123 con email EMAIL_def456 necesita atención prioritaria"
# }

# Desanonimizar (enviar el anonymizedMessage)
curl -X POST http://localhost:4001/deanonymize \
  -H 'Content-Type: application/json' \
  -d '{"anonymizedMessage":"El cliente NAME_abc123 con email EMAIL_def456 necesita atención prioritaria"}' \
  | jq
```

### Ejemplo 2: Chat Seguro con Múltiples PII

```bash
curl -X POST http://localhost:4001/secureChatGPT \
  -H 'Content-Type: application/json' \
  -d '{
    "prompt": "Analiza la situación del cliente: nombre Ana López, email ana@ejemplo.com, teléfono 3105551234. Presenta problemas con su pedido #12345."
  }' \
  | jq '.response'
```

### Ejemplo 3: Validar Instalación

```bash
# Test de salud básico
curl http://localhost:4001/invalid-endpoint
# Debería retornar: {"error":"Not found"}

# Test de tokenización
curl -X POST http://localhost:4001/tokenize \
  -H 'Content-Type: application/json' \
  -d '{"pii":"test@example.com"}'
# Debería retornar un token válido
```

## Consideraciones de Seguridad

### En Desarrollo
- Las claves de encriptación están en variables de entorno
- El almacenamiento en memoria se pierde al reiniciar el servidor
- No se recomienda para datos críticos sin auditoría

### En Producción
- **Gestión de Secretos**: Usa un Key Management Service (KMS) o secret manager
- **Base de Datos**: Implementa MongoDB o PostgreSQL con auditoría
- **Encriptación en Tránsito**: Implementa HTTPS/TLS
- **Autenticación**: Agrega mecanismos de autenticación/autorización
- **Rate Limiting**: Implementa límites de solicitudes por usuario/IP
- **Logging**: Registra operaciones sensibles sin exponer datos
- **Rotación de Claves**: Implementa rotación periódica de claves de encriptación

## Dependencias Principales

```json
{
  "express": "^4.19.2",      // Framework web
  "dotenv": "^17.2.3",       // Variables de entorno
  "mongodb": "^6.20.0",      // Cliente MongoDB
  "openai": "^latest",       // Cliente OpenAI
  "uuid": "^9.0.1",          // Generación de IDs únicos
  "zod": "^3.23.8"           // Validación de esquemas
}
```

## Troubleshooting

### Error: "OPENAI_API_KEY no está configurada"
Solución: Agrega `OPENAI_API_KEY=<tu_api_key>` al archivo `.env`

### Error: "Falta variable de entorno: VAULT_AES_KEY_HEX"
Solución: Genera las claves siguiendo las instrucciones en la sección de instalación

### Error: "No se pudo conectar a MongoDB"
Solución: Verifica que MongoDB esté corriendo o elimina la configuración de MongoDB para usar memoria

### Los tokens de anonimización no persisten
Solución: Los tokens se almacenan en memoria por defecto. Configura MongoDB para persistencia

## Desarrollo

### Estructura de Contribución
1. Fork el repositorio
2. Crea una rama feature: `git checkout -b feature/nueva-funcionalidad`
3. Realiza tus cambios y pruebas
4. Commit: `git commit -m 'Agrega nueva funcionalidad'`
5. Push: `git push origin feature/nueva-funcionalidad`
6. Abre un Pull Request

### Tests (Pendiente de Implementación)
```bash
npm test
```

## Licencia

MIT

## Autor

Desarrollado con arquitectura limpia y principios SOLID.

## Changelog

### Versión 1.0.0
- Implementación inicial de tokenización y anonimización
- Integración con OpenAI ChatGPT seguro
- Soporte para MongoDB y almacenamiento en memoria
- Detección automática de PII en texto libre

