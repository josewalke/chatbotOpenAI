const OpenAI = require('openai');
const dotenv = require('dotenv');
const winston = require('winston');
const productosService = require('./productosService');
const bookingService = require('./bookingService');
const calendarService = require('./calendarService');
const slotManager = require('./slotManager');
const googleCalendarService = require('./googleCalendarService');
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
    this.fallbackModel = 'gpt-4o'; // Modelo de respaldo para casos críticos
    this.isOpenAIAvailable = true; // Flag para controlar disponibilidad
    this.lastErrorTime = null; // Para implementar retry con backoff
    
    // Inicializar servicios de herramientas
    this.toolCalling = new AdvancedToolCalling();
    
    openaiLogger.info('OpenAI Service inicializado correctamente');
  }

  // Prompt del sistema para el asistente de la clínica
  getSystemPrompt() {
    return `Eres un asistente virtual profesional de ${process.env.CLINIC_NAME}. Tu objetivo es proporcionar información útil, agendar citas y ayudar a los clientes de manera natural y conversacional.

INFORMACIÓN DE LA CLÍNICA:
- Nombre: ${process.env.CLINIC_NAME}
- Dirección: ${process.env.CLINIC_ADDRESS}
- Teléfono: ${process.env.CLINIC_PHONE}
- Email: ${process.env.CLINIC_EMAIL}

SERVICIOS DISPONIBLES:
${this.getProductosInfo()}

INSTRUCCIONES:
1. Responde de manera natural, amigable y profesional
2. Usa un tono conversacional, como si fueras un recepcionista experto
3. Proporciona información específica cuando sea relevante
4. Si no sabes algo, admítelo honestamente y ofrece alternativas
5. Mantén las respuestas concisas pero informativas
6. Usa emojis ocasionalmente para hacer la conversación más amigable
7. Siempre pregunta si hay algo más en lo que puedas ayudar

IMPORTANTE: 
- NO uses respuestas predefinidas o genéricas
- Genera respuestas únicas y contextuales para cada consulta
- Adapta tu respuesta al tono y contexto de la conversación
- Sé específico con información cuando sea relevante

CAPACIDADES:
- Información sobre tratamientos y productos
- Agendar citas para tratamientos
- Procesar compras de productos
- Responder preguntas sobre ubicación y horarios
- Proporcionar cuidados e instrucciones de uso
- Manejar quejas y solicitudes de contacto humano

GESTIÓN DEL CARRITO:
- Cuando el cliente pregunte sobre productos en su carrito, usa la función 'consultar_carrito'
- Para agregar productos al carrito, usa 'agregar_al_carrito'
- Para remover productos del carrito, usa 'remover_del_carrito'
- Para limpiar el carrito, usa 'limpiar_carrito'

GESTIÓN DE SERVICIOS:
- Cuando el cliente pregunte sobre servicios disponibles, usa 'obtener_servicios_interactivos'
- Para agendar una cita, usa 'agendar_cita'
- Esto mostrará los servicios como tarjetas interactivas con botones para agendar

EJEMPLOS DE CONSULTAS DEL CARRITO:
- "¿Qué productos tengo en el carrito?" → consultar_carrito
- "¿Cuántos productos tengo?" → consultar_carrito
- "¿Cuál es el total de mi carrito?" → consultar_carrito
- "Agrega [producto] al carrito" → agregar_al_carrito
- "Remueve [producto] del carrito" → remover_del_carrito
- "Limpia mi carrito" → limpiar_carrito

EJEMPLOS DE CONSULTAS DE SERVICIOS:
- "¿Qué servicios ofrecen?" → obtener_servicios_interactivos
- "¿Qué tratamientos tienen?" → obtener_servicios_interactivos
- "Agenda una cita para [servicio]" → agendar_cita`;
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

  // Determinar si debe incluir productos relacionados
  shouldIncludeProducts(message, intent) {
    const lowerMessage = message.toLowerCase();
    
    // Incluir productos para consultas sobre servicios, tratamientos, productos
    const productIntents = ['services', 'products', 'treatments', 'catalog'];
    const hasProductIntent = productIntents.includes(intent);
    
    // Incluir productos si el mensaje contiene palabras clave relacionadas
    const productKeywords = ['servicio', 'tratamiento', 'producto', 'catalogo', 'precio', 'costo'];
    const hasProductKeywords = productKeywords.some(keyword => 
      lowerMessage.includes(keyword)
    );
    
    openaiLogger.info('Product inclusion check', {
      message: lowerMessage,
      intent: intent,
      hasProductIntent: hasProductIntent,
      hasProductKeywords: hasProductKeywords,
      shouldInclude: hasProductIntent || hasProductKeywords,
      timestamp: new Date().toISOString()
    });
    
    return hasProductIntent || hasProductKeywords;
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

  async processMessage(userMessage, conversationHistory = [], sessionId = null) {
    try {
      // Intentar reconectar si OpenAI no está disponible
      if (!this.isOpenAIAvailable) {
        const reconnected = await this.retryOpenAIConnection();
        if (!reconnected) {
          openaiLogger.warn('OpenAI unavailable - using fallback system', {
            message: userMessage,
            timestamp: new Date().toISOString()
          });
          // Usar sistema de respaldo en lugar de lanzar error
          return await this.processMessageWithFallback(userMessage, conversationHistory, sessionId);
        }
      }

      // Usar solo OpenAI para todas las respuestas
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
        response = await this.generateResponseWithAdvancedTools(fullPrompt, this.model, sessionId);
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
        response = await this.generateResponseWithAdvancedTools(fullPrompt, this.fallbackModel, sessionId);
        openaiLogger.info('Fallback Response Generated', {
          model: this.fallbackModel,
          tokensUsed: response.tokensUsed,
          functionCalled: response.functionCalled,
          timestamp: new Date().toISOString()
        });
      }

      // Si se llamó a una función, no ejecutarla nuevamente ya que se ejecutó en AdvancedToolCalling
      // Solo agregar información adicional si es necesario
      if (response.functionCalled && response.toolResults && response.toolResults.length > 0) {
        const functionResult = response.toolResults.find(r => r.function === response.functionCalled);
        if (functionResult && functionResult.result && functionResult.result.success) {
          // La función ya se ejecutó correctamente, no hacer nada más
        } else if (functionResult && functionResult.error) {
          response.content += `\n\n⚠️ **Error: ${functionResult.error}**`;
        }
      }

      // Determinar si incluir productos relacionados
      let relatedProducts = [];
      const shouldIncludeProducts = this.shouldIncludeProducts(userMessage, analysis.intent);
      
      // No incluir productos relacionados si se ejecutó una función del carrito o servicios
      const functionName = response.functionCalled;
      const isCartFunction = functionName && ['agregar_al_carrito', 'consultar_carrito', 'remover_del_carrito', 'limpiar_carrito'].includes(functionName);
      const isServicesFunction = functionName === 'obtener_servicios_interactivos';
      
      // También verificar si se ejecutó obtener_servicios_interactivos o agendar_cita a través de toolResults
      const hasServicesInToolResults = response.toolResults && response.toolResults.some(r => r.function === 'obtener_servicios_interactivos');
      const hasBookingInToolResults = response.toolResults && response.toolResults.some(r => r.function === 'agendar_cita');
      
      if (shouldIncludeProducts && !isCartFunction && !isServicesFunction && !hasServicesInToolResults && !hasBookingInToolResults) {
        relatedProducts = this.getRelatedProducts(userMessage);
        openaiLogger.info('Products included in response', {
          shouldInclude: shouldIncludeProducts,
          productsCount: relatedProducts.length,
          timestamp: new Date().toISOString()
        });
      }
      
      // Si es función de servicios interactivos, agregar servicios como productos relacionados
      if ((isServicesFunction || hasServicesInToolResults) && response.toolResults && response.toolResults.length > 0) {
        const servicesResult = response.toolResults.find(r => r.function === 'obtener_servicios_interactivos');
        if (servicesResult && servicesResult.result.success) {
          relatedProducts = servicesResult.result.servicios.map(service => ({
            id: service.id,
            nombre: service.nombre,
            descripcion: service.descripcion,
            precio: service.precio,
            duracion: service.duracion,
            categoria: service.categoria,
            tipo: 'servicio'
          }));
          openaiLogger.info('Services included as related products', {
            servicesCount: relatedProducts.length,
            timestamp: new Date().toISOString()
          });
        }
      }

      // Generar respuesta simplificada si hay productos relacionados
      let finalResponseContent = response.content;
      if (relatedProducts && relatedProducts.length > 0 && !isCartFunction && !isServicesFunction && !hasServicesInToolResults && !hasBookingInToolResults) {
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
        functionCalled: response.functionCalled,
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

      // Si es error de cuota, usar sistema de respaldo
      if (this.isOpenAIQuotaExceeded(error)) {
        this.isOpenAIAvailable = false;
        this.lastErrorTime = new Date();
        
        openaiLogger.warn('OpenAI quota exceeded - using fallback system', {
          error: error.message,
          timestamp: new Date().toISOString()
        });
        
        // Usar sistema de respaldo
        return await this.processMessageWithFallback(userMessage, conversationHistory, sessionId);
      }

      throw new Error('Error al procesar el mensaje con IA');
    }
  }

  // Sistema de respaldo cuando OpenAI no está disponible
  async processMessageWithFallback(userMessage, conversationHistory = [], sessionId = null) {
    try {
      console.log('DEBUG: Procesando mensaje con fallback:', userMessage);
      const lowerMessage = userMessage.toLowerCase();
      
      // Detectar intención básica sin IA
      let intent = 'general';
      let response = '';
      let relatedProducts = [];
      
      // Detectar solicitud de agendamiento (debe mostrar servicios primero)
      if (lowerMessage.includes('quiero agendar') || lowerMessage.includes('quiero reservar') || 
               lowerMessage.includes('agendar una cita') || lowerMessage.includes('reservar una cita') ||
               lowerMessage.includes('necesito una cita') || lowerMessage.includes('busco una cita')) {
        intent = 'info_servicios';
        response = '¡Perfecto! Te muestro nuestros servicios disponibles. Puedes hacer clic en "Agendar Cita" para reservar el que más te interese:';
        
        const productosService = require('./productosService');
        const categorias = productosService.getCategorias();
        
        const servicios = [];
        
        categorias.data.forEach(categoria => {
          if (categoria !== 'Productos para Casa') {
            const productos = productosService.getProductosByCategoria(categoria);
            productos.data.forEach(servicio => {
              servicios.push({
                id: servicio.id.toString(),
                nombre: servicio.nombre,
                precio: servicio.precio,
                categoria: servicio.categoria,
                descripcion: servicio.descripcion,
                duracion: servicio.duracion,
                tipo: 'servicio'
              });
            });
          }
        });
        
        relatedProducts = servicios;
      }
      // Detectar consultas sobre servicios
      else if (lowerMessage.includes('servicios') || lowerMessage.includes('tratamientos') || lowerMessage.includes('ofrecen')) {
        intent = 'info_servicios';
        response = '¡Perfecto! Te muestro nuestros servicios disponibles. Puedes hacer clic en "Agendar Cita" para reservar el que más te interese:';
        
        // Obtener servicios de la base de datos
        const productosService = require('./productosService');
        const categorias = productosService.getCategorias();
        
        let servicios = [];
        categorias.data.forEach(cat => {
          if (cat !== 'Productos para Casa') {
            const productos = productosService.getProductosByCategoria(cat);
            productos.data.forEach(producto => {
              servicios.push({
                id: producto.id.toString(),
                nombre: producto.nombre,
                duracion: producto.duracion,
                precio: producto.precio,
                categoria: producto.categoria,
                descripcion: producto.descripcion,
                tipo: 'servicio'
              });
            });
          }
        });
        
        relatedProducts = servicios;
      }
      // Detectar consultas sobre productos
      else if (lowerMessage.includes('productos') || lowerMessage.includes('comprar') || lowerMessage.includes('carrito')) {
        intent = 'info_productos';
        response = 'Te muestro nuestros productos disponibles para uso en casa:\n\n';
        
        const productosService = require('./productosService');
        const productos = productosService.getProductosByCategoria('Productos para Casa');
        
        productos.data.forEach(producto => {
          response += `• ${producto.nombre} - ${producto.precio}€\n`;
          relatedProducts.push({
            id: producto.id.toString(),
            nombre: producto.nombre,
            precio: producto.precio,
            categoria: producto.categoria,
            descripcion: producto.descripcion,
            tipo: 'producto'
          });
        });
      }
      // Detectar información completa de cita (formato estructurado)
      else if (lowerMessage.includes('confirmo mi cita') || lowerMessage.includes('datos:') || 
               lowerMessage.includes('fecha:') || lowerMessage.includes('hora:') ||
               lowerMessage.includes('nombre:') || lowerMessage.includes('teléfono:') ||
               lowerMessage.includes('email:') || lowerMessage.includes('correo:')) {
        console.log('DEBUG: Detectando información completa de cita');
        intent = 'info_cita';
        response = `### Resumen de tu cita\n\n`;
        response += `**Información recibida:**\n\n`;
        
        // Extraer información del mensaje estructurado
        let nombre = 'No proporcionado';
        let telefono = 'No proporcionado';
        let email = 'No proporcionado';
        let fecha = 'Por confirmar';
        let hora = 'Por confirmar';
        
        // Detectar nombre
        const nombreMatch = lowerMessage.match(/(?:nombre|name):\s*([a-zA-Z\s]+)/i);
        if (nombreMatch) nombre = nombreMatch[1].trim();
        
        // Detectar teléfono
        const telefonoMatch = lowerMessage.match(/(?:teléfono|telefono|tel|phone):\s*([0-9\s\-+]+)/i);
        if (telefonoMatch) telefono = telefonoMatch[1].trim();
        
        // Detectar email
        const emailMatch = lowerMessage.match(/(?:email|correo|mail):\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
        if (emailMatch) email = emailMatch[1].trim();
        
        // Detectar fecha
        const fechaMatch = lowerMessage.match(/(?:fecha|date):\s*([0-9\-/]+)/i);
        if (fechaMatch) {
          const fechaStr = fechaMatch[1].trim();
          // Convertir formato YYYY-MM-DD a formato legible
          if (fechaStr.includes('-')) {
            const [year, month, day] = fechaStr.split('-');
            fecha = `${day}/${month}/${year}`;
          } else {
            fecha = fechaStr;
          }
        }
        
        // Detectar hora
        const horaMatch = lowerMessage.match(/(?:hora|time):\s*([0-9:]+)/i);
        if (horaMatch) hora = horaMatch[1].trim();
        
        response += `- **Nombre:** ${nombre}\n`;
        response += `- **Teléfono:** ${telefono}\n`;
        response += `- **Email:** ${email}\n`;
        response += `- **Fecha:** ${fecha}\n`;
        response += `- **Hora:** ${hora}\n\n`;
        
        // Verificar si falta información importante
        const faltaInformacion = nombre === 'No proporcionado' || telefono === 'No proporcionado';
        
        // Generar ID de cita único (siempre)
        const citaId = `cita_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        if (faltaInformacion) {
          response += `**Para completar tu reserva, necesito:**\n\n`;
          if (nombre === 'No proporcionado') {
            response += `- **Tu nombre completo**\n`;
          }
          if (telefono === 'No proporcionado') {
            response += `- **Tu número de teléfono**\n`;
          }
          response += `\n¿Podrías proporcionarme esta información?`;
        } else {
          response += `### ¡Cita confirmada!\n\n`;
          response += `**Detalles de tu cita:**\n\n`;
          response += `- **ID de reserva:** \`${citaId}\`\n`;
          response += `- **Servicio:** Servicio seleccionado\n`;
          response += `- **Precio:** Por confirmar\n`;
          response += `- **Duración:** Por confirmar\n`;
          response += `- **Fecha:** ${fecha}\n`;
          response += `- **Hora:** ${hora}\n\n`;
          response += `**Próximos pasos:**\n\n`;
          response += `- Nuestro equipo te contactará en las próximas 24 horas\n`;
          response += `- Confirmaremos la fecha y hora exacta\n`;
          response += `- Te enviaremos un recordatorio 24h antes\n\n`;
          response += `¿Te gustaría agendar otra cita o necesitas ayuda con algo más?`;
        }
        
        // Buscar información del servicio para obtener precio y duración dinámicamente
        let servicioInfo = null;
        const productosService = require('./productosService');
        const categorias = productosService.getCategorias();
        for (const categoria of categorias.data) {
          if (categoria !== 'Productos para Casa') {
            const productos = productosService.getProductosByCategoria(categoria);
            for (const producto of productos.data) {
              if (lowerMessage.includes(producto.nombre.toLowerCase()) || response.includes(producto.nombre)) {
                servicioInfo = producto;
                break;
              }
            }
            if (servicioInfo) break;
          }
        }
        
        const nombreServicio = servicioInfo ? servicioInfo.nombre : 'Servicio seleccionado';
        const precioServicio = servicioInfo ? `${servicioInfo.precio}€` : 'Por confirmar';
        const duracionServicio = servicioInfo ? `${servicioInfo.duracion} minutos` : 'Por confirmar';
        
        // Actualizar respuesta con información del servicio si está disponible
        if (servicioInfo && !faltaInformacion) {
          response = response.replace('Servicio seleccionado', nombreServicio);
          response = response.replace('Por confirmar', precioServicio);
          response = response.replace('Por confirmar', duracionServicio);
        }
        
        // Simular datos de cita para el frontend
        relatedProducts = [{
          id: citaId,
          nombre: nombreServicio,
          tipo: faltaInformacion ? 'cita_parcial' : 'cita_confirmada',
          fecha: fecha,
          hora: hora,
          nombreCliente: nombre,
          telefono: telefono,
          email: email,
          precio: precioServicio,
          duracion: duracionServicio
        }];
      }
      // Detectar información de cita (nombre, teléfono, email, fecha, hora)
      else if (lowerMessage.includes('mi nombre es') || lowerMessage.includes('me llamo') || 
               lowerMessage.includes('mi teléfono es') || lowerMessage.includes('mi número es') ||
               lowerMessage.includes('mi email es') || lowerMessage.includes('mi correo es') ||
               lowerMessage.includes('prefiero') || lowerMessage.includes('me viene bien') ||
               lowerMessage.includes('el próximo') || lowerMessage.includes('la próxima') ||
               lowerMessage.includes('por la mañana') || lowerMessage.includes('por la tarde') ||
               lowerMessage.includes('después de las') || lowerMessage.includes('antes de las') ||
               lowerMessage.includes('martes') || lowerMessage.includes('miércoles') || 
               lowerMessage.includes('jueves') || lowerMessage.includes('viernes') ||
               lowerMessage.includes('sábado') || lowerMessage.includes('domingo') ||
               lowerMessage.includes('lunes') || lowerMessage.includes('a las') ||
               lowerMessage.includes('lo quiero el') || lowerMessage.includes('lo quiero la') ||
               lowerMessage.includes('5pm') || lowerMessage.includes('6pm') ||
               lowerMessage.includes('4pm') || lowerMessage.includes('3pm') ||
               lowerMessage.includes('2pm') || lowerMessage.includes('1pm') ||
               lowerMessage.includes('12pm') || lowerMessage.includes('11am') ||
               lowerMessage.includes('10am') || lowerMessage.includes('9am') ||
               lowerMessage.includes('8am') || lowerMessage.includes('7am')) {
        intent = 'info_cita';
        response = `🎊 **¡Perfecto! Información recibida** 🎊\n\n`;
        response += `✨ Déjame confirmar todos los detalles que me has proporcionado:\n\n`;
        
        // Extraer información del mensaje
        let nombre = 'No proporcionado';
        let telefono = 'No proporcionado';
        let email = 'No proporcionado';
        let fecha = 'Por confirmar';
        let hora = 'Por confirmar';
        
        // Detectar nombre
        if (lowerMessage.includes('mi nombre es') || lowerMessage.includes('me llamo')) {
          const nombreMatch = lowerMessage.match(/(?:mi nombre es|me llamo)\s+([a-zA-Z\s]+)/);
          if (nombreMatch) nombre = nombreMatch[1].trim();
        }
        
        // Detectar teléfono
        if (lowerMessage.includes('mi teléfono es') || lowerMessage.includes('mi número es')) {
          const telefonoMatch = lowerMessage.match(/(?:mi teléfono es|mi número es)\s+([0-9\s\-\+\(\)]+)/);
          if (telefonoMatch) telefono = telefonoMatch[1].trim();
        }
        
        // Detectar email
        if (lowerMessage.includes('mi email es') || lowerMessage.includes('mi correo es')) {
          const emailMatch = lowerMessage.match(/(?:mi email es|mi correo es)\s+([a-zA-Z0-9@\.\-_]+)/);
          if (emailMatch) email = emailMatch[1].trim();
        }
        
        // Detectar fecha
        if (lowerMessage.includes('martes')) {
          fecha = 'Martes';
        } else if (lowerMessage.includes('miércoles')) {
          fecha = 'Miércoles';
        } else if (lowerMessage.includes('jueves')) {
          fecha = 'Jueves';
        } else if (lowerMessage.includes('viernes')) {
          fecha = 'Viernes';
        } else if (lowerMessage.includes('sábado')) {
          fecha = 'Sábado';
        } else if (lowerMessage.includes('domingo')) {
          fecha = 'Domingo';
        } else if (lowerMessage.includes('lunes')) {
          fecha = 'Lunes';
        } else if (lowerMessage.includes('el próximo') || lowerMessage.includes('la próxima')) {
          fecha = 'Próxima semana';
        } else if (lowerMessage.includes('mañana')) {
          fecha = 'Mañana';
        } else if (lowerMessage.includes('hoy')) {
          fecha = 'Hoy';
        }
        
        // Detectar hora
        if (lowerMessage.includes('5pm')) {
          hora = '17:00 (5:00 PM)';
        } else if (lowerMessage.includes('6pm')) {
          hora = '18:00 (6:00 PM)';
        } else if (lowerMessage.includes('4pm')) {
          hora = '16:00 (4:00 PM)';
        } else if (lowerMessage.includes('3pm')) {
          hora = '15:00 (3:00 PM)';
        } else if (lowerMessage.includes('2pm')) {
          hora = '14:00 (2:00 PM)';
        } else if (lowerMessage.includes('1pm')) {
          hora = '13:00 (1:00 PM)';
        } else if (lowerMessage.includes('12pm')) {
          hora = '12:00 (12:00 PM)';
        } else if (lowerMessage.includes('11am')) {
          hora = '11:00 (11:00 AM)';
        } else if (lowerMessage.includes('10am')) {
          hora = '10:00 (10:00 AM)';
        } else if (lowerMessage.includes('9am')) {
          hora = '09:00 (9:00 AM)';
        } else if (lowerMessage.includes('8am')) {
          hora = '08:00 (8:00 AM)';
        } else if (lowerMessage.includes('7am')) {
          hora = '07:00 (7:00 AM)';
        } else if (lowerMessage.includes('a las')) {
          const horaMatch = lowerMessage.match(/a las\s+(\d+)/);
          if (horaMatch) hora = `${horaMatch[1]}:00`;
        } else if (lowerMessage.includes('por la mañana')) {
          hora = 'Por la mañana';
        } else if (lowerMessage.includes('por la tarde')) {
          hora = 'Por la tarde';
        } else if (lowerMessage.includes('después de las')) {
          const horaMatch = lowerMessage.match(/después de las\s+(\d+)/);
          if (horaMatch) hora = `Después de las ${horaMatch[1]}:00`;
        } else if (lowerMessage.includes('antes de las')) {
          const horaMatch = lowerMessage.match(/antes de las\s+(\d+)/);
          if (horaMatch) hora = `Antes de las ${horaMatch[1]}:00`;
        }
        
        response += `### Resumen de tu cita\n\n`;
        response += `**Información recibida:**\n\n`;
        response += `- **Nombre:** ${nombre === 'No proporcionado' ? 'Pendiente' : nombre}\n`;
        response += `- **Teléfono:** ${telefono === 'No proporcionado' ? 'Pendiente' : telefono}\n`;
        response += `- **Email:** ${email === 'No proporcionado' ? 'Opcional' : email}\n`;
        response += `- **Fecha:** ${fecha === 'Por confirmar' ? 'Pendiente' : fecha}\n`;
        response += `- **Hora:** ${hora === 'Por confirmar' ? 'Pendiente' : hora}\n\n`;
        
        // Verificar si falta información importante
        const faltaInformacion = nombre === 'No proporcionado' || telefono === 'No proporcionado';
        
        if (faltaInformacion) {
          response += `**Para completar tu reserva, necesito:**\n\n`;
          if (nombre === 'No proporcionado') {
            response += `- **Tu nombre completo**\n`;
          }
          if (telefono === 'No proporcionado') {
            response += `- **Tu número de teléfono**\n`;
          }
          response += `\n¿Podrías proporcionarme esta información?`;
        } else {
          // Generar ID de cita único
          const citaId = `cita_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          
          response += `### ¡Cita confirmada!\n\n`;
          response += `**Detalles de tu cita:**\n\n`;
          response += `- **ID de reserva:** \`${citaId}\`\n`;
          response += `- **Servicio:** ${nombreServicio}\n`;
          response += `- **Precio:** ${precioServicio}\n`;
          response += `- **Duración:** ${duracionServicio}\n`;
          response += `- **Fecha:** ${fecha}\n`;
          response += `- **Hora:** ${hora}\n\n`;
          response += `**Próximos pasos:**\n\n`;
          response += `- Nuestro equipo te contactará en las próximas 24 horas\n`;
          response += `- Confirmaremos la fecha y hora exacta\n`;
          response += `- Te enviaremos un recordatorio 24h antes\n\n`;
          response += `¿Te gustaría agendar otra cita o necesitas ayuda con algo más?`;
        }
        
        // Buscar información del servicio para obtener precio y duración dinámicamente
        let servicioInfo = null;
        const productosService = require('./productosService');
        const categorias = productosService.getCategorias();
        
        for (const categoria of categorias.data) {
          if (categoria !== 'Productos para Casa') {
            const productos = productosService.getProductosByCategoria(categoria);
            for (const producto of productos.data) {
              if (lowerMessage.includes(producto.nombre.toLowerCase()) || 
                  response.includes(producto.nombre)) {
                servicioInfo = producto;
                break;
              }
            }
            if (servicioInfo) break;
          }
        }
        
        // Usar información del servicio encontrado o valores por defecto
        const nombreServicio = servicioInfo ? servicioInfo.nombre : 'Servicio seleccionado';
        const precioServicio = servicioInfo ? `${servicioInfo.precio}€` : 'Por confirmar';
        const duracionServicio = servicioInfo ? `${servicioInfo.duracion} minutos` : 'Por confirmar';
        
        // Simular datos de cita
        const citaId = `cita_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        relatedProducts = [{
          id: citaId,
          nombre: nombreServicio,
          tipo: faltaInformacion ? 'cita_parcial' : 'cita_confirmada',
          estado: faltaInformacion ? 'pendiente_informacion' : 'pendiente_confirmacion_final',
          fecha: fecha,
          hora: hora,
          precio: precioServicio,
          duracion: duracionServicio
        }];
      }
      // Detectar agendamiento de citas (solo si no es información completa)
      else if ((lowerMessage.includes('agendar') || lowerMessage.includes('cita')) && 
               !lowerMessage.includes('confirmo mi cita') && 
               !lowerMessage.includes('datos:')) {
        intent = 'agendar_cita';
        
        // Extraer nombre del servicio del mensaje
        let servicioNombre = 'servicio seleccionado';
        const productosService = require('./productosService');
        const categorias = productosService.getCategorias();
        
        // Buscar el servicio mencionado en el mensaje
        for (const categoria of categorias.data) {
          if (categoria !== 'Productos para Casa') {
            const productos = productosService.getProductosByCategoria(categoria);
            for (const producto of productos.data) {
              if (lowerMessage.includes(producto.nombre.toLowerCase())) {
                servicioNombre = producto.nombre;
                break;
              }
            }
            if (servicioNombre !== 'servicio seleccionado') break;
          }
        }
        
        // Generar ID de cita único
        const citaId = `cita_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        response = `### ¡Excelente elección!\n\n`;
        response += `Me encanta que hayas elegido el **${servicioNombre}**.\n`;
        response += `Es uno de nuestros tratamientos más populares y efectivos.\n\n`;
        response += `Para confirmar tu cita, necesito los siguientes datos:\n\n`;
        response += `1. **Fecha preferida**\n`;
        response += `   Ejemplo: "el próximo martes" o "la semana que viene".\n\n`;
        response += `2. **Hora preferida**\n`;
        response += `   Ejemplo: "por la mañana" o "después de las 17:00".\n\n`;
        response += `3. **Nombre completo**\n`;
        response += `   Ejemplo: María García López.\n\n`;
        response += `4. **Número de teléfono**\n`;
        response += `   Ejemplo: 666 123 456.\n\n`;
        response += `5. **Correo electrónico (opcional)**\n`;
        response += `   Ejemplo: maria@email.com.\n\n`;
        response += `---\n\n`;
        response += `Puedes enviarme toda la información en un solo mensaje\n`;
        response += `o paso a paso, como prefieras.\n\n`;
        response += `---\n\n`;
        response += `¿Por dónde empezamos?`;
        
        // Simular datos de cita para el frontend
        relatedProducts = [{
          id: citaId,
          nombre: servicioNombre,
          tipo: 'cita_agendada',
          estado: 'pendiente_confirmacion',
          fecha: 'Por confirmar',
          hora: 'Por confirmar'
        }];
      }
      // Detectar consultas sobre ubicación
      else if (lowerMessage.includes('ubicados') || lowerMessage.includes('ubicación') || 
               lowerMessage.includes('dirección') || lowerMessage.includes('direccion') ||
               lowerMessage.includes('donde están') || lowerMessage.includes('donde estan') ||
               lowerMessage.includes('localización') || lowerMessage.includes('localizacion') ||
               lowerMessage.includes('encontrar') || lowerMessage.includes('llegar')) {
        intent = 'info_ubicacion';
        response = '📍 **¡Te ayudo con la ubicación!**\n\n';
        response += `**${process.env.CLINIC_NAME}**\n\n`;
        response += `🏢 **Dirección:**\n`;
        response += `   ${process.env.CLINIC_ADDRESS}\n\n`;
        response += `📞 **Teléfono:**\n`;
        response += `   ${process.env.CLINIC_PHONE}\n\n`;
        response += `📧 **Email:**\n`;
        response += `   ${process.env.CLINIC_EMAIL}\n\n`;
        response += `🕒 **Horarios de Atención:**\n`;
        response += `   Lunes a Viernes: 9:00 - 20:00\n`;
        response += `   Sábados: 9:00 - 15:00\n`;
        response += `   Domingos: Cerrado\n\n`;
        response += `🚗 **Cómo llegar:**\n`;
        response += `   • En coche: Parking gratuito disponible\n`;
        response += `   • Transporte público: Parada de metro/bus a 5 minutos\n`;
        response += `   • Accesibilidad: Instalaciones adaptadas\n\n`;
        response += `¿Necesitas ayuda con algo más? 😊`;
      }
      // Detectar consultas sobre horarios
      else if (lowerMessage.includes('horarios') || lowerMessage.includes('horario') ||
               lowerMessage.includes('abierto') || lowerMessage.includes('cerrado') ||
               lowerMessage.includes('cuando abren') || lowerMessage.includes('cuando cierran')) {
        intent = 'info_horarios';
        response = '🕒 **Horarios de Atención**\n\n';
        response += `**${process.env.CLINIC_NAME}**\n\n`;
        response += `📅 **Horarios:**\n`;
        response += `   • Lunes a Viernes: 9:00 - 20:00\n`;
        response += `   • Sábados: 9:00 - 15:00\n`;
        response += `   • Domingos: Cerrado\n\n`;
        response += `📞 **Para citas fuera de horario:**\n`;
        response += `   Contacta con nosotros al ${process.env.CLINIC_PHONE}\n`;
        response += `   o envía un email a ${process.env.CLINIC_EMAIL}\n\n`;
        response += `¿Te gustaría agendar una cita? 😊`;
      }
      // Detectar consultas sobre contacto
      else if (lowerMessage.includes('contacto') || lowerMessage.includes('teléfono') ||
               lowerMessage.includes('telefono') || lowerMessage.includes('llamar') ||
               lowerMessage.includes('email') || lowerMessage.includes('correo')) {
        intent = 'info_contacto';
        response = '📞 **Información de Contacto**\n\n';
        response += `**${process.env.CLINIC_NAME}**\n\n`;
        response += `📱 **Teléfono:**\n`;
        response += `   ${process.env.CLINIC_PHONE}\n\n`;
        response += `📧 **Email:**\n`;
        response += `   ${process.env.CLINIC_EMAIL}\n\n`;
        response += `🏢 **Dirección:**\n`;
        response += `   ${process.env.CLINIC_ADDRESS}\n\n`;
        response += `💬 **También puedes:**\n`;
        response += `   • Agendar citas online aquí mismo\n`;
        response += `   • Consultar nuestros servicios\n`;
        response += `   • Ver productos para casa\n\n`;
        response += `¿En qué más puedo ayudarte? 😊`;
      }
      // Respuesta general
      else {
        response = '🌟 **¡Hola! Bienvenido/a a Clínica Estética Demo** 🌟\n\n';
        response += '✨ Soy tu asistente virtual personal y estoy aquí para ayudarte con:\n\n';
        response += '🎯 **📅 Servicios y Tratamientos**\n';
        response += '   💫 Información detallada sobre todos nuestros tratamientos\n\n';
        response += '🛍️ **🏠 Productos para Casa**\n';
        response += '   💫 Productos profesionales para el cuidado en casa\n\n';
        response += '📞 **📅 Agendar Citas**\n';
        response += '   💫 Reserva tu cita de forma rápida y fácil\n\n';
        response += 'ℹ️ **📋 Información General**\n';
        response += '   💫 Todo lo que necesitas saber sobre nuestra clínica\n\n';
        response += '🎊 **¿En qué puedo ayudarte hoy?** ¡Estoy aquí para hacer tu experiencia perfecta! 😊✨';
      }

      openaiLogger.info('Fallback response generated', {
        intent: intent,
        messageLength: response.length,
        productsCount: relatedProducts.length,
        timestamp: new Date().toISOString()
      });

        return {
        response: response,
        intent: intent,
        entities: {},
        confidence: 0.8,
        model: 'fallback',
        tokensUsed: 0,
        functionCalled: null,
        relatedProducts: relatedProducts
      };
      
    } catch (error) {
      openaiLogger.error('Fallback system error', {
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      return {
        response: 'Lo siento, estoy experimentando dificultades técnicas. Por favor, contacta directamente con nuestra clínica al +34 900 123 456.',
        intent: 'error',
          entities: {},
          confidence: 0.5,
          model: 'fallback',
          tokensUsed: 0,
        functionCalled: null,
        relatedProducts: []
        };
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
        case 'obtener_servicios':
          return await this.executeObtenerServicios(args);
        case 'obtener_servicios_interactivos':
          return await this.executeObtenerServiciosInteractivos(args);
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
      
    }
  }

  // Ejecutar obtener servicios
  async executeObtenerServicios(args) {
    try {
      const { categoria, incluir_precios } = args || {};
      
      // Usar datos reales de la base de datos
      const categorias = productosService.getCategorias();
      let servicios = [];
      
      if (categoria) {
        // Filtrar por categoría específica
        const productos = productosService.getProductosByCategoria(categoria);
        servicios = productos.data.map(producto => ({
          id: producto.id.toString(),
          nombre: producto.nombre,
          duracion: producto.duracion,
          precio: incluir_precios ? producto.precio : null,
          categoria: producto.categoria,
          descripcion: producto.descripcion
        }));
      } else {
        // Obtener todos los servicios
        categorias.data.forEach(cat => {
          const productos = productosService.getProductosByCategoria(cat);
          productos.data.forEach(producto => {
            servicios.push({
              id: producto.id.toString(),
              nombre: producto.nombre,
              duracion: producto.duracion,
              precio: incluir_precios ? producto.precio : null,
              categoria: producto.categoria,
              descripcion: producto.descripcion
            });
          });
        });
      }

      // Generar respuesta formateada
      let responseText = 'Estos son nuestros servicios disponibles:\n\n';
      
      const categoriasAgrupadas = {};
      servicios.forEach(servicio => {
        if (!categoriasAgrupadas[servicio.categoria]) {
          categoriasAgrupadas[servicio.categoria] = [];
        }
        categoriasAgrupadas[servicio.categoria].push(servicio);
      });

      Object.keys(categoriasAgrupadas).forEach(categoria => {
        responseText += `**${categoria}:**\n`;
        categoriasAgrupadas[categoria].forEach(servicio => {
          responseText += `• ${servicio.nombre}`;
          if (servicio.precio) responseText += ` - ${servicio.precio}€`;
          responseText += ` (${servicio.duracion})\n`;
          responseText += `  ${servicio.descripcion}\n\n`;
        });
      });

      return {
        success: true,
        message: responseText,
        servicios: servicios,
        total: servicios.length
      };
    } catch (error) {
      return {
        success: false,
        message: `Error al obtener servicios: ${error.message}`
      };
    }
  }

  // Ejecutar obtener servicios interactivos
  async executeObtenerServiciosInteractivos(args) {
    try {
      const { incluir_precios } = args || {};
      
      // Usar datos reales de la base de datos
      const categorias = productosService.getCategorias();
      let servicios = [];
      
      // Obtener todos los servicios
      categorias.data.forEach(cat => {
        const productos = productosService.getProductosByCategoria(cat);
        productos.data.forEach(producto => {
          servicios.push({
            id: producto.id.toString(),
            nombre: producto.nombre,
            duracion: producto.duracion,
            precio: incluir_precios ? producto.precio : null,
            categoria: producto.categoria,
            descripcion: producto.descripcion
          });
        });
      });

      // Generar respuesta para servicios interactivos
      let responseText = '¡Perfecto! Te muestro nuestros servicios disponibles. Puedes hacer clic en "Agendar Cita" para reservar el que más te interese:\n\n';
      
      const categoriasAgrupadas = {};
      servicios.forEach(servicio => {
        if (!categoriasAgrupadas[servicio.categoria]) {
          categoriasAgrupadas[servicio.categoria] = [];
        }
        categoriasAgrupadas[servicio.categoria].push(servicio);
      });

      Object.keys(categoriasAgrupadas).forEach(categoria => {
        responseText += `**${categoria}:**\n`;
        categoriasAgrupadas[categoria].forEach(servicio => {
          responseText += `• ${servicio.nombre}`;
          if (servicio.precio) {
            responseText += ` - ${servicio.precio}€`;
          }
          if (servicio.duracion) {
            responseText += ` (${servicio.duracion})`;
          }
          responseText += '\n';
        });
        responseText += '\n';
      });

      return {
        success: true,
        message: responseText,
        servicios: servicios,
        total: servicios.length
      };
    } catch (error) {
      return {
        success: false,
        message: `Error al obtener servicios interactivos: ${error.message}`
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

  // Obtener estadísticas del sistema
  getSystemStats() {
      return {
      isOpenAIAvailable: this.isOpenAIAvailable,
      model: this.model,
      fallbackModel: this.fallbackModel,
      lastErrorTime: this.lastErrorTime,
      timestamp: new Date().toISOString()
    };
  }

  // Generar respuesta con tool-calling avanzado
  async generateResponseWithAdvancedTools(prompt, model, sessionId = null) {
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
      
      // Si hay tool_calls, ejecutarlas
      if (message.tool_calls && message.tool_calls.length > 0) {
        const toolResults = await this.handleAdvancedToolCalls(message.tool_calls, prompt, [], sessionId);
        return {
          content: toolResults.response,
          tokensUsed: completion.usage?.total_tokens || 0,
          toolCalled: message.tool_calls[0],
          functionCalled: message.tool_calls[0].function.name,
          toolResults: toolResults.toolResults,
          relatedProducts: toolResults.relatedProducts
        };
      }
      
      return {
        content: message.content || 'No se pudo generar una respuesta.',
        tokensUsed: completion.usage?.total_tokens || 0,
        toolCalled: null,
        functionCalled: null
      };

    } catch (error) {
      openaiLogger.error('Error generando respuesta con herramientas avanzadas:', error);
      throw error;
    }
  }

  // Manejar llamadas a herramientas avanzadas
  async handleAdvancedToolCalls(toolCalls, message, conversationHistory = [], sessionId = null) {
    try {
      const results = [];
      
      for (const toolCall of toolCalls) {
        const { name, arguments: args } = toolCall.function;
        const parameters = JSON.parse(args);
        
        // Agregar sessionId a los parámetros si es una función del carrito
        if (['agregar_al_carrito', 'consultar_carrito', 'remover_del_carrito', 'limpiar_carrito'].includes(name)) {
          parameters.session_id = sessionId || 'default_session';
        }
        
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
      let relatedProducts = shouldInclude ? this.getRelatedProducts(message) : [];
      
      // No incluir productos relacionados si se ejecutó obtener_servicios_interactivos
      const hasServicesFunction = results.some(r => r.function === 'obtener_servicios_interactivos');
      if (hasServicesFunction) {
        relatedProducts = [];
      }

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
      return {
        response: 'Error procesando la solicitud. Por favor, intenta de nuevo.',
        intent: 'error',
        entities: [],
        confidence: 0,
        relatedProducts: [],
        toolResults: []
      };
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
      } else if (result.function === 'obtener_servicios_interactivos') {
        if (result.result.success) {
          response += result.result.message;
        } else {
          response += `❌ Error obteniendo servicios: ${result.result.error}`;
        }
      } else if (result.function === 'agendar_cita') {
        if (result.result.success) {
          response += result.result.message;
        } else {
          response += `❌ Error agendando la cita: ${result.result.error}`;
        }
      } else if (result.function === 'obtener_profesionales') {
        if (result.result.success) {
          response += 'Nuestros profesionales:\n\n';
          result.result.profesionales.forEach(prof => {
            response += `• ${prof.nombre} - Especialidades: ${prof.especialidades.join(', ')}\n`;
          });
        }
      } else if (result.function === 'consultar_carrito') {
        if (result.result.success) {
          response += result.result.message;
        } else {
          response += `❌ Error consultando el carrito: ${result.result.error}`;
        }
      } else if (result.function === 'agregar_al_carrito') {
        if (result.result.success) {
          response += `✅ ${result.result.message}`;
        } else {
          response += `❌ Error agregando al carrito: ${result.result.error}`;
        }
      } else if (result.function === 'remover_del_carrito') {
        if (result.result.success) {
          response += `✅ ${result.result.message}`;
        } else {
          response += `❌ Error removiendo del carrito: ${result.result.error}`;
        }
      } else if (result.function === 'limpiar_carrito') {
        if (result.result.success) {
          response += `✅ ${result.result.message}`;
        } else {
          response += `❌ Error limpiando el carrito: ${result.result.error}`;
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
module.exports = new OpenAIService();