const express = require('express');
const router = express.Router();
const Joi = require('joi');
const openaiService = require('../services/openaiService');
const conversationService = require('../services/conversationService');

// Esquema de validación para mensajes
const messageSchema = Joi.object({
  message: Joi.string().min(1).max(1000).required(),
  sessionId: Joi.string().optional(),
  conversationId: Joi.string().optional()
});

// Esquema para nueva conversación
const newConversationSchema = Joi.object({
  userId: Joi.string().optional(),
  metadata: Joi.object({
    channel: Joi.string().default('web'),
    language: Joi.string().default('es'),
    userAgent: Joi.string().optional()
  }).optional()
});

// GET /api/chat/status - Obtener estado del sistema
router.get('/status', async (req, res) => {
  try {
    const status = openaiService.getSystemStatus();
    res.json({
      success: true,
      status: status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error obteniendo estado del sistema:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener estado del sistema'
    });
  }
});

// GET /api/chat/hybrid-stats - Obtener estadísticas del sistema híbrido
router.get('/hybrid-stats', async (req, res) => {
  try {
    const stats = openaiService.getHybridStats();
    res.json({
      success: true,
      stats: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error obteniendo estadísticas híbridas:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener estadísticas del sistema híbrido'
    });
  }
});

// POST /api/chat/conversation - Crear nueva conversación
router.post('/conversation', async (req, res) => {
  try {
    const { error, value } = newConversationSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const conversation = conversationService.createConversation(value.userId);
    
    // Agregar mensaje de bienvenida
    const welcomeMessage = `¡Hola! Soy el asistente virtual de ${process.env.CLINIC_NAME}. ¿En qué puedo ayudarte hoy? Puedo informarte sobre nuestros servicios, agendar citas, o responder tus preguntas.`;
    
    conversationService.addBotResponse(
      conversation.id, 
      welcomeMessage, 
      'saludo'
    );

    res.json({
      success: true,
      conversation: {
        id: conversation.id,
        sessionId: conversation.sessionId,
        messages: conversation.messages
      }
    });
  } catch (error) {
    console.error('Error creando conversación:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/chat/message - Enviar mensaje
router.post('/message', async (req, res) => {
  try {
    const { error, value } = messageSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    let conversation;
    
    // Buscar conversación existente
    if (value.conversationId) {
      conversation = conversationService.getConversation(value.conversationId);
    } else if (value.sessionId) {
      conversation = conversationService.getConversationBySession(value.sessionId);
    }

    // Si no existe conversación, crear una nueva
    if (!conversation) {
      conversation = conversationService.createConversation();
    }

    // Agregar mensaje del usuario
    conversationService.addMessage(conversation.id, value.message);

    // Obtener historial de conversación
    const history = conversationService.getConversationHistory(conversation.id);

    // Procesar mensaje con OpenAI
    const aiResponse = await openaiService.processMessage(value.message, history, value.sessionId);

    // Agregar respuesta del bot
    conversationService.addBotResponse(
      conversation.id,
      aiResponse.response,
      aiResponse.intent,
      aiResponse.entities
    );

    // Obtener conversación actualizada
    const updatedConversation = conversationService.getConversation(conversation.id);

    res.json({
      success: true,
      response: aiResponse.response,
      intent: aiResponse.intent,
      entities: aiResponse.entities,
      confidence: aiResponse.confidence,
      relatedProducts: aiResponse.relatedProducts || [],
      conversation: {
        id: conversation.id,
        sessionId: conversation.sessionId,
        messages: updatedConversation.messages
      }
    });

  } catch (error) {
    console.error('Error procesando mensaje:', error);
    res.status(500).json({ 
      error: 'Error al procesar el mensaje',
      message: error.message 
    });
  }
});

// GET /api/chat/conversation/:id - Obtener conversación
router.get('/conversation/:id', async (req, res) => {
  try {
    const conversation = conversationService.getConversation(req.params.id);
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversación no encontrada' });
    }

    const stats = conversationService.getConversationStats(req.params.id);

    res.json({
      success: true,
      conversation: {
        id: conversation.id,
        sessionId: conversation.sessionId,
        messages: conversation.messages,
        status: conversation.status,
        createdAt: conversation.createdAt,
        lastActivity: conversation.lastActivity,
        stats: stats
      }
    });
  } catch (error) {
    console.error('Error obteniendo conversación:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/chat/conversation/:id/complete - Completar conversación
router.post('/conversation/:id/complete', async (req, res) => {
  try {
    const { resolution = 'completed' } = req.body;
    
    conversationService.completeConversation(req.params.id, resolution);
    
    res.json({
      success: true,
      message: 'Conversación completada'
    });
  } catch (error) {
    console.error('Error completando conversación:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/chat/conversations - Listar conversaciones
router.get('/conversations', async (req, res) => {
  try {
    const { status, intent, limit = 20 } = req.query;
    
    const criteria = {};
    if (status) criteria.status = status;
    if (intent) criteria.intent = intent;
    
    const conversations = conversationService.searchConversations(criteria);
    
    // Limitar resultados
    const limitedConversations = conversations
      .sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity))
      .slice(0, parseInt(limit))
      .map(conv => ({
        id: conv.id,
        sessionId: conv.sessionId,
        status: conv.status,
        createdAt: conv.createdAt,
        lastActivity: conv.lastActivity,
        messageCount: conv.messages.length,
        intents: conv.intents.map(i => i.intent)
      }));

    res.json({
      success: true,
      conversations: limitedConversations,
      total: conversations.length
    });
  } catch (error) {
    console.error('Error listando conversaciones:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/chat/cleanup - Limpiar conversaciones antiguas
router.post('/cleanup', async (req, res) => {
  try {
    conversationService.cleanupOldConversations();
    
    res.json({
      success: true,
      message: 'Limpieza completada'
    });
  } catch (error) {
    console.error('Error en limpieza:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
