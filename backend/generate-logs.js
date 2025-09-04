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

console.log('🔄 Generando logs continuamente...');
console.log('Presiona Ctrl+C para detener\n');

let counter = 1;

const generateLogs = () => {
  const messages = [
    'Hola, quiero agendar una cita',
    '¿Cuánto cuesta la limpieza facial?',
    'Necesito información sobre horarios',
    '¿Tienen tratamiento para acné?',
    'Quiero hablar con un humano'
  ];

  const intents = [
    'agendar_cita',
    'info_servicios', 
    'ubicacion_horarios',
    'info_servicios',
    'hablar_humano'
  ];

  const models = ['gpt-4.1-mini', 'gpt-4.1'];
  const confidences = [0.85, 0.92, 0.78, 0.95, 0.88];

  const message = messages[counter % messages.length];
  const intent = intents[counter % intents.length];
  const model = models[counter % models.length];
  const confidence = confidences[counter % confidences.length];

  // Log de API
  testLogger.info('API Request', {
    method: 'POST',
    url: '/api/chat/message',
    ip: '127.0.0.1',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    timestamp: new Date().toISOString(),
    requestId: counter
  });

  // Log de OpenAI
  testLogger.info('Processing Message', {
    message: message,
    historyLength: counter % 3,
    model: model,
    timestamp: new Date().toISOString(),
    requestId: counter
  });

  testLogger.info('Intent Analysis', {
    intent: intent,
    confidence: confidence,
    entities: {
      servicio: intent === 'info_servicios' ? 'limpieza facial' : null,
      fecha: intent === 'agendar_cita' ? '2024-01-15' : null,
      hora: null,
      profesional: null,
      urgencia: null
    },
    model: model,
    requestId: counter
  });

  // Simular fallback ocasional
  if (confidence < 0.8) {
    testLogger.warn('Low Confidence - Using Fallback', {
      confidence: confidence,
      threshold: 0.8,
      fallbackModel: 'gpt-4.1',
      requestId: counter
    });
  }

  counter++;
};

// Generar logs cada 2 segundos
const interval = setInterval(generateLogs, 2000);

// Generar el primer log inmediatamente
generateLogs();

// Manejar Ctrl+C
process.on('SIGINT', () => {
  console.log('\n🛑 Deteniendo generación de logs...');
  clearInterval(interval);
  process.exit(0);
});
