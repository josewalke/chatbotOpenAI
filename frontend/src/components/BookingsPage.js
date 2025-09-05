import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import { FiCalendar, FiClock, FiUser, FiPhone, FiMail, FiMapPin, FiRefreshCw } from 'react-icons/fi';

const BookingsContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  background: #f8f9fa;
  min-height: 100vh;
`;

const Header = styled.div`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 30px;
  border-radius: 12px;
  margin-bottom: 30px;
  text-align: center;
`;

const Title = styled.h1`
  margin: 0;
  font-size: 2.5rem;
  font-weight: 600;
`;

const Subtitle = styled.p`
  margin: 10px 0 0 0;
  font-size: 1.1rem;
  opacity: 0.9;
`;

const StatsContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
`;

const StatCard = styled.div`
  background: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  text-align: center;
`;

const StatNumber = styled.div`
  font-size: 2rem;
  font-weight: bold;
  color: #667eea;
  margin-bottom: 5px;
`;

const StatLabel = styled.div`
  color: #666;
  font-size: 0.9rem;
`;

const RefreshButton = styled.button`
  background: #667eea;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1rem;
  margin-bottom: 20px;
  transition: background-color 0.3s ease;

  &:hover {
    background: #5a6fd8;
  }
`;

const BookingsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 20px;
`;

const BookingCard = styled.div`
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  border-left: 4px solid ${props => {
    switch(props.status) {
      case 'confirmed': return '#28a745';
      case 'pending': return '#ffc107';
      case 'cancelled': return '#dc3545';
      case 'completed': return '#17a2b8';
      default: return '#6c757d';
    }
  }};
`;

const BookingHeader = styled.div`
  display: flex;
  justify-content: between;
  align-items: center;
  margin-bottom: 16px;
`;

const BookingId = styled.div`
  font-size: 0.8rem;
  color: #666;
  font-family: monospace;
  background: #f8f9fa;
  padding: 4px 8px;
  border-radius: 4px;
`;

const StatusBadge = styled.span`
  background: ${props => {
    switch(props.status) {
      case 'confirmed': return '#d4edda';
      case 'pending': return '#fff3cd';
      case 'cancelled': return '#f8d7da';
      case 'completed': return '#d1ecf1';
      default: return '#e2e3e5';
    }
  }};
  color: ${props => {
    switch(props.status) {
      case 'confirmed': return '#155724';
      case 'pending': return '#856404';
      case 'cancelled': return '#721c24';
      case 'completed': return '#0c5460';
      default: return '#383d41';
    }
  }};
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 500;
  text-transform: uppercase;
`;

const BookingInfo = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
`;

const InfoItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  color: #333;
`;

const InfoLabel = styled.span`
  font-weight: 500;
  color: #666;
  min-width: 80px;
`;

const CustomerInfo = styled.div`
  background: #f8f9fa;
  padding: 16px;
  border-radius: 8px;
  margin-top: 16px;
`;

const CustomerTitle = styled.h4`
  margin: 0 0 12px 0;
  color: #333;
  font-size: 1rem;
`;

const CustomerDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const LoadingContainer = styled.div`
  text-align: center;
  padding: 40px;
  color: #666;
`;

const ErrorContainer = styled.div`
  background: #f8d7da;
  color: #721c24;
  padding: 20px;
  border-radius: 8px;
  text-align: center;
`;

const EmptyContainer = styled.div`
  text-align: center;
  padding: 40px;
  color: #666;
`;

const BookingsPage = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get('/api/booking');
      setBookings(response.data.bookings);
    } catch (err) {
      setError('Error al cargar las citas');
      console.error('Error fetching bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getServiceName = (serviceId) => {
    const services = {
      '1': 'Hidratación Facial Profunda',
      '2': 'Peeling Químico',
      '3': 'Radiofrecuencia Facial',
      '4': 'Cavitación Ultrasónica',
      '5': 'Presoterapia',
      '6': 'Mesoterapia Corporal',
      '7': 'Depilación Láser',
      '8': 'Depilación con Cera',
      '9': 'Manicura Spa',
      '10': 'Pedicura Spa',
      '11': 'Microneedling',
      '12': 'Tratamiento Antienvejecimiento'
    };
    return services[serviceId] || `Servicio ${serviceId}`;
  };

  const getStatusText = (status) => {
    const statusMap = {
      'confirmed': 'Confirmada',
      'pending': 'Pendiente',
      'cancelled': 'Cancelada',
      'completed': 'Completada'
    };
    return statusMap[status] || status;
  };

  if (loading) {
    return (
      <BookingsContainer>
        <LoadingContainer>
          <FiRefreshCw style={{ animation: 'spin 1s linear infinite' }} />
          <p>Cargando citas...</p>
        </LoadingContainer>
      </BookingsContainer>
    );
  }

  if (error) {
    return (
      <BookingsContainer>
        <ErrorContainer>
          <p>{error}</p>
          <RefreshButton onClick={fetchBookings}>
            <FiRefreshCw />
            Reintentar
          </RefreshButton>
        </ErrorContainer>
      </BookingsContainer>
    );
  }

  return (
    <BookingsContainer>
      <Header>
        <Title>📅 Gestión de Citas</Title>
        <Subtitle>Clínica Estética BellaVida</Subtitle>
      </Header>

      <StatsContainer>
        <StatCard>
          <StatNumber>{bookings.length}</StatNumber>
          <StatLabel>Total de Citas</StatLabel>
        </StatCard>
        <StatCard>
          <StatNumber>{bookings.filter(b => b.status === 'confirmed').length}</StatNumber>
          <StatLabel>Citas Confirmadas</StatLabel>
        </StatCard>
        <StatCard>
          <StatNumber>{bookings.filter(b => b.status === 'pending').length}</StatNumber>
          <StatLabel>Citas Pendientes</StatLabel>
        </StatCard>
        <StatCard>
          <StatNumber>{bookings.filter(b => b.status === 'cancelled').length}</StatNumber>
          <StatLabel>Citas Canceladas</StatLabel>
        </StatCard>
      </StatsContainer>

      <RefreshButton onClick={fetchBookings}>
        <FiRefreshCw />
        Actualizar Citas
      </RefreshButton>

      {bookings.length === 0 ? (
        <EmptyContainer>
          <FiCalendar size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
          <p>No hay citas programadas</p>
        </EmptyContainer>
      ) : (
        <BookingsGrid>
          {bookings.map((booking) => (
            <BookingCard key={booking.id} status={booking.status}>
              <BookingHeader>
                <BookingId>{booking.id}</BookingId>
                <StatusBadge status={booking.status}>
                  {getStatusText(booking.status)}
                </StatusBadge>
              </BookingHeader>

              <BookingInfo>
                <InfoItem>
                  <FiCalendar />
                  <InfoLabel>Fecha:</InfoLabel>
                  <span>{formatDate(booking.date)}</span>
                </InfoItem>
                <InfoItem>
                  <FiClock />
                  <InfoLabel>Hora:</InfoLabel>
                  <span>{booking.time}</span>
                </InfoItem>
                <InfoItem>
                  <FiMapPin />
                  <InfoLabel>Servicio:</InfoLabel>
                  <span>{getServiceName(booking.serviceId)}</span>
                </InfoItem>
                <InfoItem>
                  <FiUser />
                  <InfoLabel>Profesional:</InfoLabel>
                  <span>{booking.professionalId}</span>
                </InfoItem>
              </BookingInfo>

              <CustomerInfo>
                <CustomerTitle>👤 Información del Cliente</CustomerTitle>
                <CustomerDetails>
                  <InfoItem>
                    <FiUser />
                    <InfoLabel>Nombre:</InfoLabel>
                    <span>{booking.customerInfo.name}</span>
                  </InfoItem>
                  <InfoItem>
                    <FiPhone />
                    <InfoLabel>Teléfono:</InfoLabel>
                    <span>{booking.customerInfo.phone}</span>
                  </InfoItem>
                  <InfoItem>
                    <FiMail />
                    <InfoLabel>Email:</InfoLabel>
                    <span>{booking.customerInfo.email}</span>
                  </InfoItem>
                </CustomerDetails>
              </CustomerInfo>
            </BookingCard>
          ))}
        </BookingsGrid>
      )}
    </BookingsContainer>
  );
};

export default BookingsPage;
