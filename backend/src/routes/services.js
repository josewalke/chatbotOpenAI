const express = require('express');
const router = express.Router();

// Servicios disponibles
const services = [
  {
    id: 'limpieza_facial',
    name: 'Limpieza Facial',
    description: 'Limpieza profunda para eliminar impurezas y rejuvenecer la piel',
    duration: 60,
    price: 45,
    category: 'facial',
    preCare: 'Evitar maquillaje 2 horas antes',
    postCare: 'No exponerse al sol por 24 horas'
  },
  {
    id: 'tratamiento_anti_acne',
    name: 'Tratamiento Anti-Acné',
    description: 'Tratamiento especializado para pieles con acné y espinillas',
    duration: 90,
    price: 65,
    category: 'facial',
    preCare: 'No usar productos con ácidos 48h antes',
    postCare: 'Usar protector solar y evitar tocar la zona'
  },
  {
    id: 'hidratacion_profunda',
    name: 'Hidratación Profunda',
    description: 'Hidratación intensiva para pieles secas y deshidratadas',
    duration: 75,
    price: 55,
    category: 'facial',
    preCare: 'Mantener la piel limpia',
    postCare: 'Beber mucha agua y usar crema hidratante'
  },
  {
    id: 'peeling_quimico',
    name: 'Peeling Químico',
    description: 'Renovación celular para mejorar textura y tono de la piel',
    duration: 60,
    price: 80,
    category: 'facial',
    preCare: 'No exponerse al sol 1 semana antes',
    postCare: 'Protección solar estricta por 2 semanas'
  },
  {
    id: 'tratamiento_anti_edad',
    name: 'Tratamiento Anti-Edad',
    description: 'Tratamiento completo para reducir arrugas y líneas de expresión',
    duration: 90,
    price: 95,
    category: 'facial',
    preCare: 'Consultar con el profesional',
    postCare: 'Seguir rutina específica recomendada'
  }
];

// Profesionales disponibles
const professionals = [
  {
    id: 'ana_garcia',
    name: 'Ana García',
    specialties: ['limpieza_facial', 'hidratacion_profunda', 'peeling_quimico'],
    schedule: {
      monday: { start: '09:00', end: '18:00' },
      tuesday: { start: '09:00', end: '18:00' },
      wednesday: { start: '09:00', end: '18:00' },
      thursday: { start: '09:00', end: '18:00' },
      friday: { start: '09:00', end: '18:00' },
      saturday: { start: '09:00', end: '16:00' },
      sunday: null
    }
  },
  {
    id: 'laura_martinez',
    name: 'Laura Martínez',
    specialties: ['tratamiento_anti_acne', 'tratamiento_anti_edad', 'limpieza_facial'],
    schedule: {
      monday: { start: '10:00', end: '19:00' },
      tuesday: { start: '10:00', end: '19:00' },
      wednesday: { start: '10:00', end: '19:00' },
      thursday: { start: '10:00', end: '19:00' },
      friday: { start: '10:00', end: '19:00' },
      saturday: { start: '10:00', end: '17:00' },
      sunday: null
    }
  },
  {
    id: 'carmen_rodriguez',
    name: 'Carmen Rodríguez',
    specialties: ['hidratacion_profunda', 'peeling_quimico', 'tratamiento_anti_edad'],
    schedule: {
      monday: { start: '08:00', end: '17:00' },
      tuesday: { start: '08:00', end: '17:00' },
      wednesday: { start: '08:00', end: '17:00' },
      thursday: { start: '08:00', end: '17:00' },
      friday: { start: '08:00', end: '17:00' },
      saturday: { start: '08:00', end: '15:00' },
      sunday: null
    }
  }
];

// GET /api/services - Obtener todos los servicios
router.get('/', (req, res) => {
  res.json({
    success: true,
    services: services
  });
});

// GET /api/services/:id - Obtener servicio específico
router.get('/:id', (req, res) => {
  const service = services.find(s => s.id === req.params.id);
  
  if (!service) {
    return res.status(404).json({ error: 'Servicio no encontrado' });
  }
  
  res.json({
    success: true,
    service: service
  });
});

// GET /api/services/category/:category - Obtener servicios por categoría
router.get('/category/:category', (req, res) => {
  const categoryServices = services.filter(s => s.category === req.params.category);
  
  res.json({
    success: true,
    services: categoryServices,
    category: req.params.category
  });
});

// GET /api/services/professionals - Obtener profesionales
router.get('/professionals/all', (req, res) => {
  res.json({
    success: true,
    professionals: professionals
  });
});

// GET /api/services/professionals/:serviceId - Obtener profesionales por servicio
router.get('/professionals/:serviceId', (req, res) => {
  const serviceProfessionals = professionals.filter(p => 
    p.specialties.includes(req.params.serviceId)
  );
  
  res.json({
    success: true,
    professionals: serviceProfessionals,
    serviceId: req.params.serviceId
  });
});

// GET /api/services/schedule/:professionalId - Obtener horario de profesional
router.get('/schedule/:professionalId', (req, res) => {
  const professional = professionals.find(p => p.id === req.params.professionalId);
  
  if (!professional) {
    return res.status(404).json({ error: 'Profesional no encontrado' });
  }
  
  res.json({
    success: true,
    schedule: professional.schedule,
    professional: {
      id: professional.id,
      name: professional.name
    }
  });
});

module.exports = router;
