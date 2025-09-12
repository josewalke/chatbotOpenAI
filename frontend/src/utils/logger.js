// Sistema de logging para el frontend
class FrontendLogger {
  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.logs = [];
    this.maxLogs = 1000; // Mantener solo los últimos 1000 logs
  }

  // Método base para logging
  log(level, component, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      component,
      message,
      data: data ? JSON.parse(JSON.stringify(data)) : null
    };

    // Agregar al array de logs
    this.logs.push(logEntry);
    
    // Mantener solo los últimos logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Mostrar en consola si estamos en desarrollo
    if (this.isDevelopment) {
      const consoleMethod = this.getConsoleMethod(level);
      const prefix = `[${timestamp}] [${level.toUpperCase()}] [${component}]`;
      
      if (data) {
        console[consoleMethod](prefix, message, data);
      } else {
        console[consoleMethod](prefix, message);
      }
    }

    // Enviar logs críticos al servidor si es necesario
    if (level === 'error' || level === 'critical') {
      this.sendToServer(logEntry);
    }
  }

  // Obtener método de consola apropiado
  getConsoleMethod(level) {
    switch (level) {
      case 'error':
      case 'critical':
        return 'error';
      case 'warn':
        return 'warn';
      case 'info':
        return 'info';
      case 'debug':
        return 'log';
      default:
        return 'log';
    }
  }

  // Enviar logs críticos al servidor
  async sendToServer(logEntry) {
    try {
      // Solo enviar en producción o cuando sea crítico
      if (process.env.NODE_ENV === 'production' || logEntry.level === 'critical') {
        await fetch('/api/logs/frontend', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(logEntry)
        });
      }
    } catch (error) {
      console.error('Error enviando log al servidor:', error);
    }
  }

  // Métodos de conveniencia
  info(component, message, data = null) {
    this.log('info', component, message, data);
  }

  warn(component, message, data = null) {
    this.log('warn', component, message, data);
  }

  error(component, message, data = null) {
    this.log('error', component, message, data);
  }

  debug(component, message, data = null) {
    this.log('debug', component, message, data);
  }

  critical(component, message, data = null) {
    this.log('critical', component, message, data);
  }

  // Obtener todos los logs
  getAllLogs() {
    return [...this.logs];
  }

  // Obtener logs por componente
  getLogsByComponent(component) {
    return this.logs.filter(log => log.component === component);
  }

  // Obtener logs por nivel
  getLogsByLevel(level) {
    return this.logs.filter(log => log.level === level);
  }

  // Limpiar logs
  clearLogs() {
    this.logs = [];
  }

  // Exportar logs
  exportLogs() {
    const dataStr = JSON.stringify(this.logs, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `frontend-logs-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }
}

// Crear instancia global
const logger = new FrontendLogger();

// Hacer disponible globalmente para debugging
if (typeof window !== 'undefined') {
  window.frontendLogger = logger;
}

export default logger;

