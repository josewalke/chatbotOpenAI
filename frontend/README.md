# Frontend - Sistema de Automatización + IA

Frontend del sistema de asistente virtual inteligente para clínica estética.

## 🚀 Características

- **Interfaz moderna** con React 18
- **Chat virtual** con diseño atractivo
- **Catálogo de servicios** con tarjetas informativas
- **Navegación** con React Router
- **Diseño responsive** y UX optimizada
- **Integración con backend** via API REST

## 🛠️ Tecnologías

- **React 18** con hooks
- **Styled Components** para estilos
- **React Router** para navegación
- **Axios** para comunicación con API
- **React Icons** para iconografía

## 📋 Requisitos

- Node.js 16+
- npm o yarn
- Backend corriendo en puerto 3001

## 🔧 Instalación

### 1. Instalar dependencias
```bash
npm install
```

### 2. Configurar proxy (opcional)
El proxy ya está configurado en `package.json` para apuntar a `http://localhost:3001`

### 3. Ejecutar la aplicación

**Desarrollo:**
```bash
npm start
```

**Producción:**
```bash
npm run build
```

## 🌐 Acceso

- **Desarrollo**: http://localhost:3000
- **Backend API**: http://localhost:3001/api

## 📱 Funcionalidades

### Chat Virtual
- Conversación en tiempo real con IA
- Respuestas contextuales y naturales
- Quick replies para respuestas rápidas
- Historial de conversaciones
- Indicador de escritura

### Servicios
- Catálogo completo de tratamientos
- Información detallada de cada servicio
- Precios y duración
- Cuidados pre y post tratamiento
- Botones de reserva directa

### Navegación
- Página de inicio con características
- Sección de servicios
- Chat virtual integrado
- Diseño responsive

## 🧪 Pruebas

```bash
npm test
```

## 🎨 Personalización

### Colores principales
```css
--primary-color: #667eea
--secondary-color: #764ba2
--background-color: #f5f7fa
```

### Componentes principales
- `ChatInterface` - Interfaz del chat
- `ServicesList` - Lista de servicios
- `App` - Componente principal con navegación

## 📈 Próximas Funcionalidades

- [ ] Dashboard de administración
- [ ] Sistema de reservas completo
- [ ] Notificaciones push
- [ ] Modo oscuro
- [ ] PWA (Progressive Web App)
- [ ] Internacionalización (i18n)

## 🔧 Scripts Disponibles

- `npm start` - Iniciar servidor de desarrollo
- `npm run build` - Construir para producción
- `npm test` - Ejecutar pruebas
- `npm run lint` - Verificar código
- `npm run deploy` - Construir y preparar para despliegue
