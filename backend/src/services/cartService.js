const winston = require('winston');

// Logger específico para el carrito
const cartLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.json()
  ),
  defaultMeta: { service: 'cart-service' },
  transports: [
    new winston.transports.File({ filename: 'logs/cart.log' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  cartLogger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

class CartService {
  constructor() {
    // Almacenar carritos por sesión (en producción usar Redis o base de datos)
    this.carts = new Map();
    cartLogger.info('CartService inicializado correctamente');
  }

  // Obtener o crear carrito para una sesión
  getCart(sessionId) {
    if (!this.carts.has(sessionId)) {
      this.carts.set(sessionId, {
        items: [],
        total: 0,
        itemCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      cartLogger.info('Nuevo carrito creado', { sessionId });
    }
    return this.carts.get(sessionId);
  }

  // Agregar producto al carrito
  addToCart(sessionId, productId, productName, price, quantity = 1) {
    const cart = this.getCart(sessionId);
    
    // Buscar si el producto ya existe en el carrito
    const existingItem = cart.items.find(item => item.productId === productId);
    
    if (existingItem) {
      // Incrementar cantidad
      existingItem.quantity += quantity;
      existingItem.subtotal = existingItem.quantity * existingItem.price;
    } else {
      // Agregar nuevo producto
      cart.items.push({
        productId,
        productName,
        price,
        quantity,
        subtotal: price * quantity
      });
    }
    
    // Recalcular totales
    this.updateCartTotals(cart);
    cart.updatedAt = new Date();
    
    cartLogger.info('Producto agregado al carrito', {
      sessionId,
      productId,
      productName,
      price,
      quantity,
      totalItems: cart.itemCount,
      totalAmount: cart.total
    });
    
    return {
      success: true,
      message: `Producto agregado al carrito: ${productName} (${quantity} unidad${quantity > 1 ? 'es' : ''} por €${price})`,
      cart: this.getCartSummary(cart)
    };
  }

  // Remover producto del carrito
  removeFromCart(sessionId, productId, quantity = null) {
    const cart = this.getCart(sessionId);
    const itemIndex = cart.items.findIndex(item => item.productId === productId);
    
    if (itemIndex === -1) {
      return {
        success: false,
        message: 'Producto no encontrado en el carrito'
      };
    }
    
    const item = cart.items[itemIndex];
    
    if (quantity === null || quantity >= item.quantity) {
      // Remover completamente
      cart.items.splice(itemIndex, 1);
    } else {
      // Reducir cantidad
      item.quantity -= quantity;
      item.subtotal = item.quantity * item.price;
    }
    
    // Recalcular totales
    this.updateCartTotals(cart);
    cart.updatedAt = new Date();
    
    cartLogger.info('Producto removido del carrito', {
      sessionId,
      productId,
      quantity,
      totalItems: cart.itemCount,
      totalAmount: cart.total
    });
    
    return {
      success: true,
      message: 'Producto removido del carrito',
      cart: this.getCartSummary(cart)
    };
  }

  // Consultar estado del carrito
  getCartStatus(sessionId) {
    const cart = this.getCart(sessionId);
    return this.getCartSummary(cart);
  }

  // Limpiar carrito
  clearCart(sessionId) {
    const cart = this.getCart(sessionId);
    cart.items = [];
    this.updateCartTotals(cart);
    cart.updatedAt = new Date();
    
    cartLogger.info('Carrito limpiado', { sessionId });
    
    return {
      success: true,
      message: 'Carrito limpiado',
      cart: this.getCartSummary(cart)
    };
  }

  // Actualizar totales del carrito
  updateCartTotals(cart) {
    cart.itemCount = cart.items.reduce((total, item) => total + item.quantity, 0);
    cart.total = cart.items.reduce((total, item) => total + item.subtotal, 0);
  }

  // Obtener resumen del carrito
  getCartSummary(cart) {
    return {
      itemCount: cart.itemCount,
      totalAmount: cart.total,
      items: cart.items.map(item => ({
        productId: item.productId,
        productName: item.productName,
        price: item.price,
        quantity: item.quantity,
        subtotal: item.subtotal
      })),
      isEmpty: cart.items.length === 0,
      createdAt: cart.createdAt,
      updatedAt: cart.updatedAt
    };
  }

  // Obtener detalles completos del carrito para mostrar
  getCartDetails(sessionId) {
    const cart = this.getCart(sessionId);
    
    if (cart.items.length === 0) {
      return {
        message: "Tu carrito está vacío. ¡Agrega algunos productos!",
        isEmpty: true,
        items: [],
        total: 0,
        itemCount: 0
      };
    }
    
    let details = `🛒 **Tu carrito contiene ${cart.itemCount} producto${cart.itemCount > 1 ? 's' : ''}:**\n\n`;
    
    cart.items.forEach((item, index) => {
      details += `${index + 1}. **${item.productName}**\n`;
      details += `   - Precio: €${item.price}\n`;
      details += `   - Cantidad: ${item.quantity}\n`;
      details += `   - Subtotal: €${item.subtotal}\n\n`;
    });
    
    details += `💰 **Total: €${cart.total}**\n\n`;
    details += `¿Te gustaría proceder con la compra o agregar más productos?`;
    
    return {
      message: details,
      isEmpty: false,
      items: cart.items,
      total: cart.total,
      itemCount: cart.itemCount
    };
  }
}

module.exports = new CartService();
