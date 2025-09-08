const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const winston = require('winston');

// Logger específico para base de datos
const dbLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.json()
  ),
  defaultMeta: { service: 'database' },
  transports: [
    new winston.transports.File({ filename: 'logs/database.log' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  dbLogger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

class DatabaseService {
  constructor() {
    this.db = null;
    this.dbPath = path.join(__dirname, '..', 'data', 'clinica.db');
    this.init();
  }

  // Inicializar la base de datos
  init() {
    try {
      // Crear directorio de datos si no existe
      const dataDir = path.dirname(this.dbPath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      // Conectar a la base de datos
      this.db = new Database(this.dbPath);
      
      // Habilitar WAL mode para mejor rendimiento
      this.db.pragma('journal_mode = WAL');
      
      // Configurar foreign keys
      this.db.pragma('foreign_keys = ON');
      
      // Crear tablas
      this.createTables();
      
      // Insertar datos iniciales
      this.insertInitialData();
      
      dbLogger.info('Base de datos SQLite inicializada correctamente', {
        path: this.dbPath,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      dbLogger.error('Error inicializando base de datos:', error);
      throw error;
    }
  }

  // Crear todas las tablas
  createTables() {
    const tables = [
      // Tabla de profesionales
      `CREATE TABLE IF NOT EXISTS profesionales (
        id TEXT PRIMARY KEY,
        nombre TEXT NOT NULL,
        skills TEXT NOT NULL, -- JSON array
        horario_laboral TEXT NOT NULL, -- JSON object
        max_concurrent_bookings INTEGER DEFAULT 1,
        sala TEXT NOT NULL,
        activo BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Tabla de recursos (salas y equipos)
      `CREATE TABLE IF NOT EXISTS recursos (
        id TEXT PRIMARY KEY,
        nombre TEXT NOT NULL,
        tipo TEXT NOT NULL CHECK (tipo IN ('room', 'equipment')),
        equipamiento TEXT, -- JSON array para equipos
        sala TEXT, -- Para equipos, referencia a la sala
        activo BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Tabla de servicios
      `CREATE TABLE IF NOT EXISTS servicios (
        id TEXT PRIMARY KEY,
        nombre TEXT NOT NULL,
        categoria TEXT NOT NULL,
        duracion INTEGER NOT NULL, -- en minutos
        buffer_pre INTEGER DEFAULT 0,
        buffer_post INTEGER DEFAULT 0,
        precio DECIMAL(10,2) NOT NULL,
        descripcion TEXT,
        recursos_requeridos TEXT, -- JSON array
        instrucciones_pre TEXT,
        instrucciones_post TEXT,
        activo BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Tabla de productos
      `CREATE TABLE IF NOT EXISTS productos (
        id TEXT PRIMARY KEY,
        nombre TEXT NOT NULL,
        categoria TEXT NOT NULL,
        precio DECIMAL(10,2) NOT NULL,
        stock INTEGER DEFAULT 0,
        descripcion TEXT,
        ingredientes TEXT,
        modo_uso TEXT,
        activo BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Tabla de clientes
      `CREATE TABLE IF NOT EXISTS clientes (
        id TEXT PRIMARY KEY,
        nombre TEXT NOT NULL,
        telefono TEXT,
        email TEXT,
        fecha_nacimiento DATE,
        canal_origen TEXT,
        idioma TEXT DEFAULT 'es',
        consentimiento_whatsapp BOOLEAN DEFAULT 0,
        consentimiento_email BOOLEAN DEFAULT 0,
        tags TEXT, -- JSON array
        notas TEXT,
        activo BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Tabla de citas
      `CREATE TABLE IF NOT EXISTS citas (
        id TEXT PRIMARY KEY,
        cliente_id TEXT NOT NULL,
        servicio_id TEXT NOT NULL,
        profesional_id TEXT NOT NULL,
        fecha DATE NOT NULL,
        hora_inicio TIME NOT NULL,
        hora_fin TIME NOT NULL,
        estado TEXT DEFAULT 'confirmada' CHECK (estado IN ('confirmada', 'pendiente', 'cancelada', 'completada', 'no_show')),
        origen_canal TEXT,
        notas TEXT,
        precio DECIMAL(10,2),
        google_calendar_event_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (cliente_id) REFERENCES clientes(id),
        FOREIGN KEY (servicio_id) REFERENCES servicios(id),
        FOREIGN KEY (profesional_id) REFERENCES profesionales(id)
      )`,

      // Tabla de ventas
      `CREATE TABLE IF NOT EXISTS ventas (
        id TEXT PRIMARY KEY,
        producto_id TEXT,
        cliente_id TEXT,
        cantidad INTEGER NOT NULL DEFAULT 1,
        precio_unitario DECIMAL(10,2) NOT NULL,
        total_amount DECIMAL(10,2) NOT NULL,
        tipo_venta TEXT DEFAULT 'product' CHECK (tipo_venta IN ('product', 'service')),
        cita_id TEXT,
        profesional_id TEXT,
        metodo_pago TEXT DEFAULT 'card' CHECK (metodo_pago IN ('cash', 'card', 'transfer')),
        estado_pago TEXT DEFAULT 'paid' CHECK (estado_pago IN ('paid', 'pending', 'cancelled')),
        direccion_envio TEXT,
        notas TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (producto_id) REFERENCES productos(id),
        FOREIGN KEY (cliente_id) REFERENCES clientes(id),
        FOREIGN KEY (cita_id) REFERENCES citas(id),
        FOREIGN KEY (profesional_id) REFERENCES profesionales(id)
      )`,

      // Tabla de conversaciones
      `CREATE TABLE IF NOT EXISTS conversaciones (
        id TEXT PRIMARY KEY,
        cliente_id TEXT,
        canal TEXT NOT NULL,
        mensaje_usuario TEXT NOT NULL,
        respuesta_bot TEXT NOT NULL,
        intent TEXT,
        entidades TEXT, -- JSON object
        confianza DECIMAL(3,2),
        funcion_llamada TEXT,
        duracion_ms INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (cliente_id) REFERENCES clientes(id)
      )`,

      // Tabla de reservas temporales
      `CREATE TABLE IF NOT EXISTS reservas_temporales (
        id TEXT PRIMARY KEY,
        slot_id TEXT NOT NULL,
        cliente_id TEXT NOT NULL,
        servicio_id TEXT NOT NULL,
        profesional_id TEXT NOT NULL,
        fecha DATE NOT NULL,
        hora_inicio TIME NOT NULL,
        hora_fin TIME NOT NULL,
        ttl INTEGER NOT NULL, -- en segundos
        expires_at DATETIME NOT NULL,
        estado TEXT DEFAULT 'reserved' CHECK (estado IN ('reserved', 'confirmed', 'expired')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (cliente_id) REFERENCES clientes(id),
        FOREIGN KEY (servicio_id) REFERENCES servicios(id),
        FOREIGN KEY (profesional_id) REFERENCES profesionales(id)
      )`,

      // Tabla de satisfacción
      `CREATE TABLE IF NOT EXISTS satisfaccion (
        id TEXT PRIMARY KEY,
        cita_id TEXT NOT NULL,
        cliente_id TEXT NOT NULL,
        puntuacion INTEGER CHECK (puntuacion >= 1 AND puntuacion <= 5),
        comentarios TEXT,
        canal TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (cita_id) REFERENCES citas(id),
        FOREIGN KEY (cliente_id) REFERENCES clientes(id)
      )`,

      // Tabla de reseñas
      `CREATE TABLE IF NOT EXISTS reseñas (
        id TEXT PRIMARY KEY,
        cliente_id TEXT NOT NULL,
        cita_id TEXT,
        plataforma TEXT NOT NULL,
        link TEXT,
        puntuacion INTEGER CHECK (puntuacion >= 1 AND puntuacion <= 5),
        comentario TEXT,
        respuesta_generada TEXT,
        estado TEXT DEFAULT 'solicitada' CHECK (estado IN ('solicitada', 'publicada', 'respondida')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (cliente_id) REFERENCES clientes(id),
        FOREIGN KEY (cita_id) REFERENCES citas(id)
      )`
    ];

    // Crear índices para mejorar rendimiento
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_citas_fecha ON citas(fecha)',
      'CREATE INDEX IF NOT EXISTS idx_citas_profesional ON citas(profesional_id)',
      'CREATE INDEX IF NOT EXISTS idx_citas_cliente ON citas(cliente_id)',
      'CREATE INDEX IF NOT EXISTS idx_ventas_fecha ON ventas(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_ventas_cliente ON ventas(cliente_id)',
      'CREATE INDEX IF NOT EXISTS idx_conversaciones_cliente ON conversaciones(cliente_id)',
      'CREATE INDEX IF NOT EXISTS idx_conversaciones_fecha ON conversaciones(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_reservas_expires ON reservas_temporales(expires_at)',
      'CREATE INDEX IF NOT EXISTS idx_clientes_telefono ON clientes(telefono)',
      'CREATE INDEX IF NOT EXISTS idx_clientes_email ON clientes(email)'
    ];

    // Ejecutar creación de tablas
    tables.forEach(sql => {
      this.db.exec(sql);
    });

    // Ejecutar creación de índices
    indexes.forEach(sql => {
      this.db.exec(sql);
    });

    dbLogger.info('Tablas e índices creados correctamente');
  }

  // Insertar datos iniciales
  insertInitialData() {
    try {
      // Verificar si ya hay datos
      const profesionalesCount = this.db.prepare('SELECT COUNT(*) as count FROM profesionales').get();
      if (profesionalesCount.count > 0) {
        dbLogger.info('Datos iniciales ya existen, saltando inserción');
        return;
      }

      // Insertar profesionales
      const profesionales = [
        {
          id: 'prof_ana',
          nombre: 'Ana García',
          skills: JSON.stringify(['hidratación facial profunda', 'peeling químico', 'radiofrecuencia facial', 'microneedling']),
          horario_laboral: JSON.stringify({
            monday: { start: '09:00', end: '20:00' },
            tuesday: { start: '09:00', end: '20:00' },
            wednesday: { start: '09:00', end: '20:00' },
            thursday: { start: '09:00', end: '20:00' },
            friday: { start: '09:00', end: '20:00' },
            saturday: { start: '09:00', end: '18:00' },
            sunday: null
          }),
          sala: 'sala_1'
        },
        {
          id: 'prof_laura',
          nombre: 'Laura Martínez',
          skills: JSON.stringify(['cavitación ultrasónica', 'presoterapia', 'mesoterapia corporal', 'depilación láser']),
          horario_laboral: JSON.stringify({
            monday: { start: '09:00', end: '20:00' },
            tuesday: { start: '09:00', end: '20:00' },
            wednesday: { start: '09:00', end: '20:00' },
            thursday: { start: '09:00', end: '20:00' },
            friday: { start: '09:00', end: '20:00' },
            saturday: { start: '09:00', end: '18:00' },
            sunday: null
          }),
          sala: 'sala_2'
        },
        {
          id: 'prof_carmen',
          nombre: 'Carmen López',
          skills: JSON.stringify(['depilación con cera', 'manicura spa', 'pedicura spa', 'tratamiento antienvejecimiento']),
          horario_laboral: JSON.stringify({
            monday: { start: '09:00', end: '20:00' },
            tuesday: { start: '09:00', end: '20:00' },
            wednesday: { start: '09:00', end: '20:00' },
            thursday: { start: '09:00', end: '20:00' },
            friday: { start: '09:00', end: '20:00' },
            saturday: { start: '09:00', end: '18:00' },
            sunday: null
          }),
          sala: 'sala_3'
        }
      ];

      const insertProfesional = this.db.prepare(`
        INSERT INTO profesionales (id, nombre, skills, horario_laboral, sala)
        VALUES (?, ?, ?, ?, ?)
      `);

      profesionales.forEach(prof => {
        insertProfesional.run(prof.id, prof.nombre, prof.skills, prof.horario_laboral, prof.sala);
      });

      // Insertar recursos
      const recursos = [
        { id: 'sala_1', nombre: 'Sala Facial', tipo: 'room', equipamiento: null, sala: null },
        { id: 'sala_2', nombre: 'Sala Corporal', tipo: 'room', equipamiento: null, sala: null },
        { id: 'sala_3', nombre: 'Sala Depilación', tipo: 'room', equipamiento: null, sala: null },
        { id: 'equipo_radiofrecuencia', nombre: 'Radiofrecuencia Facial', tipo: 'equipment', equipamiento: JSON.stringify(['radiofrecuencia', 'microneedling']), sala: 'sala_1' },
        { id: 'equipo_cavitacion', nombre: 'Cavitación Ultrasónica', tipo: 'equipment', equipamiento: JSON.stringify(['cavitación', 'presoterapia']), sala: 'sala_2' },
        { id: 'equipo_laser', nombre: 'Láser Depilación', tipo: 'equipment', equipamiento: JSON.stringify(['láser', 'cera']), sala: 'sala_3' }
      ];

      const insertRecurso = this.db.prepare(`
        INSERT INTO recursos (id, nombre, tipo, equipamiento, sala)
        VALUES (?, ?, ?, ?, ?)
      `);

      recursos.forEach(recurso => {
        insertRecurso.run(recurso.id, recurso.nombre, recurso.tipo, recurso.equipamiento, recurso.sala);
      });

      // Insertar servicios
      const servicios = [
        {
          id: 'hidratación facial profunda',
          nombre: 'Hidratación Facial Profunda',
          categoria: 'Tratamientos Faciales',
          duracion: 60,
          buffer_pre: 15,
          buffer_post: 15,
          precio: 65.00,
          descripcion: 'Tratamiento facial intensivo para hidratar y nutrir la piel en profundidad',
          recursos_requeridos: JSON.stringify(['sala_1']),
          instrucciones_pre: 'Llegar sin maquillaje, evitar exposición solar 24h antes',
          instrucciones_post: 'Usar protector solar, evitar productos con alcohol'
        },
        {
          id: 'peeling químico',
          nombre: 'Peeling Químico',
          categoria: 'Tratamientos Faciales',
          duracion: 60,
          buffer_pre: 15,
          buffer_post: 15,
          precio: 80.00,
          descripcion: 'Renovación celular mediante ácidos para mejorar la textura de la piel',
          recursos_requeridos: JSON.stringify(['sala_1']),
          instrucciones_pre: 'No usar retinoides 1 semana antes',
          instrucciones_post: 'Evitar sol y usar hidratante suave'
        },
        {
          id: 'radiofrecuencia facial',
          nombre: 'Radiofrecuencia Facial',
          categoria: 'Tratamientos Faciales',
          duracion: 45,
          buffer_pre: 15,
          buffer_post: 15,
          precio: 95.00,
          descripcion: 'Tratamiento de radiofrecuencia para tensar y rejuvenecer la piel',
          recursos_requeridos: JSON.stringify(['sala_1', 'equipo_radiofrecuencia']),
          instrucciones_pre: 'Piel limpia, sin cremas',
          instrucciones_post: 'Aplicar crema hidratante, evitar sol'
        }
      ];

      const insertServicio = this.db.prepare(`
        INSERT INTO servicios (id, nombre, categoria, duracion, buffer_pre, buffer_post, precio, descripcion, recursos_requeridos, instrucciones_pre, instrucciones_post)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      servicios.forEach(servicio => {
        insertServicio.run(
          servicio.id, servicio.nombre, servicio.categoria, servicio.duracion,
          servicio.buffer_pre, servicio.buffer_post, servicio.precio, servicio.descripcion,
          servicio.recursos_requeridos, servicio.instrucciones_pre, servicio.instrucciones_post
        );
      });

      dbLogger.info('Datos iniciales insertados correctamente', {
        profesionales: profesionales.length,
        recursos: recursos.length,
        servicios: servicios.length
      });

    } catch (error) {
      dbLogger.error('Error insertando datos iniciales:', error);
      throw error;
    }
  }

  // Obtener instancia de la base de datos
  getDB() {
    return this.db;
  }

  // Cerrar conexión
  close() {
    if (this.db) {
      this.db.close();
      dbLogger.info('Conexión a base de datos cerrada');
    }
  }

  // Backup de la base de datos
  backup(backupPath) {
    try {
      const backupDB = new Database(backupPath);
      this.db.backup(backupDB);
      backupDB.close();
      dbLogger.info('Backup creado correctamente', { path: backupPath });
      return true;
    } catch (error) {
      dbLogger.error('Error creando backup:', error);
      return false;
    }
  }

  // Obtener estadísticas de la base de datos
  getStats() {
    try {
      const stats = {
        profesionales: this.db.prepare('SELECT COUNT(*) as count FROM profesionales').get().count,
        recursos: this.db.prepare('SELECT COUNT(*) as count FROM recursos').get().count,
        servicios: this.db.prepare('SELECT COUNT(*) as count FROM servicios').get().count,
        productos: this.db.prepare('SELECT COUNT(*) as count FROM productos').get().count,
        clientes: this.db.prepare('SELECT COUNT(*) as count FROM clientes').get().count,
        citas: this.db.prepare('SELECT COUNT(*) as count FROM citas').get().count,
        ventas: this.db.prepare('SELECT COUNT(*) as count FROM ventas').get().count,
        conversaciones: this.db.prepare('SELECT COUNT(*) as count FROM conversaciones').get().count,
        reservas_temporales: this.db.prepare('SELECT COUNT(*) as count FROM reservas_temporales').get().count
      };
      return stats;
    } catch (error) {
      dbLogger.error('Error obteniendo estadísticas:', error);
      return null;
    }
  }
}

module.exports = new DatabaseService();
