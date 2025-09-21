'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/providers/auth-provider'
import { useCart } from '@/providers/cart-provider'
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client'
import { PageLoadingSpinner } from '@/components/loading-spinner'
import { Navbar } from '@/components/navbar'
import { BreadcrumbNav } from '@/components/breadcrumb-nav'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Pill, Search, ShoppingCart, Plus, Minus } from 'lucide-react'
import { toast } from 'sonner'

interface Medicine {
  id: string
  name: string
  description?: string
  price: number
  stock_quantity: number
  category?: string
  image_url?: string
  created_at: string
  updated_at: string
}

export default function PharmacyPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { cart, addItem, updateQuantity, removeItem } = useCart()
  const [medicines, setMedicines] = useState<Medicine[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadMedicines()
  }, [])

  const loadMedicines = async () => {
    try {
      if (!isSupabaseConfigured()) {
        console.warn('Supabase not configured. Please set up your environment variables.')
        setMedicines([])
      } else {
        const { data, error } = await supabase
          .from('medicines')
          .select('*')

        if (error) {
          console.error('Error loading medicines:', error)
          toast.error('Failed to load medicines')
          setMedicines([])
        } else {
          setMedicines(data || [])
        }
      }
    } catch (error) {
      console.error('Error loading medicines:', error)
      toast.error('Failed to load medicines')
      setMedicines([])
    } finally {
      setLoading(false)
    }
  }

  const handleAddToCart = (medicine: Medicine) => {
    if (!user) {
      toast.error('Please login to add items to cart')
      return
    }

    const success = addItem({
      id: medicine.id,
      name: medicine.name,
      price: medicine.price,
      stock_quantity: medicine.stock_quantity,
      description: medicine.description || '',
      category: medicine.category || '',
      image_url: medicine.image_url || '',
      created_at: medicine.created_at,
      updated_at: medicine.updated_at
    })

    if (success) {
      toast.success(`Added ${medicine.name} to cart`)
    } else {
      toast.error('Item is out of stock')
    }
  }

  const handleQuantityUpdate = (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeItem(itemId)
      toast.success('Item removed from cart')
    } else {
      updateQuantity(itemId, newQuantity)
    }
  }

  const getCartItemQuantity = (medicineId: string): number => {
    const item = cart.items.find(item => item.id === medicineId)
    return item ? item.quantity : 0
  }

  const filteredMedicines = medicines.filter(medicine =>
    medicine.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (medicine.category && medicine.category.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const categories = Array.from(new Set(medicines.map(m => m.category).filter(Boolean)))

  if (authLoading || loading) {
    return <PageLoadingSpinner />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <BreadcrumbNav
        items={[
          { label: 'Home', href: '/' },
          { label: 'Pharmacy', href: '/pharmacy' }
        ]}
      />
      
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Online Pharmacy
          </h1>
          <p className="text-gray-600">
            Browse and order medicines with fast delivery
          </p>
        </div>

        {/* Search and Filters */}
        <div className="mb-6">
          <div className="flex items-center space-x-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search medicines..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          {/* Categories */}
          <div className="flex flex-wrap gap-2">
            <Badge 
              variant={searchTerm === '' ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setSearchTerm('')}
            >
              All Categories
            </Badge>
            {categories.map((category) => (
              <Badge
                key={category}
                variant={searchTerm.toLowerCase() === category?.toLowerCase() ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => setSearchTerm(category || '')}
              >
                {category}
              </Badge>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Products Grid */}
          <div className="lg:col-span-3">
            {filteredMedicines.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Pill className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No medicines found
                  </h3>
                  <p className="text-gray-600">
                    {searchTerm 
                      ? `No medicines match "${searchTerm}"`
                      : 'No medicines available at the moment'
                    }
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredMedicines.map((medicine) => {
                  const cartQuantity = getCartItemQuantity(medicine.id)
                  
                  return (
                    <Card key={medicine.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 mb-1">
                              {medicine.name}
                            </h3>
                            {medicine.description && (
                              <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                                {medicine.description}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            {medicine.category && (
                              <Badge variant="secondary" className="text-xs">
                                {medicine.category}
                              </Badge>
                            )}
                            {medicine.stock_quantity < 10 && medicine.stock_quantity > 0 && (
                              <Badge variant="destructive" className="text-xs">
                                Low Stock
                              </Badge>
                            )}
                            {medicine.stock_quantity === 0 && (
                              <Badge variant="destructive" className="text-xs">
                                Out of Stock
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="text-lg font-bold text-green-600">
                            ${medicine.price.toFixed(2)}
                          </div>
                          
                          {cartQuantity > 0 ? (
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleQuantityUpdate(medicine.id, cartQuantity - 1)}
                              >
                                <Minus className="w-3 h-3" />
                              </Button>
                              <span className="w-8 text-center text-sm font-medium">
                                {cartQuantity}
                              </span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleQuantityUpdate(medicine.id, cartQuantity + 1)}
                                disabled={cartQuantity >= medicine.stock_quantity}
                              >
                                <Plus className="w-3 h-3" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              onClick={() => handleAddToCart(medicine)}
                              disabled={medicine.stock_quantity === 0 || !user}
                              size="sm"
                            >
                              <ShoppingCart className="w-4 h-4 mr-1" />
                              Add to Cart
                            </Button>
                          )}
                        </div>
                        
                        <div className="text-xs text-gray-500 mt-2">
                          Stock: {medicine.stock_quantity} units
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>

          {/* Cart Sidebar */}
          <div className="lg:col-span-1">
            {cart.items.length > 0 && (
              <Card className="sticky top-6">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <ShoppingCart className="w-5 h-5" />
                    <span>Shopping Cart ({cart.itemCount} items)</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 mb-4">
                    {cart.items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-3 border rounded">
                        <div className="flex-1">
                          <h4 className="font-medium text-sm">{item.name}</h4>
                          <p className="text-xs text-gray-600">${item.price.toFixed(2)} each</p>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleQuantityUpdate(item.id, item.quantity - 1)}
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="w-6 text-center text-sm">{item.quantity}</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleQuantityUpdate(item.id, item.quantity + 1)}
                            disabled={item.quantity >= item.stock_quantity}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center text-lg font-bold mb-4">
                      <span>Total:</span>
                      <span>
                        ${cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2)}
                      </span>
                    </div>
                    <Button 
                      className="w-full" 
                      size="lg"
                      onClick={() => router.push('/checkout')}
                    >
                      Proceed to Checkout
                      <ShoppingCart className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}