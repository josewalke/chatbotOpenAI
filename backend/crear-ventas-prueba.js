const salesService = require('./src/services/salesService');

// Crear ventas de prueba
const ventasPrueba = [
  {
    productId: '1',
    productName: 'Hidratación Facial Profunda',
    productCategory: 'Tratamientos Faciales',
    price: 120,
    quantity: 1,
    customerName: 'María García',
    customerEmail: 'maria.garcia@email.com',
    customerPhone: '+34 123 456 789',
    saleType: 'treatment',
    paymentMethod: 'cash',
    paymentStatus: 'paid',
    notes: 'Venta de prueba - tratamiento completado'
  },
  {
    productId: '2',
    productName: 'Peeling Químico',
    productCategory: 'Tratamientos Faciales',
    price: 150,
    quantity: 1,
    customerName: 'Jose Juan',
    customerEmail: 'jose.juan@email.com',
    customerPhone: '1234567849',
    saleType: 'treatment',
    paymentMethod: 'card',
    paymentStatus: 'paid',
    notes: 'Venta de prueba - peeling realizado'
  },
  {
    productId: '4',
    productName: 'Cavitación Ultrasónica',
    productCategory: 'Tratamientos Corporales',
    price: 180,
    quantity: 2,
    customerName: 'Ana López',
    customerEmail: 'ana.lopez@email.com',
    customerPhone: '+34 987 654 321',
    saleType: 'treatment',
    paymentMethod: 'transfer',
    paymentStatus: 'paid',
    notes: 'Paquete de 2 sesiones de cavitación'
  }
];

console.log('🛒 Creando ventas de prueba...\n');

ventasPrueba.forEach((venta, index) => {
  const resultado = salesService.createSale(venta);
  if (resultado.success) {
    console.log(`✅ Venta ${index + 1} creada: ${venta.productName} - €${venta.price * venta.quantity}`);
    console.log(`   Cliente: ${venta.customerName}`);
    console.log(`   ID: ${resultado.data.id.slice(0, 8)}...\n`);
  } else {
    console.log(`❌ Error creando venta ${index + 1}: ${resultado.message}\n`);
  }
});

// Mostrar estadísticas
console.log('📊 Estadísticas de ventas:');
const stats = salesService.getSalesStats();
if (stats.success) {
  console.log(`   Total de ventas: ${stats.data.totalSales}`);
  console.log(`   Ingresos totales: €${stats.data.totalRevenue}`);
  console.log(`   Venta promedio: €${stats.data.averageSale}`);
  console.log(`   Productos vendidos: ${Object.keys(stats.data.salesByProduct).length}`);
}

console.log('\n🎉 Ventas de prueba creadas exitosamente!');
