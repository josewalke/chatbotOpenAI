import React, { useState } from 'react';
import styled from 'styled-components';

const ProductCard = ({ product, onBuy }) => {
  const [showDetails, setShowDetails] = useState(false);
  const [quantity, setQuantity] = useState(1);

  const handleBuy = () => {
    if (onBuy) {
      onBuy({
        ...product,
        quantity: quantity
      });
    }
  };

  return (
    <CardContainer>
      <ProductName>{product.nombre}</ProductName>
      
      <ProductDescription>{product.descripcion}</ProductDescription>
      
      <ProductPrice>€{product.precio}</ProductPrice>

      <BuyButton onClick={handleBuy}>
        <BuyIcon>🛒</BuyIcon>
        Añadir al Carrito
      </BuyButton>

      <CardStyles />
    </CardContainer>
  );
};

const CardContainer = styled.div`
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin: 16px 0;
  overflow: hidden;
  transition: all 0.3s ease;
  width: 100%;
  max-width: 400px;
  padding: 20px;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  }
`;

const ProductName = styled.h3`
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
  line-height: 1.3;
`;


const ProductDescription = styled.p`
  margin: 0 0 16px 0;
  color: #666;
  line-height: 1.5;
  font-size: 14px;
`;

const ProductPrice = styled.div`
  font-size: 24px;
  font-weight: 700;
  color: #333;
  margin-bottom: 20px;
`;


const BuyButton = styled.button`
  background: #333;
  color: white;
  border: none;
  padding: 16px 20px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  transition: all 0.3s ease;

  &:hover {
    background: #444;
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }
`;

const BuyIcon = styled.span`
  margin-right: 8px;
  font-size: 18px;
`;

const CardStyles = styled.div`
  /* Estilos adicionales si es necesario */
`;

export default ProductCard;
