const winston = require('winston');
const fs = require('fs');

// Crear directorio de logs si no existe
if (!fs.existsSync('logs')) {
  fs.mkdirSync('logs');
}

// Logger de prueba
const testLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.json()
  ),
  defaultMeta: { service: 'test-service' },
  transports: [
    new winston.transports.File({ filename: 'logs/api.log' }),
    new winston.transports.File({ filename: 'logs/openai.log' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

console.log('🧪 Generando logs de prueba...\n');

// Simular logs de API
testLogger.info('API Request', {
  method: 'POST',
  url: '/api/chat/message',
  ip: '127.0.0.1',
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  timestamp: new Date().toISOString()
});

testLogger.info('API Response', {
  method: 'POST',
  url: '/api/chat/message',
  statusCode: 200,
  duration: '1250ms',
  timestamp: new Date().toISOString()
});

// Simular logs de OpenAI
testLogger.info('Processing Message', {
  message: 'Hola, quiero información sobre la limpieza facial',
  historyLength: 0,
  model: 'gpt-4.1-mini',
  timestamp: new Date().toISOString()
});

testLogger.info('Calling OpenAI Base Model', {
  model: 'gpt-4.1-mini',
  messageLength: 45,
  historyLength: 0
});

testLogger.info('OpenAI Base Response', {
  model: 'gpt-4.1-mini',
  responseLength: 156,
  tokensUsed: 89,
  promptTokens: 67,
  completionTokens: 22
});

testLogger.info('Intent Analysis', {
  intent: 'info_servicios',
  confidence: 0.92,
  entities: {
    servicio: 'limpieza facial',
    fecha: null,
    hora: null,
    profesional: null,
    urgencia: null
  },
  model: 'gpt-4.1-mini'
});

// Simular un error
testLogger.error('Test Error', {
  error: 'Error de prueba para demostrar el sistema de logs',
  stack: 'Error: Test error\n    at test-logs.js:45:15',
  timestamp: new Date().toISOString()
});

console.log('✅ Logs de prueba generados exitosamente!');
console.log('📁 Archivos creados:');
console.log('   - logs/api.log');
console.log('   - logs/openai.log');
console.log('   - logs/combined.log');
console.log('\n🔍 Ahora puedes probar:');
console.log('   node logs.js          - Ver todos los logs');
console.log('   node logs.js watch api - Monitorear logs de API');
console.log('   node logs.js watch openai - Monitorear logs de OpenAI');
console.log('   node logs.js stats    - Ver estadísticas');
