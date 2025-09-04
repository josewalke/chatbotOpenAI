import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import { FiClock, FiDollarSign, FiUser, FiCalendar } from 'react-icons/fi';

const ServicesContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
`;

const ServicesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 24px;
  margin-top: 24px;
`;

const ServiceCard = styled.div`
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
  }
`;

const ServiceHeader = styled.div`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 24px;
  text-align: center;
`;

const ServiceTitle = styled.h3`
  margin: 0 0 8px 0;
  font-size: 20px;
  font-weight: 600;
`;

const ServicePrice = styled.div`
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 8px;
`;

const ServiceDuration = styled.div`
  font-size: 14px;
  opacity: 0.9;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
`;

const ServiceContent = styled.div`
  padding: 24px;
`;

const ServiceDescription = styled.p`
  color: #666;
  line-height: 1.6;
  margin-bottom: 20px;
`;

const ServiceDetails = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 20px;
`;

const DetailItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #555;
`;

const CareSection = styled.div`
  background: #f8f9fa;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 16px;
`;

const CareTitle = styled.h4`
  margin: 0 0 8px 0;
  font-size: 14px;
  color: #333;
  font-weight: 600;
`;

const CareText = styled.p`
  margin: 0;
  font-size: 13px;
  color: #666;
  line-height: 1.4;
`;

const BookButton = styled.button`
  width: 100%;
  background: #667eea;
  color: white;
  border: none;
  padding: 12px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
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

const LoadingSpinner = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  font-size: 18px;
  color: #666;
`;

const ErrorMessage = styled.div`
  background: #fee;
  color: #c33;
  padding: 16px;
  border-radius: 8px;
  text-align: center;
  margin: 20px 0;
`;

const ServicesList = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/services');
      if (response.data.success) {
        setServices(response.data.services);
      }
    } catch (err) {
      setError('Error al cargar los servicios');
      console.error('Error fetching services:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBookService = (service) => {
    // Aquí podrías navegar a una página de booking o abrir un modal
    console.log('Booking service:', service);
    alert(`Funcionalidad de booking para ${service.name} - En desarrollo`);
  };

  if (loading) {
    return (
      <ServicesContainer>
        <LoadingSpinner>Cargando servicios...</LoadingSpinner>
      </ServicesContainer>
    );
  }

  if (error) {
    return (
      <ServicesContainer>
        <ErrorMessage>{error}</ErrorMessage>
      </ServicesContainer>
    );
  }

  return (
    <ServicesContainer>
      <h1 style={{ textAlign: 'center', color: '#333', marginBottom: '20px' }}>
        Nuestros Servicios
      </h1>
      <p style={{ textAlign: 'center', color: '#666', marginBottom: '40px' }}>
        Descubre nuestra amplia gama de tratamientos estéticos profesionales
      </p>
      
      <ServicesGrid>
        {services.map((service) => (
          <ServiceCard key={service.id}>
            <ServiceHeader>
              <ServiceTitle>{service.name}</ServiceTitle>
              <ServicePrice>Desde €{service.price}</ServicePrice>
              <ServiceDuration>
                <FiClock />
                {service.duration} minutos
              </ServiceDuration>
            </ServiceHeader>
            
            <ServiceContent>
              <ServiceDescription>{service.description}</ServiceDescription>
              
              <ServiceDetails>
                <DetailItem>
                  <FiDollarSign />
                  Precio: €{service.price}
                </DetailItem>
                <DetailItem>
                  <FiClock />
                  Duración: {service.duration} min
                </DetailItem>
              </ServiceDetails>
              
              <CareSection>
                <CareTitle>📋 Cuidados Previos</CareTitle>
                <CareText>{service.preCare}</CareText>
              </CareSection>
              
              <CareSection>
                <CareTitle>💆 Cuidados Posteriores</CareTitle>
                <CareText>{service.postCare}</CareText>
              </CareSection>
              
              <BookButton onClick={() => handleBookService(service)}>
                <FiCalendar style={{ marginRight: '8px' }} />
                Reservar Cita
              </BookButton>
            </ServiceContent>
          </ServiceCard>
        ))}
      </ServicesGrid>
    </ServicesContainer>
  );
};

export default ServicesList;
