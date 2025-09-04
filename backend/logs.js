#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 Sistema de Logs del Backend');
console.log('==============================\n');

const logFiles = [
  { name: 'API Logs', file: 'logs/api.log' },
  { name: 'OpenAI Logs', file: 'logs/openai.log' },
  { name: 'Error Logs', file: 'logs/error.log' },
  { name: 'Combined Logs', file: 'logs/combined.log' }
];

function tailFile(filename, lines = 10) {
  try {
    if (!fs.existsSync(filename)) {
      console.log(`❌ Archivo no encontrado: ${filename}`);
      return;
    }
    
    const content = fs.readFileSync(filename, 'utf8');
    const linesArray = content.split('\n').filter(line => line.trim());
    const lastLines = linesArray.slice(-lines);
    
    console.log(`\n📋 ${filename} (últimas ${lines} líneas):`);
    console.log('─'.repeat(50));
    
    lastLines.forEach(line => {
      if (line.trim()) {
        try {
          const logEntry = JSON.parse(line);
          const timestamp = logEntry.timestamp || 'N/A';
          const level = logEntry.level || 'INFO';
          const message = logEntry.message || 'N/A';
          
          console.log(`[${timestamp}] [${level}] ${message}`);
          if (logEntry.error) {
            console.log(`   Error: ${logEntry.error}`);
          }
          if (logEntry.intent) {
            console.log(`   Intent: ${logEntry.intent} (conf: ${logEntry.confidence})`);
          }
          if (logEntry.modelUsed) {
            console.log(`   Model: ${logEntry.modelUsed}${logEntry.fallbackUsed ? ' (fallback)' : ''}`);
          }
        } catch (e) {
          console.log(line);
        }
      }
    });
  } catch (error) {
    console.log(`❌ Error leyendo ${filename}: ${error.message}`);
  }
}

function watchFile(filename) {
  if (!fs.existsSync(filename)) {
    console.log(`❌ Archivo no encontrado: ${filename}`);
    return;
  }
  
  console.log(`👀 Monitoreando ${filename} en tiempo real...`);
  console.log('Presiona Ctrl+C para salir\n');
  
  let lastSize = fs.statSync(filename).size;
  
  const watcher = fs.watch(filename, (eventType, filename) => {
    if (eventType === 'change') {
      const currentSize = fs.statSync(filename).size;
      if (currentSize > lastSize) {
        const stream = fs.createReadStream(filename, {
          start: lastSize,
          end: currentSize
        });
        
        stream.on('data', (chunk) => {
          const lines = chunk.toString().split('\n').filter(line => line.trim());
          lines.forEach(line => {
            if (line.trim()) {
              try {
                const logEntry = JSON.parse(line);
                const timestamp = logEntry.timestamp || 'N/A';
                const level = logEntry.level || 'INFO';
                const message = logEntry.message || 'N/A';
                
                console.log(`[${timestamp}] [${level}] ${message}`);
                if (logEntry.error) {
                  console.log(`   Error: ${logEntry.error}`);
                }
                if (logEntry.intent) {
                  console.log(`   Intent: ${logEntry.intent} (conf: ${logEntry.confidence})`);
                }
                if (logEntry.modelUsed) {
                  console.log(`   Model: ${logEntry.modelUsed}${logEntry.fallbackUsed ? ' (fallback)' : ''}`);
                }
              } catch (e) {
                console.log(line);
              }
            }
          });
        });
      }
      lastSize = currentSize;
    }
  });
  
  return watcher;
}

// Argumentos de línea de comandos
const args = process.argv.slice(2);
const command = args[0];

if (command === 'watch') {
  const fileType = args[1] || 'api';
  const logFile = logFiles.find(f => f.name.toLowerCase().includes(fileType.toLowerCase()));
  
  if (logFile) {
    watchFile(logFile.file);
  } else {
    console.log('📋 Archivos disponibles:');
    logFiles.forEach(f => console.log(`  - ${f.name}: ${f.file}`));
  }
} else if (command === 'stats') {
  console.log('📊 Estadísticas de Logs:\n');
  
  logFiles.forEach(({ name, file }) => {
    try {
      if (fs.existsSync(file)) {
        const stats = fs.statSync(file);
        const content = fs.readFileSync(file, 'utf8');
        const lines = content.split('\n').filter(line => line.trim()).length;
        
        console.log(`${name}:`);
        console.log(`  - Tamaño: ${(stats.size / 1024).toFixed(2)} KB`);
        console.log(`  - Líneas: ${lines}`);
        console.log(`  - Última modificación: ${stats.mtime.toLocaleString()}`);
      } else {
        console.log(`${name}: Archivo no encontrado`);
      }
    } catch (error) {
      console.log(`${name}: Error al leer`);
    }
    console.log('');
  });
} else {
  // Mostrar todos los logs
  logFiles.forEach(({ name, file }) => {
    tailFile(file, 5);
  });
  
  console.log('\n💡 Comandos disponibles:');
  console.log('  node logs.js          - Ver últimos logs');
  console.log('  node logs.js watch api - Monitorear logs de API en tiempo real');
  console.log('  node logs.js watch openai - Monitorear logs de OpenAI en tiempo real');
  console.log('  node logs.js stats    - Ver estadísticas de logs');
}
