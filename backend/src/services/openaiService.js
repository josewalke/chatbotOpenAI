const OpenAI = require('openai');
const dotenv = require('dotenv');
const winston = require('winston');
const productosService = require('./productosService');
const bookingService = require('./bookingService');
const calendarService = require('./calendarService');
const slotManager = require('./slotManager');
const googleCalendarService = require('./googleCalendarService');
const HybridClassifier = require('./hybridClassifier');
const AdvancedToolCalling = require('./advancedToolCalling');

dotenv.config({ path: 'config.env' });

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

class OpenAIService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    this.fallbackModel = 'gpt-4o'; // Modelo de mayor calidad para casos críticos
    this.confidenceThreshold = 0.7; // Umbral para usar fallback
    this.isOpenAIAvailable = true; // Flag para controlar disponibilidad
    this.lastErrorTime = null; // Para implementar retry con backoff
    
    // Inicializar servicios híbridos
    this.hybridClassifier = new HybridClassifier();
    this.toolCalling = new AdvancedToolCalling();
    
    openaiLogger.info('Servicios híbridos inicializados correctamente');
  }

  // Prompt del sistema para el asistente de la clínica
  getSystemPrompt() {
    return `Eres un asistente virtual de ${process.env.CLINIC_NAME}. Tu objetivo es resolver dudas, agendar citas y procesar compras de productos.

REGLAS IMPORTANTES:
- Nunca des consejo médico; redirige a un profesional para evaluaciones clínicas
- Usa un tono cercano, profesional y breve
- Distingue entre TRATAMIENTOS (requieren cita) y PRODUCTOS PARA CASA (compra directa)
- Para tratamientos: usa el NUEVO FLUJO DE CALENDARIO (search_available_slots → reserve_temporary_slot → confirm_booking)
- Para productos para casa: confirma producto, cantidad, nombre, teléfono y dirección de envío
- Valida identidad antes de modificar citas o pedidos
- Resume siempre la confirmación con todos los detalles relevantes
- Si detectas insatisfacción, NO pidas reseña; crea ticket para seguimiento humano
- Para TRATAMIENTOS: usa search_available_slots cuando tengas servicio + preferencias de fecha/hora
- Para PRODUCTOS PARA CASA: usa create_sale solo cuando tengas: producto + cantidad + nombre + teléfono + email + dirección
- NO ejecutes funciones si faltan campos requeridos
- NO preguntes por confirmación adicional si ya tienes todos los datos necesarios

FLUJO DE AGENDAMIENTO (NUEVO):
1. Cliente solicita tratamiento → search_available_slots (con servicio + ventana de tiempo)
2. Mostrar opciones disponibles → Cliente elige → reserve_temporary_slot
3. Cliente confirma → confirm_booking (con todos los datos del cliente)

CAPACIDADES:
- Información sobre tratamientos y productos para casa
- Agendar citas para tratamientos (usando NUEVO FLUJO DE CALENDARIO)
- Procesar compras de productos para casa (usando create_sale)
- Responder preguntas sobre ubicación y horarios
- Proporcionar cuidados e instrucciones de uso
- Manejar quejas y solicitudes de contacto humano

TIPOS DE PRODUCTOS:
1. TRATAMIENTOS: Requieren cita en clínica (Tratamientos Faciales, Corporales, Depilación, etc.)
2. PRODUCTOS PARA CASA: Se pueden comprar directamente y enviar a domicilio

SERVICIOS Y PRODUCTOS DISPONIBLES:
${this.getProductosInfo()}

HORARIOS:
- Lunes a Viernes: 9:00 - 20:00
- Sábados: 9:00 - 18:00
- Domingos: Cerrado

UBICACIÓN: ${process.env.CLINIC_ADDRESS}
TELÉFONO: ${process.env.CLINIC_PHONE}
EMAIL: ${process.env.CLINIC_EMAIL}`;
  }

  // Verificar si OpenAI está disponible (no en cuota excedida)
  isOpenAIQuotaExceeded(error) {
    return error && (
      error.code === 'insufficient_quota' || 
      error.status === 429 ||
      error.message?.includes('quota') ||
      error.message?.includes('billing')
    );
  }

  // Sistema de respaldo cuando OpenAI no está disponible
  generateFallbackResponse(message) {
    const lowerMessage = message.toLowerCase();
    
    // Respuestas predefinidas para casos comunes
    if (lowerMessage.includes('servicio') || lowerMessage.includes('tratamiento')) {
      const relatedProducts = this.getRelatedProducts(message);
      let content = `Te puedo ayudar con información sobre nuestros servicios. Ofrecemos tratamientos faciales, corporales, depilación y productos para el cuidado en casa. ¿Te interesa algún tratamiento específico?`;
      
      // Simplificar respuesta si hay productos relacionados
      if (relatedProducts && relatedProducts.length > 0) {
        content = "Te muestro nuestros tratamientos disponibles. Puedes ver toda la información detallada en las tarjetas de abajo.";
      }
      
      return {
        content: content,
        model: 'fallback',
        tokensUsed: 0,
        functionCalled: null,
        relatedProducts: relatedProducts
      };
    }
    
    if (lowerMessage.includes('precio') || lowerMessage.includes('costo') || lowerMessage.includes('cuánto')) {
      return {
        content: `Para conocer los precios específicos de nuestros tratamientos y productos, te recomiendo contactarnos directamente al ${process.env.CLINIC_PHONE} o visitarnos en ${process.env.CLINIC_ADDRESS}.`,
        model: 'fallback',
        tokensUsed: 0,
        functionCalled: null
      };
    }
    
    if (lowerMessage.includes('cita') || lowerMessage.includes('agendar') || lowerMessage.includes('reservar')) {
      return {
        content: `Para agendar una cita, puedes llamarnos al ${process.env.CLINIC_PHONE} o visitarnos en ${process.env.CLINIC_ADDRESS}. Nuestros horarios son: Lunes a Viernes 9:00-20:00, Sábados 9:00-18:00.`,
        model: 'fallback',
        tokensUsed: 0,
        functionCalled: null
      };
    }
    
    if (lowerMessage.includes('horario') || lowerMessage.includes('hora')) {
      return {
        content: `Nuestros horarios de atención son: Lunes a Viernes de 9:00 a 20:00, Sábados de 9:00 a 18:00. Los domingos permanecemos cerrados.`,
        model: 'fallback',
        tokensUsed: 0,
        functionCalled: null
      };
    }
    
    if (lowerMessage.includes('ubicación') || lowerMessage.includes('dirección') || lowerMessage.includes('dónde')) {
      return {
        content: `Nos encontramos en ${process.env.CLINIC_ADDRESS}. Puedes contactarnos al ${process.env.CLINIC_PHONE} o escribirnos a ${process.env.CLINIC_EMAIL}.`,
        model: 'fallback',
        tokensUsed: 0,
        functionCalled: null
      };
    }
    
    // Respuesta genérica
    return {
      content: `Gracias por contactar con ${process.env.CLINIC_NAME}. En este momento nuestro sistema de IA está temporalmente no disponible, pero puedes contactarnos directamente al ${process.env.CLINIC_PHONE} o visitarnos en ${process.env.CLINIC_ADDRESS}. Estaremos encantados de ayudarte.`,
      model: 'fallback',
      tokensUsed: 0,
      functionCalled: null
    };
  }

  // Obtener información de productos para el prompt
  getProductosInfo() {
    try {
      const categorias = productosService.getCategorias();
      let info = '';
      
      categorias.data.forEach(categoria => {
        const productos = productosService.getProductosByCategoria(categoria);
        info += `\n${categoria}:\n`;
        
        productos.data.forEach(producto => {
          info += `- ${producto.nombre}: ${producto.descripcion} (${producto.precio}€, ${producto.duracion})\n`;
        });
      });
      
      return info;
    } catch (error) {
      openaiLogger.error('Error obteniendo información de productos', { error: error.message });
      return 'Información de servicios no disponible temporalmente.';
    }
  }

  // Definir funciones disponibles para la IA
  getAvailableFunctions() {
    return [
      {
        name: "create_booking",
        description: "Crear una nueva cita cuando el cliente confirme todos los detalles (servicio, fecha, hora, nombre, teléfono)",
        parameters: {
          type: "object",
          properties: {
            serviceName: {
              type: "string",
              description: "Nombre del servicio (ej: 'hidratación facial profunda', 'peeling químico')"
            },
            customerName: {
              type: "string",
              description: "Nombre completo del cliente"
            },
            customerPhone: {
              type: "string",
              description: "Número de teléfono del cliente"
            },
            customerEmail: {
              type: "string",
              description: "Email del cliente (si no se proporciona, usar formato: nombre@clinica.com)"
            },
            date: {
              type: "string",
              description: "Fecha de la cita (ej: 'mañana', 'lunes', '2025-09-08')"
            },
            time: {
              type: "string",
              description: "Hora de la cita (ej: '5 de la tarde', '17:00', '5 pm')"
            },
            professionalId: {
              type: "string",
              description: "ID del profesional (opcional, usar 'prof_default' si no se especifica)"
            }
          },
          required: ["serviceName", "customerName", "customerPhone", "date", "time"]
        }
      },
      {
        name: "get_bookings",
        description: "Obtener todas las citas guardadas en el sistema",
        parameters: {
          type: "object",
          properties: {},
          required: []
        }
      },
      {
        name: "search_bookings",
        description: "Buscar citas por nombre del cliente o email",
        parameters: {
          type: "object",
          properties: {
            searchTerm: {
              type: "string",
              description: "Nombre del cliente o email para buscar"
            }
          },
          required: ["searchTerm"]
        }
      },
      {
        name: "create_sale",
        description: "Crear una venta de producto para casa cuando el cliente confirme todos los detalles (producto, cantidad, nombre, teléfono, dirección)",
        parameters: {
          type: "object",
          properties: {
            productName: {
              type: "string",
              description: "Nombre del producto para casa (ej: 'Sérum de Ácido Hialurónico', 'Crema Peeling Suave')"
            },
            quantity: {
              type: "number",
              description: "Cantidad del producto (por defecto 1)"
            },
            customerName: {
              type: "string",
              description: "Nombre completo del cliente"
            },
            customerPhone: {
              type: "string",
              description: "Número de teléfono del cliente"
            },
            customerEmail: {
              type: "string",
              description: "Email del cliente"
            },
            shippingAddress: {
              type: "string",
              description: "Dirección de envío completa"
            },
            paymentMethod: {
              type: "string",
              description: "Método de pago (cash, card, transfer) - por defecto 'card'"
            },
            notes: {
              type: "string",
              description: "Notas adicionales sobre la compra"
            }
          },
          required: ["productName", "customerName", "customerPhone", "customerEmail", "shippingAddress"]
        }
      },
      {
        name: "search_available_slots",
        description: "Buscar horarios disponibles para un servicio específico en una ventana de tiempo",
        parameters: {
          type: "object",
          properties: {
            serviceName: {
              type: "string",
              description: "Nombre del servicio (ej: 'hidratación facial profunda', 'peeling químico')"
            },
            startDate: {
              type: "string",
              description: "Fecha de inicio de búsqueda (ej: '2025-09-08', 'mañana')"
            },
            endDate: {
              type: "string",
              description: "Fecha de fin de búsqueda (ej: '2025-09-15', 'próxima semana')"
            },
            preferredProfessional: {
              type: "string",
              description: "Profesional preferido (opcional, ej: 'Ana García', 'Laura Martínez')"
            },
            timePreferences: {
              type: "array",
              items: { type: "string" },
              description: "Preferencias de horario (ej: ['mañana', 'tarde'], ['fin de semana'])"
            }
          },
          required: ["serviceName", "startDate", "endDate"]
        }
      },
      {
        name: "reserve_temporary_slot",
        description: "Reservar temporalmente un slot específico mientras el cliente decide",
        parameters: {
          type: "object",
          properties: {
            slotId: {
              type: "string",
              description: "ID del slot a reservar temporalmente"
            },
            customerId: {
              type: "string",
              description: "ID único del cliente"
            },
            ttl: {
              type: "number",
              description: "Tiempo de vida de la reserva en segundos (por defecto 300 = 5 minutos)"
            }
          },
          required: ["slotId", "customerId"]
        }
      },
      {
        name: "confirm_booking",
        description: "Confirmar una cita después de reservar temporalmente un slot",
        parameters: {
          type: "object",
          properties: {
            slotId: {
              type: "string",
              description: "ID del slot reservado temporalmente"
            },
            customerId: {
              type: "string",
              description: "ID del cliente"
            },
            serviceName: {
              type: "string",
              description: "Nombre del servicio"
            },
            customerName: {
              type: "string",
              description: "Nombre completo del cliente"
            },
            customerPhone: {
              type: "string",
              description: "Teléfono del cliente"
            },
            customerEmail: {
              type: "string",
              description: "Email del cliente"
            },
            notes: {
              type: "string",
              description: "Notas adicionales sobre la cita"
            }
          },
          required: ["slotId", "customerId", "serviceName", "customerName", "customerPhone"]
        }
      },
      {
        name: "get_calendar_stats",
        description: "Obtener estadísticas del calendario y disponibilidad",
        parameters: {
          type: "object",
          properties: {},
          required: []
        }
      }
    ];
  }

  async processMessage(userMessage, conversationHistory = []) {
    try {
      // Intentar reconectar si OpenAI no está disponible
      if (!this.isOpenAIAvailable) {
        const reconnected = await this.retryOpenAIConnection();
        if (!reconnected) {
          openaiLogger.warn('Using fallback system - OpenAI unavailable', {
            message: userMessage,
            timestamp: new Date().toISOString()
          });
          return this.generateFallbackResponse(userMessage);
        }
      }

      // 1. Usar clasificador híbrido primero
      const hybridResult = await this.hybridClassifier.classifyMessage(userMessage);
      openaiLogger.info('Hybrid Classification', {
        intent: hybridResult.intent,
        method: hybridResult.method,
        confidence: hybridResult.confidence,
        timestamp: new Date().toISOString()
      });

      // 2. Si la confianza es alta, usar resultado híbrido
      if (hybridResult.confidence > this.confidenceThreshold) {
        return await this.processWithHybridResult(userMessage, hybridResult, conversationHistory);
      }

      const analysis = await this.analyzeIntent(userMessage);
      
      openaiLogger.info('Processing Message', {
        message: userMessage,
        intent: analysis.intent,
        entities: analysis.entities,
        confidence: analysis.confidence,
        timestamp: new Date().toISOString()
      });

      // Construir contexto de conversación
      let conversationContext = '';
      if (conversationHistory.length > 0) {
        conversationContext = '\n\nHistorial de conversación:\n';
        conversationHistory.forEach(msg => {
          conversationContext += `${msg.role}: ${msg.content}\n`;
        });
      }

      const systemPrompt = this.getSystemPrompt();
      const fullPrompt = `${systemPrompt}${conversationContext}\n\nMensaje del cliente: "${userMessage}"`;

      // Intentar con el modelo principal usando function calling
      let response;
      try {
        response = await this.generateResponseWithAdvancedTools(fullPrompt, this.model);
        openaiLogger.info('Response Generated', {
        model: this.model,
          tokensUsed: response.tokensUsed,
          functionCalled: response.functionCalled,
          timestamp: new Date().toISOString()
        });
      } catch (primaryError) {
        openaiLogger.warn('Primary Model Failed', {
          error: primaryError.message,
          fallbackModel: this.fallbackModel,
          timestamp: new Date().toISOString()
        });
        
        // Fallback al modelo secundario
        response = await this.generateResponseWithAdvancedTools(fullPrompt, this.fallbackModel);
        openaiLogger.info('Fallback Response Generated', {
          model: this.fallbackModel,
          tokensUsed: response.tokensUsed,
          functionCalled: response.functionCalled,
          timestamp: new Date().toISOString()
        });
      }

      // Si se llamó a una función, ejecutarla
      if (response.functionCalled) {
        const functionResult = await this.executeFunction(response.functionCalled);
        if (functionResult.success) {
          response.content += `\n\n✅ **${functionResult.message}**`;
          if (functionResult.bookingId) {
            response.content += `\nID de reserva: ${functionResult.bookingId}`;
          }
        } else {
          response.content += `\n\n⚠️ **${functionResult.message}**`;
        }
      }

      // Determinar si incluir productos relacionados
      let relatedProducts = [];
      const shouldIncludeProducts = this.shouldIncludeProducts(userMessage, analysis.intent);
      
      if (shouldIncludeProducts) {
        relatedProducts = this.getRelatedProducts(userMessage);
        openaiLogger.info('Products included in response', {
          shouldInclude: shouldIncludeProducts,
          productsCount: relatedProducts.length,
          timestamp: new Date().toISOString()
        });
      }

      // Generar respuesta simplificada si hay productos relacionados
      let finalResponseContent = response.content;
      if (relatedProducts && relatedProducts.length > 0) {
        const simplifiedResponse = this.generateSimplifiedResponse(userMessage, analysis.intent, relatedProducts);
        if (simplifiedResponse) {
          finalResponseContent = simplifiedResponse;
          openaiLogger.info('Response simplified for products', {
            originalLength: response.content.length,
            simplifiedLength: simplifiedResponse.length,
            timestamp: new Date().toISOString()
          });
        }
      }

      const finalResponse = {
        response: finalResponseContent,
        intent: analysis.intent,
        entities: analysis.entities,
        confidence: analysis.confidence,
        model: response.model,
        tokensUsed: response.tokensUsed,
        functionExecuted: response.functionCalled ? response.functionCalled.name : null,
        relatedProducts: relatedProducts
      };

      openaiLogger.info('Final response prepared', {
        hasRelatedProducts: finalResponse.relatedProducts.length > 0,
        productsCount: finalResponse.relatedProducts.length,
        timestamp: new Date().toISOString()
      });

      return finalResponse;

    } catch (error) {
      console.error('Error procesando mensaje:', error);
      openaiLogger.error('Message Processing Error', {
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });

      // Si es error de cuota, activar sistema de respaldo
      if (this.isOpenAIQuotaExceeded(error)) {
        this.isOpenAIAvailable = false;
        this.lastErrorTime = new Date();
        
        openaiLogger.warn('OpenAI quota exceeded - activating fallback system', {
          error: error.message,
          timestamp: new Date().toISOString()
        });
        
        // Usar sistema de respaldo
        const fallbackResponse = this.generateFallbackResponse(userMessage);
        return {
          response: fallbackResponse.content,
          intent: 'fallback',
          entities: {},
          confidence: 0.5,
          model: 'fallback',
          tokensUsed: 0,
          functionExecuted: null,
          relatedProducts: fallbackResponse.relatedProducts || []
        };
      }

      throw new Error('Error al procesar el mensaje con IA');
    }
  }

  // Determinar si debe incluir productos relacionados
  shouldIncludeProducts(message, intent) {
    const lowerMessage = message.toLowerCase();
    
    // Palabras clave que indican interés en productos
    const productKeywords = [
      'producto', 'productos', 'tratamiento', 'tratamientos', 'servicio', 'servicios',
      'facial', 'corporal', 'depilación', 'casa', 'comprar', 'precio', 'costos',
      'hidratación', 'peeling', 'masaje', 'limpieza', 'rejuvenecimiento', 'ver',
      'ofrecen', 'tienen', 'disponible', 'información'
    ];
    
    // Intents que requieren mostrar productos
    const productIntents = [
      'info_servicios', 'info_productos', 'consulta_precios', 'buscar_producto'
    ];
    
    // Verificar si el mensaje contiene palabras clave de productos
    const hasProductKeywords = productKeywords.some(keyword => 
      lowerMessage.includes(keyword)
    );
    
    // Verificar si el intent requiere productos
    const hasProductIntent = productIntents.includes(intent);
    
    // Para debug
    openaiLogger.info('Product inclusion check', {
      message: lowerMessage,
      intent: intent,
      hasProductKeywords: hasProductKeywords,
      hasProductIntent: hasProductIntent,
      shouldInclude: hasProductKeywords || hasProductIntent,
      timestamp: new Date().toISOString()
    });
    
    return hasProductKeywords || hasProductIntent;
  }

  // Obtener productos relacionados con una consulta
  getRelatedProducts(query) {
    try {
      const allProducts = productosService.getAllProductos();
      const lowerQuery = query.toLowerCase();
      
      // Log para debug
      openaiLogger.info('Getting related products', {
        query: lowerQuery,
        totalProducts: allProducts.data.length,
        timestamp: new Date().toISOString()
      });
      
      // Si la consulta es general sobre productos, devolver productos para casa
      if (lowerQuery.includes('producto') || lowerQuery.includes('productos') || 
          lowerQuery.includes('enseñame') || lowerQuery.includes('muestra') ||
          lowerQuery.includes('tienes') || lowerQuery.includes('disponible')) {
        const casaProducts = allProducts.data.filter(p => p.categoria === 'Productos para Casa');
        openaiLogger.info('Returning casa products', {
          count: casaProducts.length,
          timestamp: new Date().toISOString()
        });
        return casaProducts.slice(0, 6);
      }
      
      // Filtrar productos que coincidan con la consulta
      const relatedProducts = allProducts.data.filter(product => {
        const searchText = `${product.nombre} ${product.descripcion} ${product.categoria}`.toLowerCase();
        return searchText.includes(lowerQuery) || 
               lowerQuery.includes(product.nombre.toLowerCase()) ||
               lowerQuery.includes(product.categoria.toLowerCase());
      });

      // Si no hay coincidencias específicas, devolver productos de la categoría más relevante
      if (relatedProducts.length === 0) {
        if (lowerQuery.includes('facial') || lowerQuery.includes('piel')) {
          return allProducts.data.filter(p => p.categoria === 'Tratamientos Faciales');
        } else if (lowerQuery.includes('corporal') || lowerQuery.includes('cuerpo')) {
          return allProducts.data.filter(p => p.categoria === 'Tratamientos Corporales');
        } else if (lowerQuery.includes('depilación') || lowerQuery.includes('vello')) {
          return allProducts.data.filter(p => p.categoria === 'Depilación');
        }
      }

      const result = relatedProducts.slice(0, 6);
      openaiLogger.info('Returning filtered products', {
        count: result.length,
        timestamp: new Date().toISOString()
      });
      return result;
    } catch (error) {
      openaiLogger.error('Error getting related products', {
        error: error.message,
        query: query,
        timestamp: new Date().toISOString()
      });
      return [];
    }
  }

  // Obtener estado del sistema
  getSystemStatus() {
    return {
      isOpenAIAvailable: this.isOpenAIAvailable,
      lastErrorTime: this.lastErrorTime,
      model: this.model,
      fallbackModel: this.fallbackModel,
      timeSinceLastError: this.lastErrorTime ? new Date() - this.lastErrorTime : null
    };
  }

  // Método para reintentar conexión con OpenAI
  async retryOpenAIConnection() {
    if (!this.isOpenAIAvailable && this.lastErrorTime) {
      const timeSinceError = new Date() - this.lastErrorTime;
      const retryInterval = 5 * 60 * 1000; // 5 minutos
      
      if (timeSinceError > retryInterval) {
        try {
          // Intentar una llamada simple para verificar si OpenAI está disponible
          await this.openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: 'test' }],
            max_tokens: 1
          });
          
          this.isOpenAIAvailable = true;
          this.lastErrorTime = null;
          
          openaiLogger.info('OpenAI connection restored', {
            timestamp: new Date().toISOString()
          });
          
          return true;
        } catch (error) {
          openaiLogger.warn('OpenAI retry failed', {
            error: error.message,
            timestamp: new Date().toISOString()
          });
          this.lastErrorTime = new Date(); // Actualizar tiempo del último error
        }
      }
    }
    return false;
  }

  // Generar respuesta con function calling
  async generateResponseWithFunctions(prompt, model) {
    try {
      const functions = this.getAvailableFunctions();
      
      const completion = await this.openai.chat.completions.create({
        model: model,
        messages: [{ role: 'user', content: prompt }],
        functions: functions,
        function_call: "auto",
        max_tokens: 500,
        temperature: 0.7
      });

      const message = completion.choices[0].message;
      const tokensUsed = completion.usage?.total_tokens || 0;

      openaiLogger.info('Response with Functions Generated', {
        model: model,
        tokensUsed: tokensUsed,
        functionCalled: message.function_call ? message.function_call.name : null,
        timestamp: new Date().toISOString()
      });

      return {
        content: message.content || '',
        model: model,
        tokensUsed: tokensUsed,
        functionCalled: message.function_call ? {
          name: message.function_call.name,
          arguments: JSON.parse(message.function_call.arguments)
        } : null
      };

    } catch (error) {
      openaiLogger.error('Response with Functions Error', {
        model: model,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  // Generar respuesta simplificada cuando hay productos relacionados
  generateSimplifiedResponse(userMessage, intent, relatedProducts) {
    const lowerMessage = userMessage.toLowerCase();
    
    // Respuestas específicas para cuando se muestran productos
    if (lowerMessage.includes('producto') || lowerMessage.includes('productos') || 
        lowerMessage.includes('enseñame') || lowerMessage.includes('muestra') ||
        lowerMessage.includes('tienes') || lowerMessage.includes('disponible')) {
      
      if (relatedProducts && relatedProducts.length > 0) {
        return "Aquí tienes nuestros productos disponibles. Puedes ver los detalles de cada uno y hacer tu compra directamente desde las tarjetas de abajo.";
      }
    }
    
    if (lowerMessage.includes('tratamiento') || lowerMessage.includes('tratamientos')) {
      if (relatedProducts && relatedProducts.length > 0) {
        return "Te muestro nuestros tratamientos disponibles. Puedes ver toda la información detallada en las tarjetas de abajo.";
      }
    }
    
    if (lowerMessage.includes('precio') || lowerMessage.includes('costos') || lowerMessage.includes('cuánto')) {
      if (relatedProducts && relatedProducts.length > 0) {
        return "Aquí puedes ver todos los precios de nuestros productos y servicios en las tarjetas de abajo.";
      }
    }
    
    // Respuesta genérica cuando hay productos
    if (relatedProducts && relatedProducts.length > 0) {
      return "Te muestro las opciones disponibles. Puedes ver todos los detalles en las tarjetas de abajo.";
    }
    
    return null; // No simplificar si no hay productos
  }

  // Ejecutar función llamada por la IA
  async executeFunction(functionCall) {
    try {
      const { name, arguments: args } = functionCall;
      
      switch (name) {
        case 'create_booking':
          return await this.executeCreateBooking(args);
        case 'get_bookings':
          return await this.executeGetBookings();
        case 'search_bookings':
          return await this.executeSearchBookings(args);
        case 'create_sale':
          return await this.executeCreateSale(args);
        case 'search_available_slots':
          return await this.executeSearchAvailableSlots(args);
        case 'reserve_temporary_slot':
          return await this.executeReserveTemporarySlot(args);
        case 'confirm_booking':
          return await this.executeConfirmBooking(args);
        case 'get_calendar_stats':
          return await this.executeGetCalendarStats();
        default:
          return {
            success: false,
            message: `Función ${name} no implementada`
          };
      }
    } catch (error) {
      openaiLogger.error('Function Execution Error', {
        functionName: functionCall.name,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      return {
        success: false,
        message: `Error ejecutando función: ${error.message}`
      };
    }
  }

  // Ejecutar creación de cita
  async executeCreateBooking(args) {
    try {
      // Convertir fecha relativa a fecha específica
      const date = this.parseDate(args.date);
      const time = this.parseTime(args.time);
      const serviceId = bookingService.getServiceId(args.serviceName);
      
      // Generar email si no se proporciona
      const email = args.customerEmail || `${args.customerName.toLowerCase().replace(/\s+/g, '.')}@clinica.com`;

      const bookingData = {
        slotId: `slot_${Date.now()}`,
        serviceId: serviceId,
        professionalId: args.professionalId || 'prof_default',
        customerInfo: {
          name: args.customerName,
          email: email,
          phone: args.customerPhone
        },
        date: date,
        time: time
      };

      const result = await bookingService.createBooking(bookingData);
      
      if (result.success) {
        openaiLogger.info('Booking Created Successfully', {
          bookingId: result.booking.id,
          customerName: args.customerName,
          serviceId: serviceId,
          date: date,
          time: time,
          timestamp: new Date().toISOString()
        });
        
        return {
          success: true,
          message: 'Cita creada y guardada exitosamente en el sistema',
          bookingId: result.booking.id,
          booking: result.booking
        };
      } else {
        return {
          success: false,
          message: `Error creando la cita: ${result.error}`
        };
      }

    } catch (error) {
      openaiLogger.error('Booking Creation Error', {
        error: error.message,
        args: args,
        timestamp: new Date().toISOString()
      });
      
      return {
        success: false,
        message: `Error procesando la cita: ${error.message}`
      };
    }
  }

  // Ejecutar obtener todas las citas
  async executeGetBookings() {
    try {
      const result = await bookingService.getAllBookings();
      
      if (result.success) {
        return {
          success: true,
          message: `Se encontraron ${result.bookings.length} citas en el sistema`,
          bookings: result.bookings
        };
      } else {
        return {
          success: false,
          message: `Error obteniendo citas: ${result.error}`
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Error: ${error.message}`
      };
    }
  }

  // Ejecutar búsqueda de citas
  async executeSearchBookings(args) {
    try {
      const result = await bookingService.getBookingsByEmail(args.searchTerm);
      
      if (result.success) {
        return {
          success: true,
          message: `Se encontraron ${result.bookings.length} citas para ${args.searchTerm}`,
          bookings: result.bookings
        };
      } else {
        return {
          success: false,
          message: `Error buscando citas: ${result.error}`
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Error: ${error.message}`
      };
    }
  }

  // Convertir fecha relativa a fecha específica
  parseDate(dateString) {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    if (dateString.toLowerCase().includes('mañana')) {
      return tomorrow.toISOString().split('T')[0];
    }
    
    if (dateString.toLowerCase().includes('lunes')) {
      // Encontrar el próximo lunes
      const nextMonday = new Date(today);
      const daysUntilMonday = (1 + 7 - today.getDay()) % 7;
      nextMonday.setDate(today.getDate() + (daysUntilMonday === 0 ? 7 : daysUntilMonday));
      return nextMonday.toISOString().split('T')[0];
    }
    
    // Si es una fecha específica, intentar parsearla
    if (dateString.match(/\d{4}-\d{2}-\d{2}/)) {
      return dateString;
    }

    // Por defecto, usar mañana
    return tomorrow.toISOString().split('T')[0];
  }

  // Convertir hora a formato HH:MM
  parseTime(timeString) {
    // Si ya está en formato HH:MM, devolverlo
    if (timeString.match(/^\d{1,2}:\d{2}$/)) {
      return timeString;
    }

    // Convertir "5 de la tarde" a "17:00"
    if (timeString.toLowerCase().includes('5') && timeString.toLowerCase().includes('tarde')) {
      return '17:00';
    }

    // Convertir "5 pm" a "17:00"
    if (timeString.toLowerCase().includes('5') && timeString.toLowerCase().includes('pm')) {
      return '17:00';
    }

    // Por defecto, usar 17:00
    return '17:00';
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
        entities: analysis.entities,
        confidence: analysis.confidence,
        timestamp: new Date().toISOString()
      });
      
      return analysis;

    } catch (error) {
      openaiLogger.error('Intent Analysis Error', {
        error: error.message,
        message: message,
        timestamp: new Date().toISOString()
      });
      
      // Fallback básico
      return {
        intent: 'info_servicios',
        entities: {},
        confidence: 0.5
      };
    }
  }

  // Ejecutar creación de venta
  async executeCreateSale(args) {
    try {
      // Validar campos requeridos
      const requiredFields = ['productName', 'customerName', 'customerPhone', 'customerEmail', 'shippingAddress'];
      const missingFields = requiredFields.filter(field => !args[field] || args[field].trim() === '');
      
      if (missingFields.length > 0) {
        return {
          success: false,
          message: `Faltan campos requeridos: ${missingFields.join(', ')}. Por favor, proporciona todos los datos necesarios para procesar la compra.`
        };
      }

      // Buscar el producto por nombre
      const productos = productosService.getAllProductos().data;
      const producto = productos.find(p => 
        p.nombre.toLowerCase().includes(args.productName.toLowerCase()) &&
        p.categoria === 'Productos para Casa'
      );

      if (!producto) {
        return {
          success: false,
          message: `Producto "${args.productName}" no encontrado en productos para casa`
        };
      }

      // Verificar stock
      if (producto.stock < (args.quantity || 1)) {
        return {
          success: false,
          message: `No hay suficiente stock. Disponible: ${producto.stock} unidades`
        };
      }

      const salesService = require('./salesService');
      
      const saleData = {
        productId: producto.id.toString(),
        productName: producto.nombre,
        productCategory: producto.categoria,
        price: producto.precio,
        quantity: args.quantity || 1,
        customerName: args.customerName,
        customerEmail: args.customerEmail,
        customerPhone: args.customerPhone,
        saleType: 'product',
        paymentMethod: args.paymentMethod || 'card',
        paymentStatus: 'paid',
        notes: `Compra directa - Envío a: ${args.shippingAddress}. ${args.notes || ''}`
      };

      const result = salesService.createSale(saleData);
      
      if (result.success) {
        // Actualizar stock del producto
        producto.stock -= (args.quantity || 1);
        
        openaiLogger.info('Sale Created Successfully', {
          saleId: result.data.id,
          productName: producto.nombre,
          quantity: args.quantity || 1,
          customerName: args.customerName,
          totalAmount: result.data.totalAmount,
          timestamp: new Date().toISOString()
        });

        return {
          success: true,
          message: `✅ **Compra procesada exitosamente**\n\n` +
                   `**Detalles del pedido:**\n` +
                   `• Producto: ${producto.nombre}\n` +
                   `• Cantidad: ${args.quantity || 1}\n` +
                   `• Precio unitario: €${producto.precio}\n` +
                   `• Total: €${result.data.totalAmount}\n` +
                   `• Cliente: ${args.customerName}\n` +
                   `• Envío a: ${args.shippingAddress}\n\n` +
                   `**ID de pedido:** ${result.data.id.slice(0, 8)}...\n\n` +
                   `El producto será enviado en 2-3 días hábiles. Recibirás un email de confirmación.`,
          saleId: result.data.id
        };
      } else {
        return {
          success: false,
          message: `Error procesando la compra: ${result.message}`
        };
      }

    } catch (error) {
      openaiLogger.error('Create Sale Error', {
        error: error.message,
        args: args,
        timestamp: new Date().toISOString()
      });
      
      return {
        success: false,
        message: `Error procesando la compra: ${error.message}`
      };
    }
  }

  // Ejecutar búsqueda de slots disponibles
  async executeSearchAvailableSlots(args) {
    try {
      const ventanaCliente = {
        desde: this.parseDate(args.startDate),
        hasta: this.parseDate(args.endDate),
        franjas: args.timePreferences || ['mañana', 'tarde']
      };

      const profesionalPreferido = args.preferredProfessional ? 
        this.getProfessionalIdByName(args.preferredProfessional) : null;

      const resultado = await calendarService.buscarHuecos(
        args.serviceName,
        ventanaCliente,
        profesionalPreferido
      );

      if (!resultado.success) {
        return {
          success: false,
          message: resultado.message
        };
      }

      const opcionesFormateadas = resultado.opciones.map(opcion => {
        const inicio = new Date(opcion.slot.inicio);
        const fin = new Date(opcion.slot.fin);
        
        return {
          slotId: opcion.slot.id,
          fecha: inicio.toLocaleDateString('es-ES'),
          hora: inicio.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
          profesional: opcion.profesional.name,
          duracion: opcion.duracion,
          sala: opcion.slot.sala,
          score: Math.round(opcion.score)
        };
      });

      openaiLogger.info('Available Slots Found', {
        serviceName: args.serviceName,
        slotsFound: opcionesFormateadas.length,
        timestamp: new Date().toISOString()
      });

      let mensaje = `📅 **Horarios disponibles para ${args.serviceName}:**\n\n`;
      
      if (opcionesFormateadas.length === 0) {
        mensaje += `❌ No hay horarios disponibles en la fecha solicitada.\n\n`;
        mensaje += `💡 Te sugiero probar con otras fechas o contactar directamente al ${process.env.CLINIC_PHONE}`;
      } else {
        opcionesFormateadas.forEach((opcion, index) => {
          mensaje += `**${index + 1}.** ${opcion.fecha} a las ${opcion.hora}\n`;
          mensaje += `   👩‍⚕️ ${opcion.profesional} | 🏠 ${opcion.sala} | ⏱️ ${opcion.duracion} min\n\n`;
        });
        
        mensaje += `💡 **¿Te interesa alguno?** Solo dime el número y procederé a reservarlo temporalmente.`;
      }

      return {
        success: true,
        message: mensaje,
        slots: opcionesFormateadas
      };

    } catch (error) {
      openaiLogger.error('Search Available Slots Error', {
        error: error.message,
        args: args,
        timestamp: new Date().toISOString()
      });
      
      return {
        success: false,
        message: `Error buscando horarios disponibles: ${error.message}`
      };
    }
  }

  // Ejecutar reserva temporal de slot
  async executeReserveTemporarySlot(args) {
    try {
      const resultado = await slotManager.reservarTemporal(
        args.slotId,
        args.customerId,
        args.ttl || 300
      );

      if (!resultado.success) {
        return {
          success: false,
          message: resultado.message
        };
      }

      openaiLogger.info('Temporary Slot Reserved', {
        slotId: args.slotId,
        customerId: args.customerId,
        expiresIn: resultado.expiresIn,
        timestamp: new Date().toISOString()
      });

      return {
        success: true,
        message: `✅ **Slot reservado temporalmente**\n\n` +
                 `⏰ Tienes ${Math.floor(resultado.expiresIn / 60)} minutos para confirmar.\n` +
                 `📅 Expira: ${resultado.expiresAt}\n\n` +
                 `💡 **¿Confirmas esta cita?** Responde "sí" para proceder con la confirmación.`,
        expiresIn: resultado.expiresIn,
        expiresAt: resultado.expiresAt
      };

    } catch (error) {
      openaiLogger.error('Reserve Temporary Slot Error', {
        error: error.message,
        args: args,
        timestamp: new Date().toISOString()
      });
      
      return {
        success: false,
        message: `Error reservando slot temporal: ${error.message}`
      };
    }
  }

  // Ejecutar confirmación de cita
  async executeConfirmBooking(args) {
    try {
      // Primero confirmar la reserva temporal
      const confirmacionReserva = await slotManager.confirmarReserva(args.slotId, args.customerId);
      
      if (!confirmacionReserva.success) {
        return {
          success: false,
          message: confirmacionReserva.message
        };
      }

      // Obtener datos del slot
      const slotData = await this.getSlotData(args.slotId);
      if (!slotData) {
        return {
          success: false,
          message: 'No se encontraron datos del slot'
        };
      }

      // Crear la cita en el sistema
      const datosCita = {
        servicio: args.serviceName,
        cliente: {
          nombre: args.customerName,
          telefono: args.customerPhone,
          email: args.customerEmail || `${args.customerName.toLowerCase().replace(/\s+/g, '.')}@clinica.com`
        },
        fecha: slotData.inicio,
        hora: slotData.inicio,
        profesional: slotData.profesional,
        sala: slotData.sala,
        notas: args.notes || ''
      };

      const resultadoCita = await calendarService.confirmarCita(args.slotId, args.customerId, datosCita);
      
      if (!resultadoCita.success) {
        return {
          success: false,
          message: resultadoCita.message
        };
      }

      // Crear evento en Google Calendar si está configurado
      if (googleCalendarService.isGoogleCalendarConfigured()) {
        const eventoData = {
          summary: `${args.serviceName} - ${args.customerName}`,
          description: `Cita confirmada para ${args.serviceName}\nCliente: ${args.customerName}\nTeléfono: ${args.customerPhone}`,
          startTime: slotData.inicio,
          endTime: slotData.fin,
          location: process.env.CLINIC_ADDRESS,
          attendees: [{ email: datosCita.cliente.email }]
        };

        const eventoResultado = await googleCalendarService.createEvent(eventoData);
        if (eventoResultado.success) {
          openaiLogger.info('Google Calendar Event Created', {
            eventId: eventoResultado.eventId,
            slotId: args.slotId
          });
        }
      }

      openaiLogger.info('Booking Confirmed', {
        slotId: args.slotId,
        customerId: args.customerId,
        serviceName: args.serviceName,
        timestamp: new Date().toISOString()
      });

      const fechaFormateada = new Date(slotData.inicio).toLocaleDateString('es-ES');
      const horaFormateada = new Date(slotData.inicio).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

      return {
        success: true,
        message: `🎉 **¡Cita confirmada exitosamente!**\n\n` +
                 `📋 **Detalles de tu cita:**\n` +
                 `• Servicio: ${args.serviceName}\n` +
                 `• Fecha: ${fechaFormateada}\n` +
                 `• Hora: ${horaFormateada}\n` +
                 `• Profesional: ${slotData.profesional}\n` +
                 `• Sala: ${slotData.sala}\n` +
                 `• Cliente: ${args.customerName}\n` +
                 `• Teléfono: ${args.customerPhone}\n\n` +
                 `📍 **Ubicación:** ${process.env.CLINIC_ADDRESS}\n` +
                 `📞 **Teléfono:** ${process.env.CLINIC_PHONE}\n\n` +
                 `✅ Recibirás un email de confirmación con todos los detalles.`,
        bookingId: resultadoCita.cita.id
      };

    } catch (error) {
      openaiLogger.error('Confirm Booking Error', {
        error: error.message,
        args: args,
        timestamp: new Date().toISOString()
      });
      
      return {
        success: false,
        message: `Error confirmando cita: ${error.message}`
      };
    }
  }

  // Ejecutar obtención de estadísticas del calendario
  async executeGetCalendarStats() {
    try {
      const estadisticasCalendario = calendarService.getEstadisticas();
      const estadisticasSlots = slotManager.getEstadisticas();
      const configuracionGoogle = googleCalendarService.getConfiguration();

      const estadisticas = {
        calendario: estadisticasCalendario,
        slots: estadisticasSlots,
        googleCalendar: configuracionGoogle
      };

      openaiLogger.info('Calendar Stats Retrieved', {
        timestamp: new Date().toISOString()
      });

      return {
        success: true,
        message: `📊 **Estadísticas del Sistema de Calendario:**\n\n` +
                 `👩‍⚕️ **Profesionales:** ${estadisticasCalendario.profesionales}\n` +
                 `🏠 **Recursos:** ${estadisticasCalendario.recursos}\n` +
                 `⏰ **Reservas temporales:** ${estadisticasSlots.reservasActivas}\n` +
                 `✅ **Reservas confirmadas:** ${estadisticasSlots.reservasConfirmadas}\n` +
                 `📅 **Google Calendar:** ${configuracionGoogle.isConfigured ? 'Conectado' : 'No configurado'}`,
        stats: estadisticas
      };

    } catch (error) {
      openaiLogger.error('Get Calendar Stats Error', {
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      return {
        success: false,
        message: `Error obteniendo estadísticas: ${error.message}`
      };
    }
  }

  // Obtener datos de un slot específico
  async getSlotData(slotId) {
    // Esta función debería obtener los datos del slot desde el calendario
    // Por ahora simulamos con datos básicos
    return {
      id: slotId,
      inicio: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Mañana
      fin: new Date(Date.now() + 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(), // Mañana + 1 hora
      profesional: 'Ana García',
      sala: 'sala_1'
    };
  }

  // Obtener ID de profesional por nombre
  getProfessionalIdByName(nombre) {
    const profesionales = {
      'Ana García': 'prof_ana',
      'Laura Martínez': 'prof_laura',
      'Carmen López': 'prof_carmen'
    };
    
    return profesionales[nombre] || null;
  }

  // Procesar mensaje con resultado del clasificador híbrido
  async processWithHybridResult(message, hybridResult, conversationHistory = []) {
    try {
      const { intent, entities, confidence } = hybridResult;
      
      // Generar respuesta basada en el intent detectado
      let response = '';
      
      switch (intent) {
        case 'greeting':
          response = '¡Hola! Soy el asistente virtual de la clínica. ¿En qué puedo ayudarte hoy?';
          break;
        case 'services':
          response = 'Ofrecemos una amplia gama de servicios estéticos. ¿Te interesa algún tratamiento específico?';
          break;
        case 'booking':
          response = 'Perfecto, puedo ayudarte a agendar una cita. ¿Qué servicio te interesa?';
          break;
        case 'prices':
          response = 'Los precios varían según el tratamiento. ¿Hay algún servicio específico del que te gustaría conocer el precio?';
          break;
        case 'location':
          response = 'Estamos ubicados en [dirección]. ¿Te gustaría que te envíe la ubicación exacta?';
          break;
        case 'hours':
          response = 'Nuestros horarios son de lunes a viernes de 9:00 a 20:00 y sábados de 9:00 a 15:00.';
          break;
        case 'products':
          response = 'Tenemos productos de alta calidad disponibles para uso en casa. Te muestro las opciones:';
          break;
        case 'satisfaction':
          response = 'Valoramos mucho tu opinión. ¿Podrías contarme más sobre tu experiencia?';
          break;
        case 'human':
          response = 'Entiendo que prefieres hablar con una persona. Te voy a conectar con nuestro equipo.';
          break;
        default:
          response = 'Entiendo tu consulta. ¿Podrías ser más específico para poder ayudarte mejor?';
      }

      // Determinar si incluir productos
      const shouldInclude = this.shouldIncludeProducts(message, intent);
      const relatedProducts = shouldInclude ? this.getRelatedProducts(message) : [];

      return {
        response: response,
        intent: intent,
        entities: entities,
        confidence: confidence,
        relatedProducts: relatedProducts,
        method: 'hybrid'
      };

    } catch (error) {
      openaiLogger.error('Error procesando resultado híbrido:', error);
      return this.generateFallbackResponse(message);
    }
  }

  // Generar respuesta con tool-calling avanzado
  async generateResponseWithAdvancedTools(prompt, model) {
    try {
      const tools = this.toolCalling.getTools();
      
      const completion = await this.openai.chat.completions.create({
        model: model,
        messages: [{ role: 'user', content: prompt }],
        tools: tools,
        tool_choice: "auto",
        max_tokens: 500,
        temperature: 0.7
      });

      const message = completion.choices[0].message;
      
      return {
        content: message.content || 'No se pudo generar una respuesta.',
        tokensUsed: completion.usage?.total_tokens || 0,
        toolCalled: message.tool_calls ? message.tool_calls[0] : null,
        functionCalled: message.tool_calls ? message.tool_calls[0].function.name : null
      };

    } catch (error) {
      openaiLogger.error('Error generando respuesta con herramientas avanzadas:', error);
      throw error;
    }
  }

  // Manejar llamadas a herramientas avanzadas
  async handleAdvancedToolCalls(toolCalls, message, conversationHistory = []) {
    try {
      const results = [];
      
      for (const toolCall of toolCalls) {
        const { name, arguments: args } = toolCall.function;
        const parameters = JSON.parse(args);
        
        openaiLogger.info('Ejecutando herramienta avanzada', {
          function: name,
          parameters: parameters,
          timestamp: new Date().toISOString()
        });

        const result = await this.toolCalling.executeFunction(name, parameters);
        results.push(result);
      }

      // Generar respuesta basada en los resultados
      let responseContent = this.generateResponseFromToolResults(results);
      
      // Determinar si incluir productos
      const shouldInclude = this.shouldIncludeProducts(message, 'products');
      const relatedProducts = shouldInclude ? this.getRelatedProducts(message) : [];

      return {
        response: responseContent,
        intent: 'tool_execution',
        entities: [],
        confidence: 0.9,
        relatedProducts: relatedProducts,
        toolResults: results
      };

    } catch (error) {
      openaiLogger.error('Error manejando herramientas avanzadas:', error);
      return this.generateFallbackResponse(message);
    }
  }

  // Generar respuesta basada en resultados de herramientas
  generateResponseFromToolResults(results) {
    let response = '';
    
    results.forEach(result => {
      if (result.function === 'buscar_huecos') {
        if (result.result.success && result.result.candidatos.length > 0) {
          response += 'He encontrado los siguientes horarios disponibles:\n\n';
          result.result.candidatos.forEach((slot, index) => {
            response += `${index + 1}. ${slot.inicio} - ${slot.profesional} (${slot.sala})\n`;
          });
          response += '\n¿Cuál prefieres?';
        } else {
          response += 'No hay horarios disponibles en la ventana solicitada. ¿Te gustaría probar con otra fecha?';
        }
      } else if (result.function === 'reservar_cita') {
        if (result.result.success) {
          response += `✅ Cita reservada exitosamente!\nID de cita: ${result.result.cita_id}`;
        } else {
          response += `❌ No se pudo reservar la cita: ${result.result.error}`;
        }
      } else if (result.function === 'obtener_servicios') {
        if (result.result.success) {
          response += 'Estos son nuestros servicios disponibles:\n\n';
          result.result.servicios.forEach(service => {
            response += `• ${service.nombre} (${service.duracion} min)`;
            if (service.precio) response += ` - €${service.precio}`;
            response += '\n';
          });
        }
      } else if (result.function === 'obtener_profesionales') {
        if (result.result.success) {
          response += 'Nuestros profesionales:\n\n';
          result.result.profesionales.forEach(prof => {
            response += `• ${prof.nombre} - Especialidades: ${prof.especialidades.join(', ')}\n`;
          });
        }
      } else {
        response += result.result.success ? 
          `✅ ${result.result.mensaje || 'Operación completada exitosamente'}` :
          `❌ ${result.result.error || 'Error en la operación'}`;
      }
    });

    return response || 'He procesado tu solicitud. ¿Hay algo más en lo que pueda ayudarte?';
  }

  // Obtener estadísticas del sistema híbrido
  getHybridStats() {
    return {
      hybridClassifier: this.hybridClassifier.getStats(),
      toolCalling: this.toolCalling.getStats(),
      openai: {
        available: this.isOpenAIAvailable,
        lastError: this.lastErrorTime,
        model: this.model,
        fallbackModel: this.fallbackModel
      }
    };
  }
}

module.exports = new OpenAIService();