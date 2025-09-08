const { v4: uuidv4 } = require('uuid');
const fs = require('fs').promises;
const path = require('path');

class CalendarService {
  constructor() {
    this.professionals = new Map();
    this.resources = new Map();
    this.timeSlots = new Map();
    this.temporaryReservations = new Map();
    this.workingHours = {
      monday: { start: '09:00', end: '20:00' },
      tuesday: { start: '09:00', end: '20:00' },
      wednesday: { start: '09:00', end: '20:00' },
      thursday: { start: '09:00', end: '20:00' },
      friday: { start: '09:00', end: '20:00' },
      saturday: { start: '09:00', end: '18:00' },
      sunday: null // Cerrado
    };
    
    this.initializeData();
  }

  // Inicializar datos de profesionales y recursos
  async initializeData() {
    try {
      // Cargar profesionales
      const professionalsData = [
        {
          id: 'prof_ana',
          name: 'Ana García',
          skills: ['hidratación facial profunda', 'peeling químico', 'radiofrecuencia facial', 'microneedling'],
          workingHours: this.workingHours,
          maxConcurrentBookings: 1,
          room: 'sala_1'
        },
        {
          id: 'prof_laura',
          name: 'Laura Martínez',
          skills: ['cavitación ultrasónica', 'presoterapia', 'mesoterapia corporal', 'depilación láser'],
          workingHours: this.workingHours,
          maxConcurrentBookings: 1,
          room: 'sala_2'
        },
        {
          id: 'prof_carmen',
          name: 'Carmen López',
          skills: ['depilación con cera', 'manicura spa', 'pedicura spa', 'tratamiento antienvejecimiento'],
          workingHours: this.workingHours,
          maxConcurrentBookings: 1,
          room: 'sala_3'
        }
      ];

      professionalsData.forEach(prof => {
        this.professionals.set(prof.id, prof);
      });

      // Cargar recursos (salas y equipos)
      const resourcesData = [
        { id: 'sala_1', name: 'Sala Facial', type: 'room', equipment: ['radiofrecuencia', 'microneedling'] },
        { id: 'sala_2', name: 'Sala Corporal', type: 'room', equipment: ['cavitación', 'presoterapia'] },
        { id: 'sala_3', name: 'Sala Depilación', type: 'room', equipment: ['láser', 'cera'] },
        { id: 'equipo_radiofrecuencia', name: 'Radiofrecuencia Facial', type: 'equipment', room: 'sala_1' },
        { id: 'equipo_cavitacion', name: 'Cavitación Ultrasónica', type: 'equipment', room: 'sala_2' },
        { id: 'equipo_laser', name: 'Láser Depilación', type: 'equipment', room: 'sala_3' }
      ];

      resourcesData.forEach(resource => {
        this.resources.set(resource.id, resource);
      });

      console.log('✅ CalendarService inicializado con profesionales y recursos');
    } catch (error) {
      console.error('❌ Error inicializando CalendarService:', error);
    }
  }

  // Buscar huecos disponibles
  async buscarHuecos(servicioId, ventanaCliente, profesionalPreferido = null) {
    try {
      const duracion = await this.calcularDuracion(servicioId);
      const recursosRequeridos = await this.obtenerRecursosRequeridos(servicioId);
      
      const candidatos = [];
      
      // 1. Obtener profesionales válidos para el servicio
      const profesionalesValidos = profesionalPreferido 
        ? [this.professionals.get(profesionalPreferido)].filter(Boolean)
        : this.getProfesionalesValidos(servicioId);
      
      if (profesionalesValidos.length === 0) {
        return { success: false, message: 'No hay profesionales disponibles para este servicio' };
      }
      
      // 2. Para cada profesional, buscar huecos disponibles
      for (const profesional of profesionalesValidos) {
        const slots = await this.getHuecosDisponibles(
          profesional, 
          duracion, 
          ventanaCliente, 
          recursosRequeridos
        );
        
        // 3. Calcular score de optimización para cada slot
        for (const slot of slots) {
          const score = this.calcularScore(slot, profesional, duracion);
          candidatos.push({ 
            slot, 
            profesional, 
            score,
            duracion,
            recursos: recursosRequeridos
          });
        }
      }
      
      // 4. Ordenar por score y retornar top 5 mejores opciones
      const mejoresOpciones = candidatos
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
      
      return {
        success: true,
        opciones: mejoresOpciones,
        total: mejoresOpciones.length
      };
      
    } catch (error) {
      console.error('Error buscando huecos:', error);
      return { success: false, message: 'Error interno del sistema' };
    }
  }

  // Calcular duración total del servicio (incluyendo buffers)
  async calcularDuracion(servicioId) {
    const duraciones = {
      'hidratación facial profunda': 90, // 60 min + 30 min buffer
      'peeling químico': 90,
      'radiofrecuencia facial': 75,
      'cavitación ultrasónica': 60,
      'presoterapia': 45,
      'mesoterapia corporal': 60,
      'depilación láser': 30,
      'depilación con cera': 45,
      'manicura spa': 60,
      'pedicura spa': 75,
      'microneedling': 90,
      'tratamiento antienvejecimiento': 120
    };
    
    return duraciones[servicioId] || 60; // Default 60 minutos
  }

  // Obtener recursos requeridos para el servicio
  async obtenerRecursosRequeridos(servicioId) {
    const recursosPorServicio = {
      'hidratación facial profunda': ['sala_1'],
      'peeling químico': ['sala_1'],
      'radiofrecuencia facial': ['sala_1', 'equipo_radiofrecuencia'],
      'cavitación ultrasónica': ['sala_2', 'equipo_cavitacion'],
      'presoterapia': ['sala_2'],
      'mesoterapia corporal': ['sala_2'],
      'depilación láser': ['sala_3', 'equipo_laser'],
      'depilación con cera': ['sala_3'],
      'manicura spa': ['sala_3'],
      'pedicura spa': ['sala_3'],
      'microneedling': ['sala_1'],
      'tratamiento antienvejecimiento': ['sala_1']
    };
    
    return recursosPorServicio[servicioId] || ['sala_1'];
  }

  // Obtener profesionales válidos para un servicio
  getProfesionalesValidos(servicioId) {
    console.log('🔍 Buscando profesionales para servicio:', servicioId);
    console.log('📋 Profesionales disponibles:', Array.from(this.professionals.keys()));
    
    const profesionalesValidos = [];
    
    for (const [id, profesional] of this.professionals) {
      console.log(`👤 Profesional ${id}:`, profesional.skills);
      if (profesional.skills.includes(servicioId)) {
        console.log(`✅ ${id} puede realizar ${servicioId}`);
        profesionalesValidos.push(profesional);
      } else {
        console.log(`❌ ${id} NO puede realizar ${servicioId}`);
      }
    }
    
    console.log('🎯 Profesionales válidos encontrados:', profesionalesValidos.length);
    return profesionalesValidos;
  }

  // Obtener huecos disponibles para un profesional
  async getHuecosDisponibles(profesional, duracion, ventanaCliente, recursosRequeridos) {
    console.log('🕐 Generando slots para:', profesional.name);
    console.log('⏱️ Duración:', duracion, 'minutos');
    console.log('📅 Ventana:', ventanaCliente);
    
    const slots = [];
    const { desde, hasta, franjas } = ventanaCliente;
    
    // Generar slots cada 30 minutos en la ventana solicitada
    const startDate = new Date(desde);
    const endDate = new Date(hasta);
    
    console.log('📆 Desde:', startDate.toDateString());
    console.log('📆 Hasta:', endDate.toDateString());
    
    for (let fecha = new Date(startDate); fecha <= endDate; fecha.setDate(fecha.getDate() + 1)) {
      const diaSemana = fecha.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      const horarioDia = profesional.workingHours[diaSemana];
      
      console.log(`📅 ${fecha.toDateString()} (${diaSemana}):`, horarioDia);
      
      if (!horarioDia) {
        console.log('❌ Día cerrado');
        continue; // Día cerrado
      }
      
      const horaInicio = this.parseTime(horarioDia.start);
      const horaFin = this.parseTime(horarioDia.end);
      
      // Generar slots cada 30 minutos
      for (let hora = horaInicio; hora < horaFin; hora += 30) {
        const slotInicio = new Date(fecha);
        slotInicio.setHours(Math.floor(hora / 60), hora % 60, 0, 0);
        
        const slotFin = new Date(slotInicio);
        slotFin.setMinutes(slotFin.getMinutes() + duracion);
        
        // Verificar si el slot está disponible
        if (await this.verificarDisponibilidadSlot(slotInicio, slotFin, profesional, recursosRequeridos)) {
          slots.push({
            id: uuidv4(),
            inicio: slotInicio.toISOString(),
            fin: slotFin.toISOString(),
            profesional: profesional.name,
            profesionalId: profesional.id,
            sala: profesional.room,
            recursos: recursosRequeridos
          });
        }
      }
    }
    
    return slots;
  }

  // Verificar disponibilidad de un slot específico
  async verificarDisponibilidadSlot(inicio, fin, profesional, recursosRequeridos) {
    // Verificar que no haya conflictos con otras citas
    const conflictos = await this.buscarConflictos(inicio, fin, profesional.id, recursosRequeridos);
    
    if (conflictos.length > 0) {
      return false;
    }
    
    // Verificar que los recursos estén disponibles
    for (const recursoId of recursosRequeridos) {
      const recurso = this.resources.get(recursoId);
      if (recurso && recurso.type === 'equipment') {
        const conflictoRecurso = await this.buscarConflictosRecurso(inicio, fin, recursoId);
        if (conflictoRecurso.length > 0) {
          return false;
        }
      }
    }
    
    return true;
  }

  // Buscar conflictos de citas
  async buscarConflictos(inicio, fin, profesionalId, recursosRequeridos) {
    const conflictos = [];
    
    // Aquí se consultaría la base de datos real de citas
    // Por ahora simulamos con datos en memoria
    for (const [slotId, reserva] of this.temporaryReservations) {
      if (reserva.profesionalId === profesionalId) {
        const reservaInicio = new Date(reserva.inicio);
        const reservaFin = new Date(reserva.fin);
        
        // Verificar solapamiento
        if ((inicio < reservaFin && fin > reservaInicio)) {
          conflictos.push(reserva);
        }
      }
    }
    
    return conflictos;
  }

  // Buscar conflictos de recursos
  async buscarConflictosRecurso(inicio, fin, recursoId) {
    const conflictos = [];
    
    for (const [slotId, reserva] of this.temporaryReservations) {
      if (reserva.recursos && reserva.recursos.includes(recursoId)) {
        const reservaInicio = new Date(reserva.inicio);
        const reservaFin = new Date(reserva.fin);
        
        if ((inicio < reservaFin && fin > reservaInicio)) {
          conflictos.push(reserva);
        }
      }
    }
    
    return conflictos;
  }

  // Calcular score de optimización
  calcularScore(slot, profesional, duracion) {
    let score = 100; // Score base
    
    const slotInicio = new Date(slot.inicio);
    const ahora = new Date();
    
    // Penalizar slots muy lejanos en el tiempo
    const diasDiferencia = (slotInicio - ahora) / (1000 * 60 * 60 * 24);
    if (diasDiferencia > 30) score -= 20;
    if (diasDiferencia > 60) score -= 40;
    
    // Bonificar slots en horarios preferidos (tarde)
    const hora = slotInicio.getHours();
    if (hora >= 16 && hora <= 19) score += 10;
    
    // Bonificar slots en días de semana
    const diaSemana = slotInicio.getDay();
    if (diaSemana >= 1 && diaSemana <= 5) score += 5;
    
    // Penalizar slots muy temprano o muy tarde
    if (hora < 10 || hora > 18) score -= 15;
    
    return Math.max(0, score);
  }

  // Reservar slot temporalmente
  async reservarTemporal(slotId, clienteId, ttl = 300) {
    try {
      const reserva = {
        slotId,
        clienteId,
        timestamp: Date.now(),
        expiresAt: Date.now() + (ttl * 1000),
        ttl
      };
      
      this.temporaryReservations.set(slotId, reserva);
      
      // Programar liberación automática
      setTimeout(() => {
        this.temporaryReservations.delete(slotId);
      }, ttl * 1000);
      
      return { success: true, expiresIn: ttl };
    } catch (error) {
      return { success: false, message: 'Error reservando slot temporal' };
    }
  }

  // Confirmar cita y liberar otros slots temporales
  async confirmarCita(slotId, clienteId, datosCita) {
    try {
      // Verificar que el slot sigue disponible
      const reservaTemporal = this.temporaryReservations.get(slotId);
      if (!reservaTemporal || reservaTemporal.clienteId !== clienteId) {
        return { success: false, message: 'Slot no disponible o expirado' };
      }
      
      // Crear cita confirmada
      const cita = {
        id: uuidv4(),
        ...datosCita,
        slotId,
        estado: 'confirmada',
        createdAt: new Date().toISOString()
      };
      
      // Liberar todos los slots temporales del cliente
      this.liberarSlotsTemporales(clienteId);
      
      // Aquí se guardaría en base de datos real
      console.log('✅ Cita confirmada:', cita.id);
      
      return { success: true, cita };
    } catch (error) {
      return { success: false, message: 'Error confirmando cita' };
    }
  }

  // Liberar slots temporales de un cliente
  liberarSlotsTemporales(clienteId) {
    for (const [slotId, reserva] of this.temporaryReservations) {
      if (reserva.clienteId === clienteId) {
        this.temporaryReservations.delete(slotId);
      }
    }
  }

  // Parsear tiempo en formato HH:MM a minutos
  parseTime(timeString) {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  }

  // Obtener estadísticas del calendario
  getEstadisticas() {
    return {
      profesionales: this.professionals.size,
      recursos: this.resources.size,
      reservasTemporales: this.temporaryReservations.size,
      horariosTrabajo: this.workingHours
    };
  }
}

module.exports = new CalendarService();
