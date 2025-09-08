const winston = require('winston');

// Logger específico para Slot Manager
const slotLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.json()
  ),
  defaultMeta: { service: 'slot-manager' },
  transports: [
    new winston.transports.File({ filename: 'logs/slot-manager.log' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  slotLogger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

class SlotManager {
  constructor() {
    this.temporaryReservations = new Map();
    this.cleanupInterval = null;
    this.defaultTTL = 300; // 5 minutos por defecto
    
    this.startCleanupProcess();
    slotLogger.info('SlotManager inicializado');
  }

  // Reservar slot temporalmente
  async reservarTemporal(slotId, clienteId, ttl = null) {
    try {
      const ttlSeconds = ttl || this.defaultTTL;
      const timestamp = Date.now();
      const expiresAt = timestamp + (ttlSeconds * 1000);
      
      const reserva = {
        slotId,
        clienteId,
        timestamp,
        expiresAt,
        ttl: ttlSeconds,
        status: 'reserved'
      };
      
      // Verificar si el slot ya está reservado
      if (this.temporaryReservations.has(slotId)) {
        const existingReservation = this.temporaryReservations.get(slotId);
        if (existingReservation.expiresAt > timestamp) {
          return {
            success: false,
            message: 'Slot ya está reservado temporalmente',
            expiresIn: Math.ceil((existingReservation.expiresAt - timestamp) / 1000)
          };
        }
      }
      
      this.temporaryReservations.set(slotId, reserva);
      
      slotLogger.info('Slot reservado temporalmente', {
        slotId,
        clienteId,
        ttl: ttlSeconds,
        expiresAt: new Date(expiresAt).toISOString()
      });
      
      return {
        success: true,
        expiresIn: ttlSeconds,
        expiresAt: new Date(expiresAt).toISOString()
      };
      
    } catch (error) {
      slotLogger.error('Error reservando slot temporal:', error);
      return {
        success: false,
        message: 'Error interno reservando slot'
      };
    }
  }

  // Verificar disponibilidad de un slot
  async verificarDisponibilidad(slotId) {
    try {
      const reserva = this.temporaryReservations.get(slotId);
      
      if (!reserva) {
        return { available: true };
      }
      
      const ahora = Date.now();
      
      if (reserva.expiresAt <= ahora) {
        // La reserva ha expirado, eliminarla
        this.temporaryReservations.delete(slotId);
        return { available: true };
      }
      
      return {
        available: false,
        clienteId: reserva.clienteId,
        expiresIn: Math.ceil((reserva.expiresAt - ahora) / 1000),
        expiresAt: new Date(reserva.expiresAt).toISOString()
      };
      
    } catch (error) {
      slotLogger.error('Error verificando disponibilidad:', error);
      return { available: false, error: 'Error interno' };
    }
  }

  // Confirmar reserva (convertir temporal en permanente)
  async confirmarReserva(slotId, clienteId) {
    try {
      const reserva = this.temporaryReservations.get(slotId);
      
      if (!reserva) {
        return {
          success: false,
          message: 'No hay reserva temporal para este slot'
        };
      }
      
      if (reserva.clienteId !== clienteId) {
        return {
          success: false,
          message: 'La reserva temporal pertenece a otro cliente'
        };
      }
      
      const ahora = Date.now();
      if (reserva.expiresAt <= ahora) {
        this.temporaryReservations.delete(slotId);
        return {
          success: false,
          message: 'La reserva temporal ha expirado'
        };
      }
      
      // Marcar como confirmada
      reserva.status = 'confirmed';
      reserva.confirmedAt = ahora;
      
      slotLogger.info('Reserva confirmada', {
        slotId,
        clienteId,
        confirmedAt: new Date(ahora).toISOString()
      });
      
      return {
        success: true,
        reserva
      };
      
    } catch (error) {
      slotLogger.error('Error confirmando reserva:', error);
      return {
        success: false,
        message: 'Error interno confirmando reserva'
      };
    }
  }

  // Liberar reserva temporal
  async liberarReserva(slotId, clienteId = null) {
    try {
      const reserva = this.temporaryReservations.get(slotId);
      
      if (!reserva) {
        return {
          success: false,
          message: 'No hay reserva para este slot'
        };
      }
      
      if (clienteId && reserva.clienteId !== clienteId) {
        return {
          success: false,
          message: 'La reserva pertenece a otro cliente'
        };
      }
      
      this.temporaryReservations.delete(slotId);
      
      slotLogger.info('Reserva liberada', {
        slotId,
        clienteId: reserva.clienteId,
        liberadoPor: clienteId || 'sistema'
      });
      
      return { success: true };
      
    } catch (error) {
      slotLogger.error('Error liberando reserva:', error);
      return {
        success: false,
        message: 'Error interno liberando reserva'
      };
    }
  }

  // Liberar todas las reservas de un cliente
  async liberarReservasCliente(clienteId) {
    try {
      const reservasLiberadas = [];
      
      for (const [slotId, reserva] of this.temporaryReservations) {
        if (reserva.clienteId === clienteId) {
          this.temporaryReservations.delete(slotId);
          reservasLiberadas.push(slotId);
        }
      }
      
      slotLogger.info('Reservas del cliente liberadas', {
        clienteId,
        reservasLiberadas: reservasLiberadas.length,
        slots: reservasLiberadas
      });
      
      return {
        success: true,
        liberadas: reservasLiberadas.length,
        slots: reservasLiberadas
      };
      
    } catch (error) {
      slotLogger.error('Error liberando reservas del cliente:', error);
      return {
        success: false,
        message: 'Error interno liberando reservas'
      };
    }
  }

  // Extender TTL de una reserva
  async extenderReserva(slotId, clienteId, ttlAdicional) {
    try {
      const reserva = this.temporaryReservations.get(slotId);
      
      if (!reserva) {
        return {
          success: false,
          message: 'No hay reserva para este slot'
        };
      }
      
      if (reserva.clienteId !== clienteId) {
        return {
          success: false,
          message: 'La reserva pertenece a otro cliente'
        };
      }
      
      const ahora = Date.now();
      if (reserva.expiresAt <= ahora) {
        this.temporaryReservations.delete(slotId);
        return {
          success: false,
          message: 'La reserva ha expirado'
        };
      }
      
      // Extender el tiempo de expiración
      reserva.expiresAt += (ttlAdicional * 1000);
      reserva.ttl += ttlAdicional;
      
      slotLogger.info('Reserva extendida', {
        slotId,
        clienteId,
        ttlAdicional,
        nuevoExpiresAt: new Date(reserva.expiresAt).toISOString()
      });
      
      return {
        success: true,
        expiresIn: Math.ceil((reserva.expiresAt - ahora) / 1000),
        expiresAt: new Date(reserva.expiresAt).toISOString()
      };
      
    } catch (error) {
      slotLogger.error('Error extendiendo reserva:', error);
      return {
        success: false,
        message: 'Error interno extendiendo reserva'
      };
    }
  }

  // Obtener estadísticas de reservas
  getEstadisticas() {
    const ahora = Date.now();
    const reservas = Array.from(this.temporaryReservations.values());
    
    const estadisticas = {
      totalReservas: reservas.length,
      reservasActivas: reservas.filter(r => r.expiresAt > ahora).length,
      reservasExpiradas: reservas.filter(r => r.expiresAt <= ahora).length,
      reservasConfirmadas: reservas.filter(r => r.status === 'confirmed').length,
      reservasPorCliente: {},
      proximasExpiraciones: []
    };
    
    // Agrupar por cliente
    reservas.forEach(reserva => {
      if (!estadisticas.reservasPorCliente[reserva.clienteId]) {
        estadisticas.reservasPorCliente[reserva.clienteId] = 0;
      }
      estadisticas.reservasPorCliente[reserva.clienteId]++;
    });
    
    // Obtener próximas expiraciones (próximos 10 minutos)
    const proximasExpiraciones = reservas
      .filter(r => r.expiresAt > ahora && r.expiresAt <= ahora + (10 * 60 * 1000))
      .sort((a, b) => a.expiresAt - b.expiresAt)
      .slice(0, 5)
      .map(r => ({
        slotId: r.slotId,
        clienteId: r.clienteId,
        expiresAt: new Date(r.expiresAt).toISOString(),
        expiresIn: Math.ceil((r.expiresAt - ahora) / 1000)
      }));
    
    estadisticas.proximasExpiraciones = proximasExpiraciones;
    
    return estadisticas;
  }

  // Proceso de limpieza automática
  startCleanupProcess() {
    // Ejecutar limpieza cada 30 segundos
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredReservations();
    }, 30000);
    
    slotLogger.info('Proceso de limpieza automática iniciado');
  }

  // Limpiar reservas expiradas
  cleanupExpiredReservations() {
    try {
      const ahora = Date.now();
      const reservasExpiradas = [];
      
      for (const [slotId, reserva] of this.temporaryReservations) {
        if (reserva.expiresAt <= ahora) {
          this.temporaryReservations.delete(slotId);
          reservasExpiradas.push(slotId);
        }
      }
      
      if (reservasExpiradas.length > 0) {
        slotLogger.info('Reservas expiradas limpiadas', {
          cantidad: reservasExpiradas.length,
          slots: reservasExpiradas
        });
      }
      
    } catch (error) {
      slotLogger.error('Error en limpieza automática:', error);
    }
  }

  // Detener proceso de limpieza
  stopCleanupProcess() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      slotLogger.info('Proceso de limpieza automática detenido');
    }
  }

  // Obtener todas las reservas (para debugging)
  getAllReservations() {
    return Array.from(this.temporaryReservations.entries()).map(([slotId, reserva]) => ({
      slotId,
      ...reserva,
      expiresAt: new Date(reserva.expiresAt).toISOString()
    }));
  }
}

module.exports = new SlotManager();
