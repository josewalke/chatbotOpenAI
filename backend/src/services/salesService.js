const { v4: uuidv4 } = require('uuid');
const moment = require('moment');
const fs = require('fs');
const path = require('path');

class SalesService {
  constructor() {
    this.sales = new Map(); // Almacenamiento en memoria
    this.salesFile = path.join(__dirname, '../data/ventas.json');
    this.loadSales();
  }

  // Cargar ventas desde archivo
  loadSales() {
    try {
      if (fs.existsSync(this.salesFile)) {
        const data = fs.readFileSync(this.salesFile, 'utf8');
        const salesArray = JSON.parse(data);
        salesArray.forEach(sale => {
          this.sales.set(sale.id, sale);
        });
        console.log(`✅ Cargadas ${salesArray.length} ventas desde archivo`);
      }
    } catch (error) {
      console.error('Error cargando ventas:', error.message);
    }
  }

  // Guardar ventas en archivo
  saveSales() {
    try {
      const salesArray = Array.from(this.sales.values());
      fs.writeFileSync(this.salesFile, JSON.stringify(salesArray, null, 2), 'utf8');
    } catch (error) {
      console.error('Error guardando ventas:', error.message);
    }
  }

  // Crear nueva venta
  createSale(saleData) {
    try {
      const sale = {
        id: uuidv4(),
        productId: saleData.productId,
        productName: saleData.productName,
        productCategory: saleData.productCategory,
        price: saleData.price,
        quantity: saleData.quantity || 1,
        totalAmount: saleData.price * (saleData.quantity || 1),
        customerInfo: {
          name: saleData.customerName,
          email: saleData.customerEmail,
          phone: saleData.customerPhone
        },
        saleType: saleData.saleType || 'treatment', // 'treatment', 'product', 'package'
        bookingId: saleData.bookingId || null, // Relación con cita si aplica
        professionalId: saleData.professionalId || 'prof_default',
        paymentMethod: saleData.paymentMethod || 'cash',
        paymentStatus: saleData.paymentStatus || 'paid',
        notes: saleData.notes || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      this.sales.set(sale.id, sale);
      this.saveSales();

      return {
        success: true,
        data: sale,
        message: 'Venta registrada exitosamente'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error al crear la venta',
        error: error.message
      };
    }
  }

  // Obtener todas las ventas
  getAllSales() {
    const salesArray = Array.from(this.sales.values());
    return {
      success: true,
      data: salesArray,
      total: salesArray.length
    };
  }

  // Obtener venta por ID
  getSaleById(id) {
    const sale = this.sales.get(id);
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
  }

  // Obtener ventas por producto
  getSalesByProduct(productId) {
    const sales = Array.from(this.sales.values()).filter(sale => sale.productId === productId);
    return {
      success: true,
      data: sales,
      total: sales.length
    };
  }

  // Obtener ventas por cliente
  getSalesByCustomer(customerEmail) {
    const sales = Array.from(this.sales.values()).filter(sale => 
      sale.customerInfo.email === customerEmail
    );
    return {
      success: true,
      data: sales,
      total: sales.length
    };
  }

  // Obtener ventas por fecha
  getSalesByDateRange(startDate, endDate) {
    const sales = Array.from(this.sales.values()).filter(sale => {
      const saleDate = new Date(sale.createdAt);
      return saleDate >= new Date(startDate) && saleDate <= new Date(endDate);
    });
    return {
      success: true,
      data: sales,
      total: sales.length
    };
  }

  // Obtener estadísticas de ventas
  getSalesStats() {
    const sales = Array.from(this.sales.values());
    
    if (sales.length === 0) {
      return {
        success: true,
        data: {
          totalSales: 0,
          totalRevenue: 0,
          averageSale: 0,
          salesByProduct: {},
          salesByCategory: {},
          salesByMonth: {},
          topProducts: [],
          topCustomers: []
        }
      };
    }

    const totalRevenue = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
    const averageSale = totalRevenue / sales.length;

    // Ventas por producto
    const salesByProduct = {};
    sales.forEach(sale => {
      if (!salesByProduct[sale.productId]) {
        salesByProduct[sale.productId] = {
          productName: sale.productName,
          quantity: 0,
          revenue: 0
        };
      }
      salesByProduct[sale.productId].quantity += sale.quantity;
      salesByProduct[sale.productId].revenue += sale.totalAmount;
    });

    // Ventas por categoría
    const salesByCategory = {};
    sales.forEach(sale => {
      if (!salesByCategory[sale.productCategory]) {
        salesByCategory[sale.productCategory] = {
          quantity: 0,
          revenue: 0
        };
      }
      salesByCategory[sale.productCategory].quantity += sale.quantity;
      salesByCategory[sale.productCategory].revenue += sale.totalAmount;
    });

    // Ventas por mes
    const salesByMonth = {};
    sales.forEach(sale => {
      const month = moment(sale.createdAt).format('YYYY-MM');
      if (!salesByMonth[month]) {
        salesByMonth[month] = {
          quantity: 0,
          revenue: 0
        };
      }
      salesByMonth[month].quantity += sale.quantity;
      salesByMonth[month].revenue += sale.totalAmount;
    });

    // Top productos
    const topProducts = Object.entries(salesByProduct)
      .map(([productId, data]) => ({
        productId,
        productName: data.productName,
        quantity: data.quantity,
        revenue: data.revenue
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Top clientes
    const customerStats = {};
    sales.forEach(sale => {
      const email = sale.customerInfo.email;
      if (!customerStats[email]) {
        customerStats[email] = {
          name: sale.customerInfo.name,
          purchases: 0,
          totalSpent: 0
        };
      }
      customerStats[email].purchases += 1;
      customerStats[email].totalSpent += sale.totalAmount;
    });

    const topCustomers = Object.entries(customerStats)
      .map(([email, data]) => ({
        email,
        name: data.name,
        purchases: data.purchases,
        totalSpent: data.totalSpent
      }))
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10);

    return {
      success: true,
      data: {
        totalSales: sales.length,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        averageSale: Math.round(averageSale * 100) / 100,
        salesByProduct,
        salesByCategory,
        salesByMonth,
        topProducts,
        topCustomers
      }
    };
  }

  // Actualizar venta
  updateSale(id, updateData) {
    const sale = this.sales.get(id);
    if (!sale) {
      return {
        success: false,
        message: 'Venta no encontrada'
      };
    }

    try {
      const updatedSale = {
        ...sale,
        ...updateData,
        id: id, // Mantener ID original
        updatedAt: new Date().toISOString()
      };

      this.sales.set(id, updatedSale);
      this.saveSales();

      return {
        success: true,
        data: updatedSale,
        message: 'Venta actualizada exitosamente'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error al actualizar la venta',
        error: error.message
      };
    }
  }

  // Eliminar venta
  deleteSale(id) {
    const sale = this.sales.get(id);
    if (!sale) {
      return {
        success: false,
        message: 'Venta no encontrada'
      };
    }

    this.sales.delete(id);
    this.saveSales();

    return {
      success: true,
      message: 'Venta eliminada exitosamente'
    };
  }

  // Registrar venta desde cita completada
  registerSaleFromBooking(bookingId, productId, productName, productCategory, price, customerInfo, professionalId) {
    const saleData = {
      productId,
      productName,
      productCategory,
      price,
      quantity: 1,
      customerName: customerInfo.name,
      customerEmail: customerInfo.email,
      customerPhone: customerInfo.phone,
      saleType: 'treatment',
      bookingId,
      professionalId,
      paymentMethod: 'cash',
      paymentStatus: 'paid',
      notes: `Venta generada automáticamente desde cita ${bookingId}`
    };

    return this.createSale(saleData);
  }
}

module.exports = new SalesService();
