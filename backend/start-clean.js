const fs = require('fs');
const path = require('path');

// Función para encontrar un puerto libre
function findFreePort(startPort = 5000) {
  return new Promise((resolve) => {
    const net = require('net');
    const server = net.createServer();
    
    server.listen(startPort, () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
    
    server.on('error', () => {
      resolve(findFreePort(startPort + 1));
    });
  });
}

// Función principal
async function setupPort() {
  try {
    const envPath = path.join(__dirname, '.env');
    const packagePath = path.join(__dirname, 'package.json');
    
    // Leer archivo .env
    let envContent = fs.readFileSync(envPath, 'utf8');
    
    // Buscar puerto libre
    const freePort = await findFreePort(5000);
    
    // Actualizar puerto en .env
    envContent = envContent.replace(/PORT=\d+/, `PORT=${freePort}`);
    fs.writeFileSync(envPath, envContent);
    
    console.log(`✅ Puerto configurado: ${freePort}`);
    console.log(`🚀 Iniciando servidor en puerto ${freePort}...`);
    
    // Iniciar servidor
    require('./src/server.js');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

setupPort();
