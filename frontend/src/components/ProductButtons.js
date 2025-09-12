import React from 'react';
import styled from 'styled-components';
import { FiShoppingCart, FiCalendar, FiInfo } from 'react-icons/fi';
import logger from '../utils/logger';

const ProductButtonsContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 16px;
  margin-top: 16px;
  padding: 0 8px;
`;

const ProductButton = styled.button`
  background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
  border: 2px solid #e1e5e9;
  border-radius: 16px;
  padding: 20px;
  text-align: left;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  gap: 12px;
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
    transform: scaleX(0);
    transition: transform 0.3s ease;
  }
  
  &:hover {
    border-color: #667eea;
    transform: translateY(-4px);
    box-shadow: 0 8px 25px rgba(102, 126, 234, 0.15);
    
    &::before {
      transform: scaleX(1);
    }
  }
  
  &:active {
    transform: translateY(-2px);
  }
`;

const ProductHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
`;

const ProductName = styled.h4`
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
  color: #2c3e50;
  flex: 1;
  line-height: 1.3;
`;

const ProductPrice = styled.span`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 0.9rem;
  font-weight: 700;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
`;

const ProductCategory = styled.span`
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  color: #6c757d;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  align-self: flex-start;
  border: 1px solid #dee2e6;
`;

const ProductDescription = styled.p`
  margin: 0;
  font-size: 0.9rem;
  color: #6c757d;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const ProductActions = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 8px;
`;

const ActionButton = styled.button`
  background: ${props => props.$isPrimary ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'transparent'};
  color: ${props => props.$isPrimary ? 'white' : '#667eea'};
  border: 2px solid #667eea;
  border-radius: 10px;
  padding: 8px 16px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.3s ease;
  flex: 1;
  justify-content: center;
  
  &:hover {
    background: ${props => props.$isPrimary ? 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)' : '#667eea'};
    color: white;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
  }
  
  &:active {
    transform: translateY(0);
  }
`;

const ProductButtons = ({ products, onProductSelect, onProductInfo, isTreatment = false }) => {
  logger.info('ProductButtons', 'Componente ProductButtons renderizado', { 
    productsCount: products?.length || 0, 
    isTreatment,
    hasOnProductSelect: !!onProductSelect,
    hasOnProductInfo: !!onProductInfo
  });

  const handleProductClick = (product) => {
    logger.info('ProductButtons', 'Producto clickeado', { 
      productId: product.id, 
      productName: product.nombre,
      isTreatment: product.isTreatment
    });
    
    if (onProductSelect) {
      logger.debug('ProductButtons', 'Llamando onProductSelect');
      onProductSelect(product);
    } else {
      logger.warn('ProductButtons', 'onProductSelect no está definido');
    }
  };

  const handleInfoClick = (product, e) => {
    logger.info('ProductButtons', 'Botón de información clickeado', { 
      productId: product.id, 
      productName: product.nombre
    });
    
    e.stopPropagation();
    if (onProductInfo) {
      logger.debug('ProductButtons', 'Llamando onProductInfo');
      onProductInfo(product);
    } else {
      logger.warn('ProductButtons', 'onProductInfo no está definido');
    }
  };

  if (!products || products.length === 0) {
    logger.warn('ProductButtons', 'No hay productos para mostrar', { products });
    return null;
  }

  logger.debug('ProductButtons', 'Renderizando botones de productos', { 
    products: products.map(p => ({ id: p.id, nombre: p.nombre, precio: p.precio }))
  });

  return (
    <ProductButtonsContainer>
      {products.map((product, index) => (
        <ProductButton
          key={product.id || index}
          onClick={() => handleProductClick(product)}
        >
          <ProductHeader>
            <ProductName>{product.nombre}</ProductName>
            <ProductPrice>€{product.precio}</ProductPrice>
          </ProductHeader>
          
          <ProductCategory>{product.categoria}</ProductCategory>
          
          <ProductDescription>
            {product.descripcion}
          </ProductDescription>
          
          <ProductActions>
            <ActionButton $isPrimary={true}>
              {isTreatment ? <FiCalendar /> : <FiShoppingCart />}
              {isTreatment ? 'Agendar' : 'Comprar'}
            </ActionButton>
            <ActionButton onClick={(e) => handleInfoClick(product, e)}>
              <FiInfo />
              Info
            </ActionButton>
          </ProductActions>
        </ProductButton>
      ))}
    </ProductButtonsContainer>
  );
};

export default ProductButtons;
