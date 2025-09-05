const { productosEsteticos } = require('../data/productosEsteticos');
const fs = require('fs');
const path = require('path');

class ProductosService {
  constructor() {
    this.productos = [...productosEsteticos]; // Copia para poder modificar
    this.nextId = Math.max(...this.productos.map(p => p.id)) + 1;
    this.dataFile = path.join(__dirname, '../data/productosEsteticos.js');
  }

  // Obtener todos los productos
  getAllProductos() {
    return {
      success: true,
      data: this.productos,
      total: this.productos.length
    };
  }

  // Obtener producto por ID
  getProductoById(id) {
    const producto = this.productos.find(p => p.id === parseInt(id));
    if (!producto) {
      return {
        success: false,
        message: 'Producto no encontrado'
      };
    }
    return {
      success: true,
      data: producto
    };
  }

  // Buscar productos por categoría
  getProductosByCategoria(categoria) {
    const productos = this.productos.filter(p => 
      p.categoria.toLowerCase().includes(categoria.toLowerCase())
    );
    return {
      success: true,
      data: productos,
      total: productos.length
    };
  }

  // Buscar productos por nombre
  searchProductos(query) {
    const productos = this.productos.filter(p => 
      p.nombre.toLowerCase().includes(query.toLowerCase()) ||
      p.descripcion.toLowerCase().includes(query.toLowerCase())
    );
    return {
      success: true,
      data: productos,
      total: productos.length
    };
  }

  // Obtener todas las categorías
  getCategorias() {
    const categorias = [...new Set(this.productos.map(p => p.categoria))];
    return {
      success: true,
      data: categorias
    };
  }

  // Crear nuevo producto
  createProducto(productoData) {
    try {
      // Validar datos requeridos
      const requiredFields = ['nombre', 'categoria', 'descripcion', 'precio', 'duracion'];
      for (const field of requiredFields) {
        if (!productoData[field]) {
          return {
            success: false,
            message: `El campo ${field} es requerido`
          };
        }
      }

      // Crear nuevo producto
      const nuevoProducto = {
        id: this.nextId++,
        nombre: productoData.nombre,
        categoria: productoData.categoria,
        descripcion: productoData.descripcion,
        precio: parseFloat(productoData.precio),
        duracion: productoData.duracion,
        beneficios: productoData.beneficios || [],
        cuidados: productoData.cuidados || [],
        contraindicaciones: productoData.contraindicaciones || [],
        activo: productoData.activo !== undefined ? productoData.activo : true,
        fechaCreacion: new Date().toISOString(),
        fechaModificacion: new Date().toISOString()
      };

      this.productos.push(nuevoProducto);
      this.saveToFile();

      return {
        success: true,
        data: nuevoProducto,
        message: 'Producto creado exitosamente'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error al crear el producto',
        error: error.message
      };
    }
  }

  // Actualizar producto
  updateProducto(id, productoData) {
    try {
      const index = this.productos.findIndex(p => p.id === parseInt(id));
      if (index === -1) {
        return {
          success: false,
          message: 'Producto no encontrado'
        };
      }

      // Actualizar campos
      const productoActualizado = {
        ...this.productos[index],
        ...productoData,
        id: parseInt(id), // Mantener el ID original
        fechaModificacion: new Date().toISOString()
      };

      this.productos[index] = productoActualizado;
      this.saveToFile();

      return {
        success: true,
        data: productoActualizado,
        message: 'Producto actualizado exitosamente'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error al actualizar el producto',
        error: error.message
      };
    }
  }

  // Eliminar producto (soft delete)
  deleteProducto(id) {
    try {
      const index = this.productos.findIndex(p => p.id === parseInt(id));
      if (index === -1) {
        return {
          success: false,
          message: 'Producto no encontrado'
        };
      }

      // Soft delete - marcar como inactivo
      this.productos[index].activo = false;
      this.productos[index].fechaModificacion = new Date().toISOString();
      this.saveToFile();

      return {
        success: true,
        message: 'Producto eliminado exitosamente'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error al eliminar el producto',
        error: error.message
      };
    }
  }

  // Eliminar producto permanentemente
  deleteProductoPermanente(id) {
    try {
      const index = this.productos.findIndex(p => p.id === parseInt(id));
      if (index === -1) {
        return {
          success: false,
          message: 'Producto no encontrado'
        };
      }

      this.productos.splice(index, 1);
      this.saveToFile();

      return {
        success: true,
        message: 'Producto eliminado permanentemente'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error al eliminar el producto',
        error: error.message
      };
    }
  }

  // Obtener productos activos
  getProductosActivos() {
    const productosActivos = this.productos.filter(p => p.activo !== false);
    return {
      success: true,
      data: productosActivos,
      total: productosActivos.length
    };
  }

  // Obtener estadísticas de productos
  getEstadisticas() {
    const total = this.productos.length;
    const activos = this.productos.filter(p => p.activo !== false).length;
    const inactivos = total - activos;
    
    const porCategoria = {};
    this.productos.forEach(producto => {
      if (!porCategoria[producto.categoria]) {
        porCategoria[producto.categoria] = 0;
      }
      porCategoria[producto.categoria]++;
    });

    const precioPromedio = this.productos.reduce((sum, p) => sum + p.precio, 0) / total;

    return {
      success: true,
      data: {
        total,
        activos,
        inactivos,
        porCategoria,
        precioPromedio: Math.round(precioPromedio * 100) / 100
      }
    };
  }

  // Guardar cambios en archivo
  saveToFile() {
    try {
      const content = `// Base de datos de productos estéticos para clínica
const productosEsteticos = ${JSON.stringify(this.productos, null, 2)};

// Funciones de búsqueda
function buscarPorCategoria(categoria) {
  return productosEsteticos.filter(producto => 
    producto.categoria.toLowerCase().includes(categoria.toLowerCase())
  );
}

function buscarPorNombre(nombre) {
  return productosEsteticos.filter(producto => 
    producto.nombre.toLowerCase().includes(nombre.toLowerCase())
  );
}

function obtenerPorId(id) {
  return productosEsteticos.find(producto => producto.id === id);
}

function obtenerCategorias() {
  const categorias = [...new Set(productosEsteticos.map(producto => producto.categoria))];
  return categorias;
}

function buscarPorPrecio(precioMin, precioMax) {
  return productosEsteticos.filter(producto => 
    producto.precio >= precioMin && producto.precio <= precioMax
  );
}

function buscarPorDuracion(duracion) {
  return productosEsteticos.filter(producto => 
    producto.duracion.includes(duracion)
  );
}

module.exports = {
  productosEsteticos,
  buscarPorCategoria,
  buscarPorNombre,
  obtenerPorId,
  obtenerCategorias,
  buscarPorPrecio,
  buscarPorDuracion
};`;

      fs.writeFileSync(this.dataFile, content, 'utf8');
    } catch (error) {
      console.error('Error al guardar archivo:', error);
    }
  }

  // Restaurar desde archivo
  restoreFromFile() {
    try {
      delete require.cache[require.resolve(this.dataFile)];
      const { productosEsteticos } = require(this.dataFile);
      this.productos = [...productosEsteticos];
      this.nextId = Math.max(...this.productos.map(p => p.id)) + 1;
    } catch (error) {
      console.error('Error al restaurar desde archivo:', error);
    }
  }
}

module.exports = new ProductosService();