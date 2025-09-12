import React, { useState, useEffect } from 'react';
import api from '../services/api';

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

      <style jsx>{`
        .system-status {
          background: #f8f9fa;
          border: 1px solid #e9ecef;
          border-radius: 8px;
          padding: 16px;
          margin: 16px 0;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .status-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .status-header h3 {
          margin: 0;
          color: #333;
          font-size: 18px;
        }

        .refresh-btn {
          background: #007bff;
          color: white;
          border: none;
          padding: 8px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          transition: background-color 0.2s;
        }

        .refresh-btn:hover:not(:disabled) {
          background: #0056b3;
        }

        .refresh-btn:disabled {
          background: #6c757d;
          cursor: not-allowed;
        }

        .status-indicator {
          display: flex;
          align-items: center;
          margin-bottom: 12px;
        }

        .status-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          margin-right: 8px;
          animation: pulse 2s infinite;
        }

        .status-dot.success {
          background: #28a745;
        }

        .status-dot.warning {
          background: #ffc107;
        }

        .status-dot.error {
          background: #dc3545;
        }

        .status-dot.loading {
          background: #6c757d;
        }

        .status-text {
          font-weight: 600;
          color: #333;
        }

        .status-details {
          background: white;
          border-radius: 4px;
          padding: 12px;
          margin-bottom: 12px;
        }

        .status-item {
          margin-bottom: 8px;
          font-size: 14px;
          color: #555;
        }

        .status-item:last-child {
          margin-bottom: 0;
        }

        .fallback-notice {
          background: #fff3cd;
          border: 1px solid #ffeaa7;
          border-radius: 4px;
          padding: 12px;
          display: flex;
          align-items: flex-start;
        }

        .notice-icon {
          font-size: 20px;
          margin-right: 12px;
          margin-top: 2px;
        }

        .notice-text strong {
          display: block;
          color: #856404;
          margin-bottom: 4px;
        }

        .notice-text p {
          margin: 0;
          color: #856404;
          font-size: 14px;
          line-height: 1.4;
        }

        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default SystemStatus;
