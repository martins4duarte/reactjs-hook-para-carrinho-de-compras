import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product } from '../types';

import _ from 'lodash'

interface CartProviderProps {
  children: ReactNode;
}
interface UpdateProductAmount {
  productId: number;
  amount: number;
}
interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}


const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart')
    console.log(storagedCart)
    if (storagedCart) {
      return JSON.parse(storagedCart);
    }
    return [];
  });


  const addProduct = async (productId: number) => {

    const newCart = [...cart];
    const productExistsOnCart = _.find(newCart, (o) => { return o.id === productId }) // verifica se o produto ja existe no carrinho
    const productAmount = productExistsOnCart ? productExistsOnCart.amount : 0 // se o produto existir, passa a quantidade, senão passa 0


    try {
      const { data } = await api.get(`/stock/${productId}`) // desestrutura o retorno do estoque

      if (productAmount > (data.amount - 1)) {
        toast.error('Quantidade solicitada fora de estoque');
        return
      }
      
      const searchProduct = await api.get(`/products/${productId}`) // busca o produto selecionado

      if (productExistsOnCart) {
        const updatedArray = newCart.map(product => {
          if (product.id === productId) {
            return { ...product, amount: product.amount + 1 }
          }
          return product
        })
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedArray))
        setCart(updatedArray)
        
      } else {
        const product = { ...searchProduct.data, amount: 1 }
        const productLocalStorage = [...cart, product]
        console.log(product)
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(productLocalStorage))
        setCart(productLocalStorage)
      }
      
    } catch {
      toast.error('Erro na adição do produto');
    }
  }



  const removeProduct = async (productId: number) => {
    try {
      const filteredProductSelected = cart.findIndex(product => product.id === productId)
      if (filteredProductSelected >= 0) {
        const productRemoved = _.reject(cart, (product) => { return product.id === productId });
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(productRemoved))
        setCart(productRemoved)
      } else {
        throw Error('Produto não existe')
      }
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount
  }: UpdateProductAmount) => {
    try {
      
      if(amount <= 0) {
        return;
      }
      
      const { data } = await api.get(`/stock/${productId}`) // desestrutura o retorno do estoque

      if (amount > data.amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return
      }

      const newCart = [...cart]
      const productExists = newCart.find(product => product.id === productId)

      if(productExists){
        productExists.amount = amount;
        setCart(newCart)
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart))
      } else {
        throw Error()
      }

    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
