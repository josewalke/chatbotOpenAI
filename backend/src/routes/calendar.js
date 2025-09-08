const express = require('express');
const router = express.Router();
const calendarService = require('../services/calendarService');
const slotManager = require('../services/slotManager');
const googleCalendarService = require('../services/googleCalendarService');
const winston = require('winston');

// Logger específico para rutas de calendario
const calendarLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.json()
  ),
  defaultMeta: { service: 'calendar-routes' },
  transports: [
    new winston.transports.File({ filename: 'logs/calendar.log' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  calendarLogger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// Buscar slots disponibles
router.post('/slots/search', async (req, res) => {
  try {
    const { servicioId, ventanaCliente, profesionalPreferido } = req.body;
    
    calendarLogger.info('API Request - Buscar slots disponibles', {
      servicioId,
      ventanaCliente,
      profesionalPreferido,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    if (!servicioId || !ventanaCliente) {
      return res.status(400).json({
        success: false,
        message: 'servicioId y ventanaCliente son requeridos'
      });
    }

    const resultado = await calendarService.buscarHuecos(
      servicioId,
      ventanaCliente,
      profesionalPreferido
    );

    calendarLogger.info('API Response - Slots encontrados', {
      total: resultado.opciones?.length || 0,
      statusCode: resultado.success ? 200 : 400
    });

    res.status(resultado.success ? 200 : 400).json(resultado);

  } catch (error) {
    calendarLogger.error('Error buscando slots:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

// Reservar slot temporalmente
router.post('/slots/reserve', async (req, res) => {
  try {
    const { slotId, clienteId, ttl } = req.body;
    
    calendarLogger.info('API Request - Reservar slot temporal', {
      slotId,
      clienteId,
      ttl,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    if (!slotId || !clienteId) {
      return res.status(400).json({
        success: false,
        message: 'slotId y clienteId son requeridos'
      });
    }

    const resultado = await slotManager.reservarTemporal(slotId, clienteId, ttl);

    calendarLogger.info('API Response - Slot reservado', {
      success: resultado.success,
      expiresIn: resultado.expiresIn,
      statusCode: resultado.success ? 200 : 400
    });

    res.status(resultado.success ? 200 : 400).json(resultado);

  } catch (error) {
    calendarLogger.error('Error reservando slot:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

// Confirmar reserva
router.post('/slots/confirm', async (req, res) => {
  try {
    const { slotId, clienteId, datosCita } = req.body;
    
    calendarLogger.info('API Request - Confirmar reserva', {
      slotId,
      clienteId,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    if (!slotId || !clienteId || !datosCita) {
      return res.status(400).json({
        success: false,
        message: 'slotId, clienteId y datosCita son requeridos'
      });
    }

    const resultado = await calendarService.confirmarCita(slotId, clienteId, datosCita);

    calendarLogger.info('API Response - Reserva confirmada', {
      success: resultado.success,
      bookingId: resultado.cita?.id,
      statusCode: resultado.success ? 200 : 400
    });

    res.status(resultado.success ? 200 : 400).json(resultado);

  } catch (error) {
    calendarLogger.error('Error confirmando reserva:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

// Liberar reserva temporal
router.delete('/slots/:slotId/reserve', async (req, res) => {
  try {
    const { slotId } = req.params;
    const { clienteId } = req.body;
    
    calendarLogger.info('API Request - Liberar reserva', {
      slotId,
      clienteId,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    const resultado = await slotManager.liberarReserva(slotId, clienteId);

    calendarLogger.info('API Response - Reserva liberada', {
      success: resultado.success,
      statusCode: resultado.success ? 200 : 400
    });

    res.status(resultado.success ? 200 : 400).json(resultado);

  } catch (error) {
    calendarLogger.error('Error liberando reserva:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

// Verificar disponibilidad de slot
router.get('/slots/:slotId/availability', async (req, res) => {
  try {
    const { slotId } = req.params;
    
    calendarLogger.info('API Request - Verificar disponibilidad', {
      slotId,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    const resultado = await slotManager.verificarDisponibilidad(slotId);

    calendarLogger.info('API Response - Disponibilidad verificada', {
      available: resultado.available,
      statusCode: 200
    });

    res.json(resultado);

  } catch (error) {
    calendarLogger.error('Error verificando disponibilidad:', error);
    res.status(500).json({
      available: false,
      error: 'Error interno del servidor'
    });
  }
});

// Obtener estadísticas del calendario
router.get('/stats', async (req, res) => {
  try {
    calendarLogger.info('API Request - Obtener estadísticas', {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    const estadisticasCalendario = calendarService.getEstadisticas();
    const estadisticasSlots = slotManager.getEstadisticas();
    const configuracionGoogle = googleCalendarService.getConfiguration();

    const estadisticas = {
      calendario: estadisticasCalendario,
      slots: estadisticasSlots,
      googleCalendar: configuracionGoogle,
      timestamp: new Date().toISOString()
    };

    calendarLogger.info('API Response - Estadísticas obtenidas', {
      statusCode: 200
    });

    res.json({
      success: true,
      data: estadisticas
    });

  } catch (error) {
    calendarLogger.error('Error obteniendo estadísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

// Obtener profesionales disponibles
router.get('/professionals', async (req, res) => {
  try {
    calendarLogger.info('API Request - Obtener profesionales', {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    const estadisticas = calendarService.getEstadisticas();
    const profesionales = Array.from(calendarService.professionals.values()).map(prof => ({
      id: prof.id,
      name: prof.name,
      skills: prof.skills,
      room: prof.room,
      maxConcurrentBookings: prof.maxConcurrentBookings
    }));

    calendarLogger.info('API Response - Profesionales obtenidos', {
      total: profesionales.length,
      statusCode: 200
    });

    res.json({
      success: true,
      data: profesionales
    });

  } catch (error) {
    calendarLogger.error('Error obteniendo profesionales:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

// Obtener recursos disponibles
router.get('/resources', async (req, res) => {
  try {
    calendarLogger.info('API Request - Obtener recursos', {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    const recursos = Array.from(calendarService.resources.values()).map(resource => ({
      id: resource.id,
      name: resource.name,
      type: resource.type,
      equipment: resource.equipment,
      room: resource.room
    }));

    calendarLogger.info('API Response - Recursos obtenidos', {
      total: recursos.length,
      statusCode: 200
    });

    res.json({
      success: true,
      data: recursos
    });

  } catch (error) {
    calendarLogger.error('Error obteniendo recursos:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

// Obtener reservas temporales (para debugging)
router.get('/reservations', async (req, res) => {
  try {
    calendarLogger.info('API Request - Obtener reservas temporales', {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    const reservas = slotManager.getAllReservations();

    calendarLogger.info('API Response - Reservas obtenidas', {
      total: reservas.length,
      statusCode: 200
    });

    res.json({
      success: true,
      data: reservas
    });

  } catch (error) {
    calendarLogger.error('Error obteniendo reservas:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

// Liberar todas las reservas de un cliente
router.delete('/reservations/client/:clienteId', async (req, res) => {
  try {
    const { clienteId } = req.params;
    
    calendarLogger.info('API Request - Liberar reservas del cliente', {
      clienteId,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    const resultado = await slotManager.liberarReservasCliente(clienteId);

    calendarLogger.info('API Response - Reservas del cliente liberadas', {
      success: resultado.success,
      liberadas: resultado.liberadas,
      statusCode: resultado.success ? 200 : 400
    });

    res.status(resultado.success ? 200 : 400).json(resultado);

  } catch (error) {
    calendarLogger.error('Error liberando reservas del cliente:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

module.exports = router;
