const { v4: uuidv4 } = require('uuid');
const moment = require('moment');

class ConversationService {
  constructor() {
    this.conversations = new Map(); // En producción usar Redis o DB
    this.sessions = new Map();
  }

  // Crear nueva conversación
  createConversation(userId = null) {
    const conversationId = uuidv4();
    const sessionId = uuidv4();
    
    const conversation = {
      id: conversationId,
      sessionId: sessionId,
      userId: userId,
      messages: [],
      intents: [],
      entities: [],
      status: 'active',
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      metadata: {
        channel: 'web',
        language: 'es',
        userAgent: null
      }
    };

    this.conversations.set(conversationId, conversation);
    this.sessions.set(sessionId, conversationId);
    
    return conversation;
  }

  // Obtener conversación por ID
  getConversation(conversationId) {
    return this.conversations.get(conversationId);
  }

  // Obtener conversación por session ID
  getConversationBySession(sessionId) {
    const conversationId = this.sessions.get(sessionId);
    return conversationId ? this.conversations.get(conversationId) : null;
  }

  // Agregar mensaje a la conversación
  addMessage(conversationId, message, intent = null, entities = {}) {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      throw new Error('Conversación no encontrada');
    }

    const messageObj = {
      id: uuidv4(),
      content: message,
      timestamp: new Date().toISOString(),
      intent: intent,
      entities: entities,
      sender: 'user'
    };

    conversation.messages.push(messageObj);
    conversation.lastActivity = new Date().toISOString();

    if (intent) {
      conversation.intents.push({
        intent: intent,
        timestamp: new Date().toISOString(),
        confidence: entities.confidence || 0.5
      });
    }

    return messageObj;
  }

  // Agregar respuesta del bot
  addBotResponse(conversationId, response, intent = null, entities = {}) {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      throw new Error('Conversación no encontrada');
    }

    const responseObj = {
      id: uuidv4(),
      content: response,
      timestamp: new Date().toISOString(),
      intent: intent,
      entities: entities,
      sender: 'bot'
    };

    conversation.messages.push(responseObj);
    conversation.lastActivity = new Date().toISOString();

    return responseObj;
  }

  // Obtener historial de mensajes para OpenAI
  getConversationHistory(conversationId, maxMessages = 10) {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      return [];
    }

    const recentMessages = conversation.messages.slice(-maxMessages);
    return recentMessages.map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'assistant',
      content: msg.content
    }));
  }

  // Actualizar estado de la conversación
  updateConversationStatus(conversationId, status) {
    const conversation = this.conversations.get(conversationId);
    if (conversation) {
      conversation.status = status;
      conversation.lastActivity = new Date().toISOString();
    }
  }

  // Marcar conversación como completada
  completeConversation(conversationId, resolution = 'completed') {
    const conversation = this.conversations.get(conversationId);
    if (conversation) {
      conversation.status = 'completed';
      conversation.resolution = resolution;
      conversation.completedAt = new Date().toISOString();
    }
  }

  // Limpiar conversaciones antiguas (más de 24 horas)
  cleanupOldConversations() {
    const cutoff = moment().subtract(24, 'hours').toDate();
    
    for (const [conversationId, conversation] of this.conversations.entries()) {
      if (new Date(conversation.lastActivity) < cutoff) {
        this.conversations.delete(conversationId);
        this.sessions.delete(conversation.sessionId);
      }
    }
  }

  // Obtener estadísticas de conversación
  getConversationStats(conversationId) {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      return null;
    }

    const userMessages = conversation.messages.filter(m => m.sender === 'user').length;
    const botMessages = conversation.messages.filter(m => m.sender === 'bot').length;
    const uniqueIntents = [...new Set(conversation.intents.map(i => i.intent))];

    return {
      totalMessages: conversation.messages.length,
      userMessages,
      botMessages,
      uniqueIntents,
      duration: moment(conversation.lastActivity).diff(moment(conversation.createdAt), 'minutes'),
      status: conversation.status
    };
  }

  // Buscar conversaciones por criterios
  searchConversations(criteria = {}) {
    const results = [];
    
    for (const conversation of this.conversations.values()) {
      let match = true;
      
      if (criteria.userId && conversation.userId !== criteria.userId) {
        match = false;
      }
      
      if (criteria.status && conversation.status !== criteria.status) {
        match = false;
      }
      
      if (criteria.intent && !conversation.intents.some(i => i.intent === criteria.intent)) {
        match = false;
      }
      
      if (match) {
        results.push(conversation);
      }
    }
    
    return results;
  }
}

module.exports = new ConversationService();
