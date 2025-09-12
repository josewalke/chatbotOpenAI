import React from 'react';
import styled from 'styled-components';
import ProductCard from './ProductCard';

const ProductGrid = ({ products, onBuy }) => {
  if (!products || products.length === 0) {
    return (
      <NoProductsMessage>
        No se encontraron productos para mostrar.
      </NoProductsMessage>
    );
  }

  return (
    <GridContainer>
      <GridTitle>🛍️ Productos Disponibles</GridTitle>
      <ProductsGrid>
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onBuy={onBuy}
          />
        ))}
      </ProductsGrid>
    </GridContainer>
  );
};

const GridContainer = styled.div`
  margin: 20px 0;
`;

const GridTitle = styled.h2`
  text-align: center;
  color: #333;
  margin-bottom: 16px;
  font-size: 18px;
  font-weight: 600;
`;

const ProductsGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  margin: 0;
  padding: 0;
`;

const NoProductsMessage = styled.div`
  text-align: center;
  padding: 40px 20px;
  color: #666;
  font-size: 16px;
  background: #f8f9fa;
  border-radius: 8px;
  margin: 20px 0;
`;

export default ProductGrid;
