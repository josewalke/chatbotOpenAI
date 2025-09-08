# 🚀 Guía de Inicio Rápido - Chatbot Clínica Estética

## ⚡ Inicio en 3 Pasos

### **Paso 1: Configuración**
```bash
# 1. Clonar el repositorio
git clone https://github.com/josewalke/chatbotOpenAI.git
cd chatbotOpenAI

# 2. Instalar dependencias
cd backend && npm install
cd ../frontend && npm install

# 3. Configurar variables de entorno
cd ../backend
cp config.env.example config.env
# Editar config.env con tu OPENAI_API_KEY
```

### **Paso 2: Configurar OpenAI**
```bash
# Editar backend/config.env
OPENAI_API_KEY=sk-proj-tu_clave_aqui
```

### **Paso 3: Iniciar el Sistema**
```bash
# Opción A: Script automático (Windows)
start-project-smart.bat

# Opción B: Manual
# Terminal 1 - Backend
cd backend
npm run start-smart

# Terminal 2 - Frontend  
cd frontend
npm start
```

## 🌐 URLs de Acceso

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8080/api
- **Health Check**: http://localhost:8080/api/health

## 🧪 Pruebas Rápidas

### **Test 1: Chat con IA**
```bash
curl -X POST http://localhost:8080/api/chat/message \
  -H "Content-Type: application/json" \
  -d '{"message": "Hola, quiero agendar una cita", "sessionId": "test123"}'
```

### **Test 2: Búsqueda de Horarios**
```bash
curl -X POST http://localhost:8080/api/calendar/slots/search \
  -H "Content-Type: application/json" \
  -d '{"servicioId": "hidratación facial profunda", "ventanaCliente": {"desde": "2025-09-09", "hasta": "2025-09-15", "franjas": ["mañana"]}}'
```

### **Test 3: Verificar Productos**
```bash
curl http://localhost:8080/api/productos
```

## 🚨 Solución de Problemas

### **Error: Puerto ocupado**
```bash
# Limpiar procesos
cleanup.bat
# O manualmente
taskkill /f /im node.exe
```

### **Error: OpenAI API**
- Verificar `OPENAI_API_KEY` en `config.env`
- Comprobar límites de API en OpenAI

### **Error: Base de datos**
```bash
# Recrear base de datos
rm backend/src/data/clinica.db
node backend/src/server.js
```

## 📱 Uso del Frontend

1. **Abrir**: http://localhost:3000
2. **Chat**: Escribir mensajes en el chat
3. **Productos**: Ver catálogo de servicios
4. **Ventas**: Gestionar ventas realizadas
5. **Reservas**: Ver citas agendadas

## 🎯 Funcionalidades Principales

- ✅ **Chat inteligente** con OpenAI GPT-4
- ✅ **Búsqueda de horarios** disponibles
- ✅ **Reservas de citas** automáticas
- ✅ **Gestión de productos** y servicios
- ✅ **Base de datos SQLite** persistente
- ✅ **APIs RESTful** completas
- ✅ **Sistema de logging** detallado

## 🔧 Comandos Útiles

```bash
# Ver logs en tiempo real
tail -f backend/logs/api.log

# Verificar estado del servidor
curl http://localhost:8080/api/health

# Limpiar logs
rm -rf backend/logs/*.log

# Reiniciar sistema completo
cleanup.bat && start-project-smart.bat
```

## 📞 Soporte

- **GitHub Issues**: [Crear issue](https://github.com/josewalke/chatbotOpenAI/issues)
- **Documentación**: Ver `README.md`
- **Logs**: Revisar `backend/logs/`

---

**¡Listo! Tu chatbot inteligente está funcionando. 🎉**
