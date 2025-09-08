const { v4: uuidv4 } = require('uuid');
const databaseService = require('./databaseService');
const winston = require('winston');

// Logger específico para ventas
const salesLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.json()
  ),
  defaultMeta: { service: 'sales-service' },
  transports: [
    new winston.transports.File({ filename: 'logs/sales.log' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  salesLogger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

class SalesService {
  constructor() {
    this.db = databaseService.getDB();
  }

  // Crear una nueva venta
  async createSale(saleData) {
    try {
      console.log('🔍 Datos recibidos en createSale:', saleData);
      
      const saleId = uuidv4();
      const now = new Date().toISOString();

      // Calcular total
      const totalAmount = saleData.precio_unitario * (saleData.cantidad || 1);

      const insertSale = this.db.prepare(`
        INSERT INTO ventas (
          id, producto_id, cliente_id, cantidad, precio_unitario, total_amount,
          tipo_venta, metodo_pago, estado_pago, direccion_envio, notas, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const result = insertSale.run(
        saleId,
        saleData.producto_id || null,
        saleData.cliente_id || null,
        saleData.cantidad || 1,
        saleData.precio_unitario,
        totalAmount,
        saleData.tipo_venta || 'product',
        saleData.metodo_pago || 'card',
        saleData.estado_pago || 'paid',
        saleData.direccion_envio || null,
        saleData.notas || null,
        now,
        now
      );

      salesLogger.info('Venta creada exitosamente', {
        saleId,
        totalAmount,
        cliente: saleData.cliente_id,
        producto: saleData.producto_id
      });

      return {
        success: true,
        data: {
          id: saleId,
          productId: saleData.producto_id,
          productName: saleData.notas?.split(' - ')[0]?.replace('Venta de ', '') || 'Producto',
          totalAmount,
          createdAt: now
        }
      };

    } catch (error) {
      salesLogger.error('Error creando venta:', error);
      return {
        success: false,
        message: 'Error interno creando venta',
        error: error.message
      };
    }
  }

  // Obtener todas las ventas
  async getAllSales() {
    try {
      const sales = this.db.prepare(`
        SELECT 
          v.*,
          p.nombre as producto_nombre,
          p.categoria as producto_categoria,
          c.nombre as cliente_nombre,
          c.telefono as cliente_telefono,
          c.email as cliente_email,
          prof.nombre as profesional_nombre
        FROM ventas v
        LEFT JOIN productos p ON v.producto_id = p.id
        LEFT JOIN clientes c ON v.cliente_id = c.id
        LEFT JOIN profesionales prof ON v.profesional_id = prof.id
        ORDER BY v.created_at DESC
      `).all();

      salesLogger.info('Ventas obtenidas', { total: sales.length });

      return {
        success: true,
        data: sales,
        total: sales.length
      };

    } catch (error) {
      salesLogger.error('Error obteniendo ventas:', error);
      return {
        success: false,
        message: 'Error interno obteniendo ventas',
        error: error.message
      };
    }
  }

  // Obtener estadísticas de ventas
  async getSalesStats() {
    try {
      const stats = this.db.prepare(`
        SELECT 
          COUNT(*) as totalSales,
          COALESCE(SUM(total_amount), 0) as totalRevenue,
          COALESCE(AVG(total_amount), 0) as averageSale,
          COUNT(CASE WHEN DATE(created_at) = DATE('now') THEN 1 END) as salesToday,
          COUNT(CASE WHEN DATE(created_at) >= DATE('now', '-7 days') THEN 1 END) as salesThisWeek,
          COUNT(CASE WHEN DATE(created_at) >= DATE('now', '-30 days') THEN 1 END) as salesThisMonth
        FROM ventas
      `).get();

      // Ventas por producto
      const salesByProduct = this.db.prepare(`
        SELECT 
          p.nombre as producto,
          COUNT(*) as cantidad,
          SUM(v.total_amount) as ingresos
        FROM ventas v
        LEFT JOIN productos p ON v.producto_id = p.id
        GROUP BY v.producto_id, p.nombre
        ORDER BY cantidad DESC
        LIMIT 10
      `).all();

      // Ventas por categoría
      const salesByCategory = this.db.prepare(`
        SELECT 
          p.categoria,
          COUNT(*) as cantidad,
          SUM(v.total_amount) as ingresos
        FROM ventas v
        LEFT JOIN productos p ON v.producto_id = p.id
        WHERE p.categoria IS NOT NULL
        GROUP BY p.categoria
        ORDER BY cantidad DESC
      `).all();

      // Ventas por mes (últimos 12 meses)
      const salesByMonth = this.db.prepare(`
        SELECT 
          strftime('%Y-%m', created_at) as mes,
          COUNT(*) as cantidad,
          SUM(total_amount) as ingresos
        FROM ventas
        WHERE created_at >= DATE('now', '-12 months')
        GROUP BY strftime('%Y-%m', created_at)
        ORDER BY mes DESC
      `).all();

      // Top clientes
      const topCustomers = this.db.prepare(`
        SELECT 
          c.nombre as cliente,
          COUNT(*) as compras,
          SUM(v.total_amount) as gasto_total
        FROM ventas v
        LEFT JOIN clientes c ON v.cliente_id = c.id
        WHERE c.nombre IS NOT NULL
        GROUP BY v.cliente_id, c.nombre
        ORDER BY gasto_total DESC
        LIMIT 10
      `).all();

      const result = {
        ...stats,
        salesByProduct,
        salesByCategory,
        salesByMonth,
        topCustomers
      };

      salesLogger.info('Estadísticas de ventas obtenidas', {
        totalSales: stats.totalSales,
        totalRevenue: stats.totalRevenue
      });

      return {
        success: true,
        data: result
      };

    } catch (error) {
      salesLogger.error('Error obteniendo estadísticas:', error);
      return {
        success: false,
        message: 'Error interno obteniendo estadísticas',
        error: error.message
      };
    }
  }

  // Buscar ventas por término
  async searchSales(searchTerm) {
    try {
      const sales = this.db.prepare(`
        SELECT 
          v.*,
          p.nombre as producto_nombre,
          c.nombre as cliente_nombre
        FROM ventas v
        LEFT JOIN productos p ON v.producto_id = p.id
        LEFT JOIN clientes c ON v.cliente_id = c.id
        WHERE 
          p.nombre LIKE ? OR 
          c.nombre LIKE ? OR 
          c.telefono LIKE ? OR 
          c.email LIKE ? OR
          v.id LIKE ?
        ORDER BY v.created_at DESC
      `).all(`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`);

      salesLogger.info('Búsqueda de ventas realizada', {
        searchTerm,
        results: sales.length
      });

      return {
        success: true,
        data: sales,
        total: sales.length
      };

    } catch (error) {
      salesLogger.error('Error buscando ventas:', error);
      return {
        success: false,
        message: 'Error interno buscando ventas',
        error: error.message
      };
    }
  }

  // Actualizar venta
  async updateSale(saleId, updateData) {
    try {
      const now = new Date().toISOString();
      
      // Construir query dinámicamente
      const fields = [];
      const values = [];
      
      Object.keys(updateData).forEach(key => {
        if (updateData[key] !== undefined) {
          fields.push(`${key} = ?`);
          values.push(updateData[key]);
        }
      });
      
      if (fields.length === 0) {
        return {
          success: false,
          message: 'No hay campos para actualizar'
        };
      }
      
      fields.push('updated_at = ?');
      values.push(now);
      values.push(saleId);

      const updateQuery = this.db.prepare(`
        UPDATE ventas 
        SET ${fields.join(', ')}
        WHERE id = ?
      `);

      const result = updateQuery.run(...values);

      if (result.changes === 0) {
        return {
          success: false,
          message: 'Venta no encontrada'
        };
      }

      salesLogger.info('Venta actualizada', { saleId, changes: result.changes });

      return {
        success: true,
        message: 'Venta actualizada correctamente'
      };

    } catch (error) {
      salesLogger.error('Error actualizando venta:', error);
      return {
        success: false,
        message: 'Error interno actualizando venta',
        error: error.message
      };
    }
  }

  // Eliminar venta
  async deleteSale(saleId) {
    try {
      const deleteQuery = this.db.prepare('DELETE FROM ventas WHERE id = ?');
      const result = deleteQuery.run(saleId);

      if (result.changes === 0) {
        return {
          success: false,
          message: 'Venta no encontrada'
        };
      }

      salesLogger.info('Venta eliminada', { saleId });

      return {
        success: true,
        message: 'Venta eliminada correctamente'
      };

    } catch (error) {
      salesLogger.error('Error eliminando venta:', error);
      return {
        success: false,
        message: 'Error interno eliminando venta',
        error: error.message
      };
    }
  }

  // Obtener venta por ID
  async getSaleById(saleId) {
    try {
      const sale = this.db.prepare(`
        SELECT 
          v.*,
          p.nombre as producto_nombre,
          p.categoria as producto_categoria,
          c.nombre as cliente_nombre,
          c.telefono as cliente_telefono,
          c.email as cliente_email,
          prof.nombre as profesional_nombre
        FROM ventas v
        LEFT JOIN productos p ON v.producto_id = p.id
        LEFT JOIN clientes c ON v.cliente_id = c.id
        LEFT JOIN profesionales prof ON v.profesional_id = prof.id
        WHERE v.id = ?
      `).get(saleId);

      if (!sale) {
        return {
          success: false,
          message: 'Venta no encontrada'
        };
      }

      return {
        success: true,
        data: sale
      };

    } catch (error) {
      salesLogger.error('Error obteniendo venta por ID:', error);
      return {
        success: false,
        message: 'Error interno obteniendo venta',
        error: error.message
      };
    }
  }
}

module.exports = new SalesService();
