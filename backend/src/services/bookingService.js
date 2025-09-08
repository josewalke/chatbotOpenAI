const axios = require('axios');

class BookingService {
  constructor() {
    this.baseUrl = 'http://localhost:5000/api';
  }

  // Crear una nueva cita
  async createBooking(bookingData) {
    try {
      const response = await axios.post(`${this.baseUrl}/booking/create`, bookingData);
      return {
        success: true,
        booking: response.data.booking
      };
    } catch (error) {
      console.error('Error creating booking:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  // Obtener todas las citas
  async getAllBookings() {
    try {
      const response = await axios.get(`${this.baseUrl}/booking`);
      return {
        success: true,
        bookings: response.data.bookings
      };
    } catch (error) {
      console.error('Error getting bookings:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  // Obtener cita por ID
  async getBookingById(bookingId) {
    try {
      const response = await axios.get(`${this.baseUrl}/booking/${bookingId}`);
      return {
        success: true,
        booking: response.data.booking
      };
    } catch (error) {
      console.error('Error getting booking:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  // Buscar citas por email del cliente
  async getBookingsByEmail(email) {
    try {
      const response = await axios.get(`${this.baseUrl}/booking/customer/${email}`);
      return {
        success: true,
        bookings: response.data.bookings
      };
    } catch (error) {
      console.error('Error getting customer bookings:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  // Cancelar cita
  async cancelBooking(bookingId) {
    try {
      const response = await axios.delete(`${this.baseUrl}/booking/${bookingId}`);
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
      'hidratación facial profunda': '1',
      'peeling químico': '2', 
      'radiofrecuencia facial': '3',
      'cavitación ultrasónica': '4',
      'presoterapia': '5',
      'mesoterapia corporal': '6',
      'depilación láser': '7',
      'depilación con cera': '8',
      'manicura spa': '9',
      'pedicura spa': '10',
      'microneedling': '11',
      'tratamiento antienvejecimiento': '12'
    };

    return serviceMapping[serviceName?.toLowerCase()] || serviceName;
  }

  // Convertir fecha relativa a fecha específica
  parseDate(dateString) {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    if (dateString.toLowerCase().includes('mañana')) {
      return tomorrow.toISOString().split('T')[0];
    }
    
    // Si es una fecha específica, intentar parsearla
    if (dateString.match(/\d{4}-\d{2}-\d{2}/)) {
      return dateString;
    }

    // Por defecto, usar mañana
    return tomorrow.toISOString().split('T')[0];
  }

  // Convertir hora a formato HH:MM
  parseTime(timeString) {
    // Si ya está en formato HH:MM, devolverlo
    if (timeString.match(/^\d{1,2}:\d{2}$/)) {
      return timeString;
    }

    // Convertir "5 de la tarde" a "17:00"
    if (timeString.toLowerCase().includes('5') && timeString.toLowerCase().includes('tarde')) {
      return '17:00';
    }

    // Convertir "5 pm" a "17:00"
    if (timeString.toLowerCase().includes('5') && timeString.toLowerCase().includes('pm')) {
      return '17:00';
    }

    // Por defecto, usar 17:00
    return '17:00';
  }
}

module.exports = new BookingService();
