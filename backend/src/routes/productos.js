const express = require('express');
const router = express.Router();
const productosService = require('../services/productsServiceSQLite');
const DataTransformService = require('../services/dataTransformService');
const Joi = require('joi');

// Middleware de logging
const logger = require('winston');

// Esquemas de validación
const validarProducto = Joi.object({
  nombre: Joi.string().min(3).max(100).required(),
  categoria: Joi.string().min(3).max(50).required(),
  descripcion: Joi.string().min(10).max(500).required(),
  precio: Joi.number().min(0).required(),
  duracion: Joi.string().min(5).max(50).required(),
  beneficios: Joi.array().items(Joi.string()).optional(),
  cuidados: Joi.array().items(Joi.string()).optional(),
  contraindicaciones: Joi.array().items(Joi.string()).optional(),
  activo: Joi.boolean().optional()
});

const validarBusqueda = Joi.object({
  categoria: Joi.string().optional(),
  nombre: Joi.string().optional(),
  precioMin: Joi.number().min(0).optional(),
  precioMax: Joi.number().min(0).optional(),
  duracion: Joi.string().optional(),
  activo: Joi.boolean().optional()
});

const validarRecomendaciones = Joi.object({
  necesidades: Joi.array().items(Joi.string()).min(1).required()
});

// GET /api/productos - Obtener todos los productos
router.get('/', async (req, res) => {
  try {
    logger.info('API Request - Obtener todos los productos', {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    const resultado = await productosService.getAllProducts();
    
    // Transformar datos al formato esperado por el frontend
    const transformedData = {
      success: resultado.success,
      data: DataTransformService.transformProducts(resultado.data),
      total: resultado.total
    };
    
    logger.info('API Response - Productos obtenidos', {
      total: transformedData.total,
      statusCode: 200
    });

    res.json(transformedData);
  } catch (error) {
    logger.error('Error obteniendo productos', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// GET /api/productos/activos - Obtener solo productos activos
router.get('/activos', async (req, res) => {
  try {
    logger.info('API Request - Obtener productos activos', {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    const resultado = productosService.getProductosActivos();
    
    logger.info('API Response - Productos activos obtenidos', {
      total: resultado.total,
      statusCode: 200
    });

    res.json(resultado);
  } catch (error) {
    logger.error('Error obteniendo productos activos', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// GET /api/productos/categorias - Obtener todas las categorías
router.get('/categorias', async (req, res) => {
  try {
    logger.info('API Request - Obtener categorías', {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    const resultado = productosService.getCategorias();
    
    logger.info('API Response - Categorías obtenidas', {
      total: resultado.data.length,
      statusCode: 200
    });

    res.json(resultado);
  } catch (error) {
    logger.error('Error obteniendo categorías', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// GET /api/productos/estadisticas - Obtener estadísticas de productos
router.get('/estadisticas', async (req, res) => {
  try {
    logger.info('API Request - Obtener estadísticas', {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    const resultado = await productosService.getProductStats();
    
    // Transformar estadísticas al formato esperado por el frontend
    const transformedData = {
      success: resultado.success,
      data: DataTransformService.transformProductStats(resultado.data)
    };
    
    logger.info('API Response - Estadísticas obtenidas', {
      statusCode: 200
    });

    res.json(transformedData);
  } catch (error) {
    logger.error('Error obteniendo estadísticas', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// GET /api/productos/:id - Obtener producto por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    logger.info('API Request - Obtener producto por ID', {
      id: id,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    const resultado = productosService.getProductoById(id);
    
    if (!resultado.success) {
      logger.warn('Producto no encontrado', { id: id });
      return res.status(404).json(resultado);
    }
    
    logger.info('API Response - Producto obtenido', {
      id: id,
      nombre: resultado.data.nombre,
      statusCode: 200
    });

    res.json(resultado);
  } catch (error) {
    logger.error('Error obteniendo producto por ID', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// GET /api/productos/categoria/:categoria - Buscar productos por categoría
router.get('/categoria/:categoria', async (req, res) => {
  try {
    const { categoria } = req.params;
    
    logger.info('API Request - Buscar productos por categoría', {
      categoria: categoria,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    const resultado = productosService.getProductosByCategoria(categoria);
    
    logger.info('API Response - Productos encontrados por categoría', {
      categoria: categoria,
      total: resultado.total,
      statusCode: 200
    });

    res.json(resultado);
  } catch (error) {
    logger.error('Error buscando productos por categoría', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// GET /api/productos/buscar/:query - Buscar productos por nombre o descripción
router.get('/buscar/:query', async (req, res) => {
  try {
    const { query } = req.params;
    
    logger.info('API Request - Buscar productos por query', {
      query: query,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    const resultado = productosService.searchProductos(query);
    
    logger.info('API Response - Productos encontrados por query', {
      query: query,
      total: resultado.total,
      statusCode: 200
    });

    res.json(resultado);
  } catch (error) {
    logger.error('Error buscando productos por query', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// POST /api/productos - Crear nuevo producto
router.post('/', async (req, res) => {
  try {
    const { error, value } = validarProducto.validate(req.body);
    
    if (error) {
      logger.warn('Validación fallida al crear producto', { error: error.details });
      return res.status(400).json({
        success: false,
        message: 'Datos del producto inválidos',
        errors: error.details.map(detail => detail.message)
      });
    }

    logger.info('API Request - Crear nuevo producto', {
      nombre: value.nombre,
      categoria: value.categoria,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    const resultado = productosService.createProducto(value);
    
    if (!resultado.success) {
      logger.warn('Error al crear producto', { error: resultado.message });
      return res.status(400).json(resultado);
    }
    
    logger.info('API Response - Producto creado', {
      id: resultado.data.id,
      nombre: resultado.data.nombre,
      statusCode: 201
    });

    res.status(201).json(resultado);
  } catch (error) {
    logger.error('Error creando producto', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// PUT /api/productos/:id - Actualizar producto
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { error, value } = validarProducto.validate(req.body);
    
    if (error) {
      logger.warn('Validación fallida al actualizar producto', { error: error.details });
      return res.status(400).json({
        success: false,
        message: 'Datos del producto inválidos',
        errors: error.details.map(detail => detail.message)
      });
    }

    logger.info('API Request - Actualizar producto', {
      id: id,
      nombre: value.nombre,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    const resultado = productosService.updateProducto(id, value);
    
    if (!resultado.success) {
      logger.warn('Error al actualizar producto', { error: resultado.message });
      return res.status(404).json(resultado);
    }
    
    logger.info('API Response - Producto actualizado', {
      id: id,
      nombre: resultado.data.nombre,
      statusCode: 200
    });

    res.json(resultado);
  } catch (error) {
    logger.error('Error actualizando producto', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// DELETE /api/productos/:id - Eliminar producto (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    logger.info('API Request - Eliminar producto', {
      id: id,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    const resultado = productosService.deleteProducto(id);
    
    if (!resultado.success) {
      logger.warn('Error al eliminar producto', { error: resultado.message });
      return res.status(404).json(resultado);
    }
    
    logger.info('API Response - Producto eliminado', {
      id: id,
      statusCode: 200
    });

    res.json(resultado);
  } catch (error) {
    logger.error('Error eliminando producto', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// DELETE /api/productos/:id/permanente - Eliminar producto permanentemente
router.delete('/:id/permanente', async (req, res) => {
  try {
    const { id } = req.params;
    
    logger.info('API Request - Eliminar producto permanentemente', {
      id: id,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    const resultado = productosService.deleteProductoPermanente(id);
    
    if (!resultado.success) {
      logger.warn('Error al eliminar producto permanentemente', { error: resultado.message });
      return res.status(404).json(resultado);
    }
    
    logger.info('API Response - Producto eliminado permanentemente', {
      id: id,
      statusCode: 200
    });

    res.json(resultado);
  } catch (error) {
    logger.error('Error eliminando producto permanentemente', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// POST /api/productos/buscar - Búsqueda avanzada
router.post('/buscar', async (req, res) => {
  try {
    const { error, value } = validarBusqueda.validate(req.body);
    
    if (error) {
      logger.warn('Validación fallida en búsqueda avanzada', { error: error.details });
      return res.status(400).json({
        success: false,
        message: 'Datos de búsqueda inválidos',
        errors: error.details.map(detail => detail.message)
      });
    }

    logger.info('API Request - Búsqueda avanzada', {
      criterios: value,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    // Implementar búsqueda avanzada basada en criterios
    let productos = productosService.getAllProducts().data;
    
    if (value.categoria) {
      productos = productos.filter(p => 
        p.categoria.toLowerCase().includes(value.categoria.toLowerCase())
      );
    }
    
    if (value.nombre) {
      productos = productos.filter(p => 
        p.nombre.toLowerCase().includes(value.nombre.toLowerCase())
      );
    }
    
    if (value.precioMin !== undefined) {
      productos = productos.filter(p => p.precio >= value.precioMin);
    }
    
    if (value.precioMax !== undefined) {
      productos = productos.filter(p => p.precio <= value.precioMax);
    }
    
    if (value.duracion) {
      productos = productos.filter(p => 
        p.duracion.toLowerCase().includes(value.duracion.toLowerCase())
      );
    }
    
    if (value.activo !== undefined) {
      productos = productos.filter(p => p.activo === value.activo);
    }

    const resultado = {
      success: true,
      data: productos,
      total: productos.length
    };
    
    logger.info('API Response - Búsqueda avanzada completada', {
      criterios: value,
      total: resultado.total,
      statusCode: 200
    });

    res.json(resultado);
  } catch (error) {
    logger.error('Error en búsqueda avanzada', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// POST /api/productos/recomendaciones - Obtener recomendaciones
router.post('/recomendaciones', async (req, res) => {
  try {
    const { error, value } = validarRecomendaciones.validate(req.body);
    
    if (error) {
      logger.warn('Validación fallida en recomendaciones', { error: error.details });
      return res.status(400).json({
        success: false,
        message: 'Datos de recomendación inválidos',
        errors: error.details.map(detail => detail.message)
      });
    }

    logger.info('API Request - Obtener recomendaciones', {
      necesidades: value.necesidades,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    // Implementar lógica de recomendaciones basada en necesidades
    const productos = productosService.getAllProducts().data;
    const recomendaciones = productos.filter(producto => {
      const beneficios = producto.beneficios.join(' ').toLowerCase();
      return value.necesidades.some(necesidad => 
        beneficios.includes(necesidad.toLowerCase())
      );
    });

    const resultado = {
      success: true,
      data: recomendaciones,
      total: recomendaciones.length
    };
    
    logger.info('API Response - Recomendaciones obtenidas', {
      necesidades: value.necesidades,
      total: resultado.total,
      statusCode: 200
    });

    res.json(resultado);
  } catch (error) {
    logger.error('Error obteniendo recomendaciones', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

module.exports = router;