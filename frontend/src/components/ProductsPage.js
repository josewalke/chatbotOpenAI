import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import { 
  FiPackage, FiPlus, FiEdit, FiTrash2, FiSearch, FiFilter, 
  FiRefreshCw, FiEye, FiEyeOff, FiSave, FiX, FiCheck,
  FiDollarSign, FiClock, FiTag, FiInfo, FiAlertTriangle
} from 'react-icons/fi';

const ProductsContainer = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
  background: #f8f9fa;
  min-height: 100vh;
`;

const Header = styled.div`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 30px;
  border-radius: 12px;
  margin-bottom: 30px;
  text-align: center;
`;

const Title = styled.h1`
  margin: 0;
  font-size: 2.5rem;
  font-weight: 600;
`;

const Subtitle = styled.p`
  margin: 10px 0 0 0;
  font-size: 1.1rem;
  opacity: 0.9;
`;

const ControlsContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  flex-wrap: wrap;
  gap: 20px;
`;

const SearchContainer = styled.div`
  display: flex;
  gap: 10px;
  flex: 1;
  min-width: 300px;
`;

const SearchInput = styled.input`
  flex: 1;
  padding: 12px 16px;
  border: 2px solid #e9ecef;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.3s ease;

  &:focus {
    outline: none;
    border-color: #667eea;
  }
`;

const FilterSelect = styled.select`
  padding: 12px 16px;
  border: 2px solid #e9ecef;
  border-radius: 8px;
  font-size: 1rem;
  background: white;
  cursor: pointer;
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 10px;
`;

const Button = styled.button`
  padding: 12px 20px;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s ease;

  &.primary {
    background: #667eea;
    color: white;
    &:hover { background: #5a6fd8; }
  }

  &.secondary {
    background: #6c757d;
    color: white;
    &:hover { background: #5a6268; }
  }

  &.success {
    background: #28a745;
    color: white;
    &:hover { background: #218838; }
  }

  &.danger {
    background: #dc3545;
    color: white;
    &:hover { background: #c82333; }
  }

  &.warning {
    background: #ffc107;
    color: #212529;
    &:hover { background: #e0a800; }
  }
`;

const StatsContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
`;

const StatCard = styled.div`
  background: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  text-align: center;
`;

const StatNumber = styled.div`
  font-size: 2rem;
  font-weight: bold;
  color: #667eea;
  margin-bottom: 5px;
`;

const StatLabel = styled.div`
  color: #666;
  font-size: 0.9rem;
`;

const ProductsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 20px;
`;

const ProductCard = styled.div`
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  border-left: 4px solid ${props => props.$activo ? '#28a745' : '#dc3545'};
  transition: transform 0.3s ease;

  &:hover {
    transform: translateY(-2px);
  }
`;

const ProductHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
`;

const ProductTitle = styled.h3`
  margin: 0;
  font-size: 1.2rem;
  color: #333;
  flex: 1;
`;

const ProductId = styled.div`
  font-size: 0.8rem;
  color: #666;
  font-family: monospace;
  background: #f8f9fa;
  padding: 4px 8px;
  border-radius: 4px;
`;

const ProductCategory = styled.div`
  background: #e3f2fd;
  color: #1976d2;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 500;
  margin-bottom: 12px;
  display: inline-block;
`;

const ProductDescription = styled.p`
  color: #666;
  line-height: 1.5;
  margin-bottom: 16px;
`;

const ProductDetails = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 16px;
`;

const DetailItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  color: #333;
`;

const DetailLabel = styled.span`
  font-weight: 500;
  color: #666;
  min-width: 60px;
`;

const ProductPrice = styled.div`
  font-size: 1.5rem;
  font-weight: bold;
  color: #28a745;
  text-align: center;
  margin-bottom: 16px;
`;

const ProductActions = styled.div`
  display: flex;
  gap: 8px;
  justify-content: center;
`;

const StatusBadge = styled.span`
  background: ${props => props.$activo ? '#d4edda' : '#f8d7da'};
  color: ${props => props.$activo ? '#155724' : '#721c24'};
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 500;
  text-transform: uppercase;
`;

const Modal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: ${props => props.$show ? 'flex' : 'none'};
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background: white;
  border-radius: 12px;
  padding: 30px;
  max-width: 600px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
`;

const ModalTitle = styled.h2`
  margin: 0;
  color: #333;
`;

const FormGroup = styled.div`
  margin-bottom: 20px;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #333;
`;

const Input = styled.input`
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #e9ecef;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.3s ease;

  &:focus {
    outline: none;
    border-color: #667eea;
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #e9ecef;
  border-radius: 8px;
  font-size: 1rem;
  min-height: 100px;
  resize: vertical;
  transition: border-color 0.3s ease;

  &:focus {
    outline: none;
    border-color: #667eea;
  }
`;

const Select = styled.select`
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #e9ecef;
  border-radius: 8px;
  font-size: 1rem;
  background: white;
  cursor: pointer;
`;

const CheckboxContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const Checkbox = styled.input`
  width: 18px;
  height: 18px;
`;

const LoadingContainer = styled.div`
  text-align: center;
  padding: 40px;
  color: #666;
`;

const ErrorContainer = styled.div`
  background: #f8d7da;
  color: #721c24;
  padding: 20px;
  border-radius: 8px;
  text-align: center;
`;

const EmptyContainer = styled.div`
  text-align: center;
  padding: 40px;
  color: #666;
`;

const ProductsPage = () => {
  const [productos, setProductos] = useState([]);
  const [estadisticas, setEstadisticas] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    nombre: '',
    categoria: '',
    descripcion: '',
    precio: '',
    duracion: '',
    beneficios: [],
    cuidados: [],
    contraindicaciones: [],
    activo: true
  });

  const categorias = [
    'Tratamientos Faciales',
    'Tratamientos Corporales',
    'Depilación',
    'Manos y Pies',
    'Tratamientos Especiales'
  ];

  const fetchProductos = async () => {
    try {
      setLoading(true);
      setError(null);
      const [productosRes, estadisticasRes] = await Promise.all([
        axios.get('/api/productos'),
        axios.get('/api/productos/estadisticas')
      ]);
      setProductos(productosRes.data.data);
      setEstadisticas(estadisticasRes.data.data);
    } catch (err) {
      setError('Error al cargar los productos');
      console.error('Error fetching productos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProductos();
  }, []);

  const handleCreateProduct = () => {
    setEditingProduct(null);
    setFormData({
      nombre: '',
      categoria: '',
      descripcion: '',
      precio: '',
      duracion: '',
      beneficios: [],
      cuidados: [],
      contraindicaciones: [],
      activo: true
    });
    setShowModal(true);
  };

  const handleEditProduct = (producto) => {
    setEditingProduct(producto);
    setFormData({
      nombre: producto.nombre,
      categoria: producto.categoria,
      descripcion: producto.descripcion,
      precio: producto.precio.toString(),
      duracion: producto.duracion,
      beneficios: producto.beneficios || [],
      cuidados: producto.cuidados || [],
      contraindicaciones: producto.contraindicaciones || [],
      activo: producto.activo !== false
    });
    setShowModal(true);
  };

  const handleDeleteProduct = async (id) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este producto?')) {
      try {
        await axios.delete(`/api/productos/${id}`);
        fetchProductos();
      } catch (err) {
        setError('Error al eliminar el producto');
      }
    }
  };

  const handleSaveProduct = async () => {
    try {
      const productData = {
        ...formData,
        precio: parseFloat(formData.precio),
        beneficios: formData.beneficios.filter(b => b.trim() !== ''),
        cuidados: formData.cuidados.filter(c => c.trim() !== ''),
        contraindicaciones: formData.contraindicaciones.filter(c => c.trim() !== '')
      };

      if (editingProduct) {
        await axios.put(`/api/productos/${editingProduct.id}`, productData);
      } else {
        await axios.post('/api/productos', productData);
      }

      setShowModal(false);
      fetchProductos();
    } catch (err) {
      setError('Error al guardar el producto');
    }
  };

  const handleAddBenefit = () => {
    setFormData({
      ...formData,
      beneficios: [...formData.beneficios, '']
    });
  };

  const handleAddCare = () => {
    setFormData({
      ...formData,
      cuidados: [...formData.cuidados, '']
    });
  };

  const handleAddContraindication = () => {
    setFormData({
      ...formData,
      contraindicaciones: [...formData.contraindicaciones, '']
    });
  };

  const handleRemoveItem = (type, index) => {
    setFormData({
      ...formData,
      [type]: formData[type].filter((_, i) => i !== index)
    });
  };

  const handleUpdateItem = (type, index, value) => {
    const newItems = [...formData[type]];
    newItems[index] = value;
    setFormData({
      ...formData,
      [type]: newItems
    });
  };

  const filteredProductos = productos.filter(producto => {
    const matchesSearch = producto.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         producto.descripcion.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !filterCategory || producto.categoria === filterCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <ProductsContainer>
        <LoadingContainer>
          <FiRefreshCw style={{ animation: 'spin 1s linear infinite' }} />
          <p>Cargando productos...</p>
        </LoadingContainer>
      </ProductsContainer>
    );
  }

  if (error) {
    return (
      <ProductsContainer>
        <ErrorContainer>
          <p>{error}</p>
          <Button className="primary" onClick={fetchProductos}>
            <FiRefreshCw />
            Reintentar
          </Button>
        </ErrorContainer>
      </ProductsContainer>
    );
  }

  return (
    <ProductsContainer>
      <Header>
        <Title>📦 Gestión de Productos</Title>
        <Subtitle>Clínica Estética BellaVida</Subtitle>
      </Header>

      <StatsContainer>
        <StatCard>
          <StatNumber>{estadisticas.total || 0}</StatNumber>
          <StatLabel>Total de Productos</StatLabel>
        </StatCard>
        <StatCard>
          <StatNumber>{estadisticas.activos || 0}</StatNumber>
          <StatLabel>Productos Activos</StatLabel>
        </StatCard>
        <StatCard>
          <StatNumber>{estadisticas.inactivos || 0}</StatNumber>
          <StatLabel>Productos Inactivos</StatLabel>
        </StatCard>
        <StatCard>
          <StatNumber>€{estadisticas.precioPromedio || 0}</StatNumber>
          <StatLabel>Precio Promedio</StatLabel>
        </StatCard>
      </StatsContainer>

      <ControlsContainer>
        <SearchContainer>
          <SearchInput
            type="text"
            placeholder="Buscar productos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <FilterSelect
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="">Todas las categorías</option>
            {categorias.map(categoria => (
              <option key={categoria} value={categoria}>{categoria}</option>
            ))}
          </FilterSelect>
        </SearchContainer>
        <ActionButtons>
          <Button className="primary" onClick={handleCreateProduct}>
            <FiPlus />
            Nuevo Producto
          </Button>
          <Button className="secondary" onClick={fetchProductos}>
            <FiRefreshCw />
            Actualizar
          </Button>
        </ActionButtons>
      </ControlsContainer>

      {filteredProductos.length === 0 ? (
        <EmptyContainer>
          <FiPackage size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
          <p>No se encontraron productos</p>
        </EmptyContainer>
      ) : (
        <ProductsGrid>
          {filteredProductos.map((producto) => (
            <ProductCard key={producto.id} $activo={producto.activo !== false}>
              <ProductHeader>
                <ProductTitle>{producto.nombre}</ProductTitle>
                <ProductId>#{producto.id}</ProductId>
              </ProductHeader>

              <ProductCategory>{producto.categoria}</ProductCategory>
              <ProductDescription>{producto.descripcion}</ProductDescription>

              <ProductDetails>
                <DetailItem>
                  <FiDollarSign />
                  <DetailLabel>Precio:</DetailLabel>
                  <span>€{producto.precio}</span>
                </DetailItem>
                <DetailItem>
                  <FiClock />
                  <DetailLabel>Duración:</DetailLabel>
                  <span>{producto.duracion}</span>
                </DetailItem>
              </ProductDetails>

              <ProductPrice>€{producto.precio}</ProductPrice>

              <div style={{ marginBottom: '16px', textAlign: 'center' }}>
                <StatusBadge $activo={producto.activo !== false}>
                  {producto.activo !== false ? 'Activo' : 'Inactivo'}
                </StatusBadge>
              </div>

              <ProductActions>
                <Button className="warning" onClick={() => handleEditProduct(producto)}>
                  <FiEdit />
                  Editar
                </Button>
                <Button className="danger" onClick={() => handleDeleteProduct(producto.id)}>
                  <FiTrash2 />
                  Eliminar
                </Button>
              </ProductActions>
            </ProductCard>
          ))}
        </ProductsGrid>
      )}

      <Modal $show={showModal}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>
              {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
            </ModalTitle>
            <Button className="secondary" onClick={() => setShowModal(false)}>
              <FiX />
            </Button>
          </ModalHeader>

          <FormGroup>
            <Label>Nombre del Producto</Label>
            <Input
              type="text"
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              placeholder="Ej: Hidratación Facial Profunda"
            />
          </FormGroup>

          <FormGroup>
            <Label>Categoría</Label>
            <Select
              value={formData.categoria}
              onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
            >
              <option value="">Seleccionar categoría</option>
              {categorias.map(categoria => (
                <option key={categoria} value={categoria}>{categoria}</option>
              ))}
            </Select>
          </FormGroup>

          <FormGroup>
            <Label>Descripción</Label>
            <TextArea
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              placeholder="Descripción detallada del producto..."
            />
          </FormGroup>

          <FormGroup>
            <Label>Precio (€)</Label>
            <Input
              type="number"
              step="0.01"
              value={formData.precio}
              onChange={(e) => setFormData({ ...formData, precio: e.target.value })}
              placeholder="120.00"
            />
          </FormGroup>

          <FormGroup>
            <Label>Duración</Label>
            <Input
              type="text"
              value={formData.duracion}
              onChange={(e) => setFormData({ ...formData, duracion: e.target.value })}
              placeholder="60 minutos"
            />
          </FormGroup>

          <FormGroup>
            <Label>Beneficios</Label>
            {formData.beneficios.map((benefit, index) => (
              <div key={index} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <Input
                  type="text"
                  value={benefit}
                  onChange={(e) => handleUpdateItem('beneficios', index, e.target.value)}
                  placeholder="Beneficio del tratamiento"
                />
                <Button className="danger" onClick={() => handleRemoveItem('beneficios', index)}>
                  <FiX />
                </Button>
              </div>
            ))}
            <Button className="secondary" onClick={handleAddBenefit}>
              <FiPlus />
              Agregar Beneficio
            </Button>
          </FormGroup>

          <FormGroup>
            <Label>Cuidados</Label>
            {formData.cuidados.map((care, index) => (
              <div key={index} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <Input
                  type="text"
                  value={care}
                  onChange={(e) => handleUpdateItem('cuidados', index, e.target.value)}
                  placeholder="Cuidado post-tratamiento"
                />
                <Button className="danger" onClick={() => handleRemoveItem('cuidados', index)}>
                  <FiX />
                </Button>
              </div>
            ))}
            <Button className="secondary" onClick={handleAddCare}>
              <FiPlus />
              Agregar Cuidado
            </Button>
          </FormGroup>

          <FormGroup>
            <Label>Contraindicaciones</Label>
            {formData.contraindicaciones.map((contraindication, index) => (
              <div key={index} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <Input
                  type="text"
                  value={contraindication}
                  onChange={(e) => handleUpdateItem('contraindicaciones', index, e.target.value)}
                  placeholder="Contraindicación"
                />
                <Button className="danger" onClick={() => handleRemoveItem('contraindicaciones', index)}>
                  <FiX />
                </Button>
              </div>
            ))}
            <Button className="secondary" onClick={handleAddContraindication}>
              <FiPlus />
              Agregar Contraindicación
            </Button>
          </FormGroup>

          <FormGroup>
            <CheckboxContainer>
              <Checkbox
                type="checkbox"
                checked={formData.activo}
                onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
              />
              <Label>Producto activo</Label>
            </CheckboxContainer>
          </FormGroup>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <Button className="secondary" onClick={() => setShowModal(false)}>
              Cancelar
            </Button>
            <Button className="success" onClick={handleSaveProduct}>
              <FiSave />
              Guardar
            </Button>
          </div>
        </ModalContent>
      </Modal>
    </ProductsContainer>
  );
};

export default ProductsPage;
