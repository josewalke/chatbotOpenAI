const axios = require('axios');

async function forceReconnection() {
  console.log('🔄 Forzando reconexión del sistema...\n');

  try {
    // 1. Verificar estado actual
    console.log('1. Estado actual del sistema:');
    const statusResponse = await axios.get('http://localhost:8080/api/chat/status');
    console.log(JSON.stringify(statusResponse.data.status, null, 2));
    console.log('');

    // 2. Enviar un mensaje para forzar la reconexión
    console.log('2. Enviando mensaje para forzar reconexión...');
    
    // Crear conversación
    const conversationResponse = await axios.post('http://localhost:8080/api/chat/conversation');
    const conversationId = conversationResponse.data.conversationId;
    
    // Enviar mensaje
    const messageResponse = await axios.post('http://localhost:8080/api/chat/message', {
      message: 'Hola, ¿funcionas correctamente?',
      conversationId: conversationId
    });

    console.log('Respuesta:', messageResponse.data.response);
    console.log('Modelo usado:', messageResponse.data.model);
    console.log('Intent:', messageResponse.data.intent);
    console.log('');

    // 3. Verificar estado después del mensaje
    console.log('3. Estado después del mensaje:');
    const finalStatusResponse = await axios.get('http://localhost:8080/api/chat/status');
    console.log(JSON.stringify(finalStatusResponse.data.status, null, 2));

  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

forceReconnection().then(() => {
  console.log('\n✅ Reconexión completada');
  process.exit(0);
}).catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});
