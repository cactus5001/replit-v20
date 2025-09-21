// Shopping cart management with localStorage persistence and Supabase sync
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client'

export interface CartItem {
  id: string
  name: string
  description?: string
  price: number
  stock_quantity: number
  category?: string
  image_url?: string
  quantity: number
  created_at: string
  updated_at: string
}

export interface Cart {
  items: CartItem[]
  total: number
  itemCount: number
  lastUpdated: string
}

const CART_STORAGE_KEY = 'wanterio_cart'

export class CartManager {
  private static instance: CartManager
  private listeners: ((cart: Cart) => void)[] = []
  private currentCart: Cart = {
    items: [],
    total: 0,
    itemCount: 0,
    lastUpdated: new Date().toISOString()
  }

  static getInstance(): CartManager {
    if (!CartManager.instance) {
      CartManager.instance = new CartManager()
    }
    return CartManager.instance
  }

  constructor() {
    // Load cart from localStorage on initialization
    this.loadFromLocalStorage()
  }

  // Get current cart state
  getCart(): Cart {
    return { ...this.currentCart }
  }

  // Add item to cart
  addItem(medicine: Omit<CartItem, 'quantity'>, quantity: number = 1): boolean {
    if (quantity <= 0 || quantity > medicine.stock_quantity) {
      return false
    }

    const existingItemIndex = this.currentCart.items.findIndex(item => item.id === medicine.id)
    
    if (existingItemIndex >= 0) {
      // Update existing item quantity
      const existingItem = this.currentCart.items[existingItemIndex]
      const newQuantity = existingItem.quantity + quantity
      
      if (newQuantity > medicine.stock_quantity) {
        return false
      }
      
      this.currentCart.items[existingItemIndex] = {
        ...existingItem,
        quantity: newQuantity
      }
    } else {
      // Add new item
      this.currentCart.items.push({
        ...medicine,
        quantity
      })
    }

    this.updateCartTotals()
    this.saveToLocalStorage()
    this.notifyListeners()
    this.syncToSupabase()
    
    return true
  }

  // Update item quantity
  updateQuantity(medicineId: string, newQuantity: number): boolean {
    const itemIndex = this.currentCart.items.findIndex(item => item.id === medicineId)
    
    if (itemIndex === -1) {
      return false
    }

    if (newQuantity <= 0) {
      // Remove item
      this.currentCart.items.splice(itemIndex, 1)
    } else {
      const item = this.currentCart.items[itemIndex]
      if (newQuantity > item.stock_quantity) {
        return false
      }
      
      this.currentCart.items[itemIndex] = {
        ...item,
        quantity: newQuantity
      }
    }

    this.updateCartTotals()
    this.saveToLocalStorage()
    this.notifyListeners()
    this.syncToSupabase()
    
    return true
  }

  // Remove item from cart
  removeItem(medicineId: string): void {
    this.currentCart.items = this.currentCart.items.filter(item => item.id !== medicineId)
    this.updateCartTotals()
    this.saveToLocalStorage()
    this.notifyListeners()
    this.syncToSupabase()
  }

  // Clear entire cart
  clearCart(): void {
    this.currentCart = {
      items: [],
      total: 0,
      itemCount: 0,
      lastUpdated: new Date().toISOString()
    }
    this.saveToLocalStorage()
    this.notifyListeners()
    this.syncToSupabase()
  }

  // Load cart from localStorage
  private loadFromLocalStorage(): void {
    if (typeof window === 'undefined') return

    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY)
      if (stored) {
        const parsedCart = JSON.parse(stored)
        this.currentCart = {
          items: parsedCart.items || [],
          total: parsedCart.total || 0,
          itemCount: parsedCart.itemCount || 0,
          lastUpdated: parsedCart.lastUpdated || new Date().toISOString()
        }
        this.updateCartTotals() // Recalculate in case of data inconsistency
      }
    } catch (error) {
      console.error('Error loading cart from localStorage:', error)
      this.currentCart = {
        items: [],
        total: 0,
        itemCount: 0,
        lastUpdated: new Date().toISOString()
      }
    }
  }

  // Save cart to localStorage
  private saveToLocalStorage(): void {
    if (typeof window === 'undefined') return

    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(this.currentCart))
    } catch (error) {
      console.error('Error saving cart to localStorage:', error)
    }
  }

  // Update cart totals
  private updateCartTotals(): void {
    this.currentCart.total = this.currentCart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    this.currentCart.itemCount = this.currentCart.items.reduce((sum, item) => sum + item.quantity, 0)
    this.currentCart.lastUpdated = new Date().toISOString()
  }

  // Sync cart to Supabase for logged-in users (simplified for current environment)
  private async syncToSupabase(): Promise<void> {
    // Temporarily disabled - will implement when full Supabase is available
    // This ensures cart works with localStorage for now
    return
  }

  // Load cart from Supabase for logged-in users (simplified for current environment)
  async loadFromSupabase(userId: string): Promise<void> {
    // Temporarily using localStorage only - will implement Supabase sync when fully available
    // Cart persistence is handled by localStorage for now
    return
  }

  // Subscribe to cart changes
  subscribe(callback: (cart: Cart) => void): () => void {
    this.listeners.push(callback)
    // Call immediately with current state
    callback(this.getCart())
    
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback)
    }
  }

  // Notify all listeners of cart changes
  private notifyListeners(): void {
    const cart = this.getCart()
    this.listeners.forEach(listener => listener(cart))
  }

  // Check stock availability before checkout
  async validateStock(): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = []
    
    // Simplified validation for current environment
    // In production, this will check against actual database stock
    for (const item of this.currentCart.items) {
      if (item.quantity > item.stock_quantity) {
        errors.push(`${item.name} - Requested quantity (${item.quantity}) exceeds available stock (${item.stock_quantity})`)
      }
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }
}

// Export singleton instance
export const cartManager = CartManager.getInstance()