import React from 'react';
import styled from 'styled-components';
import ServiceCard from './ServiceCard';

const ServiceGrid = ({ services, onBook }) => {
  if (!services || services.length === 0) {
    return (
      <NoServicesMessage>
        No se encontraron servicios para mostrar.
      </NoServicesMessage>
    );
  }

  return (
    <GridContainer>
      <GridTitle>📅 Servicios Disponibles</GridTitle>
      <ServicesGrid>
        {services.map((service) => (
          <ServiceCard
            key={service.id}
            service={service}
            onBook={onBook}
          />
        ))}
      </ServicesGrid>
    </GridContainer>
  );
};

const GridContainer = styled.div`
  margin: 20px 0;
`;

const GridTitle = styled.h2`
  text-align: center;
  color: #333;
  margin-bottom: 16px;
  font-size: 18px;
  font-weight: 600;
`;

const ServicesGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  margin: 0;
  padding: 0;
`;

const NoServicesMessage = styled.div`
  text-align: center;
  color: #666;
  font-style: italic;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
  margin: 20px 0;
`;

export default ServiceGrid;
