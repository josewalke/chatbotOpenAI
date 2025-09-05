const express = require('express');
const router = express.Router();
const salesService = require('../services/salesService');
const productosService = require('../services/productosService');
const Joi = require('joi');

// Middleware de logging
const logger = require('winston');

// Esquemas de validación
const createSaleSchema = Joi.object({
  productId: Joi.string().required(),
  productName: Joi.string().required(),
  productCategory: Joi.string().required(),
  price: Joi.number().min(0).required(),
  quantity: Joi.number().min(1).optional(),
  customerName: Joi.string().min(2).max(100).required(),
  customerEmail: Joi.string().email().required(),
  customerPhone: Joi.string().required(),
  saleType: Joi.string().valid('treatment', 'product', 'package').optional(),
  bookingId: Joi.string().optional(),
  professionalId: Joi.string().optional(),
  paymentMethod: Joi.string().valid('cash', 'card', 'transfer').optional(),
  paymentStatus: Joi.string().valid('paid', 'pending', 'cancelled').optional(),
  notes: Joi.string().max(500).optional()
});

const updateSaleSchema = Joi.object({
  productId: Joi.string().optional(),
  productName: Joi.string().optional(),
  productCategory: Joi.string().optional(),
  price: Joi.number().min(0).optional(),
  quantity: Joi.number().min(1).optional(),
  customerName: Joi.string().min(2).max(100).optional(),
  customerEmail: Joi.string().email().optional(),
  customerPhone: Joi.string().optional(),
  saleType: Joi.string().valid('treatment', 'product', 'package').optional(),
  bookingId: Joi.string().optional(),
  professionalId: Joi.string().optional(),
  paymentMethod: Joi.string().valid('cash', 'card', 'transfer').optional(),
  paymentStatus: Joi.string().valid('paid', 'pending', 'cancelled').optional(),
  notes: Joi.string().max(500).optional()
});

const dateRangeSchema = Joi.object({
  startDate: Joi.string().isoDate().required(),
  endDate: Joi.string().isoDate().required()
});

// GET /api/sales - Obtener todas las ventas
router.get('/', async (req, res) => {
  try {
    logger.info('API Request - Obtener todas las ventas', {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    const resultado = salesService.getAllSales();
    
    logger.info('API Response - Ventas obtenidas', {
      total: resultado.total,
      statusCode: 200
    });

    res.json(resultado);
  } catch (error) {
    logger.error('Error obteniendo ventas', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// GET /api/sales/stats - Obtener estadísticas de ventas
router.get('/stats', async (req, res) => {
  try {
    logger.info('API Request - Obtener estadísticas de ventas', {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    const resultado = salesService.getSalesStats();
    
    logger.info('API Response - Estadísticas obtenidas', {
      statusCode: 200
    });

    res.json(resultado);
  } catch (error) {
    logger.error('Error obteniendo estadísticas', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// GET /api/sales/product/:productId - Obtener ventas por producto
router.get('/product/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    
    logger.info('API Request - Obtener ventas por producto', {
      productId: productId,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    const resultado = salesService.getSalesByProduct(productId);
    
    logger.info('API Response - Ventas por producto obtenidas', {
      productId: productId,
      total: resultado.total,
      statusCode: 200
    });

    res.json(resultado);
  } catch (error) {
    logger.error('Error obteniendo ventas por producto', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// GET /api/sales/customer/:email - Obtener ventas por cliente
router.get('/customer/:email', async (req, res) => {
  try {
    const { email } = req.params;
    
    logger.info('API Request - Obtener ventas por cliente', {
      email: email,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    const resultado = salesService.getSalesByCustomer(email);
    
    logger.info('API Response - Ventas por cliente obtenidas', {
      email: email,
      total: resultado.total,
      statusCode: 200
    });

    res.json(resultado);
  } catch (error) {
    logger.error('Error obteniendo ventas por cliente', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// GET /api/sales/range - Obtener ventas por rango de fechas
router.get('/range', async (req, res) => {
  try {
    const { error, value } = dateRangeSchema.validate(req.query);
    
    if (error) {
      logger.warn('Validación fallida en rango de fechas', { error: error.details });
      return res.status(400).json({
        success: false,
        message: 'Datos de fecha inválidos',
        errors: error.details.map(detail => detail.message)
      });
    }

    logger.info('API Request - Obtener ventas por rango de fechas', {
      startDate: value.startDate,
      endDate: value.endDate,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    const resultado = salesService.getSalesByDateRange(value.startDate, value.endDate);
    
    logger.info('API Response - Ventas por rango obtenidas', {
      startDate: value.startDate,
      endDate: value.endDate,
      total: resultado.total,
      statusCode: 200
    });

    res.json(resultado);
  } catch (error) {
    logger.error('Error obteniendo ventas por rango', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// GET /api/sales/:id - Obtener venta por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    logger.info('API Request - Obtener venta por ID', {
      id: id,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    const resultado = salesService.getSaleById(id);
    
    if (!resultado.success) {
      logger.warn('Venta no encontrada', { id: id });
      return res.status(404).json(resultado);
    }
    
    logger.info('API Response - Venta obtenida', {
      id: id,
      productName: resultado.data.productName,
      statusCode: 200
    });

    res.json(resultado);
  } catch (error) {
    logger.error('Error obteniendo venta por ID', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// POST /api/sales - Crear nueva venta
router.post('/', async (req, res) => {
  try {
    const { error, value } = createSaleSchema.validate(req.body);
    
    if (error) {
      logger.warn('Validación fallida al crear venta', { error: error.details });
      return res.status(400).json({
        success: false,
        message: 'Datos de la venta inválidos',
        errors: error.details.map(detail => detail.message)
      });
    }

    logger.info('API Request - Crear nueva venta', {
      productId: value.productId,
      productName: value.productName,
      customerName: value.customerName,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    const resultado = salesService.createSale(value);
    
    if (!resultado.success) {
      logger.warn('Error al crear venta', { error: resultado.message });
      return res.status(400).json(resultado);
    }
    
    logger.info('API Response - Venta creada', {
      id: resultado.data.id,
      productName: resultado.data.productName,
      totalAmount: resultado.data.totalAmount,
      statusCode: 201
    });

    res.status(201).json(resultado);
  } catch (error) {
    logger.error('Error creando venta', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// POST /api/sales/from-booking - Crear venta desde cita
router.post('/from-booking', async (req, res) => {
  try {
    const { bookingId, productId, customerInfo, professionalId } = req.body;
    
    if (!bookingId || !productId || !customerInfo) {
      return res.status(400).json({
        success: false,
        message: 'Faltan datos requeridos: bookingId, productId, customerInfo'
      });
    }

    // Obtener información del producto
    const productResult = productosService.getProductoById(productId);
    if (!productResult.success) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }

    const product = productResult.data;

    logger.info('API Request - Crear venta desde cita', {
      bookingId: bookingId,
      productId: productId,
      productName: product.nombre,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    const resultado = salesService.registerSaleFromBooking(
      bookingId,
      productId,
      product.nombre,
      product.categoria,
      product.precio,
      customerInfo,
      professionalId || 'prof_default'
    );
    
    if (!resultado.success) {
      logger.warn('Error al crear venta desde cita', { error: resultado.message });
      return res.status(400).json(resultado);
    }
    
    logger.info('API Response - Venta desde cita creada', {
      id: resultado.data.id,
      bookingId: bookingId,
      productName: product.nombre,
      statusCode: 201
    });

    res.status(201).json(resultado);
  } catch (error) {
    logger.error('Error creando venta desde cita', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// PUT /api/sales/:id - Actualizar venta
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { error, value } = updateSaleSchema.validate(req.body);
    
    if (error) {
      logger.warn('Validación fallida al actualizar venta', { error: error.details });
      return res.status(400).json({
        success: false,
        message: 'Datos de la venta inválidos',
        errors: error.details.map(detail => detail.message)
      });
    }

    logger.info('API Request - Actualizar venta', {
      id: id,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    const resultado = salesService.updateSale(id, value);
    
    if (!resultado.success) {
      logger.warn('Error al actualizar venta', { error: resultado.message });
      return res.status(404).json(resultado);
    }
    
    logger.info('API Response - Venta actualizada', {
      id: id,
      productName: resultado.data.productName,
      statusCode: 200
    });

    res.json(resultado);
  } catch (error) {
    logger.error('Error actualizando venta', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// DELETE /api/sales/:id - Eliminar venta
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    logger.info('API Request - Eliminar venta', {
      id: id,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    const resultado = salesService.deleteSale(id);
    
    if (!resultado.success) {
      logger.warn('Error al eliminar venta', { error: resultado.message });
      return res.status(404).json(resultado);
    }
    
    logger.info('API Response - Venta eliminada', {
      id: id,
      statusCode: 200
    });

    res.json(resultado);
  } catch (error) {
    logger.error('Error eliminando venta', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

module.exports = router;
