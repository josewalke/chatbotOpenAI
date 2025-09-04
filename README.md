# 🤖 Chatbot OpenAI para Clínica Estética

Sistema de automatización + IA omnichannel para clínica estética que atiende por Instagram, Facebook, WhatsApp y llamadas telefónicas.

## 🚀 Características

- **IA Conversacional**: Integración con OpenAI GPT-4.1-mini y GPT-4.1 (fallback)
- **Omnichannel**: Soporte para múltiples canales de comunicación
- **Agendamiento Inteligente**: Sistema de citas con disponibilidad en tiempo real
- **Logging Completo**: Sistema de logs detallado para monitoreo y debugging
- **Arquitectura Modular**: Backend Node.js + Frontend React separados

## 📋 Funcionalidades

### 🤖 Chatbot IA
- Análisis de intents y entidades
- Respuestas contextuales
- Fallback automático a modelo de mayor calidad
- Gestión de conversaciones

### 📅 Sistema de Citas
- Agendamiento automático
- Verificación de disponibilidad
- Confirmación de citas
- Reagendamiento y cancelación

### 📊 Logging y Monitoreo
- Logs de API detallados
- Logs de OpenAI con métricas
- Monitoreo en tiempo real
- Estadísticas de uso

## 🛠️ Tecnologías

### Backend
- **Node.js** + Express
- **OpenAI API** (GPT-4.1-mini / GPT-4.1)
- **Winston** para logging
- **Joi** para validación
- **Helmet** para seguridad

### Frontend
- **React 18**
- **Styled Components**
- **Axios** para API calls
- **React Router**

## 📁 Estructura del Proyecto

```
pruebachatbot/
├── backend/                 # Servidor Node.js
│   ├── src/
│   │   ├── routes/         # Rutas de la API
│   │   ├── services/       # Servicios (OpenAI, etc.)
│   │   └── server.js       # Servidor principal
│   ├── logs/               # Archivos de logs
│   ├── .env               # Variables de entorno
│   └── package.json
├── frontend/               # Aplicación React
│   ├── src/
│   │   ├── components/     # Componentes React
│   │   └── App.js
│   └── package.json
├── .gitignore
└── README.md
```

## 🚀 Instalación

### Prerrequisitos
- Node.js 18+
- npm o yarn
- Clave de API de OpenAI

### 1. Clonar el repositorio
```bash
git clone https://github.com/josewalke/chatbotOpenAI.git
cd chatbotOpenAI
```

### 2. Configurar Backend
```bash
cd backend
npm install
cp .env.example .env
# Editar .env con tu clave de OpenAI
npm run dev
```

### 3. Configurar Frontend
```bash
cd frontend
npm install
npm start
```

## ⚙️ Configuración

### Variables de Entorno (backend/.env)
```env
# OpenAI
OPENAI_API_KEY=tu_clave_de_openai
OPENAI_MODEL=gpt-4.1-mini

# Servidor
PORT=8080
NODE_ENV=development

# Clínica
CLINIC_NAME=Tu Clínica Estética
CLINIC_ADDRESS=Dirección de la clínica
CLINIC_PHONE=+34 123 456 789
CLINIC_EMAIL=info@tuclinica.com
```

## 📊 Logging

### Comandos de Monitoreo
```bash
# Ver últimos logs
node logs.js

# Monitorear API en tiempo real
node logs.js watch api

# Monitorear OpenAI en tiempo real
node logs.js watch openai

# Ver estadísticas
node logs.js stats
```

### Archivos de Log
- `logs/api.log` - Requests/responses de la API
- `logs/openai.log` - Interacciones con OpenAI
- `logs/error.log` - Errores del sistema
- `logs/combined.log` - Todos los logs

## 🔧 Scripts Disponibles

### Backend
```bash
npm run dev          # Desarrollo con nodemon
npm start           # Producción
npm test           # Tests
```

### Frontend
```bash
npm start          # Desarrollo
npm run build      # Build de producción
npm test          # Tests
```

## 🌐 API Endpoints

### Chat
- `POST /api/chat/message` - Enviar mensaje
- `POST /api/chat/conversation` - Crear conversación
- `GET /api/chat/conversation/:id` - Obtener conversación

### Servicios
- `GET /api/services` - Listar servicios
- `GET /api/services/:id` - Obtener servicio

### Citas
- `POST /api/booking/create` - Crear cita
- `PUT /api/booking/:id` - Actualizar cita
- `DELETE /api/booking/:id` - Cancelar cita

## 🤖 Intents Soportados

- `saludo` - Saludos y bienvenida
- `info_servicios` - Información de servicios
- `agendar_cita` - Agendar cita
- `reagendar_cita` - Reagendar cita
- `cancelar_cita` - Cancelar cita
- `ubicacion_horarios` - Ubicación y horarios
- `cuidados` - Cuidados pre/post tratamiento
- `queja` - Quejas y reclamaciones
- `hablar_humano` - Solicitar atención humana

## 📈 Métricas y Monitoreo

### Métricas de OpenAI
- Tokens consumidos
- Tiempo de respuesta
- Tasa de fallback
- Confianza de intents

### Métricas de API
- Requests por minuto
- Tiempo de respuesta promedio
- Códigos de estado
- Errores

## 🔒 Seguridad

- Rate limiting (100 requests/15min)
- Headers de seguridad (Helmet)
- Validación de entrada (Joi)
- Sanitización de datos
- Logs de auditoría

## 🚀 Despliegue

### Desarrollo
```bash
# Backend
cd backend && npm run dev

# Frontend
cd frontend && npm start
```

### Producción
```bash
# Backend
cd backend && npm start

# Frontend
cd frontend && npm run build
```

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📝 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para detalles.

## 📞 Soporte

Para soporte técnico, contacta a:
- Email: soporte@tuclinica.com
- Teléfono: +34 123 456 789

## 🙏 Agradecimientos

- OpenAI por proporcionar la API de GPT
- La comunidad de Node.js y React
- Todos los contribuidores del proyecto

---

**Desarrollado con ❤️ para clínicas estéticas**
