import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import { FiSend, FiUser, FiMessageCircle } from 'react-icons/fi';
import ProductGrid from './ProductGrid';
import ServiceGrid from './ServiceGrid';
import BookingForm from './BookingForm';
import './BookingForm.css';

const ChatContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  max-width: 800px;
  margin: 0 auto;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  overflow: hidden;
`;

const ChatHeader = styled.div`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 20px;
  text-align: center;
  font-size: 18px;
  font-weight: 600;
`;

const MessagesContainer = styled.div`
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  background: #f8f9fa;
`;

const MessageBubble = styled.div`
  display: flex;
  margin-bottom: 16px;
  align-items: flex-start;
  ${props => props.$isUser ? 'justify-content: flex-end;' : 'justify-content: flex-start;'}
`;

const MessageContent = styled.div`
  max-width: 70%;
  padding: 12px 16px;
  border-radius: 18px;
  font-size: 14px;
  line-height: 1.4;
  ${props => props.$isUser ? `
    background: #667eea;
    color: white;
    border-bottom-right-radius: 4px;
  ` : `
    background: white;
    color: #333;
    border: 1px solid #e1e5e9;
    border-bottom-left-radius: 4px;
  `}
`;

const MessageTime = styled.div`
  font-size: 11px;
  color: #999;
  margin-top: 4px;
  text-align: ${props => props.$isUser ? 'right' : 'left'};
`;

const InputContainer = styled.div`
  padding: 20px;
  background: white;
  border-top: 1px solid #e1e5e9;
  display: flex;
  align-items: center;
  gap: 12px;
`;

const MessageInput = styled.input`
  flex: 1;
  padding: 12px 16px;
  border: 2px solid #e1e5e9;
  border-radius: 25px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.3s ease;
  
  &:focus {
    border-color: #667eea;
  }
  
  &:disabled {
    background: #f8f9fa;
    cursor: not-allowed;
  }
`;

const SendButton = styled.button`
  background: #667eea;
  color: white;
  border: none;
  border-radius: 50%;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background-color 0.3s ease;
  
  &:hover {
    background: #5a6fd8;
  }
  
  &:disabled {
    background: #ccc;
    cursor: not-allowed;
  }
`;

const TypingIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 12px 16px;
  background: white;
  border: 1px solid #e1e5e9;
  border-radius: 18px;
  border-bottom-left-radius: 4px;
  max-width: 70%;
  font-size: 14px;
  color: #666;
`;

const Dot = styled.div`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #667eea;
  animation: typing 1.4s infinite ease-in-out;
  
  &:nth-child(1) { animation-delay: -0.32s; }
  &:nth-child(2) { animation-delay: -0.16s; }
  
  @keyframes typing {
    0%, 80%, 100% {
      transform: scale(0.8);
      opacity: 0.5;
    }
    40% {
      transform: scale(1);
      opacity: 1;
    }
  }
`;

const QuickReplies = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 12px;
  flex-wrap: wrap;
`;

const QuickReplyButton = styled.button`
  background: white;
  border: 1px solid #667eea;
  color: #667eea;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    background: #667eea;
    color: white;
  }
`;

const ChatInterface = () => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [selectedService, setSelectedService] = useState('');
  const messagesEndRef = useRef(null);

  const quickReplies = [
    '¿Qué servicios ofrecen?',
    'Quiero agendar una cita',
    '¿Cuáles son los horarios?',
    '¿Dónde están ubicados?'
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Crear nueva conversación al cargar
    createNewConversation();
  }, []);

  const createNewConversation = async () => {
    try {
      const response = await axios.post('/api/chat/conversation');
      if (response.data.success) {
        setConversationId(response.data.conversation.id);
        setSessionId(response.data.conversation.sessionId);
        setMessages(response.data.conversation.messages);
      }
    } catch (error) {
      console.error('Error creando conversación:', error);
    }
  };

  const handleBookingFormSubmit = (formMessage) => {
    setShowBookingForm(false);
    sendMessage(formMessage);
  };

  const handleBookingFormCancel = () => {
    setShowBookingForm(false);
    setSelectedService('');
  };

  const handleServiceClick = (serviceName) => {
    setSelectedService(serviceName);
    setShowBookingForm(true);
  };

  const sendMessage = async (messageText) => {
    if (!messageText.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      content: messageText,
      sender: 'user',
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await axios.post('/api/chat/message', {
        message: messageText,
        conversationId: conversationId,
        sessionId: sessionId
      });

      if (response.data.success) {
        const botMessage = {
          id: Date.now() + 1,
          content: response.data.response,
          sender: 'bot',
          timestamp: new Date().toISOString(),
          intent: response.data.intent,
          entities: response.data.entities,
          relatedProducts: response.data.relatedProducts || []
        };

        setMessages(prev => [...prev, botMessage]);
        
        // Actualizar IDs si la conversación cambió
        if (response.data.conversation.id !== conversationId) {
          setConversationId(response.data.conversation.id);
          setSessionId(response.data.conversation.sessionId);
        }
      }
    } catch (error) {
      console.error('Error enviando mensaje:', error);
      const errorMessage = {
        id: Date.now() + 1,
        content: 'Lo siento, hubo un error al procesar tu mensaje. Por favor, intenta de nuevo.',
        sender: 'bot',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    sendMessage(inputMessage);
  };

  const handleQuickReply = (reply) => {
    sendMessage(reply);
  };

  const handleProductBuy = async (product) => {
    console.log('Producto seleccionado para compra:', product);
    
    // Enviar mensaje al backend para agregar al carrito
    const addToCartMessage = `Agrega ${product.nombre} al carrito`;
    
    // Crear mensaje del usuario
    const userMessage = {
      id: Date.now(),
      content: addToCartMessage,
      sender: 'user',
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    
    try {
      const response = await axios.post('/api/chat/message', {
        message: addToCartMessage,
        conversationId: conversationId,
        sessionId: sessionId
      });
      
      if (response.data.success) {
        const botMessage = {
          id: Date.now() + 1,
          content: response.data.response,
          sender: 'bot',
          timestamp: new Date().toISOString(),
          relatedProducts: response.data.relatedProducts || []
        };
        
        setMessages(prev => [...prev, botMessage]);
      }
    } catch (error) {
      console.error('Error agregando al carrito:', error);
      const errorMessage = {
        id: Date.now() + 1,
        content: 'Error agregando el producto al carrito. Por favor, intenta de nuevo.',
        sender: 'bot',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleServiceBook = async (service) => {
    console.log('Servicio seleccionado para agendar:', service);
    setSelectedService(service.nombre);
    setShowBookingForm(true);
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <ChatContainer>
      <ChatHeader>
        <FiMessageCircle style={{ marginRight: '8px' }} />
        Asistente Virtual - Clínica Estética
      </ChatHeader>
      
      <MessagesContainer>
        {messages.map((message) => (
          <div key={message.id}>
            <MessageBubble $isUser={message.sender === 'user'}>
              <MessageContent $isUser={message.sender === 'user'}>
                {message.content}
                <MessageTime $isUser={message.sender === 'user'}>
                  {formatTime(message.timestamp)}
                </MessageTime>
              </MessageContent>
            </MessageBubble>
            
            {/* Mostrar productos relacionados si existen */}
            {message.sender === 'bot' && message.relatedProducts && message.relatedProducts.length > 0 && (
              <>
                {/* Mostrar servicios si hay servicios */}
                {message.relatedProducts.some(item => item.tipo === 'servicio') && (
                  <ServiceGrid 
                    services={message.relatedProducts.filter(item => item.tipo === 'servicio')} 
                    onBook={handleServiceBook}
                  />
                )}
                
                {/* Mostrar productos si hay productos */}
                {message.relatedProducts.some(item => !item.tipo || item.tipo === 'producto') && (
                  <ProductGrid 
                    products={message.relatedProducts.filter(item => !item.tipo || item.tipo === 'producto')} 
                    onBuy={handleProductBuy}
                  />
                )}
              </>
            )}
          </div>
        ))}
        
        {isLoading && (
          <MessageBubble $isUser={false}>
            <TypingIndicator>
              <Dot />
              <Dot />
              <Dot />
              Escribiendo...
            </TypingIndicator>
          </MessageBubble>
        )}
        
        <div ref={messagesEndRef} />
      </MessagesContainer>

      {showBookingForm && (
        <div style={{ padding: '0 20px' }}>
          <BookingForm
            serviceName={selectedService}
            onFormSubmit={handleBookingFormSubmit}
            onCancel={handleBookingFormCancel}
          />
        </div>
      )}

      <InputContainer>
        <form onSubmit={handleSendMessage} style={{ display: 'flex', width: '100%', gap: '12px' }}>
          <MessageInput
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Escribe tu mensaje..."
            disabled={isLoading}
          />
          <SendButton type="submit" disabled={isLoading || !inputMessage.trim()}>
            <FiSend />
          </SendButton>
        </form>
      </InputContainer>

      {messages.length <= 2 && (
        <div style={{ padding: '0 20px 20px' }}>
          <QuickReplies>
            {quickReplies.map((reply, index) => (
              <QuickReplyButton
                key={index}
                onClick={() => handleQuickReply(reply)}
                disabled={isLoading}
              >
                {reply}
              </QuickReplyButton>
            ))}
          </QuickReplies>
        </div>
      )}
    </ChatContainer>
  );
};

export default ChatInterface;
