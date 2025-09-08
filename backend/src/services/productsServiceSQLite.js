const { v4: uuidv4 } = require('uuid');
const databaseService = require('./databaseService');
const winston = require('winston');

// Logger específico para productos
const productsLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.json()
  ),
  defaultMeta: { service: 'products-service' },
  transports: [
    new winston.transports.File({ filename: 'logs/products.log' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  productsLogger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

class ProductsService {
  constructor() {
    this.db = databaseService.getDB();
    this.loadInitialProducts();
  }

  // Cargar productos iniciales desde el archivo existente
  loadInitialProducts() {
    try {
      // Verificar si ya hay productos
      const count = this.db.prepare('SELECT COUNT(*) as count FROM productos').get();
      if (count.count > 0) {
        productsLogger.info('Productos ya cargados en la base de datos');
        return;
      }

      // Cargar desde el archivo JSON existente
      const fs = require('fs');
      const path = require('path');
      const productosFile = path.join(__dirname, '..', '..', 'src', 'data', 'productosEsteticos.js');
      
      if (fs.existsSync(productosFile)) {
        delete require.cache[require.resolve(productosFile)];
        const productosModule = require(productosFile);
        const productosData = productosModule.productosEsteticos || productosModule;
        
        if (Array.isArray(productosData)) {
          const insertProduct = this.db.prepare(`
            INSERT INTO productos (id, nombre, categoria, precio, stock, descripcion, ingredientes, modo_uso)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `);

          productosData.forEach(producto => {
            insertProduct.run(
              producto.id || uuidv4(),
              producto.nombre,
              producto.categoria,
              producto.precio,
              producto.stock || 0,
              producto.descripcion || '',
              JSON.stringify(producto.ingredientes || []),
              producto.modoUso || ''
            );
          });

          productsLogger.info('Productos iniciales cargados desde archivo', {
            cantidad: productosData.length
          });
        } else {
          productsLogger.warn('El archivo de productos no contiene un array válido');
        }
      }

    } catch (error) {
      productsLogger.error('Error cargando productos iniciales:', error);
    }
  }

  // Obtener todos los productos
  async getAllProducts() {
    try {
      const products = this.db.prepare(`
        SELECT 
          id, nombre, categoria, precio, stock, descripcion, 
          ingredientes, modo_uso, activo, created_at, updated_at
        FROM productos 
        WHERE activo = 1
        ORDER BY categoria, nombre
      `).all();

      // Parsear ingredientes JSON
      const parsedProducts = products.map(product => ({
        ...product,
        ingredientes: JSON.parse(product.ingredientes || '[]')
      }));

      productsLogger.info('Productos obtenidos', { total: parsedProducts.length });

      return {
        success: true,
        data: parsedProducts,
        total: parsedProducts.length
      };

    } catch (error) {
      productsLogger.error('Error obteniendo productos:', error);
      return {
        success: false,
        message: 'Error interno obteniendo productos',
        error: error.message
      };
    }
  }

  // Obtener producto por ID
  async getProductById(productId) {
    try {
      const product = this.db.prepare(`
        SELECT 
          id, nombre, categoria, precio, stock, descripcion, 
          ingredientes, modo_uso, activo, created_at, updated_at
        FROM productos 
        WHERE id = ? AND activo = 1
      `).get(productId);

      if (!product) {
        return {
          success: false,
          message: 'Producto no encontrado'
        };
      }

      // Parsear ingredientes JSON
      product.ingredientes = JSON.parse(product.ingredientes || '[]');

      return {
        success: true,
        data: product
      };

    } catch (error) {
      productsLogger.error('Error obteniendo producto por ID:', error);
      return {
        success: false,
        message: 'Error interno obteniendo producto',
        error: error.message
      };
    }
  }

  // Crear nuevo producto
  async createProduct(productData) {
    try {
      const productId = uuidv4();
      const now = new Date().toISOString();

      const insertProduct = this.db.prepare(`
        INSERT INTO productos (
          id, nombre, categoria, precio, stock, descripcion, 
          ingredientes, modo_uso, activo, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const result = insertProduct.run(
        productId,
        productData.nombre,
        productData.categoria,
        productData.precio,
        productData.stock || 0,
        productData.descripcion || '',
        JSON.stringify(productData.ingredientes || []),
        productData.modo_uso || '',
        1, // activo
        now,
        now
      );

      productsLogger.info('Producto creado exitosamente', {
        productId,
        nombre: productData.nombre
      });

      return {
        success: true,
        data: {
          id: productId,
          ...productData,
          activo: 1,
          createdAt: now
        }
      };

    } catch (error) {
      productsLogger.error('Error creando producto:', error);
      return {
        success: false,
        message: 'Error interno creando producto',
        error: error.message
      };
    }
  }

  // Actualizar producto
  async updateProduct(productId, updateData) {
    try {
      const now = new Date().toISOString();
      
      // Construir query dinámicamente
      const fields = [];
      const values = [];
      
      Object.keys(updateData).forEach(key => {
        if (updateData[key] !== undefined) {
          if (key === 'ingredientes') {
            fields.push(`${key} = ?`);
            values.push(JSON.stringify(updateData[key]));
          } else {
            fields.push(`${key} = ?`);
            values.push(updateData[key]);
          }
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
      values.push(productId);

      const updateQuery = this.db.prepare(`
        UPDATE productos 
        SET ${fields.join(', ')}
        WHERE id = ?
      `);

      const result = updateQuery.run(...values);

      if (result.changes === 0) {
        return {
          success: false,
          message: 'Producto no encontrado'
        };
      }

      productsLogger.info('Producto actualizado', { productId, changes: result.changes });

      return {
        success: true,
        message: 'Producto actualizado correctamente'
      };

    } catch (error) {
      productsLogger.error('Error actualizando producto:', error);
      return {
        success: false,
        message: 'Error interno actualizando producto',
        error: error.message
      };
    }
  }

  // Eliminar producto (soft delete)
  async deleteProduct(productId) {
    try {
      const updateQuery = this.db.prepare('UPDATE productos SET activo = 0, updated_at = ? WHERE id = ?');
      const result = updateQuery.run(new Date().toISOString(), productId);

      if (result.changes === 0) {
        return {
          success: false,
          message: 'Producto no encontrado'
        };
      }

      productsLogger.info('Producto eliminado', { productId });

      return {
        success: true,
        message: 'Producto eliminado correctamente'
      };

    } catch (error) {
      productsLogger.error('Error eliminando producto:', error);
      return {
        success: false,
        message: 'Error interno eliminando producto',
        error: error.message
      };
    }
  }

  // Obtener estadísticas de productos
  async getProductStats() {
    try {
      const stats = this.db.prepare(`
        SELECT 
          COUNT(*) as totalProducts,
          COUNT(CASE WHEN activo = 1 THEN 1 END) as activeProducts,
          COUNT(CASE WHEN stock > 0 THEN 1 END) as inStockProducts,
          COUNT(CASE WHEN stock = 0 THEN 1 END) as outOfStockProducts,
          COALESCE(AVG(precio), 0) as averagePrice,
          COALESCE(MAX(precio), 0) as maxPrice,
          COALESCE(MIN(precio), 0) as minPrice
        FROM productos
      `).get();

      // Productos por categoría
      const productsByCategory = this.db.prepare(`
        SELECT 
          categoria,
          COUNT(*) as cantidad,
          COALESCE(AVG(precio), 0) as precio_promedio
        FROM productos
        WHERE activo = 1
        GROUP BY categoria
        ORDER BY cantidad DESC
      `).all();

      // Top productos más vendidos
      const topSellingProducts = this.db.prepare(`
        SELECT 
          p.nombre as producto,
          p.categoria,
          COUNT(v.id) as ventas,
          SUM(v.cantidad) as unidades_vendidas,
          SUM(v.total_amount) as ingresos
        FROM productos p
        LEFT JOIN ventas v ON p.id = v.producto_id
        WHERE p.activo = 1
        GROUP BY p.id, p.nombre, p.categoria
        ORDER BY ventas DESC
        LIMIT 10
      `).all();

      // Productos con stock bajo
      const lowStockProducts = this.db.prepare(`
        SELECT 
          id, nombre, categoria, stock, precio
        FROM productos
        WHERE activo = 1 AND stock <= 5 AND stock > 0
        ORDER BY stock ASC
      `).all();

      const result = {
        ...stats,
        productsByCategory,
        topSellingProducts,
        lowStockProducts
      };

      productsLogger.info('Estadísticas de productos obtenidas', {
        totalProducts: stats.totalProducts,
        activeProducts: stats.activeProducts
      });

      return {
        success: true,
        data: result
      };

    } catch (error) {
      productsLogger.error('Error obteniendo estadísticas:', error);
      return {
        success: false,
        message: 'Error interno obteniendo estadísticas',
        error: error.message
      };
    }
  }

  // Buscar productos
  async searchProducts(searchTerm) {
    try {
      const products = this.db.prepare(`
        SELECT 
          id, nombre, categoria, precio, stock, descripcion, 
          ingredientes, modo_uso, activo, created_at, updated_at
        FROM productos 
        WHERE activo = 1 AND (
          nombre LIKE ? OR 
          categoria LIKE ? OR 
          descripcion LIKE ?
        )
        ORDER BY categoria, nombre
      `).all(`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`);

      // Parsear ingredientes JSON
      const parsedProducts = products.map(product => ({
        ...product,
        ingredientes: JSON.parse(product.ingredientes || '[]')
      }));

      productsLogger.info('Búsqueda de productos realizada', {
        searchTerm,
        results: parsedProducts.length
      });

      return {
        success: true,
        data: parsedProducts,
        total: parsedProducts.length
      };

    } catch (error) {
      productsLogger.error('Error buscando productos:', error);
      return {
        success: false,
        message: 'Error interno buscando productos',
        error: error.message
      };
    }
  }

  // Actualizar stock
  async updateStock(productId, newStock) {
    try {
      const updateQuery = this.db.prepare(`
        UPDATE productos 
        SET stock = ?, updated_at = ?
        WHERE id = ? AND activo = 1
      `);

      const result = updateQuery.run(newStock, new Date().toISOString(), productId);

      if (result.changes === 0) {
        return {
          success: false,
          message: 'Producto no encontrado'
        };
      }

      productsLogger.info('Stock actualizado', { productId, newStock });

      return {
        success: true,
        message: 'Stock actualizado correctamente'
      };

    } catch (error) {
      productsLogger.error('Error actualizando stock:', error);
      return {
        success: false,
        message: 'Error interno actualizando stock',
        error: error.message
      };
    }
  }
}

module.exports = new ProductsService();
