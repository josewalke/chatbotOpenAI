const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const path = require('path');

// Cargar variables de entorno
dotenv.config({ path: 'config.env' });

const app = express();
const PORT = process.env.PORT || 8080;

// Configurar trust proxy para rate limiting
app.set('trust proxy', 1);

// Middleware de seguridad
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100 // máximo 100 requests por ventana
});
app.use('/api/', limiter);

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://tu-dominio.com'] 
    : ['http://localhost:3000'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Middleware de logging para todas las requests
app.use((req, res, next) => {
  const start = Date.now();
  
  // Log de request entrante
  logger.info('API Request', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });

  // Interceptar el final de la response
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('API Response', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    });
  });

  next();
});

// Logging
const winston = require('winston');

// Crear directorio de logs si no existe
const fs = require('fs');
if (!fs.existsSync('logs')) {
  fs.mkdirSync('logs');
}

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'chatbot-backend' },
  transports: [
    // Logs de error
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    // Logs combinados
    new winston.transports.File({ 
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    // Logs de API específicos
    new winston.transports.File({ 
      filename: 'logs/api.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    // Logs de OpenAI
    new winston.transports.File({ 
      filename: 'logs/openai.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ]
});

// En desarrollo, también mostrar en consola
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple(),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        return `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''}`;
      })
    )
  }));
}

// Rutas
const chatRoutes = require('./routes/chat');
const bookingRoutes = require('./routes/booking');
const servicesRoutes = require('./routes/services');
const productosRoutes = require('./routes/productos');
const salesRoutes = require('./routes/sales');

app.use('/api/chat', chatRoutes);
app.use('/api/booking', bookingRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/productos', productosRoutes);
app.use('/api/sales', salesRoutes);

// Ruta de salud
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV 
  });
});

// Manejo de errores
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(500).json({ 
    error: 'Algo salió mal!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Error interno del servidor'
  });
});

// Ruta 404
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
  console.log(`📊 Ambiente: ${process.env.NODE_ENV}`);
  console.log(`🔗 API disponible en: http://localhost:${PORT}/api`);
  console.log(`🔗 API disponible en: http://127.0.0.1:${PORT}/api`);
  
  // Log del inicio del servidor
  logger.info('Server Started', {
    port: PORT,
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
    openaiModel: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
    fallbackModel: 'gpt-4.1'
  });
}).on('error', (error) => {
  console.error('❌ Error iniciando servidor:', error);
  logger.error('Server Start Error', { error: error.message, stack: error.stack });
  process.exit(1);
});

// Manejar señales de terminación
process.on('SIGINT', () => {
  console.log('\n🛑 Cerrando servidor...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Cerrando servidor...');
  process.exit(0);
});
