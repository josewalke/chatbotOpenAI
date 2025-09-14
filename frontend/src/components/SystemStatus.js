import React, { useState, useEffect } from 'react';
import api from '../services/api';
import './SystemStatus.css';

const SystemStatus = () => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const response = await api.get('/chat/status');
      setStatus(response.data.status);
      setError(null);
    } catch (err) {
      setError('Error al obtener estado del sistema');
      console.error('Error fetching system status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    // Actualizar cada 30 segundos
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (timestamp) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleString('es-ES');
  };

  const formatDuration = (milliseconds) => {
    if (!milliseconds) return 'N/A';
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  if (loading) {
    return (
      <div className="system-status">
        <div className="status-indicator loading">
          <span className="status-dot loading"></span>
          <span>Cargando estado del sistema...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="system-status">
        <div className="status-indicator error">
          <span className="status-dot error"></span>
          <span>{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="system-status">
      <div className="status-header">
        <h3>Estado del Sistema</h3>
        <button 
          className="refresh-btn" 
          onClick={fetchStatus}
          disabled={loading}
        >
          🔄 Actualizar
        </button>
      </div>
      
      <div className="status-content">
        <div className="status-indicator">
          <span 
            className={`status-dot ${status.isOpenAIAvailable ? 'success' : 'warning'}`}
          ></span>
          <span className="status-text">
            {status.isOpenAIAvailable ? 'OpenAI Disponible' : 'Sistema de Respaldo Activo'}
          </span>
        </div>

        <div className="status-details">
          <div className="status-item">
            <strong>Modelo Principal:</strong> {status.model}
          </div>
          <div className="status-item">
            <strong>Modelo de Respaldo:</strong> {status.fallbackModel}
          </div>
          
          {status.lastErrorTime && (
            <>
              <div className="status-item">
                <strong>Último Error:</strong> {formatTime(status.lastErrorTime)}
              </div>
              <div className="status-item">
                <strong>Tiempo desde Error:</strong> {formatDuration(status.timeSinceLastError)}
              </div>
            </>
          )}
        </div>

        {!status.isOpenAIAvailable && (
          <div className="fallback-notice">
            <div className="notice-icon">⚠️</div>
            <div className="notice-text">
              <strong>Sistema de Respaldo Activo</strong>
              <p>
                OpenAI está temporalmente no disponible. El sistema está usando respuestas predefinidas.
                Se reintentará la conexión automáticamente cada 5 minutos.
              </p>
            </div>
          </div>
        )}
      </div>

          </div>
  );
};

export default SystemStatus;
