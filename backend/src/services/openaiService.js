const OpenAI = require('openai');
const dotenv = require('dotenv');
const winston = require('winston');
const productosService = require('./productosService');
const bookingService = require('./bookingService');
const calendarService = require('./calendarService');
const slotManager = require('./slotManager');
const googleCalendarService = require('./googleCalendarService');

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
        response = await this.generateResponseWithFunctions(fullPrompt, this.model);
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
        response = await this.generateResponseWithFunctions(fullPrompt, this.fallbackModel);
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

      return {
        response: response.content,
        intent: analysis.intent,
        entities: analysis.entities,
        confidence: analysis.confidence,
        model: response.model,
        tokensUsed: response.tokensUsed,
        functionExecuted: response.functionCalled ? response.functionCalled.name : null
      };

    } catch (error) {
      console.error('Error procesando mensaje:', error);
      openaiLogger.error('Message Processing Error', {
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });

      throw new Error('Error al procesar el mensaje con IA');
    }
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
}

module.exports = new OpenAIService();