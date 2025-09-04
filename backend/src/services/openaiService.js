const OpenAI = require('openai');
const dotenv = require('dotenv');
const winston = require('winston');

dotenv.config({ path: '.env' });

// Logger específico para OpenAI
const openaiLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.json()
  ),
  defaultMeta: { service: 'openai-service' },
  transports: [
    new winston.transports.File({ filename: 'logs/openai.log' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  openaiLogger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

dotenv.config({ path: '.env' });

class OpenAIService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.model = process.env.OPENAI_MODEL || 'gpt-4.1-mini';
    this.fallbackModel = 'gpt-4.1'; // Modelo de mayor calidad para casos críticos
    this.confidenceThreshold = 0.7; // Umbral para usar fallback
  }

  // Prompt del sistema para el asistente de la clínica
  getSystemPrompt() {
    return `Eres un asistente virtual de ${process.env.CLINIC_NAME}. Tu objetivo es resolver dudas y agendar citas con precisión.

REGLAS IMPORTANTES:
- Nunca des consejo médico; redirige a un profesional para evaluaciones clínicas
- Usa un tono cercano, profesional y breve
- Antes de ofrecer huecos, confirma servicio y preferencias de fechas/horas
- Valida identidad antes de modificar citas
- Resume siempre la confirmación con: servicio, profesional, fecha, hora, ubicación, políticas clave
- Si detectas insatisfacción, NO pidas reseña; crea ticket para seguimiento humano

CAPACIDADES:
- Información sobre servicios y precios
- Agendar y reagendar citas
- Responder preguntas sobre ubicación y horarios
- Proporcionar cuidados pre y post tratamiento
- Manejar quejas y solicitudes de contacto humano

SERVICIOS DISPONIBLES:
- Limpieza facial (60 min, desde €45)
- Tratamiento anti-acné (90 min, desde €65)
- Hidratación profunda (75 min, desde €55)
- Peeling químico (60 min, desde €80)
- Tratamiento anti-edad (90 min, desde €95)

HORARIOS:
- Lunes a Viernes: 9:00 - 20:00
- Sábados: 9:00 - 18:00
- Domingos: Cerrado

UBICACIÓN: ${process.env.CLINIC_ADDRESS}
TELÉFONO: ${process.env.CLINIC_PHONE}
EMAIL: ${process.env.CLINIC_EMAIL}`;
  }

  async processMessage(userMessage, conversationHistory = []) {
    try {
      openaiLogger.info('Processing Message', {
        message: userMessage,
        historyLength: conversationHistory.length,
        model: this.model,
        timestamp: new Date().toISOString()
      });

      const messages = [
        { role: 'system', content: this.getSystemPrompt() },
        ...conversationHistory,
        { role: 'user', content: userMessage }
      ];

      // Intentar con el modelo base primero
      openaiLogger.info('Calling OpenAI Base Model', {
        model: this.model,
        messageLength: userMessage.length,
        historyLength: conversationHistory.length
      });

      let completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: messages,
        max_tokens: 500,
        temperature: 0.7,
        presence_penalty: 0.1,
        frequency_penalty: 0.1
      });

      const response = completion.choices[0].message.content;
      
      openaiLogger.info('OpenAI Base Response', {
        model: this.model,
        responseLength: response.length,
        tokensUsed: completion.usage?.total_tokens || 0,
        promptTokens: completion.usage?.prompt_tokens || 0,
        completionTokens: completion.usage?.completion_tokens || 0
      });
      
      // Extraer intents y entidades del mensaje
      const intentAnalysis = await this.analyzeIntent(userMessage);
      
      openaiLogger.info('Intent Analysis', {
        intent: intentAnalysis.intent,
        confidence: intentAnalysis.confidence,
        entities: intentAnalysis.entities,
        model: this.model
      });
      
      // Si la confianza es baja, intentar con el modelo de fallback
      if (intentAnalysis.confidence < this.confidenceThreshold) {
        openaiLogger.warn('Low Confidence - Using Fallback', {
          confidence: intentAnalysis.confidence,
          threshold: this.confidenceThreshold,
          fallbackModel: this.fallbackModel
        });
        
        completion = await this.openai.chat.completions.create({
          model: this.fallbackModel,
          messages: messages,
          max_tokens: 500,
          temperature: 0.5, // Menor temperatura para mayor precisión
          presence_penalty: 0.1,
          frequency_penalty: 0.1
        });

        const fallbackResponse = completion.choices[0].message.content;
        const fallbackAnalysis = await this.analyzeIntent(userMessage, this.fallbackModel);
        
        openaiLogger.info('OpenAI Fallback Response', {
          model: this.fallbackModel,
          responseLength: fallbackResponse.length,
          tokensUsed: completion.usage?.total_tokens || 0,
          newConfidence: fallbackAnalysis.confidence
        });
        
        return {
          response: fallbackResponse,
          intent: fallbackAnalysis.intent,
          entities: fallbackAnalysis.entities,
          confidence: fallbackAnalysis.confidence,
          timestamp: new Date().toISOString(),
          modelUsed: this.fallbackModel,
          fallbackUsed: true
        };
      }
      
      return {
        response: response,
        intent: intentAnalysis.intent,
        entities: intentAnalysis.entities,
        confidence: intentAnalysis.confidence,
        timestamp: new Date().toISOString(),
        modelUsed: this.model,
        fallbackUsed: false
      };
    } catch (error) {
      openaiLogger.error('OpenAI Processing Error', {
        error: error.message,
        stack: error.stack,
        message: userMessage,
        timestamp: new Date().toISOString()
      });
      console.error('Error en OpenAI:', error);
      throw new Error('Error al procesar el mensaje con IA');
    }
  }

  async analyzeIntent(message, model = null) {
    try {
      const modelToUse = model || this.model;
      
      openaiLogger.info('Analyzing Intent', {
        message: message,
        model: modelToUse,
        timestamp: new Date().toISOString()
      });
      
      const prompt = `Analiza el siguiente mensaje del cliente y extrae:
1. INTENTO PRINCIPAL (uno de: saludo, info_servicios, agendar_cita, reagendar_cita, cancelar_cita, ubicacion_horarios, cuidados, queja, hablar_humano)
2. ENTIDADES RELEVANTES (servicio, fecha, hora, profesional, urgencia)
3. CONFIANZA (0-1)

Mensaje: "${message}"

Responde ÚNICAMENTE en formato JSON válido, sin markdown ni código:
{
  "intent": "intento_principal",
  "entities": {
    "servicio": "nombre_servicio_o_null",
    "fecha": "fecha_o_null", 
    "hora": "hora_o_null",
    "profesional": "nombre_profesional_o_null",
    "urgencia": "alta/media/baja_o_null"
  },
  "confidence": 0.95
}`;

      const completion = await this.openai.chat.completions.create({
        model: modelToUse,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 200,
        temperature: 0.1
      });

      const responseText = completion.choices[0].message.content.trim();
      
      openaiLogger.info('Intent Analysis Response', {
        model: modelToUse,
        rawResponse: responseText,
        tokensUsed: completion.usage?.total_tokens || 0
      });
      
      // Limpiar la respuesta de markdown si existe
      let cleanResponse = responseText;
      if (responseText.includes('```json')) {
        cleanResponse = responseText.replace(/```json\s*/, '').replace(/```\s*$/, '');
        openaiLogger.info('Cleaned JSON Response', { original: responseText, cleaned: cleanResponse });
      } else if (responseText.includes('```')) {
        cleanResponse = responseText.replace(/```\s*/, '').replace(/```\s*$/, '');
        openaiLogger.info('Cleaned JSON Response', { original: responseText, cleaned: cleanResponse });
      }
      
      const analysis = JSON.parse(cleanResponse);
      
      openaiLogger.info('Intent Analysis Complete', {
        intent: analysis.intent,
        confidence: analysis.confidence,
        entities: analysis.entities,
        model: modelToUse
      });
      
      return analysis;
    } catch (error) {
      openaiLogger.error('Intent Analysis Error', {
        error: error.message,
        stack: error.stack,
        message: message,
        model: model || this.model,
        timestamp: new Date().toISOString()
      });
      console.error('Error analizando intent:', error);
      console.error('Respuesta del modelo:', completion?.choices[0]?.message?.content);
      return {
        intent: 'unknown',
        entities: {},
        confidence: 0.5
      };
    }
  }

  async generateBookingSlots(service, preferredDates = []) {
    try {
      const prompt = `Genera 5 opciones de horarios disponibles para el servicio "${service}" considerando:
- Horarios de la clínica: L-V 9:00-20:00, S 9:00-18:00
- Duración del servicio: ${this.getServiceDuration(service)} minutos
- Fechas preferidas: ${preferredDates.join(', ') || 'próximos 7 días'}
- Buffer de 15 min antes y después

Responde en formato JSON con slots disponibles:
{
  "slots": [
    {
      "id": "slot_1",
      "date": "2024-01-15",
      "time": "10:00",
      "endTime": "11:00",
      "professional": "Ana",
      "available": true
    }
  ]
}`;

      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 300,
        temperature: 0.1
      });

      return JSON.parse(completion.choices[0].message.content);
    } catch (error) {
      console.error('Error generando slots:', error);
      return { slots: [] };
    }
  }

  getServiceDuration(service) {
    const durations = {
      'limpieza facial': 60,
      'tratamiento anti-acné': 90,
      'hidratación profunda': 75,
      'peeling químico': 60,
      'tratamiento anti-edad': 90
    };
    return durations[service.toLowerCase()] || 60;
  }
}

module.exports = new OpenAIService();
