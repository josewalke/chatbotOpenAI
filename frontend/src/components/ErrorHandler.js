import React from 'react';
import styled from 'styled-components';
import { FiAlertTriangle, FiRefreshCw, FiWifi, FiWifiOff } from 'react-icons/fi';
import logger from '../utils/logger';

const ErrorContainer = styled.div`
  background: ${props => props.$type === 'warning' ? '#fff3cd' : '#f8d7da'};
  border: 1px solid ${props => props.$type === 'warning' ? '#ffeaa7' : '#f5c6cb'};
  color: ${props => props.$type === 'warning' ? '#856404' : '#721c24'};
  padding: 12px 16px;
  border-radius: 8px;
  margin: 8px 0;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
`;

const ErrorIcon = styled.div`
  font-size: 1.1rem;
  flex-shrink: 0;
`;

const ErrorMessage = styled.div`
  flex: 1;
`;

const RetryButton = styled.button`
  background: ${props => props.$type === 'warning' ? '#ffc107' : '#dc3545'};
  color: white;
  border: none;
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 0.8rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: opacity 0.3s ease;
  
  &:hover {
    opacity: 0.8;
  }
`;

const ConnectionStatus = styled.div`
  position: fixed;
  top: 20px;
  right: 20px;
  background: ${props => props.$isOnline ? '#d4edda' : '#f8d7da'};
  color: ${props => props.$isOnline ? '#155724' : '#721c24'};
  padding: 8px 12px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
  z-index: 1000;
  transition: all 0.3s ease;
`;

const ErrorHandler = ({ error, onRetry, type = 'error' }) => {
  logger.info('ErrorHandler', 'Componente ErrorHandler renderizado', { 
    hasError: !!error, 
    type,
    hasOnRetry: !!onRetry,
    errorCode: error?.code,
    errorMessage: error?.message
  });

  if (!error) {
    logger.debug('ErrorHandler', 'No hay error para mostrar');
    return null;
  }

  const getErrorMessage = (error) => {
    logger.debug('ErrorHandler', 'Obteniendo mensaje de error', { 
      errorCode: error.code, 
      errorMessage: error.message,
      status: error.response?.status
    });

    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      return 'La conexión tardó demasiado. Verifica tu conexión a internet.';
    }
    if (error.code === 'ERR_NETWORK' || error.message.includes('Network Error')) {
      return 'Error de conexión. Verifica tu conexión a internet.';
    }
    if (error.response?.status === 500) {
      return 'Error interno del servidor. Intenta de nuevo en unos momentos.';
    }
    if (error.response?.status === 404) {
      return 'Servicio no disponible. Intenta de nuevo más tarde.';
    }
    return 'Error inesperado. Intenta de nuevo.';
  };

  const handleRetry = () => {
    logger.info('ErrorHandler', 'Reintentando operación');
    if (onRetry) {
      onRetry();
    } else {
      logger.warn('ErrorHandler', 'onRetry no está definido');
    }
  };

  return (
    <ErrorContainer $type={type}>
      <ErrorIcon>
        <FiAlertTriangle />
      </ErrorIcon>
      <ErrorMessage>
        {getErrorMessage(error)}
      </ErrorMessage>
      {onRetry && (
        <RetryButton $type={type} onClick={handleRetry}>
          <FiRefreshCw />
          Reintentar
        </RetryButton>
      )}
    </ErrorContainer>
  );
};

const ConnectionIndicator = ({ isOnline }) => {
  logger.debug('ConnectionIndicator', 'Estado de conexión actualizado', { isOnline });
  
  return (
    <ConnectionStatus $isOnline={isOnline}>
      {isOnline ? <FiWifi /> : <FiWifiOff />}
      {isOnline ? 'Conectado' : 'Sin conexión'}
    </ConnectionStatus>
  );
};

export { ErrorHandler, ConnectionIndicator };
