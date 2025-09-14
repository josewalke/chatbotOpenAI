class AdvancedToolCalling {
  constructor() {
    this.tools = this.initializeTools();
    this.functionRegistry = new Map();
    this.registerFunctions();
  }

  // Inicializar herramientas disponibles
  initializeTools() {
    return [
      {
        type: "function",
        function: {
          name: "buscar_huecos",
          description: "Buscar horarios disponibles para un servicio específico",
          parameters: {
            type: "object",
            properties: {
              servicio_id: {
                type: "string",
                description: "ID del servicio solicitado"
              },
              profesional_id: {
                type: "string",
                description: "ID del profesional preferido (opcional)"
              },
              ventana_cliente: {
                type: "object",
                description: "Ventana de tiempo preferida por el cliente",
                properties: {
                  desde: { type: "string", format: "date" },
                  hasta: { type: "string", format: "date" },
                  franjas: { 
                    type: "array", 
                    items: { type: "string", enum: ["mañana", "tarde", "noche"] }
                  }
                }
              }
            },
            required: ["servicio_id", "ventana_cliente"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "reservar_cita",
          description: "Reservar una cita específica",
          parameters: {
            type: "object",
            properties: {
              slot_id: {
                type: "string",
                description: "ID del horario seleccionado"
              },
              cliente_id: {
                type: "string",
                description: "ID del cliente"
              },
              servicio_id: {
                type: "string",
                description: "ID del servicio"
              },
              requiere_deposito: {
                type: "boolean",
                description: "Si el servicio requiere depósito"
              }
            },
            required: ["slot_id", "cliente_id", "servicio_id"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "reagendar_cita",
          description: "Reagendar una cita existente",
          parameters: {
            type: "object",
            properties: {
              cita_id: {
                type: "string",
                description: "ID de la cita a reagendar"
              },
              nueva_ventana: {
                type: "object",
                description: "Nueva ventana de tiempo",
                properties: {
                  desde: { type: "string", format: "date" },
                  hasta: { type: "string", format: "date" },
                  franjas: { 
                    type: "array", 
                    items: { type: "string", enum: ["mañana", "tarde", "noche"] }
                  }
                }
              }
            },
            required: ["cita_id", "nueva_ventana"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "cancelar_cita",
          description: "Cancelar una cita existente",
          parameters: {
            type: "object",
            properties: {
              cita_id: {
                type: "string",
                description: "ID de la cita a cancelar"
              },
              motivo: {
                type: "string",
                description: "Motivo de la cancelación"
              }
            },
            required: ["cita_id"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "obtener_servicios",
          description: "Obtener lista de servicios disponibles",
          parameters: {
            type: "object",
            properties: {
              categoria: {
                type: "string",
                description: "Categoría de servicios (opcional)"
              },
              incluir_precios: {
                type: "boolean",
                description: "Si incluir precios en la respuesta"
              }
            }
          }
        }
      },
      {
        type: "function",
        function: {
          name: "obtener_servicios_interactivos",
          description: "Obtener lista de servicios disponibles con formato interactivo",
          parameters: {
            type: "object",
            properties: {
              categoria: {
                type: "string",
                description: "Categoría de servicios (opcional)"
              },
              incluir_precios: {
                type: "boolean",
                description: "Si incluir precios en la respuesta",
                default: true
              }
            }
          }
        }
      },
      {
        type: "function",
        function: {
          name: "agregar_al_carrito",
          description: "Agregar un producto al carrito de compras",
          parameters: {
            type: "object",
            properties: {
              producto_id: {
                type: "string",
                description: "ID único del producto basado en su nombre (ej: 'crema_antienvejecimiento' para 'Crema Antienvejecimiento')"
              },
              producto_nombre: {
                type: "string",
                description: "Nombre del producto"
              },
              precio: {
                type: "number",
                description: "Precio del producto"
              },
              cantidad: {
                type: "integer",
                description: "Cantidad a agregar (por defecto 1)",
                default: 1
              },
              session_id: {
                type: "string",
                description: "ID de la sesión del usuario"
              }
            },
            required: ["producto_id", "producto_nombre", "precio", "session_id"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "consultar_carrito",
          description: "Consultar el estado actual del carrito de compras",
          parameters: {
            type: "object",
            properties: {
              session_id: {
                type: "string",
                description: "ID de la sesión del usuario"
              }
            },
            required: ["session_id"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "remover_del_carrito",
          description: "Remover un producto del carrito de compras",
          parameters: {
            type: "object",
            properties: {
              producto_id: {
                type: "string",
                description: "ID del producto a remover"
              },
              cantidad: {
                type: "integer",
                description: "Cantidad a remover (opcional, si no se especifica se remueve todo)"
              },
              session_id: {
                type: "string",
                description: "ID de la sesión del usuario"
              }
            },
            required: ["producto_id", "session_id"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "agendar_cita",
          description: "Agendar una cita para un servicio específico",
          parameters: {
            type: "object",
            properties: {
              servicio_id: {
                type: "string",
                description: "ID del servicio a agendar"
              },
              servicio_nombre: {
                type: "string",
                description: "Nombre del servicio"
              },
              fecha_preferida: {
                type: "string",
                description: "Fecha preferida para la cita (opcional)"
              },
              hora_preferida: {
                type: "string",
                description: "Hora preferida para la cita (opcional)"
              },
              session_id: {
                type: "string",
                description: "ID de la sesión del usuario"
              }
            },
            required: ["servicio_id", "servicio_nombre", "session_id"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "limpiar_carrito",
          description: "Limpiar completamente el carrito de compras",
          parameters: {
            type: "object",
            properties: {
              session_id: {
                type: "string",
                description: "ID de la sesión del usuario"
              }
            },
            required: ["session_id"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "obtener_profesionales",
          description: "Obtener lista de profesionales disponibles",
          parameters: {
            type: "object",
            properties: {
              servicio_id: {
                type: "string",
                description: "ID del servicio para filtrar profesionales"
              },
              incluir_horarios: {
                type: "boolean",
                description: "Si incluir horarios de trabajo"
              }
            }
          }
        }
      },
      {
        type: "function",
        function: {
          name: "enviar_email",
          description: "Enviar email de confirmación o recordatorio",
          parameters: {
            type: "object",
            properties: {
              template_id: {
                type: "string",
                description: "ID de la plantilla de email",
                enum: ["confirmacion", "recordatorio", "post_tratamiento", "csat"]
              },
              to: {
                type: "string",
                description: "Email del destinatario"
              },
              variables: {
                type: "object",
                description: "Variables para personalizar el email"
              }
            },
            required: ["template_id", "to"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "solicitar_resena",
          description: "Solicitar reseña a un cliente satisfecho",
          parameters: {
            type: "object",
            properties: {
              cliente_id: {
                type: "string",
                description: "ID del cliente"
              },
              cita_id: {
                type: "string",
                description: "ID de la cita relacionada"
              },
              plataforma: {
                type: "string",
                description: "Plataforma para la reseña",
                enum: ["google", "facebook", "instagram"]
              }
            },
            required: ["cliente_id", "cita_id"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "responder_resena",
          description: "Responder automáticamente a una reseña",
          parameters: {
            type: "object",
            properties: {
              review_id: {
                type: "string",
                description: "ID de la reseña"
              },
              rating: {
                type: "integer",
                description: "Calificación de la reseña (1-5)",
                minimum: 1,
                maximum: 5
              },
              texto_cliente: {
                type: "string",
                description: "Texto de la reseña del cliente"
              }
            },
            required: ["review_id", "rating", "texto_cliente"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "obtener_informacion_cliente",
          description: "Obtener información de un cliente",
          parameters: {
            type: "object",
            properties: {
              cliente_id: {
                type: "string",
                description: "ID del cliente"
              },
              incluir_historial: {
                type: "boolean",
                description: "Si incluir historial de citas"
              }
            },
            required: ["cliente_id"]
          }
        }
      }
    ];
  }

  // Registrar funciones en el registry
  registerFunctions() {
    // Función para buscar huecos disponibles
    this.functionRegistry.set('buscar_huecos', async (params) => {
      try {
        const { servicio_id, profesional_id, ventana_cliente } = params;
        
        // Simular búsqueda de huecos (aquí iría la lógica real)
        const huecosDisponibles = [
          {
            slot_id: "sl_001",
            inicio: "2024-01-15T10:00:00",
            fin: "2024-01-15T11:00:00",
            profesional: "Ana García",
            sala: "Sala 1"
          },
          {
            slot_id: "sl_002", 
            inicio: "2024-01-15T16:00:00",
            fin: "2024-01-15T17:00:00",
            profesional: "Laura Martínez",
            sala: "Sala 2"
          }
        ];

        return {
          success: true,
          candidatos: huecosDisponibles,
          total: huecosDisponibles.length
        };
      } catch (error) {
        return {
          success: false,
          error: error.message
        };
      }
    });

    // Función para reservar cita
    this.functionRegistry.set('reservar_cita', async (params) => {
      try {
        const { slot_id, cliente_id, servicio_id, requiere_deposito } = params;
        
        // Simular reserva (aquí iría la lógica real)
        const cita_id = `cita_${Date.now()}`;
        
        return {
          success: true,
          cita_id: cita_id,
          estado: "confirmada",
          mensaje: "Cita reservada exitosamente"
        };
      } catch (error) {
        return {
          success: false,
          error: error.message
        };
      }
    });

    // Función para reagendar cita
    this.functionRegistry.set('reagendar_cita', async (params) => {
      try {
        const { cita_id, nueva_ventana } = params;
        
        // Simular reagendamiento
        return {
          success: true,
          opciones: [
            {
              slot_id: "sl_003",
              inicio: "2024-01-16T14:00:00",
              fin: "2024-01-16T15:00:00",
              profesional: "Ana García"
            }
          ]
        };
      } catch (error) {
        return {
          success: false,
          error: error.message
        };
      }
    });

    // Función para cancelar cita
    this.functionRegistry.set('cancelar_cita', async (params) => {
      try {
        const { cita_id, motivo } = params;
        
        return {
          success: true,
          mensaje: "Cita cancelada exitosamente",
          motivo: motivo
        };
      } catch (error) {
        return {
          success: false,
          error: error.message
        };
      }
    });

    // Función para obtener servicios
    this.functionRegistry.set('obtener_servicios', async (params) => {
      try {
        const { categoria, incluir_precios } = params;
        
        // Usar datos reales de la base de datos
        const productosService = require('./productosService');
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

        return {
          success: true,
          servicios: servicios,
          total: servicios.length
        };
      } catch (error) {
        return {
          success: false,
          error: error.message
        };
      }
    });

    // Función para obtener profesionales
    this.functionRegistry.set('obtener_profesionales', async (params) => {
      try {
        const { servicio_id, incluir_horarios } = params;
        
        const profesionales = [
          {
            id: "prof_001",
            nombre: "Ana García",
            especialidades: ["Facial", "Estética"],
            horarios: incluir_horarios ? {
              lunes: "09:00-18:00",
              martes: "09:00-18:00",
              miercoles: "09:00-18:00"
            } : null
          }
        ];

        return {
          success: true,
          profesionales: profesionales
        };
      } catch (error) {
        return {
          success: false,
          error: error.message
        };
      }
    });

    // Función para enviar email
    this.functionRegistry.set('enviar_email', async (params) => {
      try {
        const { template_id, to, variables } = params;
        
        // Simular envío de email
        return {
          success: true,
          message_id: `email_${Date.now()}`,
          template: template_id,
          destinatario: to
        };
      } catch (error) {
        return {
          success: false,
          error: error.message
        };
      }
    });

    // Función para solicitar reseña
    this.functionRegistry.set('solicitar_resena', async (params) => {
      try {
        const { cliente_id, cita_id, plataforma } = params;
        
        return {
          success: true,
          link_resena: `https://google.com/reviews?place_id=123&cita=${cita_id}`,
          plataforma: plataforma || "google"
        };
      } catch (error) {
        return {
          success: false,
          error: error.message
        };
      }
    });

    // Función para responder reseña
    this.functionRegistry.set('responder_resena', async (params) => {
      try {
        const { review_id, rating, texto_cliente } = params;
        
        let respuesta = "";
        if (rating >= 4) {
          respuesta = "¡Gracias por tu excelente reseña! Nos alegra saber que tuviste una experiencia positiva.";
        } else if (rating <= 2) {
          respuesta = "Lamentamos no haber cumplido tus expectativas. Nos pondremos en contacto contigo para resolver cualquier inconveniente.";
        } else {
          respuesta = "Gracias por tu feedback. Trabajamos constantemente para mejorar nuestros servicios.";
        }

        return {
          success: true,
          respuesta: respuesta,
          review_id: review_id
        };
      } catch (error) {
        return {
          success: false,
          error: error.message
        };
      }
    });

    // Función para obtener información del cliente
    this.functionRegistry.set('obtener_informacion_cliente', async (params) => {
      try {
        const { cliente_id, incluir_historial } = params;
        
        const cliente = {
          id: cliente_id,
          nombre: "María García",
          email: "maria@email.com",
          telefono: "+34 123 456 789",
          historial: incluir_historial ? [
            {
              fecha: "2024-01-10",
              servicio: "Limpieza Facial",
              profesional: "Ana García"
            }
          ] : null
        };

        return {
          success: true,
          cliente: cliente
        };
      } catch (error) {
        return {
          success: false,
          error: error.message
        };
      }
    });

    // Función para obtener servicios interactivos
    this.functionRegistry.set('obtener_servicios_interactivos', async (params) => {
      try {
        const { categoria, incluir_precios = true } = params;
        
        // Usar datos reales de la base de datos
        const productosService = require('./productosService');
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
            descripcion: producto.descripcion,
            tipo: 'servicio'
          }));
        } else {
          // Obtener todos los servicios (excluir productos para casa)
          categorias.data.forEach(cat => {
            if (cat !== 'Productos para Casa') { // Excluir productos para casa
              const productos = productosService.getProductosByCategoria(cat);
              productos.data.forEach(producto => {
                servicios.push({
                  id: producto.id.toString(),
                  nombre: producto.nombre,
                  duracion: producto.duracion,
                  precio: incluir_precios ? producto.precio : null,
                  categoria: producto.categoria,
                  descripcion: producto.descripcion,
                  tipo: 'servicio'
                });
              });
            }
          });
        }

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
          total: servicios.length,
          formato: 'interactivo'
        };
      } catch (error) {
        return {
          success: false,
          error: error.message
        };
      }
    });

    // Funciones del carrito de compras
    this.functionRegistry.set('agregar_al_carrito', async (params) => {
      try {
        const { producto_id, producto_nombre, precio, cantidad = 1, session_id } = params;
        
        // Generar ID consistente basado en el nombre del producto
        const consistentProductId = producto_nombre.toLowerCase()
          .replace(/[áàäâ]/g, 'a')
          .replace(/[éèëê]/g, 'e')
          .replace(/[íìïî]/g, 'i')
          .replace(/[óòöô]/g, 'o')
          .replace(/[úùüû]/g, 'u')
          .replace(/ñ/g, 'n')
          .replace(/[^a-z0-9]/g, '_')
          .replace(/_+/g, '_')
          .replace(/^_|_$/g, '');
        
        const cartService = require('./cartService');
        const result = cartService.addToCart(session_id, consistentProductId, producto_nombre, precio, cantidad);
        
        return result;
      } catch (error) {
        return {
          success: false,
          error: error.message
        };
      }
    });

    this.functionRegistry.set('consultar_carrito', async (params) => {
      try {
        const { session_id } = params;
        
        const cartService = require('./cartService');
        const cartDetails = cartService.getCartDetails(session_id);
        
        return {
          success: true,
          ...cartDetails
        };
      } catch (error) {
        return {
          success: false,
          error: error.message
        };
      }
    });

    this.functionRegistry.set('remover_del_carrito', async (params) => {
      try {
        const { producto_id, cantidad, session_id } = params;
        
        const cartService = require('./cartService');
        const result = cartService.removeFromCart(session_id, producto_id, cantidad);
        
        return result;
      } catch (error) {
        return {
          success: false,
          error: error.message
        };
      }
    });

    this.functionRegistry.set('agendar_cita', async (params) => {
      try {
        const { servicio_id, servicio_nombre, fecha_preferida, hora_preferida, session_id } = params;
        
        // Generar ID de cita único
        const cita_id = `cita_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Simular agendamiento (aquí iría la lógica real de agendamiento)
        let mensaje = `✅ Cita agendada exitosamente para ${servicio_nombre}`;
        
        if (fecha_preferida) {
          mensaje += `\n📅 Fecha: ${fecha_preferida}`;
        }
        if (hora_preferida) {
          mensaje += `\n🕐 Hora: ${hora_preferida}`;
        }
        
        mensaje += `\n🆔 ID de cita: ${cita_id}`;
        mensaje += `\n\n¿Te gustaría agendar otra cita o necesitas ayuda con algo más?`;
        
        return {
          success: true,
          message: mensaje,
          cita_id: cita_id,
          servicio: servicio_nombre,
          fecha: fecha_preferida || 'Por confirmar',
          hora: hora_preferida || 'Por confirmar'
        };
      } catch (error) {
        return {
          success: false,
          error: error.message
        };
      }
    });

    this.functionRegistry.set('limpiar_carrito', async (params) => {
      try {
        const { session_id } = params;
        
        const cartService = require('./cartService');
        const result = cartService.clearCart(session_id);
        
        return result;
      } catch (error) {
        return {
          success: false,
          error: error.message
        };
      }
    });
  }

  // Ejecutar función específica
  async executeFunction(functionName, parameters) {
    try {
      if (!this.functionRegistry.has(functionName)) {
        throw new Error(`Función ${functionName} no encontrada`);
      }

      const functionToExecute = this.functionRegistry.get(functionName);
      const result = await functionToExecute(parameters);
      
      return {
        function: functionName,
        result: result
      };
    } catch (error) {
      return {
        function: functionName,
        error: error.message
      };
    }
  }

  // Obtener herramientas disponibles
  getTools() {
    return this.tools;
  }

  // Obtener estadísticas
  getStats() {
    return {
      totalTools: this.tools.length,
      registeredFunctions: this.functionRegistry.size,
      availableFunctions: Array.from(this.functionRegistry.keys())
    };
  }
}

module.exports = AdvancedToolCalling;
