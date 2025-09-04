const OpenAI = require('openai');
const dotenv = require('dotenv');

// Cargar variables de entorno
dotenv.config({ path: '.env' });

console.log('🔍 Verificando configuración de OpenAI...');
console.log('API Key configurada:', process.env.OPENAI_API_KEY ? '✅ Sí' : '❌ No');
console.log('Modelo configurado:', process.env.OPENAI_MODEL || 'gpt-4.1-mini');
console.log('Modelo de fallback:', 'gpt-4.1');

async function testOpenAI() {
  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    console.log('🚀 Probando conexión con OpenAI...');

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4',
      messages: [{ role: 'user', content: 'Hola, ¿cómo estás?' }],
      max_tokens: 50,
    });

    console.log('✅ Conexión exitosa con OpenAI!');
    console.log('Modelo usado:', process.env.OPENAI_MODEL || 'gpt-4.1-mini');
    console.log('Respuesta:', completion.choices[0].message.content);
    
  } catch (error) {
    console.error('❌ Error conectando con OpenAI:', error.message);
    console.error('Detalles:', error);
  }
}

testOpenAI();
