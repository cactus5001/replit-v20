'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { cartManager, Cart, CartItem } from '@/lib/cart'
import { useAuth } from './auth-provider'

interface CartContextType {
  cart: Cart
  addToCart: (medicine: Omit<CartItem, 'quantity'>, quantity?: number) => boolean
  updateQuantity: (medicineId: string, quantity: number) => boolean
  removeItem: (medicineId: string) => void
  clearCart: () => void
  isLoading: boolean
  validateStock: () => Promise<{ valid: boolean; errors: string[] }>
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [cart, setCart] = useState<Cart>(cartManager.getCart())
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    // Subscribe to cart changes
    const unsubscribe = cartManager.subscribe(setCart)
    
    // Load cart from Supabase when user logs in
    if (user) {
      setIsLoading(true)
      cartManager.loadFromSupabase(user.id).finally(() => {
        setIsLoading(false)
      })
    }

    return unsubscribe
  }, [user])

  const addToCart = (medicine: Omit<CartItem, 'quantity'>, quantity: number = 1): boolean => {
    return cartManager.addItem(medicine, quantity)
  }

  const updateQuantity = (medicineId: string, quantity: number): boolean => {
    return cartManager.updateQuantity(medicineId, quantity)
  }

  const removeItem = (medicineId: string): void => {
    cartManager.removeItem(medicineId)
  }

  const clearCart = (): void => {
    cartManager.clearCart()
  }

  const validateStock = (): Promise<{ valid: boolean; errors: string[] }> => {
    return cartManager.validateStock()
  }

  return (
    <CartContext.Provider value={{
      cart,
      addToCart,
      updateQuantity,
      removeItem,
      clearCart,
      isLoading,
      validateStock
    }}>
      {children}
    </CartContext.Provider>
  )
}