const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());

// Ruta de prueba
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Servidor funcionando correctamente',
    port: PORT,
    timestamp: new Date().toISOString()
  });
});

// Ruta de productos de prueba
app.get('/api/productos', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: 1,
        nombre: "Hidratación Facial Profunda",
        categoria: "Tratamientos Faciales",
        descripcion: "Tratamiento de hidratación intensiva",
        precio: 120,
        duracion: "60 minutos"
      }
    ],
    total: 1
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor iniciado en puerto ${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📦 Productos: http://localhost:${PORT}/api/productos`);
});