# Sistema de Logging Frontend

## 📋 Descripción

Se ha implementado un sistema completo de logging para el frontend que permite hacer seguimiento detallado de todas las operaciones, errores y flujos de la aplicación.

## 🏗️ Arquitectura

### Logger Principal (`frontend/src/utils/logger.js`)

El sistema de logging está centralizado en una clase `FrontendLogger` que proporciona:

- **Múltiples niveles de log**: `info`, `warn`, `error`, `debug`, `critical`
- **Almacenamiento en memoria**: Mantiene los últimos 1000 logs
- **Filtrado por componente**: Cada log incluye el componente que lo generó
- **Exportación de logs**: Permite descargar logs en formato JSON
- **Envío automático**: Los logs críticos se envían al servidor automáticamente

### Componentes con Logging

#### 1. **ChatInterface** (`frontend/src/components/ChatInterface.js`)
- ✅ Inicialización del componente
- ✅ Creación de conversaciones
- ✅ Envío de mensajes
- ✅ Respuestas del backend
- ✅ Manejo de errores
- ✅ Parseo de productos
- ✅ Interacciones del usuario

#### 2. **ProductButtons** (`frontend/src/components/ProductButtons.js`)
- ✅ Renderizado del componente
- ✅ Clicks en productos
- ✅ Clicks en información
- ✅ Validación de props

#### 3. **ProductInfoModal** (`frontend/src/components/ProductInfoModal.js`)
- ✅ Apertura/cierre del modal
- ✅ Selección de productos
- ✅ Validación de datos

#### 4. **ErrorHandler** (`frontend/src/components/ErrorHandler.js`)
- ✅ Manejo de errores
- ✅ Estados de conexión
- ✅ Reintentos de operaciones

#### 5. **Servicios API** (`frontend/src/services/api.js`)
- ✅ Requests HTTP
- ✅ Responses HTTP
- ✅ Errores de red
- ✅ Timeouts

## 🎛️ Debugger Visual

### LogsDebugger (`frontend/src/components/LogsDebugger.js`)

Un componente visual que muestra los logs en tiempo real:

- **Ubicación**: Esquina inferior derecha
- **Visibilidad**: Solo en modo desarrollo
- **Filtros**: Por nivel de log (all, error, info)
- **Controles**:
  - Exportar logs
  - Limpiar logs
  - Mostrar/ocultar
  - Filtrar por nivel

## 📊 Tipos de Logs

### INFO
```javascript
logger.info('ChatInterface', 'Conversación creada exitosamente', {
  conversationId: '123',
  sessionId: 'abc',
  messageCount: 5
});
```

### DEBUG
```javascript
logger.debug('ProductButtons', 'Renderizando botones de productos', {
  products: products.map(p => ({ id: p.id, nombre: p.nombre }))
});
```

### WARN
```javascript
logger.warn('ChatInterface', 'Mensaje no enviado - condiciones no cumplidas', {
  hasText: !!messageText.trim(),
  isLoading,
  isSending
});
```

### ERROR
```javascript
logger.error('ChatInterface', 'Error enviando mensaje', error);
```

### CRITICAL
```javascript
logger.critical('API', 'Error crítico de conexión', {
  error: error.message,
  url: error.config?.url
});
```

## 🔧 Uso del Logger

### Importación
```javascript
import logger from '../utils/logger';
```

### Métodos Disponibles
```javascript
// Logging básico
logger.info(component, message, data);
logger.warn(component, message, data);
logger.error(component, message, data);
logger.debug(component, message, data);
logger.critical(component, message, data);

// Utilidades
logger.getAllLogs();                    // Obtener todos los logs
logger.getLogsByComponent('ChatInterface'); // Filtrar por componente
logger.getLogsByLevel('error');         // Filtrar por nivel
logger.clearLogs();                     // Limpiar logs
logger.exportLogs();                    // Exportar logs
```

## 🎯 Casos de Uso

### 1. **Debugging de Problemas**
- Identificar dónde fallan las operaciones
- Rastrear el flujo de datos
- Detectar errores de red o API

### 2. **Monitoreo de Rendimiento**
- Medir tiempos de respuesta
- Identificar operaciones lentas
- Optimizar flujos críticos

### 3. **Análisis de Usuario**
- Entender cómo interactúan los usuarios
- Identificar patrones de uso
- Mejorar la experiencia

### 4. **Desarrollo y Testing**
- Verificar que los componentes funcionen correctamente
- Validar integraciones
- Detectar regresiones

## 🚀 Acceso a Logs

### En Desarrollo
- **Visual**: Componente LogsDebugger en la esquina inferior derecha
- **Consola**: Todos los logs se muestran en la consola del navegador
- **Global**: `window.frontendLogger` disponible para debugging manual

### En Producción
- **Servidor**: Logs críticos se envían automáticamente al servidor
- **Exportación**: Los usuarios pueden exportar logs si es necesario
- **Memoria**: Solo se mantienen los últimos 1000 logs para optimizar memoria

## 📈 Beneficios

1. **Debugging Eficiente**: Identificación rápida de problemas
2. **Monitoreo en Tiempo Real**: Seguimiento de operaciones críticas
3. **Análisis de Datos**: Información detallada para mejoras
4. **Mantenimiento**: Facilita el mantenimiento del código
5. **Optimización**: Identifica cuellos de botella y mejoras

## 🔒 Seguridad

- Los logs no contienen información sensible
- Los datos se sanitizan antes de ser enviados
- Solo logs críticos se envían al servidor
- Los logs se almacenan solo en memoria del cliente

## 📝 Mejores Prácticas

1. **Usar niveles apropiados**: INFO para operaciones normales, ERROR para problemas
2. **Incluir contexto**: Siempre incluir datos relevantes en el log
3. **Ser descriptivo**: Mensajes claros y específicos
4. **No loggear datos sensibles**: Evitar passwords, tokens, etc.
5. **Usar componentes consistentes**: Nombres de componentes claros y consistentes

---

Este sistema de logging proporciona visibilidad completa del funcionamiento del frontend, facilitando el desarrollo, debugging y mantenimiento de la aplicación.

