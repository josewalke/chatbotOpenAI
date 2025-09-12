import React from 'react';
import styled from 'styled-components';

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

const TextContent = styled.div`
  white-space: pre-wrap;
`;

const MessageRenderer = ({ content, isUser, timestamp, formatTime }) => {
  // Función para detectar si el mensaje contiene productos estructurados
  const parseMessageContent = (messageContent) => {
    // Detectar patrones de productos en el texto
    const productPatterns = [
      // Patrón para tratamientos: "Nombre del tratamiento (precio€, duración)"
      /([^:\n]+):\s*([^€]+)\s*\((\d+)€,\s*([^)]+)\)/g,
      // Patrón para productos: "Nombre del producto (precio€)"
      /([^:\n]+):\s*([^€]+)\s*\((\d+)€\)/g,
      // Patrón más simple: "Nombre - precio€"
      /([^-]+)\s*-\s*(\d+)€/g
    ];

    const products = [];
    let textContent = messageContent;

    // Intentar extraer productos usando diferentes patrones
    productPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(messageContent)) !== null) {
        const [, category, name, price, duration] = match;
        
        // Determinar si es tratamiento o producto
        const isTreatment = duration !== undefined;
        
        products.push({
          id: `product-${products.length}`,
          nombre: name.trim(),
          categoria: category.trim(),
          precio: parseInt(price),
          duracion: duration ? duration.trim() : null,
          descripcion: isTreatment ? `Tratamiento profesional de ${name.trim()}` : `Producto para uso en casa`,
          isTreatment: isTreatment
        });

        // Remover el texto del producto del contenido principal
        textContent = textContent.replace(match[0], '');
      }
    });

    return {
      textContent: textContent.trim(),
      products: products
    };
  };

  const { textContent, products } = parseMessageContent(content);

  return (
    <MessageContent $isUser={isUser}>
      {textContent && (
        <TextContent>{textContent}</TextContent>
      )}
      <MessageTime $isUser={isUser}>
        {formatTime(timestamp)}
      </MessageTime>
    </MessageContent>
  );
};

export default MessageRenderer;

