import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { FiEye, FiEyeOff, FiDownload, FiTrash2, FiFilter } from 'react-icons/fi';
import logger from '../utils/logger';

const LogsContainer = styled.div`
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 400px;
  max-height: 500px;
  background: rgba(0, 0, 0, 0.9);
  border-radius: 12px;
  padding: 16px;
  z-index: 2000;
  font-family: 'Courier New', monospace;
  font-size: 0.8rem;
  color: #00ff00;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const LogsHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
`;

const LogsTitle = styled.h4`
  margin: 0;
  color: #ffffff;
  font-size: 0.9rem;
  font-weight: 600;
`;

const LogsControls = styled.div`
  display: flex;
  gap: 8px;
`;

const ControlButton = styled.button`
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #ffffff;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.7rem;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.2);
  }
`;

const LogsContent = styled.div`
  max-height: 400px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const LogEntry = styled.div`
  padding: 4px 8px;
  border-radius: 4px;
  background: ${props => {
    switch (props.$level) {
      case 'error':
      case 'critical':
        return 'rgba(255, 0, 0, 0.1)';
      case 'warn':
        return 'rgba(255, 165, 0, 0.1)';
      case 'info':
        return 'rgba(0, 255, 0, 0.1)';
      case 'debug':
        return 'rgba(0, 0, 255, 0.1)';
      default:
        return 'rgba(255, 255, 255, 0.05)';
    }
  }};
  border-left: 3px solid ${props => {
    switch (props.$level) {
      case 'error':
      case 'critical':
        return '#ff0000';
      case 'warn':
        return '#ffa500';
      case 'info':
        return '#00ff00';
      case 'debug':
        return '#0000ff';
      default:
        return '#ffffff';
    }
  }};
  font-size: 0.7rem;
  line-height: 1.3;
`;

const LogTimestamp = styled.span`
  color: #888;
  font-size: 0.6rem;
`;

const LogLevel = styled.span`
  color: ${props => {
    switch (props.$level) {
      case 'error':
      case 'critical':
        return '#ff0000';
      case 'warn':
        return '#ffa500';
      case 'info':
        return '#00ff00';
      case 'debug':
        return '#0000ff';
      default:
        return '#ffffff';
    }
  }};
  font-weight: bold;
  margin: 0 4px;
`;

const LogComponent = styled.span`
  color: #ffff00;
  font-weight: bold;
`;

const LogMessage = styled.span`
  color: #ffffff;
`;

const LogsDebugger = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState('all');
  const [maxLogs, setMaxLogs] = useState(50);

  useEffect(() => {
    const updateLogs = () => {
      const allLogs = logger.getAllLogs();
      setLogs(allLogs.slice(-maxLogs));
    };

    // Actualizar logs cada segundo
    const interval = setInterval(updateLogs, 1000);
    
    // Actualizar inmediatamente
    updateLogs();

    return () => clearInterval(interval);
  }, [maxLogs]);

  const filteredLogs = logs.filter(log => {
    if (filter === 'all') return true;
    return log.level === filter;
  });

  const handleExport = () => {
    logger.exportLogs();
  };

  const handleClear = () => {
    logger.clearLogs();
    setLogs([]);
  };

  const toggleVisibility = () => {
    setIsVisible(!isVisible);
  };

  if (!isVisible) {
    return (
      <ControlButton 
        onClick={toggleVisibility}
        style={{ position: 'fixed', bottom: '20px', right: '20px' }}
      >
        <FiEye />
        Logs
      </ControlButton>
    );
  }

  return (
    <LogsContainer>
      <LogsHeader>
        <LogsTitle>Frontend Logs</LogsTitle>
        <LogsControls>
          <ControlButton onClick={() => setFilter('all')}>
            <FiFilter />
            All
          </ControlButton>
          <ControlButton onClick={() => setFilter('error')}>
            <FiFilter />
            Errors
          </ControlButton>
          <ControlButton onClick={() => setFilter('info')}>
            <FiFilter />
            Info
          </ControlButton>
          <ControlButton onClick={handleExport}>
            <FiDownload />
            Export
          </ControlButton>
          <ControlButton onClick={handleClear}>
            <FiTrash2 />
            Clear
          </ControlButton>
          <ControlButton onClick={toggleVisibility}>
            <FiEyeOff />
          </ControlButton>
        </LogsControls>
      </LogsHeader>
      
      <LogsContent>
        {filteredLogs.map((log, index) => (
          <LogEntry key={index} $level={log.level}>
            <LogTimestamp>
              {new Date(log.timestamp).toLocaleTimeString()}
            </LogTimestamp>
            <LogLevel $level={log.level}>
              [{log.level.toUpperCase()}]
            </LogLevel>
            <LogComponent>
              [{log.component}]
            </LogComponent>
            <LogMessage>
              {log.message}
            </LogMessage>
            {log.data && (
              <div style={{ marginTop: '4px', fontSize: '0.6rem', color: '#888' }}>
                {JSON.stringify(log.data, null, 2)}
              </div>
            )}
          </LogEntry>
        ))}
      </LogsContent>
    </LogsContainer>
  );
};

export default LogsDebugger;

