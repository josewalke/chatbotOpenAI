const axios = require('axios');

async function quickTest() {
  try {
    const conv = await axios.post('http://localhost:8080/api/chat/conversation');
    const msg = await axios.post('http://localhost:8080/api/chat/message', {
      message: "enseñame los productos que tienes",
      conversationId: conv.data.conversation.id
    });
    
    console.log('Related Products:', msg.data.relatedProducts?.length || 0);
    if (msg.data.relatedProducts?.length > 0) {
      console.log('✅ ¡Funcionando!');
      msg.data.relatedProducts.forEach((p, i) => {
        console.log(`${i+1}. ${p.nombre} - €${p.precio}`);
      });
    } else {
      console.log('❌ No hay productos');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

quickTest();
