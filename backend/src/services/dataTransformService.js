// Servicio para transformar datos de SQLite al formato esperado por el frontend
class DataTransformService {
  
  // Transformar ventas de SQLite al formato del frontend
  static transformSales(salesData) {
    if (!Array.isArray(salesData)) {
      return [];
    }

    return salesData.map(sale => ({
      id: sale.id,
      productName: sale.producto_nombre || 'Producto',
      productCategory: sale.producto_categoria || 'Categoría',
      price: sale.precio_unitario,
      quantity: sale.cantidad,
      totalAmount: sale.total_amount,
      customerInfo: {
        name: sale.cliente_nombre || 'Cliente',
        email: sale.cliente_email || '',
        phone: sale.cliente_telefono || ''
      },
      paymentStatus: sale.estado_pago,
      paymentMethod: sale.metodo_pago,
      saleType: sale.tipo_venta,
      createdAt: sale.created_at,
      notes: sale.notas,
      // Campos adicionales para compatibilidad
      producto_id: sale.producto_id,
      cliente_id: sale.cliente_id,
      profesional_id: sale.profesional_id
    }));
  }

  // Transformar productos de SQLite al formato del frontend
  static transformProducts(productsData) {
    if (!Array.isArray(productsData)) {
      return [];
    }

    return productsData.map(product => ({
      id: product.id,
      nombre: product.nombre,
      categoria: product.categoria,
      precio: product.precio,
      stock: product.stock,
      descripcion: product.descripcion,
      ingredientes: product.ingredientes || [],
      modoUso: product.modo_uso || '',
      activo: product.activo === 1,
      created_at: product.created_at,
      updated_at: product.updated_at,
      // Campos adicionales para compatibilidad
      duracion: product.duracion || '',
      beneficios: product.beneficios || [],
      cuidados: product.cuidados || [],
      contraindicaciones: product.contraindicaciones || []
    }));
  }

  // Transformar estadísticas de ventas
  static transformSalesStats(statsData) {
    if (!statsData) {
      return {};
    }

    return {
      totalSales: statsData.totalSales || 0,
      totalRevenue: statsData.totalRevenue || 0,
      averageSale: statsData.averageSale || 0,
      salesToday: statsData.salesToday || 0,
      salesThisWeek: statsData.salesThisWeek || 0,
      salesThisMonth: statsData.salesThisMonth || 0,
      salesByProduct: statsData.salesByProduct || [],
      salesByCategory: statsData.salesByCategory || [],
      salesByMonth: statsData.salesByMonth || [],
      topCustomers: statsData.topCustomers || []
    };
  }

  // Transformar estadísticas de productos
  static transformProductStats(statsData) {
    if (!statsData) {
      return {};
    }

    return {
      totalProducts: statsData.totalProducts || 0,
      activeProducts: statsData.activeProducts || 0,
      inStockProducts: statsData.inStockProducts || 0,
      outOfStockProducts: statsData.outOfStockProducts || 0,
      averagePrice: statsData.averagePrice || 0,
      maxPrice: statsData.maxPrice || 0,
      minPrice: statsData.minPrice || 0,
      productsByCategory: statsData.productsByCategory || [],
      topSellingProducts: statsData.topSellingProducts || [],
      lowStockProducts: statsData.lowStockProducts || []
    };
  }
}

module.exports = DataTransformService;
