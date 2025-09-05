const axios = require('axios');

async function testFunctionCalling() {
  try {
    console.log('🧪 Probando Function Calling...');
    
    // Crear conversación
    const conversationResponse = await axios.post('http://localhost:5000/api/chat/conversation');
    const conversationId = conversationResponse.data.conversation.id;
    
    console.log('✅ Conversación creada:', conversationId);
    
    // Enviar mensaje para agendar cita
    const messageData = {
      message: "quiero agendar una cita para hidratación facial profunda mañana a las 5 de la tarde, mi nombre es Maria Garcia y mi telefono es 123456789",
      conversationId: conversationId
    };
    
    console.log('📤 Enviando mensaje...');
    const chatResponse = await axios.post('http://localhost:5000/api/chat/message', messageData);
    
    console.log('🤖 Respuesta de la IA:');
    console.log(chatResponse.data.response);
    
    if (chatResponse.data.functionExecuted) {
      console.log('✅ Función ejecutada:', chatResponse.data.functionExecuted);
    }
    
    // Verificar si se creó la cita
    console.log('\n🔍 Verificando citas...');
    const bookingsResponse = await axios.get('http://localhost:5000/api/booking');
    
    console.log('📊 Total de citas:', bookingsResponse.data.total);
    if (bookingsResponse.data.bookings.length > 0) {
      console.log('✅ Citas encontradas:');
      bookingsResponse.data.bookings.forEach(booking => {
        console.log(`- ${booking.customerInfo.name}: ${booking.date} ${booking.time}`);
      });
    } else {
      console.log('❌ No se encontraron citas');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testFunctionCalling();
