import React, { useState } from 'react';
import styled from 'styled-components';

const ServiceCard = ({ service, onBook }) => {
  const [showDetails, setShowDetails] = useState(false);

  const handleBook = () => {
    if (onBook) {
      onBook({
        ...service,
        tipo: 'servicio'
      });
    }
  };

  return (
    <CardContainer>
      <ServiceName>{service.nombre}</ServiceName>
      
      <ServiceDescription>{service.descripcion}</ServiceDescription>
      
      <ServiceDetails>
        <DetailItem>
          <DetailLabel>⏱️ Duración:</DetailLabel>
          <DetailValue>{service.duracion}</DetailValue>
        </DetailItem>
        
        <DetailItem>
          <DetailLabel>💰 Precio:</DetailLabel>
          <DetailValue>€{service.precio}</DetailValue>
        </DetailItem>
        
        <DetailItem>
          <DetailLabel>📂 Categoría:</DetailLabel>
          <DetailValue>{service.categoria}</DetailValue>
        </DetailItem>
      </ServiceDetails>

      <BookButton onClick={handleBook}>
        <BookIcon>📅</BookIcon>
        Agendar Cita
      </BookButton>

      <CardStyles />
    </CardContainer>
  );
};

const CardContainer = styled.div`
  background: white;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 1px solid #e0e0e0;
  transition: all 0.3s ease;
  
  &:hover {
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
    transform: translateY(-2px);
  }
`;

const ServiceName = styled.h3`
  color: #333;
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 12px 0;
  line-height: 1.3;
`;

const ServiceDescription = styled.p`
  color: #666;
  font-size: 14px;
  line-height: 1.5;
  margin: 0 0 16px 0;
`;

const ServiceDetails = styled.div`
  margin-bottom: 16px;
`;

const DetailItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const DetailLabel = styled.span`
  color: #666;
  font-size: 13px;
  font-weight: 500;
`;

const DetailValue = styled.span`
  color: #333;
  font-size: 13px;
  font-weight: 600;
`;

const BookButton = styled.button`
  width: 100%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  padding: 12px 16px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.3s ease;
  
  &:hover {
    background: linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
  }
  
  &:active {
    transform: translateY(0);
  }
`;

const BookIcon = styled.span`
  font-size: 16px;
`;

const CardStyles = styled.div`
  /* Estilos adicionales si son necesarios */
`;

export default ServiceCard;
