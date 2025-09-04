const express = require('express');
const app = express();
const PORT = 3002;

app.use(express.json());

// Ruta de prueba simple
app.get('/test', (req, res) => {
  res.json({ message: 'Servidor funcionando correctamente!' });
});

// Ruta de salud
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    port: PORT
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor de prueba corriendo en puerto ${PORT}`);
  console.log(`🔗 Test URL: http://localhost:${PORT}/test`);
  console.log(`🔗 Health URL: http://localhost:${PORT}/health`);
}).on('error', (error) => {
  console.error('❌ Error iniciando servidor:', error);
  process.exit(1);
});

// Mantener el proceso vivo
process.on('SIGINT', () => {
  console.log('\n🛑 Cerrando servidor...');
  process.exit(0);
});
