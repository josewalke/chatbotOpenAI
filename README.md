# 🤖 Chatbot Inteligente para Clínica Estética

Sistema completo de automatización + IA que atiende por múltiples canales, responde dudas y agenda citas con disponibilidad inteligente.

## 🎯 Características Principales

### **🧠 Inteligencia Artificial**
- **OpenAI GPT-4** para procesamiento de lenguaje natural
- **Análisis de intents** y extracción de entidades
- **Tool-calling** para acciones específicas (agendar, buscar, reservar)
- **Fallback automático** a GPT-4o en caso de problemas

### **📅 Sistema de Calendario Inteligente**
- **Búsqueda inteligente** de horarios disponibles
- **Reservas temporales** con TTL automático
- **Integración Google Calendar** (modo simulación)
- **Gestión de profesionales** y recursos
- **Sistema de scoring** para optimización de citas

### **💾 Persistencia de Datos**
- **SQLite** para almacenamiento robusto
- **Migración automática** desde JSON
- **Transformación de datos** para compatibilidad frontend/backend
- **Backup automático** y recuperación

### **🌐 APIs RESTful**
- **Endpoints de calendario**: `/api/calendar/slots/search`, `/api/calendar/slots/reserve`
- **Endpoints de ventas**: `/api/sales` (CRUD completo)
- **Endpoints de productos**: `/api/productos` (CRUD completo)
- **Endpoints de chat**: `/api/chat/message`
- **Endpoints de reservas**: `/api/booking`

### **🎨 Frontend React**
- **Interfaz moderna** con Styled Components
- **Manejo de errores** robusto
- **APIs centralizadas** con Axios
- **Componentes reutilizables**

## 🚀 Instalación y Configuración

### **Prerrequisitos**
- Node.js 18+
- npm o yarn
- OpenAI API Key

### **Instalación**
```bash
# Clonar el repositorio
git clone https://github.com/josewalke/chatbotOpenAI.git
cd chatbotOpenAI

# Instalar dependencias del backend
cd backend
npm install

# Instalar dependencias del frontend
cd ../frontend
npm install
```

### **Configuración**
1. **Crear archivo de configuración**:
```bash
# En backend/config.env
OPENAI_API_KEY=tu_clave_aqui
PORT=8080
CLINIC_NAME=Tu Clínica
CLINIC_ADDRESS=Tu Dirección
CLINIC_PHONE=+34 123 456 789
CLINIC_EMAIL=info@tuclinica.com

# Google Calendar (opcional)
GOOGLE_CALENDAR_CREDENTIALS_PATH=path/to/credentials.json
GOOGLE_CALENDAR_CALENDAR_ID=tu_calendario_id
```

2. **Inicializar base de datos**:
```bash
cd backend
node src/server.js
# La base de datos se crea automáticamente
```

## 🎮 Uso del Sistema

### **Inicio Rápido**
```bash
# Opción 1: Scripts de batch (Windows)
start-project-smart.bat

# Opción 2: Comandos NPM
cd backend && npm run start-smart
cd frontend && npm start
```

### **APIs Disponibles**

#### **Chat con IA**
```bash
POST /api/chat/message
{
  "message": "Quiero agendar una cita de hidratación facial",
  "sessionId": "unique-session-id"
}
```

#### **Búsqueda de Horarios**
```bash
POST /api/calendar/slots/search
{
  "servicioId": "hidratación facial profunda",
  "ventanaCliente": {
    "desde": "2025-09-09",
    "hasta": "2025-09-15",
    "franjas": ["mañana"]
  }
}
```

#### **Reservar Cita**
```bash
POST /api/calendar/slots/reserve
{
  "slotId": "slot-uuid",
  "cliente": {
    "nombre": "María García",
    "telefono": "+34 123 456 789",
    "email": "maria@email.com"
  },
  "servicioId": "hidratación facial profunda"
}
```

## 🏗️ Arquitectura del Sistema

### **Backend (Node.js + Express)**
```
src/
├── routes/           # Endpoints de API
├── services/         # Lógica de negocio
├── data/            # Base de datos SQLite
└── server.js        # Servidor principal
```

### **Frontend (React)**
```
src/
├── components/       # Componentes React
├── services/         # Servicios de API
└── App.js           # Aplicación principal
```

### **Servicios Principales**
- **`calendarService`**: Gestión de calendario y slots
- **`openaiService`**: Integración con OpenAI
- **`databaseService`**: Gestión de SQLite
- **`slotManager`**: Reservas temporales
- **`dataTransformService`**: Transformación de datos

## 🔧 Funcionalidades Avanzadas

### **Sistema de Calendario**
- **Búsqueda inteligente** de horarios
- **Reservas temporales** con expiración
- **Gestión de recursos** (salas, equipos)
- **Optimización de carga** de profesionales

### **Gestión de Datos**
- **Migración automática** desde JSON
- **Transformación de formatos** para compatibilidad
- **Backup y recuperación** automática
- **Validación de datos** con Joi

### **Sistema de Logging**
- **Winston** para logging estructurado
- **Archivos separados** por servicio
- **Rotación automática** de logs
- **Niveles de log** configurables

## 🛡️ Seguridad y Validación

- **Helmet** para headers de seguridad
- **CORS** configurado
- **Rate limiting** para APIs
- **Validación Joi** para datos de entrada
- **Sanitización** de inputs

## 📊 Monitoreo y Logs

### **Archivos de Log**
- `logs/api.log` - Requests de API
- `logs/error.log` - Errores del sistema
- `logs/calendar.log` - Actividad de calendario
- `logs/openai.log` - Interacciones con OpenAI

### **Métricas Disponibles**
- Tasa de conversión a citas
- Tiempo de respuesta de APIs
- Uso de recursos del sistema
- Estadísticas de ventas

## 🚨 Solución de Problemas

### **Conflictos de Puertos**
```bash
# Limpiar procesos
cleanup.bat

# O manualmente
taskkill /f /im node.exe
```

### **Problemas de Base de Datos**
```bash
# Recrear base de datos
rm backend/src/data/clinica.db
node backend/src/server.js
```

### **Errores de OpenAI**
- Verificar `OPENAI_API_KEY` en `config.env`
- Comprobar límites de API
- Revisar logs en `logs/openai.log`

## 🔮 Próximas Funcionalidades

- [ ] **Integración WhatsApp Business API**
- [ ] **Integración Instagram/Facebook Messenger**
- [ ] **Sistema de voz (IVR/Voicebot)**
- [ ] **Automatización de emails**
- [ ] **Sistema de reseñas automáticas**
- [ ] **Dashboard de métricas**
- [ ] **Integración CRM**

## 📝 Licencia

MIT License - Ver archivo `LICENSE` para más detalles.

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor:
1. Fork el proyecto
2. Crea una rama para tu feature
3. Commit tus cambios
4. Push a la rama
5. Abre un Pull Request

## 📞 Soporte

Para soporte técnico o preguntas:
- **Email**: info@tuclinica.com
- **GitHub Issues**: [Crear issue](https://github.com/josewalke/chatbotOpenAI/issues)

---

**Desarrollado con ❤️ para automatizar y mejorar la experiencia de los clientes en clínicas estéticas.**