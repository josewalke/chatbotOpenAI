import React from 'react';
import styled from 'styled-components';
import { FiX, FiShoppingCart, FiCalendar, FiTag, FiClock, FiInfo } from 'react-icons/fi';
import logger from '../utils/logger';

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
  background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
  border-radius: 20px;
  padding: 32px;
  max-width: 550px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  position: relative;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.2);
`;

const CloseButton = styled.button`
  position: absolute;
  top: 20px;
  right: 20px;
  background: rgba(255, 255, 255, 0.9);
  border: none;
  font-size: 1.5rem;
  color: #666;
  cursor: pointer;
  padding: 8px;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  
  &:hover {
    background: #667eea;
    color: white;
    transform: scale(1.1);
  }
`;

const ProductHeader = styled.div`
  margin-bottom: 24px;
  text-align: center;
`;

const ProductTitle = styled.h2`
  margin: 0 0 16px 0;
  color: #2c3e50;
  font-size: 1.8rem;
  font-weight: 700;
  line-height: 1.3;
`;

const ProductPrice = styled.div`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 12px 24px;
  border-radius: 25px;
  font-size: 1.4rem;
  font-weight: 700;
  display: inline-block;
  margin-bottom: 16px;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
`;

const ProductCategory = styled.div`
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  color: #6c757d;
  padding: 6px 16px;
  border-radius: 20px;
  font-size: 0.9rem;
  font-weight: 600;
  display: inline-block;
  border: 1px solid #dee2e6;
`;

const ProductDescription = styled.p`
  color: #6c757d;
  line-height: 1.7;
  margin-bottom: 24px;
  font-size: 1rem;
  text-align: center;
`;

const ProductDetails = styled.div`
  margin-bottom: 24px;
  background: rgba(255, 255, 255, 0.7);
  padding: 20px;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.3);
`;

const DetailItem = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  color: #2c3e50;
  padding: 8px 0;
`;

const DetailLabel = styled.span`
  font-weight: 600;
  color: #667eea;
  min-width: 100px;
  font-size: 0.9rem;
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 16px;
  justify-content: center;
`;

const ActionButton = styled.button`
  background: ${props => props.$isPrimary ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'transparent'};
  color: ${props => props.$isPrimary ? 'white' : '#667eea'};
  border: 2px solid #667eea;
  border-radius: 12px;
  padding: 16px 32px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
  transition: all 0.3s ease;
  flex: 1;
  justify-content: center;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.2);
  
  &:hover {
    background: ${props => props.$isPrimary ? 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)' : '#667eea'};
    color: white;
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(102, 126, 234, 0.3);
  }
  
  &:active {
    transform: translateY(0);
  }
`;

const ProductInfoModal = ({ product, isOpen, onClose, onProductSelect, isTreatment = false }) => {
  logger.info('ProductInfoModal', 'Componente ProductInfoModal renderizado', { 
    isOpen, 
    hasProduct: !!product,
    productId: product?.id,
    productName: product?.nombre,
    isTreatment,
    hasOnProductSelect: !!onProductSelect
  });

  // No renderizar si no está abierto o no hay producto
  if (!isOpen || !product) {
    if (!isOpen) {
      logger.debug('ProductInfoModal', 'Modal cerrado, no renderizando');
    }
    if (!product) {
      logger.debug('ProductInfoModal', 'No hay producto, no renderizando');
    }
    return null;
  }

  const handleSelect = () => {
    logger.info('ProductInfoModal', 'Producto seleccionado desde modal', { 
      productId: product.id, 
      productName: product.nombre,
      isTreatment
    });
    
    if (onProductSelect) {
      logger.debug('ProductInfoModal', 'Llamando onProductSelect');
      onProductSelect(product);
    } else {
      logger.warn('ProductInfoModal', 'onProductSelect no está definido');
    }
    onClose();
  };

  return (
    <Modal $show={isOpen}>
      <ModalContent>
        <CloseButton onClick={onClose}>
          <FiX />
        </CloseButton>
        
        <ProductHeader>
          <ProductTitle>{product.nombre}</ProductTitle>
          <ProductPrice>€{product.precio}</ProductPrice>
          <ProductCategory>{product.categoria}</ProductCategory>
        </ProductHeader>
        
        <ProductDescription>
          {product.descripcion}
        </ProductDescription>
        
        <ProductDetails>
          {product.duracion && (
            <DetailItem>
              <FiClock />
              <DetailLabel>Duración:</DetailLabel>
              <span>{product.duracion}</span>
            </DetailItem>
          )}
          
          {product.ingredientes && product.ingredientes.length > 0 && (
            <DetailItem>
              <FiTag />
              <DetailLabel>Ingredientes:</DetailLabel>
              <span>{product.ingredientes.join(', ')}</span>
            </DetailItem>
          )}
          
          {product.modoUso && (
            <DetailItem>
              <FiInfo />
              <DetailLabel>Modo de uso:</DetailLabel>
              <span>{product.modoUso}</span>
            </DetailItem>
          )}
        </ProductDetails>
        
        <ActionButtons>
          <ActionButton $isPrimary={true} onClick={handleSelect}>
            {isTreatment ? <FiCalendar /> : <FiShoppingCart />}
            {isTreatment ? 'Agendar Cita' : 'Comprar Producto'}
          </ActionButton>
        </ActionButtons>
      </ModalContent>
    </Modal>
  );
};

export default ProductInfoModal;
