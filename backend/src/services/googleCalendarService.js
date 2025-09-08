const { google } = require('googleapis');
const winston = require('winston');

// Logger específico para Google Calendar
const calendarLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.json()
  ),
  defaultMeta: { service: 'google-calendar' },
  transports: [
    new winston.transports.File({ filename: 'logs/google-calendar.log' })
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

class GoogleCalendarIntegration {
  constructor() {
    this.auth = null;
    this.calendar = null;
    this.calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';
    this.isConfigured = false;
    
    this.initializeAuth();
  }

  // Inicializar autenticación con Google Calendar
  async initializeAuth() {
    try {
      // Para desarrollo, usar credenciales de servicio o OAuth2
      if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
        const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
        this.auth = new google.auth.GoogleAuth({
          credentials,
          scopes: ['https://www.googleapis.com/auth/calendar']
        });
      } else if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
        this.auth = new google.auth.OAuth2(
          process.env.GOOGLE_CLIENT_ID,
          process.env.GOOGLE_CLIENT_SECRET,
          process.env.GOOGLE_REDIRECT_URI || 'http://localhost:8080/auth/google/callback'
        );
      } else {
        calendarLogger.warn('Google Calendar no configurado - usando modo simulación');
        return;
      }

      this.calendar = google.calendar({ version: 'v3', auth: this.auth });
      this.isConfigured = true;
      
      calendarLogger.info('Google Calendar inicializado correctamente');
    } catch (error) {
      calendarLogger.error('Error inicializando Google Calendar:', error);
    }
  }

  // Obtener eventos ocupados en un rango de tiempo
  async getBusyTimes(startTime, endTime, calendarIds = []) {
    try {
      if (!this.isConfigured) {
        return this.simulateBusyTimes(startTime, endTime);
      }

      const calendars = calendarIds.length > 0 ? calendarIds : [this.calendarId];
      
      const response = await this.calendar.freebusy.query({
        requestBody: {
          timeMin: startTime,
          timeMax: endTime,
          items: calendars.map(id => ({ id }))
        }
      });

      calendarLogger.info('Busy times obtenidos', {
        startTime,
        endTime,
        calendars: calendars.length
      });

      return response.data.calendars;
    } catch (error) {
      calendarLogger.error('Error obteniendo busy times:', error);
      return this.simulateBusyTimes(startTime, endTime);
    }
  }

  // Crear evento en el calendario
  async createEvent(eventData) {
    try {
      if (!this.isConfigured) {
        return this.simulateCreateEvent(eventData);
      }

      const event = {
        summary: eventData.summary || 'Cita Clínica Estética',
        description: eventData.description || '',
        start: {
          dateTime: eventData.startTime,
          timeZone: 'Europe/Madrid'
        },
        end: {
          dateTime: eventData.endTime,
          timeZone: 'Europe/Madrid'
        },
        attendees: eventData.attendees || [],
        location: eventData.location || process.env.CLINIC_ADDRESS,
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 }, // 24 horas antes
            { method: 'popup', minutes: 60 }       // 1 hora antes
          ]
        }
      };

      const response = await this.calendar.events.insert({
        calendarId: this.calendarId,
        resource: event
      });

      calendarLogger.info('Evento creado en Google Calendar', {
        eventId: response.data.id,
        summary: event.summary
      });

      return {
        success: true,
        eventId: response.data.id,
        event: response.data
      };
    } catch (error) {
      calendarLogger.error('Error creando evento:', error);
      return {
        success: false,
        message: 'Error creando evento en Google Calendar'
      };
    }
  }

  // Actualizar evento existente
  async updateEvent(eventId, eventData) {
    try {
      if (!this.isConfigured) {
        return this.simulateUpdateEvent(eventId, eventData);
      }

      const event = {
        summary: eventData.summary,
        description: eventData.description,
        start: {
          dateTime: eventData.startTime,
          timeZone: 'Europe/Madrid'
        },
        end: {
          dateTime: eventData.endTime,
          timeZone: 'Europe/Madrid'
        },
        attendees: eventData.attendees || [],
        location: eventData.location || process.env.CLINIC_ADDRESS
      };

      const response = await this.calendar.events.update({
        calendarId: this.calendarId,
        eventId: eventId,
        resource: event
      });

      calendarLogger.info('Evento actualizado en Google Calendar', {
        eventId: eventId
      });

      return {
        success: true,
        event: response.data
      };
    } catch (error) {
      calendarLogger.error('Error actualizando evento:', error);
      return {
        success: false,
        message: 'Error actualizando evento en Google Calendar'
      };
    }
  }

  // Eliminar evento
  async deleteEvent(eventId) {
    try {
      if (!this.isConfigured) {
        return this.simulateDeleteEvent(eventId);
      }

      await this.calendar.events.delete({
        calendarId: this.calendarId,
        eventId: eventId
      });

      calendarLogger.info('Evento eliminado de Google Calendar', {
        eventId: eventId
      });

      return { success: true };
    } catch (error) {
      calendarLogger.error('Error eliminando evento:', error);
      return {
        success: false,
        message: 'Error eliminando evento de Google Calendar'
      };
    }
  }

  // Obtener eventos de un día específico
  async getEventsForDay(date) {
    try {
      if (!this.isConfigured) {
        return this.simulateGetEventsForDay(date);
      }

      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const response = await this.calendar.events.list({
        calendarId: this.calendarId,
        timeMin: startOfDay.toISOString(),
        timeMax: endOfDay.toISOString(),
        singleEvents: true,
        orderBy: 'startTime'
      });

      return {
        success: true,
        events: response.data.items || []
      };
    } catch (error) {
      calendarLogger.error('Error obteniendo eventos del día:', error);
      return {
        success: false,
        events: []
      };
    }
  }

  // Simular busy times para desarrollo
  simulateBusyTimes(startTime, endTime) {
    const busyTimes = {};
    const calendars = [this.calendarId];
    
    calendars.forEach(calendarId => {
      busyTimes[calendarId] = {
        busy: [
          {
            start: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 horas desde ahora
            end: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString()   // 3 horas desde ahora
          }
        ]
      };
    });

    calendarLogger.info('Simulando busy times para desarrollo');
    return busyTimes;
  }

  // Simular creación de evento para desarrollo
  simulateCreateEvent(eventData) {
    const eventId = `sim_${Date.now()}`;
    calendarLogger.info('Simulando creación de evento', { eventId });
    
    return {
      success: true,
      eventId: eventId,
      event: {
        id: eventId,
        summary: eventData.summary,
        start: { dateTime: eventData.startTime },
        end: { dateTime: eventData.endTime }
      }
    };
  }

  // Simular actualización de evento para desarrollo
  simulateUpdateEvent(eventId, eventData) {
    calendarLogger.info('Simulando actualización de evento', { eventId });
    return { success: true };
  }

  // Simular eliminación de evento para desarrollo
  simulateDeleteEvent(eventId) {
    calendarLogger.info('Simulando eliminación de evento', { eventId });
    return { success: true };
  }

  // Simular obtención de eventos del día para desarrollo
  simulateGetEventsForDay(date) {
    calendarLogger.info('Simulando obtención de eventos del día', { date });
    return {
      success: true,
      events: []
    };
  }

  // Verificar si Google Calendar está configurado
  isGoogleCalendarConfigured() {
    return this.isConfigured;
  }

  // Obtener configuración actual
  getConfiguration() {
    return {
      isConfigured: this.isConfigured,
      calendarId: this.calendarId,
      hasServiceAccount: !!process.env.GOOGLE_SERVICE_ACCOUNT_KEY,
      hasOAuth2: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
    };
  }
}

module.exports = new GoogleCalendarIntegration();
