#!/bin/bash

echo "🚀 Instalando Sistema de Automatización + IA para Clínica Estética"
echo "================================================================"

# Verificar si Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "❌ Node.js no está instalado. Por favor, instala Node.js 16+ primero."
    exit 1
fi

# Verificar versión de Node.js
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo "❌ Node.js versión $NODE_VERSION detectada. Se requiere Node.js 16+"
    exit 1
fi

echo "✅ Node.js $(node -v) detectado"

# Crear directorio de logs si no existe
mkdir -p logs

# Instalar dependencias del backend
echo "📦 Instalando dependencias del backend..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Error instalando dependencias del backend"
    exit 1
fi

# Instalar dependencias del frontend
echo "📦 Instalando dependencias del frontend..."
cd frontend
npm install

if [ $? -ne 0 ]; then
    echo "❌ Error instalando dependencias del frontend"
    exit 1
fi

cd ..

# Verificar si existe archivo .env
if [ ! -f ".env" ]; then
    echo "📝 Configurando variables de entorno..."
    cp config.env .env
    echo "⚠️  IMPORTANTE: Edita el archivo .env con tu API key de OpenAI"
    echo "   OPENAI_API_KEY=tu_api_key_aqui"
fi

echo ""
echo "✅ Instalación completada exitosamente!"
echo ""
echo "🎯 Próximos pasos:"
echo "1. Edita el archivo .env con tu API key de OpenAI"
echo "2. Ejecuta 'npm run dev' para iniciar el backend"
echo "3. En otra terminal, ejecuta 'cd frontend && npm start' para el frontend"
echo ""
echo "🌐 URLs de acceso:"
echo "   Frontend: http://localhost:3000"
echo "   Backend API: http://localhost:3001/api"
echo "   Health Check: http://localhost:3001/api/health"
echo ""
echo "📚 Documentación: README.md"
echo ""
echo "¡Disfruta tu nuevo sistema de automatización! 🎉"
