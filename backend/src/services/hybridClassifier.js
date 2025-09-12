const natural = require('natural');

class HybridClassifier {
  constructor() {
    this.classifier = new natural.BayesClassifier();
    this.rulesEngine = new RulesEngine();
    this.confidenceThreshold = 0.7;
    this.trainingData = this.loadTrainingData();
    this.trainClassifier();
  }

  // Datos de entrenamiento para intents comunes
  loadTrainingData() {
    return {
      greeting: [
        'hola', 'buenos días', 'buenas tardes', 'buenas noches', 'saludos',
        'hey', 'hi', 'hello', 'buen día', 'que tal', 'como estas'
      ],
      services: [
        'servicios', 'tratamientos', 'limpieza facial', 'botox', 'rellenos',
        'peeling', 'hidratación', 'antienvejecimiento', 'depilación', 'masajes',
        'que servicios tienen', 'que tratamientos ofrecen', 'catalogo'
      ],
      booking: [
        'agendar', 'reservar', 'cita', 'turno', 'horario', 'disponibilidad',
        'quiero una cita', 'necesito reservar', 'puedo agendar', 'tienen horarios',
        'cuando puedo venir', 'agendar cita', 'reservar turno'
      ],
      prices: [
        'precios', 'costo', 'cuanto cuesta', 'tarifas', 'valor', 'precio',
        'que precio tiene', 'cuanto vale', 'costos', 'tarifa'
      ],
      location: [
        'ubicación', 'dirección', 'donde están', 'como llegar', 'ubicados',
        'direccion', 'ubicacion', 'donde queda', 'localización'
      ],
      hours: [
        'horarios', 'horario', 'cuando abren', 'cuando cierran', 'horas',
        'que horarios tienen', 'horario de atención', 'abierto'
      ],
      cancel: [
        'cancelar', 'anular', 'suspender', 'no puedo venir', 'reagendar',
        'cambiar cita', 'modificar', 'cancelar turno'
      ],
      products: [
        'productos', 'comprar', 'venta', 'tienda', 'cosméticos', 'cremas',
        'sérums', 'mascarillas', 'productos para casa', 'venta de productos'
      ],
      satisfaction: [
        'queja', 'reclamo', 'mal servicio', 'no me gusto', 'insatisfecho',
        'problema', 'malo', 'terrible', 'pésimo', 'excelente', 'muy bueno',
        'satisfecho', 'feliz', 'contento'
      ],
      human: [
        'hablar con persona', 'agente humano', 'operador', 'atencion personal',
        'quiero hablar con alguien', 'persona real', 'humano'
      ]
    };
  }

  // Entrenar el clasificador con datos etiquetados
  trainClassifier() {
    try {
      // Agregar ejemplos de entrenamiento
      Object.entries(this.trainingData).forEach(([intent, examples]) => {
        examples.forEach(example => {
          this.classifier.addDocument(example, intent);
        });
      });

      // Entrenar el clasificador
      this.classifier.train();
      console.log('✅ Clasificador híbrido entrenado exitosamente');
    } catch (error) {
      console.error('❌ Error entrenando clasificador:', error);
    }
  }

  // Clasificar mensaje usando enfoque híbrido
  async classifyMessage(message) {
    try {
      // 1. Primero intentar con reglas (más rápido y preciso para casos específicos)
      const ruleResult = this.rulesEngine.classify(message);
      if (ruleResult.confidence > this.confidenceThreshold) {
        return {
          intent: ruleResult.intent,
          confidence: ruleResult.confidence,
          method: 'rules',
          entities: ruleResult.entities
        };
      }

      // 2. Si las reglas no son suficientes, usar ML
      const mlResult = this.classifier.classify(message);
      const mlConfidence = this.getMLConfidence(message, mlResult);

      // 3. Combinar resultados si es necesario
      if (mlConfidence > this.confidenceThreshold) {
        return {
          intent: mlResult,
          confidence: mlConfidence,
          method: 'ml',
          entities: this.extractEntities(message, mlResult)
        };
      }

      // 4. Si ambos fallan, devolver resultado de baja confianza
      return {
        intent: mlResult || 'unknown',
        confidence: Math.max(ruleResult.confidence, mlConfidence),
        method: 'hybrid',
        entities: this.extractEntities(message, mlResult)
      };

    } catch (error) {
      console.error('❌ Error en clasificación híbrida:', error);
      return {
        intent: 'unknown',
        confidence: 0,
        method: 'error',
        entities: []
      };
    }
  }

  // Calcular confianza del clasificador ML
  getMLConfidence(message, intent) {
    try {
      const classifications = this.classifier.getClassifications(message);
      const topClassification = classifications[0];
      return topClassification ? topClassification.value : 0;
    } catch (error) {
      return 0;
    }
  }

  // Extraer entidades básicas
  extractEntities(message, intent) {
    const entities = [];
    const lowerMessage = message.toLowerCase();

    // Extraer fechas
    const datePatterns = [
      /(lunes|martes|miércoles|jueves|viernes|sábado|domingo)/i,
      /(mañana|tarde|noche)/i,
      /(\d{1,2}:\d{2})/i,
      /(hoy|mañana|pasado mañana)/i
    ];

    datePatterns.forEach(pattern => {
      const match = lowerMessage.match(pattern);
      if (match) {
        entities.push({
          type: 'datetime',
          value: match[0],
          confidence: 0.8
        });
      }
    });

    // Extraer servicios/productos
    const serviceKeywords = [
      'limpieza facial', 'botox', 'relleno', 'peeling', 'hidratación',
      'antienvejecimiento', 'depilación', 'masaje', 'facial', 'corporal'
    ];

    serviceKeywords.forEach(keyword => {
      if (lowerMessage.includes(keyword)) {
        entities.push({
          type: 'service',
          value: keyword,
          confidence: 0.9
        });
      }
    });

    // Extraer números (cantidades, precios)
    const numberPattern = /(\d+)/g;
    const numbers = lowerMessage.match(numberPattern);
    if (numbers) {
      numbers.forEach(num => {
        entities.push({
          type: 'number',
          value: parseInt(num),
          confidence: 0.7
        });
      });
    }

    return entities;
  }

  // Agregar nuevo ejemplo de entrenamiento
  addTrainingExample(text, intent) {
    this.classifier.addDocument(text, intent);
    this.classifier.train();
  }

  // Obtener estadísticas del clasificador
  getStats() {
    return {
      trained: this.classifier.classifications.length > 0,
      totalExamples: this.classifier.classifications.length,
      intents: Object.keys(this.trainingData),
      confidenceThreshold: this.confidenceThreshold
    };
  }
}

// Motor de reglas para casos específicos
class RulesEngine {
  constructor() {
    this.rules = this.initializeRules();
  }

  initializeRules() {
    return [
      // Reglas de saludo
      {
        pattern: /^(hola|hi|hello|buenos días|buenas tardes|buenas noches)$/i,
        intent: 'greeting',
        confidence: 0.95,
        entities: []
      },
      // Reglas de servicios
      {
        pattern: /(servicios|tratamientos|catalogo|que ofrecen)/i,
        intent: 'services',
        confidence: 0.9,
        entities: []
      },
      // Reglas de agendamiento
      {
        pattern: /(agendar|reservar|cita|turno|quiero una cita)/i,
        intent: 'booking',
        confidence: 0.9,
        entities: []
      },
      // Reglas de precios
      {
        pattern: /(precio|costo|cuanto cuesta|tarifa|valor)/i,
        intent: 'prices',
        confidence: 0.9,
        entities: []
      },
      // Reglas de ubicación
      {
        pattern: /(ubicacion|direccion|donde estan|como llegar)/i,
        intent: 'location',
        confidence: 0.9,
        entities: []
      },
      // Reglas de horarios
      {
        pattern: /(horarios|horario|cuando abren|cuando cierran)/i,
        intent: 'hours',
        confidence: 0.9,
        entities: []
      },
      // Reglas de cancelación
      {
        pattern: /(cancelar|anular|no puedo venir|reagendar)/i,
        intent: 'cancel',
        confidence: 0.9,
        entities: []
      },
      // Reglas de productos
      {
        pattern: /(productos|comprar|venta|tienda|cosmeticos)/i,
        intent: 'products',
        confidence: 0.9,
        entities: []
      },
      // Reglas de satisfacción
      {
        pattern: /(queja|reclamo|mal servicio|no me gusto|excelente|muy bueno)/i,
        intent: 'satisfaction',
        confidence: 0.85,
        entities: []
      },
      // Reglas de humano
      {
        pattern: /(hablar con persona|agente humano|operador|atencion personal)/i,
        intent: 'human',
        confidence: 0.95,
        entities: []
      }
    ];
  }

  classify(message) {
    for (const rule of this.rules) {
      if (rule.pattern.test(message)) {
        return {
          intent: rule.intent,
          confidence: rule.confidence,
          entities: rule.entities
        };
      }
    }

    return {
      intent: 'unknown',
      confidence: 0,
      entities: []
    };
  }
}

module.exports = HybridClassifier;
