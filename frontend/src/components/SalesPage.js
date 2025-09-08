import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import api from '../services/api';
import { 
  FiTrendingUp, FiPlus, FiEdit, FiTrash2, FiSearch, FiFilter, 
  FiRefreshCw, FiEye, FiEyeOff, FiSave, FiX, FiCheck,
  FiDollarSign, FiClock, FiTag, FiInfo, FiAlertTriangle,
  FiShoppingCart, FiUser, FiCalendar, FiBarChart3, FiPieChart
} from 'react-icons/fi';

const SalesContainer = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
  background: #f8f9fa;
  min-height: 100vh;
`;

const Header = styled.div`
  background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
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
  color: #28a745;
  margin-bottom: 5px;
`;

const StatLabel = styled.div`
  color: #666;
  font-size: 0.9rem;
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
    border-color: #28a745;
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
    background: #28a745;
    color: white;
    &:hover { background: #218838; }
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

  &.info {
    background: #17a2b8;
    color: white;
    &:hover { background: #138496; }
  }
`;

const SalesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 20px;
`;

const SaleCard = styled.div`
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  border-left: 4px solid ${props => {
    switch(props.$paymentStatus) {
      case 'paid': return '#28a745';
      case 'pending': return '#ffc107';
      case 'cancelled': return '#dc3545';
      default: return '#6c757d';
    }
  }};
  transition: transform 0.3s ease;

  &:hover {
    transform: translateY(-2px);
  }
`;

const SaleHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
`;

const SaleTitle = styled.h3`
  margin: 0;
  font-size: 1.2rem;
  color: #333;
  flex: 1;
`;

const SaleId = styled.div`
  font-size: 0.8rem;
  color: #666;
  font-family: monospace;
  background: #f8f9fa;
  padding: 4px 8px;
  border-radius: 4px;
`;

const SaleCategory = styled.div`
  background: #e8f5e8;
  color: #155724;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 500;
  margin-bottom: 12px;
  display: inline-block;
`;

const SaleDetails = styled.div`
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

const SaleAmount = styled.div`
  font-size: 1.5rem;
  font-weight: bold;
  color: #28a745;
  text-align: center;
  margin-bottom: 16px;
`;

const SaleActions = styled.div`
  display: flex;
  gap: 8px;
  justify-content: center;
`;

const StatusBadge = styled.span`
  background: ${props => {
    switch(props.status) {
      case 'paid': return '#d4edda';
      case 'pending': return '#fff3cd';
      case 'cancelled': return '#f8d7da';
      default: return '#e2e3e5';
    }
  }};
  color: ${props => {
    switch(props.status) {
      case 'paid': return '#155724';
      case 'pending': return '#856404';
      case 'cancelled': return '#721c24';
      default: return '#383d41';
    }
  }};
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
    border-color: #28a745;
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
    border-color: #28a745;
  }
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

const ChartsContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
`;

const ChartCard = styled.div`
  background: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
`;

const ChartTitle = styled.h3`
  margin: 0 0 16px 0;
  color: #333;
  font-size: 1.1rem;
`;

const SalesPage = () => {
  const [sales, setSales] = useState([]);
  const [stats, setStats] = useState({});
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingSale, setEditingSale] = useState(null);
  const [formData, setFormData] = useState({
    productId: '',
    productName: '',
    productCategory: '',
    price: '',
    quantity: 1,
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    saleType: 'treatment',
    paymentMethod: 'cash',
    paymentStatus: 'paid',
    notes: ''
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [salesRes, statsRes, productsRes] = await Promise.all([
        api.get('/sales'),
        api.get('/sales/stats'),
        api.get('/productos')
      ]);
      setSales(salesRes.data.data || []);
      setStats(statsRes.data.data || {});
      setProducts(productsRes.data.data || []);
    } catch (err) {
      setError('Error al cargar los datos de ventas');
      console.error('Error fetching sales data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateSale = () => {
    setEditingSale(null);
    setFormData({
      productId: '',
      productName: '',
      productCategory: '',
      price: '',
      quantity: 1,
      customerName: '',
      customerEmail: '',
      customerPhone: '',
      saleType: 'treatment',
      paymentMethod: 'cash',
      paymentStatus: 'paid',
      notes: ''
    });
    setShowModal(true);
  };

  const handleEditSale = (sale) => {
    setEditingSale(sale);
    setFormData({
      productId: sale.productId,
      productName: sale.productName,
      productCategory: sale.productCategory,
      price: sale.price.toString(),
      quantity: sale.quantity,
      customerName: sale.customerInfo.name,
      customerEmail: sale.customerInfo.email,
      customerPhone: sale.customerInfo.phone,
      saleType: sale.saleType,
      paymentMethod: sale.paymentMethod,
      paymentStatus: sale.paymentStatus,
      notes: sale.notes
    });
    setShowModal(true);
  };

  const handleDeleteSale = async (id) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar esta venta?')) {
      try {
        await api.delete(`/sales/${id}`);
        fetchData();
      } catch (err) {
        setError('Error al eliminar la venta');
      }
    }
  };

  const handleSaveSale = async () => {
    try {
      const saleData = {
        ...formData,
        price: parseFloat(formData.price),
        quantity: parseInt(formData.quantity)
      };

      if (editingSale) {
        await axios.put(`/api/sales/${editingSale.id}`, saleData);
      } else {
        await axios.post('/api/sales', saleData);
      }

      setShowModal(false);
      fetchData();
    } catch (err) {
      setError('Error al guardar la venta');
    }
  };

  const handleProductChange = (productId) => {
    const product = products.find(p => p.id === parseInt(productId));
    if (product) {
      setFormData({
        ...formData,
        productId: product.id.toString(),
        productName: product.nombre,
        productCategory: product.categoria,
        price: product.precio.toString()
      });
    }
  };

  const filteredSales = (sales || []).filter(sale => {
    const productName = sale.productName || sale.producto_nombre || '';
    const customerName = sale.customerInfo?.name || sale.cliente_nombre || '';
    const matchesSearch = productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         customerName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !filterStatus || sale.paymentStatus === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusText = (status) => {
    const statusMap = {
      'paid': 'Pagado',
      'pending': 'Pendiente',
      'cancelled': 'Cancelado'
    };
    return statusMap[status] || status;
  };

  const getSaleTypeText = (type) => {
    const typeMap = {
      'treatment': 'Tratamiento',
      'product': 'Producto',
      'package': 'Paquete'
    };
    return typeMap[type] || type;
  };

  if (loading) {
    return (
      <SalesContainer>
        <LoadingContainer>
          <FiRefreshCw style={{ animation: 'spin 1s linear infinite' }} />
          <p>Cargando ventas...</p>
        </LoadingContainer>
      </SalesContainer>
    );
  }

  if (error) {
    return (
      <SalesContainer>
        <ErrorContainer>
          <p>{error}</p>
          <Button className="primary" onClick={fetchData}>
            <FiRefreshCw />
            Reintentar
          </Button>
        </ErrorContainer>
      </SalesContainer>
    );
  }

  return (
    <SalesContainer>
      <Header>
        <Title>💰 Gestión de Ventas</Title>
        <Subtitle>Clínica Estética BellaVida</Subtitle>
      </Header>

      <StatsContainer>
        <StatCard>
          <StatNumber>{stats.totalSales || 0}</StatNumber>
          <StatLabel>Total de Ventas</StatLabel>
        </StatCard>
        <StatCard>
          <StatNumber>€{stats.totalRevenue || 0}</StatNumber>
          <StatLabel>Ingresos Totales</StatLabel>
        </StatCard>
        <StatCard>
          <StatNumber>€{stats.averageSale || 0}</StatNumber>
          <StatLabel>Venta Promedio</StatLabel>
        </StatCard>
        <StatCard>
          <StatNumber>{stats.topProducts?.length || 0}</StatNumber>
          <StatLabel>Productos Vendidos</StatLabel>
        </StatCard>
      </StatsContainer>

      <ControlsContainer>
        <SearchContainer>
          <SearchInput
            type="text"
            placeholder="Buscar ventas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <FilterSelect
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">Todos los estados</option>
            <option value="paid">Pagado</option>
            <option value="pending">Pendiente</option>
            <option value="cancelled">Cancelado</option>
          </FilterSelect>
        </SearchContainer>
        <ActionButtons>
          <Button className="primary" onClick={handleCreateSale}>
            <FiPlus />
            Nueva Venta
          </Button>
          <Button className="secondary" onClick={fetchData}>
            <FiRefreshCw />
            Actualizar
          </Button>
        </ActionButtons>
      </ControlsContainer>

      {filteredSales.length === 0 ? (
        <EmptyContainer>
          <FiShoppingCart size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
          <p>No se encontraron ventas</p>
        </EmptyContainer>
      ) : (
        <SalesGrid>
          {filteredSales.map((sale) => (
            <SaleCard key={sale.id} $paymentStatus={sale.paymentStatus}>
              <SaleHeader>
                <SaleTitle>{sale.productName}</SaleTitle>
                <SaleId>#{sale.id.slice(0, 8)}</SaleId>
              </SaleHeader>

              <SaleCategory>{sale.productCategory}</SaleCategory>

              <SaleDetails>
                <DetailItem>
                  <FiUser />
                  <DetailLabel>Cliente:</DetailLabel>
                  <span>{sale.customerInfo.name}</span>
                </DetailItem>
                <DetailItem>
                  <FiTag />
                  <DetailLabel>Tipo:</DetailLabel>
                  <span>{getSaleTypeText(sale.saleType)}</span>
                </DetailItem>
                <DetailItem>
                  <FiShoppingCart />
                  <DetailLabel>Cantidad:</DetailLabel>
                  <span>{sale.quantity}</span>
                </DetailItem>
                <DetailItem>
                  <FiCalendar />
                  <DetailLabel>Fecha:</DetailLabel>
                  <span>{new Date(sale.createdAt).toLocaleDateString('es-ES')}</span>
                </DetailItem>
              </SaleDetails>

              <SaleAmount>€{sale.totalAmount}</SaleAmount>

              <div style={{ marginBottom: '16px', textAlign: 'center' }}>
                <StatusBadge status={sale.paymentStatus}>
                  {getStatusText(sale.paymentStatus)}
                </StatusBadge>
              </div>

              <SaleActions>
                <Button className="warning" onClick={() => handleEditSale(sale)}>
                  <FiEdit />
                  Editar
                </Button>
                <Button className="danger" onClick={() => handleDeleteSale(sale.id)}>
                  <FiTrash2 />
                  Eliminar
                </Button>
              </SaleActions>
            </SaleCard>
          ))}
        </SalesGrid>
      )}

      <Modal $show={showModal}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>
              {editingSale ? 'Editar Venta' : 'Nueva Venta'}
            </ModalTitle>
            <Button className="secondary" onClick={() => setShowModal(false)}>
              <FiX />
            </Button>
          </ModalHeader>

          <FormGroup>
            <Label>Producto</Label>
            <Select
              value={formData.productId}
              onChange={(e) => handleProductChange(e.target.value)}
            >
              <option value="">Seleccionar producto</option>
              {products.map(product => (
                <option key={product.id} value={product.id}>
                  {product.nombre} - €{product.precio}
                </option>
              ))}
            </Select>
          </FormGroup>

          <FormGroup>
            <Label>Cantidad</Label>
            <Input
              type="number"
              min="1"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
            />
          </FormGroup>

          <FormGroup>
            <Label>Nombre del Cliente</Label>
            <Input
              type="text"
              value={formData.customerName}
              onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
              placeholder="Nombre completo del cliente"
            />
          </FormGroup>

          <FormGroup>
            <Label>Email del Cliente</Label>
            <Input
              type="email"
              value={formData.customerEmail}
              onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
              placeholder="email@ejemplo.com"
            />
          </FormGroup>

          <FormGroup>
            <Label>Teléfono del Cliente</Label>
            <Input
              type="text"
              value={formData.customerPhone}
              onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
              placeholder="+34 123 456 789"
            />
          </FormGroup>

          <FormGroup>
            <Label>Tipo de Venta</Label>
            <Select
              value={formData.saleType}
              onChange={(e) => setFormData({ ...formData, saleType: e.target.value })}
            >
              <option value="treatment">Tratamiento</option>
              <option value="product">Producto</option>
              <option value="package">Paquete</option>
            </Select>
          </FormGroup>

          <FormGroup>
            <Label>Método de Pago</Label>
            <Select
              value={formData.paymentMethod}
              onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
            >
              <option value="cash">Efectivo</option>
              <option value="card">Tarjeta</option>
              <option value="transfer">Transferencia</option>
            </Select>
          </FormGroup>

          <FormGroup>
            <Label>Estado del Pago</Label>
            <Select
              value={formData.paymentStatus}
              onChange={(e) => setFormData({ ...formData, paymentStatus: e.target.value })}
            >
              <option value="paid">Pagado</option>
              <option value="pending">Pendiente</option>
              <option value="cancelled">Cancelado</option>
            </Select>
          </FormGroup>

          <FormGroup>
            <Label>Notas</Label>
            <TextArea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Notas adicionales sobre la venta..."
            />
          </FormGroup>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <Button className="secondary" onClick={() => setShowModal(false)}>
              Cancelar
            </Button>
            <Button className="success" onClick={handleSaveSale}>
              <FiSave />
              Guardar
            </Button>
          </div>
        </ModalContent>
      </Modal>
    </SalesContainer>
  );
};

export default SalesPage;
