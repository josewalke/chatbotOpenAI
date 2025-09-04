const express = require('express');
const router = express.Router();
const Joi = require('joi');
const { v4: uuidv4 } = require('uuid');
const moment = require('moment');
const openaiService = require('../services/openaiService');

// Simulación de base de datos de citas (en producción usar DB real)
const bookings = new Map();

// Esquemas de validación
const searchSlotsSchema = Joi.object({
  serviceId: Joi.string().required(),
  professionalId: Joi.string().optional(),
  startDate: Joi.string().isoDate().required(),
  endDate: Joi.string().isoDate().required(),
  preferredTimes: Joi.array().items(Joi.string()).optional()
});

const createBookingSchema = Joi.object({
  slotId: Joi.string().required(),
  serviceId: Joi.string().required(),
  professionalId: Joi.string().required(),
  customerInfo: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    email: Joi.string().email().required(),
    phone: Joi.string().pattern(/^\+?[\d\s\-\(\)]+$/).required()
  }).required(),
  date: Joi.string().isoDate().required(),
  time: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).required()
});

// GET /api/booking/slots/search - Buscar slots disponibles
router.get('/slots/search', async (req, res) => {
  try {
    const { error, value } = searchSlotsSchema.validate(req.query);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { serviceId, professionalId, startDate, endDate, preferredTimes } = value;

    // Generar slots disponibles usando OpenAI
    const slots = await openaiService.generateBookingSlots(serviceId, [startDate, endDate]);

    // Filtrar por profesional si se especifica
    let availableSlots = slots.slots;
    if (professionalId) {
      availableSlots = availableSlots.filter(slot => slot.professional === professionalId);
    }

    // Filtrar por horarios preferidos si se especifican
    if (preferredTimes && preferredTimes.length > 0) {
      availableSlots = availableSlots.filter(slot => {
        const slotHour = parseInt(slot.time.split(':')[0]);
        return preferredTimes.some(pref => {
          const prefHour = parseInt(pref.split(':')[0]);
          return Math.abs(slotHour - prefHour) <= 2; // ±2 horas de tolerancia
        });
      });
    }

    res.json({
      success: true,
      slots: availableSlots,
      searchCriteria: {
        serviceId,
        professionalId,
        startDate,
        endDate,
        preferredTimes
      }
    });

  } catch (error) {
    console.error('Error buscando slots:', error);
    res.status(500).json({ error: 'Error al buscar slots disponibles' });
  }
});

// POST /api/booking/create - Crear nueva cita
router.post('/create', async (req, res) => {
  try {
    const { error, value } = createBookingSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { slotId, serviceId, professionalId, customerInfo, date, time } = value;

    // Verificar que el slot esté disponible
    const conflictingBooking = Array.from(bookings.values()).find(booking => 
      booking.professionalId === professionalId &&
      booking.date === date &&
      booking.time === time &&
      booking.status !== 'cancelled'
    );

    if (conflictingBooking) {
      return res.status(409).json({ error: 'El horario seleccionado ya no está disponible' });
    }

    // Crear la cita
    const bookingId = uuidv4();
    const booking = {
      id: bookingId,
      slotId,
      serviceId,
      professionalId,
      customerInfo,
      date,
      time,
      status: 'confirmed',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: {
        source: 'web',
        ip: req.ip,
        userAgent: req.get('User-Agent')
      }
    };

    bookings.set(bookingId, booking);

    res.json({
      success: true,
      booking: {
        id: booking.id,
        serviceId: booking.serviceId,
        professionalId: booking.professionalId,
        customerInfo: booking.customerInfo,
        date: booking.date,
        time: booking.time,
        status: booking.status
      },
      message: 'Cita confirmada exitosamente'
    });

  } catch (error) {
    console.error('Error creando cita:', error);
    res.status(500).json({ error: 'Error al crear la cita' });
  }
});

// GET /api/booking/:id - Obtener cita específica
router.get('/:id', (req, res) => {
  const booking = bookings.get(req.params.id);
  
  if (!booking) {
    return res.status(404).json({ error: 'Cita no encontrada' });
  }
  
  res.json({
    success: true,
    booking: booking
  });
});

// PUT /api/booking/:id/status - Actualizar estado de cita
router.put('/:id/status', (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['confirmed', 'pending', 'cancelled', 'completed'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Estado no válido' });
    }

    const booking = bookings.get(req.params.id);
    if (!booking) {
      return res.status(404).json({ error: 'Cita no encontrada' });
    }

    booking.status = status;
    booking.updatedAt = new Date().toISOString();

    res.json({
      success: true,
      booking: {
        id: booking.id,
        status: booking.status,
        updatedAt: booking.updatedAt
      }
    });

  } catch (error) {
    console.error('Error actualizando cita:', error);
    res.status(500).json({ error: 'Error al actualizar la cita' });
  }
});

// DELETE /api/booking/:id - Cancelar cita
router.delete('/:id', (req, res) => {
  try {
    const booking = bookings.get(req.params.id);
    if (!booking) {
      return res.status(404).json({ error: 'Cita no encontrada' });
    }

    booking.status = 'cancelled';
    booking.updatedAt = new Date().toISOString();
    booking.cancelledAt = new Date().toISOString();

    res.json({
      success: true,
      message: 'Cita cancelada exitosamente'
    });

  } catch (error) {
    console.error('Error cancelando cita:', error);
    res.status(500).json({ error: 'Error al cancelar la cita' });
  }
});

// GET /api/booking/customer/:email - Obtener citas de un cliente
router.get('/customer/:email', (req, res) => {
  try {
    const customerBookings = Array.from(bookings.values()).filter(booking => 
      booking.customerInfo.email === req.params.email
    );

    res.json({
      success: true,
      bookings: customerBookings.map(booking => ({
        id: booking.id,
        serviceId: booking.serviceId,
        professionalId: booking.professionalId,
        date: booking.date,
        time: booking.time,
        status: booking.status,
        createdAt: booking.createdAt
      }))
    });

  } catch (error) {
    console.error('Error obteniendo citas del cliente:', error);
    res.status(500).json({ error: 'Error al obtener las citas' });
  }
});

// GET /api/booking/professional/:id - Obtener citas de un profesional
router.get('/professional/:id', (req, res) => {
  try {
    const professionalBookings = Array.from(bookings.values()).filter(booking => 
      booking.professionalId === req.params.id
    );

    res.json({
      success: true,
      bookings: professionalBookings.map(booking => ({
        id: booking.id,
        serviceId: booking.serviceId,
        customerInfo: booking.customerInfo,
        date: booking.date,
        time: booking.time,
        status: booking.status
      }))
    });

  } catch (error) {
    console.error('Error obteniendo citas del profesional:', error);
    res.status(500).json({ error: 'Error al obtener las citas' });
  }
});

module.exports = router;
