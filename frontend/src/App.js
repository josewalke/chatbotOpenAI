import React, { useState } from 'react';
import styled from 'styled-components';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import ChatInterface from './components/ChatInterface';
import ServicesList from './components/ServicesList';
import { FiMessageCircle, FiGrid, FiHome, FiInfo } from 'react-icons/fi';

const AppContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
`;

const Header = styled.header`
  background: white;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  padding: 0 20px;
`;

const Nav = styled.nav`
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 70px;
`;

const Logo = styled.div`
  font-size: 24px;
  font-weight: 700;
  color: #667eea;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const NavLinks = styled.div`
  display: flex;
  gap: 20px;
`;

const NavLink = styled(Link)`
  text-decoration: none;
  color: #333;
  font-weight: 500;
  padding: 8px 16px;
  border-radius: 20px;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 6px;
  
  &:hover {
    background: #667eea;
    color: white;
  }
  
  &.active {
    background: #667eea;
    color: white;
  }
`;

const MainContent = styled.main`
  flex: 1;
  padding: 20px 0;
`;

const HomeContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 20px;
  text-align: center;
`;

const HeroSection = styled.div`
  background: white;
  border-radius: 16px;
  padding: 60px 40px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.1);
  margin-bottom: 40px;
`;

const HeroTitle = styled.h1`
  font-size: 48px;
  font-weight: 700;
  color: #333;
  margin-bottom: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const HeroSubtitle = styled.p`
  font-size: 20px;
  color: #666;
  margin-bottom: 40px;
  line-height: 1.6;
`;

const CTAButton = styled.button`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 16px 32px;
  border-radius: 30px;
  font-size: 18px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.3s ease;
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 auto;
  
  &:hover {
    transform: translateY(-2px);
  }
`;

const FeaturesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 30px;
  margin-top: 40px;
`;

const FeatureCard = styled.div`
  background: white;
  padding: 30px;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  text-align: center;
  transition: transform 0.3s ease;
  
  &:hover {
    transform: translateY(-4px);
  }
`;

const FeatureIcon = styled.div`
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;
  color: white;
  font-size: 32px;
`;

const FeatureTitle = styled.h3`
  font-size: 20px;
  font-weight: 600;
  color: #333;
  margin-bottom: 12px;
`;

const FeatureDescription = styled.p`
  color: #666;
  line-height: 1.6;
`;

const App = () => {
  const [currentPage, setCurrentPage] = useState('home');

  const HomePage = () => (
    <HomeContainer>
      <HeroSection>
        <HeroTitle>Clínica Estética Virtual</HeroTitle>
        <HeroSubtitle>
          Descubre nuestra asistente virtual inteligente que te ayudará a agendar citas, 
          resolver dudas y obtener información sobre nuestros servicios de manera rápida y eficiente.
        </HeroSubtitle>
        <CTAButton onClick={() => setCurrentPage('chat')}>
          <FiMessageCircle />
          Hablar con el Asistente
        </CTAButton>
      </HeroSection>
      
      <FeaturesGrid>
        <FeatureCard>
          <FeatureIcon>
            <FiMessageCircle />
          </FeatureIcon>
          <FeatureTitle>Asistente Virtual 24/7</FeatureTitle>
          <FeatureDescription>
            Nuestro asistente inteligente está disponible en cualquier momento para responder 
            tus preguntas y ayudarte con el proceso de reserva.
          </FeatureDescription>
        </FeatureCard>
        
        <FeatureCard>
          <FeatureIcon>
            <FiGrid />
          </FeatureIcon>
          <FeatureTitle>Servicios Especializados</FeatureTitle>
          <FeatureDescription>
            Amplia gama de tratamientos estéticos profesionales con información detallada 
            sobre cada servicio, precios y cuidados.
          </FeatureDescription>
        </FeatureCard>
        
        <FeatureCard>
          <FeatureIcon>
            <FiHome />
          </FeatureIcon>
          <FeatureTitle>Reserva Fácil y Rápida</FeatureTitle>
          <FeatureDescription>
            Sistema de reserva intuitivo que te permite agendar citas en minutos, 
            eligiendo el servicio, profesional y horario que prefieras.
          </FeatureDescription>
        </FeatureCard>
      </FeaturesGrid>
    </HomeContainer>
  );

  return (
    <Router>
      <AppContainer>
        <Header>
          <Nav>
            <Logo>
              <FiMessageCircle />
              Clínica Estética
            </Logo>
            <NavLinks>
              <NavLink 
                to="/" 
                className={currentPage === 'home' ? 'active' : ''}
                onClick={() => setCurrentPage('home')}
              >
                <FiHome />
                Inicio
              </NavLink>
              <NavLink 
                to="/services" 
                className={currentPage === 'services' ? 'active' : ''}
                onClick={() => setCurrentPage('services')}
              >
                <FiGrid />
                Servicios
              </NavLink>
              <NavLink 
                to="/chat" 
                className={currentPage === 'chat' ? 'active' : ''}
                onClick={() => setCurrentPage('chat')}
              >
                <FiMessageCircle />
                Asistente Virtual
              </NavLink>
            </NavLinks>
          </Nav>
        </Header>
        
        <MainContent>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/services" element={<ServicesList />} />
            <Route path="/chat" element={<ChatInterface />} />
          </Routes>
        </MainContent>
      </AppContainer>
    </Router>
  );
};

export default App;
