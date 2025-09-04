# Backend - Sistema de Automatización + IA

Backend del sistema de asistente virtual inteligente para clínica estética.

## 🚀 Características

- **API REST** completa con Express
- **Integración OpenAI** para procesamiento de IA
- **Sistema de conversaciones** con gestión de sesiones
- **Validación de datos** con Joi
- **Logging** estructurado con Winston
- **Seguridad** con Helmet y rate limiting

## 🛠️ Tecnologías

- **Node.js** con Express
- **OpenAI API** para IA
- **Joi** para validación
- **Winston** para logging
- **Helmet** para seguridad

## 📋 Requisitos

- Node.js 16+
- npm o yarn
- Cuenta de OpenAI con API key

## 🔧 Instalación

### 1. Instalar dependencias
```bash
npm install
```

### 2. Configurar variables de entorno
```bash
# Copiar y editar el archivo de configuración
cp config.env .env
```

**Variables necesarias:**
```env
OPENAI_API_KEY=tu_api_key_de_openai
NODE_ENV=development
PORT=3001
CLINIC_NAME=Tu Clínica Estética
CLINIC_ADDRESS=Tu Dirección
CLINIC_PHONE=+34 900 123 456
CLINIC_EMAIL=info@tuclinica.com
```

### 3. Ejecutar el servidor

**Desarrollo:**
```bash
npm run dev
```

**Producción:**
```bash
npm start
```

## 🌐 Endpoints

### Chat
- `POST /api/chat/conversation` - Crear conversación
- `POST /api/chat/message` - Enviar mensaje
- `GET /api/chat/conversation/:id` - Obtener conversación
- `GET /api/chat/conversations` - Listar conversaciones

### Servicios
- `GET /api/services` - Listar servicios
- `GET /api/services/:id` - Obtener servicio
- `GET /api/services/professionals/:serviceId` - Profesionales

### Booking
- `GET /api/booking/slots/search` - Buscar horarios
- `POST /api/booking/create` - Crear cita
- `GET /api/booking/:id` - Obtener cita

## 🧪 Pruebas

```bash
npm test
```

## 📊 Monitoreo

- Logs en `logs/combined.log`
- Errores en `logs/error.log`
- Health check: `GET /api/health`

## 🔒 Seguridad

- Rate limiting en endpoints
- Headers de seguridad con Helmet
- Validación de entrada con Joi
- Sanitización de datos

## 📈 Próximas Funcionalidades

- [ ] Base de datos PostgreSQL
- [ ] Autenticación JWT
- [ ] WebSocket para tiempo real
- [ ] Integración con WhatsApp/Instagram
- [ ] Sistema de emails automáticos
