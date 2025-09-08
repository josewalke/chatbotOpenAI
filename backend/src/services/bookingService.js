const axios = require('axios');
const calendarService = require('./calendarService');
const slotManager = require('./slotManager');

class BookingService {
  constructor() {
    this.baseUrl = 'http://localhost:8080/api';
  }

  // Crear una nueva cita usando el nuevo sistema de calendario
  async createBooking(bookingData) {
    try {
      // Generar un ID único para el cliente
      const clienteId = `cliente_${Date.now()}`;
      
      // Crear datos de cita para el sistema de calendario
      const datosCita = {
        servicio: bookingData.serviceId,
        cliente: {
          nombre: bookingData.customerInfo.name,
          telefono: bookingData.customerInfo.phone,
          email: bookingData.customerInfo.email
        },
        fecha: bookingData.date,
        hora: bookingData.time,
        profesional: bookingData.professionalId,
        sala: 'sala_1', // Por defecto
        notas: ''
      };

      // Usar el sistema de calendario directamente
      const resultado = await calendarService.confirmarCita(
        bookingData.slotId, 
        clienteId, 
        datosCita
      );

      if (resultado.success) {
        return {
          success: true,
          booking: {
            id: resultado.cita.id,
            ...datosCita,
            slotId: bookingData.slotId,
            clienteId: clienteId
          }
        };
      } else {
        return {
          success: false,
          error: resultado.message
        };
      }
    } catch (error) {
      console.error('Error creating booking:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Obtener todas las citas
  async getAllBookings() {
    try {
      const response = await axios.get(`${this.baseUrl}/booking`);
      return {
        success: true,
        bookings: response.data.bookings || []
      };
    } catch (error) {
      console.error('Error getting bookings:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  // Buscar citas por término
  async searchBookings(searchTerm) {
    try {
      const response = await axios.get(`${this.baseUrl}/booking/search`, {
        params: { q: searchTerm }
      });
      return {
        success: true,
        bookings: response.data.bookings || []
      };
    } catch (error) {
      console.error('Error searching bookings:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  // Actualizar una cita existente
  async updateBooking(bookingId, updateData) {
    try {
      const response = await axios.put(`${this.baseUrl}/booking/${bookingId}`, updateData);
      return {
        success: true,
        booking: response.data.booking
      };
    } catch (error) {
      console.error('Error updating booking:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  // Cancelar una cita
  async cancelBooking(bookingId, reason) {
    try {
      const response = await axios.delete(`${this.baseUrl}/booking/${bookingId}`, {
        data: { reason }
      });
      return {
        success: true,
        message: response.data.message
      };
    } catch (error) {
      console.error('Error canceling booking:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  // Mapear nombre de servicio a ID
  getServiceId(serviceName) {
    const serviceMapping = {
      'hidratación facial profunda': 'hidratación facial profunda',
      'peeling químico': 'peeling químico', 
      'radiofrecuencia facial': 'radiofrecuencia facial',
      'cavitación ultrasónica': 'cavitación ultrasónica',
      'presoterapia': 'presoterapia',
      'mesoterapia corporal': 'mesoterapia corporal',
      'depilación láser': 'depilación láser',
      'depilación con cera': 'depilación con cera',
      'manicura spa': 'manicura spa',
      'pedicura spa': 'pedicura spa',
      'microneedling': 'microneedling',
      'tratamiento antienvejecimiento': 'tratamiento antienvejecimiento'
    };

    return serviceMapping[serviceName.toLowerCase()] || serviceName;
  }

  // Obtener información de un servicio
  getServiceInfo(serviceId) {
    const services = {
      'hidratación facial profunda': {
        id: 'hidratación facial profunda',
        name: 'Hidratación Facial Profunda',
        duration: 90,
        price: 65,
        description: 'Tratamiento facial intensivo para hidratar y nutrir la piel en profundidad'
      },
      'peeling químico': {
        id: 'peeling químico',
        name: 'Peeling Químico',
        duration: 90,
        price: 80,
        description: 'Renovación celular mediante ácidos para mejorar la textura de la piel'
      },
      'radiofrecuencia facial': {
        id: 'radiofrecuencia facial',
        name: 'Radiofrecuencia Facial',
        duration: 75,
        price: 95,
        description: 'Tratamiento de radiofrecuencia para tensar y rejuvenecer la piel'
      },
      'cavitación ultrasónica': {
        id: 'cavitación ultrasónica',
        name: 'Cavitación Ultrasónica',
        duration: 60,
        price: 70,
        description: 'Tratamiento corporal para reducir grasa localizada'
      },
      'presoterapia': {
        id: 'presoterapia',
        name: 'Presoterapia',
        duration: 45,
        price: 50,
        description: 'Tratamiento de drenaje linfático mediante presión controlada'
      },
      'mesoterapia corporal': {
        id: 'mesoterapia corporal',
        name: 'Mesoterapia Corporal',
        duration: 60,
        price: 85,
        description: 'Inyección de vitaminas y principios activos para mejorar la piel corporal'
      },
      'depilación láser': {
        id: 'depilación láser',
        name: 'Depilación Láser',
        duration: 30,
        price: 40,
        description: 'Depilación permanente mediante tecnología láser'
      },
      'depilación con cera': {
        id: 'depilación con cera',
        name: 'Depilación con Cera',
        duration: 45,
        price: 25,
        description: 'Depilación tradicional con cera caliente'
      },
      'manicura spa': {
        id: 'manicura spa',
        name: 'Manicura Spa',
        duration: 60,
        price: 35,
        description: 'Cuidado completo de manos con tratamientos hidratantes'
      },
      'pedicura spa': {
        id: 'pedicura spa',
        name: 'Pedicura Spa',
        duration: 75,
        price: 45,
        description: 'Cuidado completo de pies con tratamientos relajantes'
      },
      'microneedling': {
        id: 'microneedling',
        name: 'Microneedling',
        duration: 90,
        price: 120,
        description: 'Tratamiento de microagujas para estimular la regeneración celular'
      },
      'tratamiento antienvejecimiento': {
        id: 'tratamiento antienvejecimiento',
        name: 'Tratamiento Antienvejecimiento',
        duration: 120,
        price: 150,
        description: 'Tratamiento completo anti-edad con múltiples técnicas'
      }
    };

    return services[serviceId] || null;
  }

  // Obtener todos los servicios disponibles
  getAllServices() {
    return Object.values(this.getServiceInfo('hidratación facial profunda') ? 
      Object.keys(this.getServiceInfo('hidratación facial profunda')).map(key => 
        this.getServiceInfo(key)
      ).filter(Boolean) : []);
  }
}

module.exports = new BookingService();