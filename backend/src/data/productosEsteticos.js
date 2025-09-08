// Base de datos de productos estéticos para clínica
const productosEsteticos = [
  // TRATAMIENTOS FACIALES
  {
    id: 1,
    categoria: "Tratamientos Faciales",
    nombre: "Hidratación Facial Profunda",
    descripcion: "Tratamiento de hidratación intensiva con ácido hialurónico para restaurar la humedad natural de la piel",
    precio: 120,
    duracion: "60 minutos",
    beneficios: [
      "Hidratación profunda de la piel",
      "Reducción de líneas de expresión",
      "Mejora de la textura cutánea",
      "Efecto lifting inmediato"
    ],
    cuidados: [
      "Evitar exposición solar directa por 24 horas",
      "Usar protector solar FPS 50+",
      "No aplicar maquillaje por 6 horas",
      "Hidratar la piel diariamente"
    ],
    contraindicaciones: [
      "Embarazo y lactancia",
      "Alergias al ácido hialurónico",
      "Infecciones activas en la zona",
      "Tratamientos anticoagulantes"
    ]
  },
  {
    id: 2,
    categoria: "Tratamientos Faciales",
    nombre: "Peeling Químico",
    descripcion: "Renovación celular con ácidos para eliminar manchas, cicatrices y mejorar la textura de la piel",
    precio: 150,
    duracion: "45 minutos",
    beneficios: [
      "Eliminación de manchas solares",
      "Reducción de cicatrices de acné",
      "Mejora de la textura cutánea",
      "Estimulación de colágeno"
    ],
    cuidados: [
      "Protección solar estricta por 30 días",
      "Hidratación intensiva",
      "Evitar productos irritantes",
      "Seguir rutina post-peeling"
    ],
    contraindicaciones: [
      "Piel muy sensible",
      "Embarazo",
      "Exposición solar reciente",
      "Heridas abiertas"
    ]
  },
  {
    id: 3,
    categoria: "Tratamientos Faciales",
    nombre: "Radiofrecuencia Facial",
    descripcion: "Tratamiento de radiofrecuencia para tensar la piel y estimular la producción de colágeno",
    precio: 200,
    duracion: "90 minutos",
    beneficios: [
      "Lifting facial no quirúrgico",
      "Reducción de arrugas",
      "Mejora de la firmeza",
      "Estimulación de colágeno"
    ],
    cuidados: [
      "Hidratación abundante",
      "Evitar calor excesivo por 24 horas",
      "Usar protector solar",
      "Masajes suaves en la zona"
    ],
    contraindicaciones: [
      "Implantes metálicos",
      "Embarazo",
      "Marcapasos",
      "Piel muy sensible"
    ]
  },

  // TRATAMIENTOS CORPORALES
  {
    id: 4,
    categoria: "Tratamientos Corporales",
    nombre: "Cavitación Ultrasónica",
    descripcion: "Eliminación de grasa localizada mediante ondas ultrasónicas de baja frecuencia",
    precio: 180,
    duracion: "60 minutos",
    beneficios: [
      "Reducción de grasa localizada",
      "Mejora de la silueta",
      "Tratamiento no invasivo",
      "Resultados visibles en pocas sesiones"
    ],
    cuidados: [
      "Beber mucha agua",
      "Ejercicio moderado",
      "Dieta equilibrada",
      "Evitar alcohol por 24 horas"
    ],
    contraindicaciones: [
      "Embarazo",
      "Problemas hepáticos",
      "Marcapasos",
      "Heridas abiertas"
    ]
  },
  {
    id: 5,
    categoria: "Tratamientos Corporales",
    nombre: "Presoterapia",
    descripcion: "Drenaje linfático mediante presión de aire para eliminar toxinas y reducir celulitis",
    precio: 80,
    duracion: "45 minutos",
    beneficios: [
      "Drenaje linfático",
      "Reducción de celulitis",
      "Eliminación de toxinas",
      "Mejora de la circulación"
    ],
    cuidados: [
      "Beber agua abundante",
      "Evitar sal en exceso",
      "Ejercicio regular",
      "Masajes de drenaje"
    ],
    contraindicaciones: [
      "Problemas circulatorios graves",
      "Trombosis",
      "Embarazo",
      "Heridas en las piernas"
    ]
  },
  {
    id: 6,
    categoria: "Tratamientos Corporales",
    nombre: "Mesoterapia Corporal",
    descripcion: "Inyección de vitaminas y minerales para mejorar la calidad de la piel y reducir grasa",
    precio: 250,
    duracion: "75 minutos",
    beneficios: [
      "Mejora de la calidad de la piel",
      "Reducción de grasa localizada",
      "Hidratación profunda",
      "Estimulación metabólica"
    ],
    cuidados: [
      "Evitar ejercicio intenso por 24 horas",
      "Hidratación abundante",
      "Protección solar",
      "Masajes suaves"
    ],
    contraindicaciones: [
      "Alergias a los componentes",
      "Embarazo",
      "Problemas de coagulación",
      "Infecciones activas"
    ]
  },

  // TRATAMIENTOS DE DEPILACIÓN
  {
    id: 7,
    categoria: "Depilación",
    nombre: "Depilación Láser",
    descripcion: "Eliminación permanente del vello mediante tecnología láser de última generación",
    precio: 100,
    duracion: "30 minutos",
    beneficios: [
      "Eliminación permanente del vello",
      "Sin dolor",
      "Tratamiento rápido",
      "Resultados duraderos"
    ],
    cuidados: [
      "Evitar exposición solar",
      "Usar protector solar",
      "No depilar entre sesiones",
      "Hidratar la zona tratada"
    ],
    contraindicaciones: [
      "Piel muy bronceada",
      "Embarazo",
      "Heridas en la zona",
      "Alergias al láser"
    ]
  },
  {
    id: 8,
    categoria: "Depilación",
    nombre: "Depilación con Cera",
    descripcion: "Depilación tradicional con cera caliente para una piel suave y sin vello",
    precio: 40,
    duracion: "20 minutos",
    beneficios: [
      "Piel suave y sedosa",
      "Eliminación desde la raíz",
      "Tratamiento relajante",
      "Precio accesible"
    ],
    cuidados: [
      "Evitar calor excesivo por 24 horas",
      "Hidratar la zona",
      "Usar ropa cómoda",
      "Evitar productos irritantes"
    ],
    contraindicaciones: [
      "Piel muy sensible",
      "Heridas abiertas",
      "Alergias a la cera",
      "Varices en la zona"
    ]
  },

  // TRATAMIENTOS DE MANOS Y PIES
  {
    id: 9,
    categoria: "Manos y Pies",
    nombre: "Manicura Spa",
    descripcion: "Tratamiento completo de manos con exfoliación, hidratación y esmaltado",
    precio: 35,
    duracion: "45 minutos",
    beneficios: [
      "Manos suaves y cuidadas",
      "Hidratación profunda",
      "Esmaltado perfecto",
      "Relajación total"
    ],
    cuidados: [
      "Evitar agua caliente por 2 horas",
      "Usar guantes para tareas domésticas",
      "Hidratar diariamente",
      "Evitar productos químicos"
    ],
    contraindicaciones: [
      "Heridas en las manos",
      "Infecciones activas",
      "Alergias a los productos",
      "Problemas circulatorios"
    ]
  },
  {
    id: 10,
    categoria: "Manos y Pies",
    nombre: "Pedicura Spa",
    descripcion: "Tratamiento completo de pies con exfoliación, hidratación y esmaltado",
    precio: 45,
    duracion: "60 minutos",
    beneficios: [
      "Pies suaves y cuidados",
      "Eliminación de callos",
      "Hidratación profunda",
      "Relajación total"
    ],
    cuidados: [
      "Evitar calzado ajustado por 24 horas",
      "Hidratar diariamente",
      "Usar calcetines de algodón",
      "Evitar agua caliente"
    ],
    contraindicaciones: [
      "Heridas en los pies",
      "Infecciones activas",
      "Alergias a los productos",
      "Problemas circulatorios"
    ]
  },

  // TRATAMIENTOS ESPECIALES
  {
    id: 11,
    categoria: "Tratamientos Especiales",
    nombre: "Microneedling",
    descripcion: "Tratamiento de microagujas para estimular la producción de colágeno y mejorar la piel",
    precio: 220,
    duracion: "90 minutos",
    beneficios: [
      "Estimulación de colágeno",
      "Mejora de cicatrices",
      "Reducción de poros",
      "Piel más firme"
    ],
    cuidados: [
      "Protección solar estricta",
      "Hidratación intensiva",
      "Evitar productos irritantes",
      "Seguir rutina post-tratamiento"
    ],
    contraindicaciones: [
      "Piel muy sensible",
      "Embarazo",
      "Heridas activas",
      "Infecciones en la zona"
    ]
  },
  {
    id: 12,
    categoria: "Tratamientos Especiales",
    nombre: "Tratamiento Antienvejecimiento",
    descripcion: "Tratamiento completo anti-edad con múltiples tecnologías para rejuvenecer la piel",
    precio: 350,
    duracion: "120 minutos",
    beneficios: [
      "Reducción de arrugas",
      "Mejora de la firmeza",
      "Hidratación profunda",
      "Efecto lifting"
    ],
    cuidados: [
      "Protección solar diaria",
      "Hidratación abundante",
      "Rutina de cuidado específica",
      "Evitar factores de envejecimiento"
    ],
    contraindicaciones: [
      "Piel muy sensible",
      "Embarazo",
      "Alergias a los componentes",
      "Infecciones activas"
    ]
  },

  // PRODUCTOS PARA LLEVAR A CASA
  {
    id: 13,
    categoria: "Productos para Casa",
    nombre: "Sérum de Ácido Hialurónico",
    descripcion: "Sérum concentrado de ácido hialurónico para hidratación profunda en casa",
    precio: 45,
    duracion: "Producto para uso diario",
    beneficios: [
      "Hidratación intensiva",
      "Reducción de líneas de expresión",
      "Piel más firme y elástica",
      "Uso diario seguro"
    ],
    cuidados: [
      "Aplicar por la mañana y noche",
      "Usar protector solar durante el día",
      "Conservar en lugar fresco",
      "Evitar contacto con ojos"
    ],
    contraindicaciones: [
      "Alergias al ácido hialurónico",
      "Piel muy sensible",
      "Heridas abiertas"
    ],
    tipoProducto: "home",
    stock: 50,
    unidad: "30ml"
  },
  {
    id: 14,
    categoria: "Productos para Casa",
    nombre: "Crema Peeling Suave",
    descripcion: "Crema exfoliante suave con ácidos naturales para renovación celular en casa",
    precio: 35,
    duracion: "Producto para uso semanal",
    beneficios: [
      "Exfoliación suave",
      "Renovación celular",
      "Piel más suave",
      "Uso semanal seguro"
    ],
    cuidados: [
      "Usar máximo 2 veces por semana",
      "Aplicar por la noche",
      "Usar protector solar al día siguiente",
      "No usar en piel irritada"
    ],
    contraindicaciones: [
      "Piel muy sensible",
      "Heridas abiertas",
      "Embarazo"
    ],
    tipoProducto: "home",
    stock: 30,
    unidad: "50ml"
  },
  {
    id: 15,
    categoria: "Productos para Casa",
    nombre: "Mascarilla Hidratante",
    descripcion: "Mascarilla facial hidratante con ingredientes naturales para uso en casa",
    precio: 25,
    duracion: "Producto para uso semanal",
    beneficios: [
      "Hidratación profunda",
      "Piel más suave",
      "Relajación facial",
      "Fácil aplicación"
    ],
    cuidados: [
      "Aplicar sobre piel limpia",
      "Dejar actuar 15-20 minutos",
      "Enjuagar con agua tibia",
      "Usar máximo 2 veces por semana"
    ],
    contraindicaciones: [
      "Alergias a ingredientes naturales",
      "Piel muy sensible"
    ],
    tipoProducto: "home",
    stock: 40,
    unidad: "100ml"
  },
  {
    id: 16,
    categoria: "Productos para Casa",
    nombre: "Aceite Corporal Anticelulítico",
    descripcion: "Aceite corporal con ingredientes activos para reducir celulitis en casa",
    precio: 55,
    duracion: "Producto para uso diario",
    beneficios: [
      "Reducción de celulitis",
      "Mejora de la circulación",
      "Piel más firme",
      "Masaje relajante"
    ],
    cuidados: [
      "Aplicar con masaje circular",
      "Usar diariamente",
      "Conservar en lugar fresco",
      "Evitar contacto con ojos"
    ],
    contraindicaciones: [
      "Alergias a aceites esenciales",
      "Piel muy sensible",
      "Embarazo"
    ],
    tipoProducto: "home",
    stock: 25,
    unidad: "200ml"
  },
  {
    id: 17,
    categoria: "Productos para Casa",
    nombre: "Kit de Cuidado Facial Completo",
    descripcion: "Kit completo con limpiador, tónico, sérum y crema hidratante",
    precio: 120,
    duracion: "Kit completo para rutina diaria",
    beneficios: [
      "Rutina completa de cuidado",
      "Productos complementarios",
      "Ahorro en compra",
      "Resultados profesionales"
    ],
    cuidados: [
      "Seguir orden de aplicación",
      "Usar diariamente",
      "Conservar en lugar fresco",
      "Leer instrucciones de cada producto"
    ],
    contraindicaciones: [
      "Alergias a ingredientes",
      "Piel muy sensible"
    ],
    tipoProducto: "home",
    stock: 15,
    unidad: "Kit completo"
  },
  {
    id: 18,
    categoria: "Productos para Casa",
    nombre: "Crema Antienvejecimiento",
    descripcion: "Crema facial antienvejecimiento con retinol y vitamina C",
    precio: 75,
    duracion: "Producto para uso diario",
    beneficios: [
      "Reducción de arrugas",
      "Mejora de la firmeza",
      "Piel más luminosa",
      "Protección antioxidante"
    ],
    cuidados: [
      "Aplicar por la noche",
      "Usar protector solar durante el día",
      "Empezar con uso alternado",
      "Evitar contacto con ojos"
    ],
    contraindicaciones: [
      "Embarazo y lactancia",
      "Piel muy sensible",
      "Alergias al retinol"
    ],
    tipoProducto: "home",
    stock: 20,
    unidad: "50ml"
  }
];

// Función para buscar productos por categoría
function buscarPorCategoria(categoria) {
  return productosEsteticos.filter(producto => 
    producto.categoria.toLowerCase().includes(categoria.toLowerCase())
  );
}

// Función para buscar productos por nombre
function buscarPorNombre(nombre) {
  return productosEsteticos.filter(producto => 
    producto.nombre.toLowerCase().includes(nombre.toLowerCase())
  );
}

// Función para obtener producto por ID
function obtenerPorId(id) {
  return productosEsteticos.find(producto => producto.id === id);
}

// Función para obtener todas las categorías
function obtenerCategorias() {
  const categorias = [...new Set(productosEsteticos.map(producto => producto.categoria))];
  return categorias;
}

// Función para obtener productos por rango de precio
function buscarPorPrecio(precioMin, precioMax) {
  return productosEsteticos.filter(producto => 
    producto.precio >= precioMin && producto.precio <= precioMax
  );
}

// Función para obtener productos por duración
function buscarPorDuracion(duracion) {
  return productosEsteticos.filter(producto => 
    producto.duracion.includes(duracion)
  );
}

module.exports = {
  productosEsteticos,
  buscarPorCategoria,
  buscarPorNombre,
  obtenerPorId,
  obtenerCategorias,
  buscarPorPrecio,
  buscarPorDuracion
};
