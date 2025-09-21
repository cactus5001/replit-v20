'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/providers/auth-provider'
import { useCart } from '@/providers/cart-provider'
import { cartManager } from '@/lib/cart'
import { Navbar } from '@/components/navbar'
import { BreadcrumbNav } from '@/components/breadcrumb-nav'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { ArrowLeft, ArrowRight, ShoppingCart, Truck, CreditCard, CheckCircle, MapPin, Phone, Mail, DollarSign } from 'lucide-react'
import { toast } from 'sonner'

interface ShippingInfo {
  fullName: string
  email: string
  phone: string
  address: string
  city: string
  postalCode: string
  notes?: string
}

interface PaymentInfo {
  method: 'cod' | 'bank_transfer' | 'stripe'
  bankDetails?: string
}

const CHECKOUT_STEPS = [
  { id: 1, title: 'Cart Review', icon: ShoppingCart, description: 'Review your items' },
  { id: 2, title: 'Shipping', icon: Truck, description: 'Delivery information' },
  { id: 3, title: 'Payment', icon: CreditCard, description: 'Choose payment method' },
  { id: 4, title: 'Confirmation', icon: CheckCircle, description: 'Complete your order' }
]

export default function CheckoutPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { cart, clearCart } = useCart()
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  
  const [shippingInfo, setShippingInfo] = useState<ShippingInfo>({
    fullName: '',
    email: user?.email || '',
    phone: '',
    address: '',
    city: '',
    postalCode: '',
    notes: ''
  })
  
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo>({
    method: 'cod'
  })

  // Redirect if cart is empty or user not logged in
  useEffect(() => {
    if (!user) {
      toast.error('Please login to continue with checkout')
      router.push('/auth/login')
      return
    }
    
    if (cart.items.length === 0) {
      toast.error('Your cart is empty')
      router.push('/pharmacy')
      return
    }
  }, [user, cart.items.length, router])

  const nextStep = () => {
    if (currentStep < CHECKOUT_STEPS.length) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const validateShipping = (): boolean => {
    const required = ['fullName', 'email', 'phone', 'address', 'city', 'postalCode']
    const missing = required.filter(field => !shippingInfo[field as keyof ShippingInfo])
    
    if (missing.length > 0) {
      toast.error(`Please fill in: ${missing.join(', ')}`)
      return false
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(shippingInfo.email)) {
      toast.error('Please enter a valid email address')
      return false
    }

    return true
  }

  const handleStepNavigation = () => {
    if (currentStep === 2 && !validateShipping()) {
      return
    }
    nextStep()
  }

  const placeOrder = async () => {
    setLoading(true)
    
    try {
      // Validate stock one more time
      const stockValidation = await cartManager.validateStock()
      if (!stockValidation.valid) {
        toast.error('Some items are out of stock: ' + stockValidation.errors.join(', '))
        setCurrentStep(1)
        return
      }

      // Calculate totals
      const subtotal = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
      const tax = subtotal * 0.08 // 8% tax
      const shipping = subtotal > 50 ? 0 : 9.99 // Free shipping over $50
      const total = subtotal + tax + shipping

      // Create order object
      const orderData = {
        user_id: user?.id,
        items: cart.items.map(item => ({
          medicine_id: item.id,
          quantity: item.quantity,
          price: item.price,
          total: item.price * item.quantity
        })),
        shipping_info: shippingInfo,
        payment_method: paymentInfo.method,
        subtotal,
        tax,
        shipping,
        total,
        status: 'pending'
      }

      // TODO: Save order to database
      console.log('Order data:', orderData)
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Clear cart and show success
      clearCart()
      toast.success('Order placed successfully!')
      
      // Move to confirmation step
      nextStep()
      
      // Redirect to order confirmation after a moment
      setTimeout(() => {
        router.push('/orders')
      }, 3000)
      
    } catch (error) {
      console.error('Error placing order:', error)
      toast.error('Failed to place order. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!user || cart.items.length === 0) {
    return null // Will redirect via useEffect
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <BreadcrumbNav
        items={[
          { label: 'Home', href: '/' },
          { label: 'Pharmacy', href: '/pharmacy' },
          { label: 'Checkout', href: '/checkout' }
        ]}
      />
      
      <div className="max-w-4xl mx-auto p-6">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {CHECKOUT_STEPS.map((step, index) => {
              const Icon = step.icon
              const isActive = currentStep === step.id
              const isCompleted = currentStep > step.id
              
              return (
                <div key={step.id} className="flex items-center">
                  <div className={`flex items-center space-x-3 ${
                    isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-400'
                  }`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                      isActive ? 'border-blue-600 bg-blue-50' : 
                      isCompleted ? 'border-green-600 bg-green-50' : 'border-gray-300'
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="hidden md:block">
                      <div className="font-medium">{step.title}</div>
                      <div className="text-sm text-gray-500">{step.description}</div>
                    </div>
                  </div>
                  {index < CHECKOUT_STEPS.length - 1 && (
                    <div className={`hidden md:block w-24 h-0.5 mx-4 ${
                      isCompleted ? 'bg-green-600' : 'bg-gray-300'
                    }`} />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Step 1: Cart Review */}
            {currentStep === 1 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <ShoppingCart className="w-5 h-5" />
                    <span>Review Your Cart</span>
                  </CardTitle>
                  <CardDescription>
                    Review your items before proceeding to checkout
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {cart.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <h3 className="font-medium">{item.name}</h3>
                        <p className="text-sm text-gray-600">{item.description}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge variant="outline">{item.category}</Badge>
                          {item.stock_quantity < 10 && (
                            <Badge variant="destructive">Low Stock</Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">${item.price.toFixed(2)} × {item.quantity}</div>
                        <div className="text-lg font-bold">${(item.price * item.quantity).toFixed(2)}</div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Step 2: Shipping Information */}
            {currentStep === 2 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Truck className="w-5 h-5" />
                    <span>Shipping Information</span>
                  </CardTitle>
                  <CardDescription>
                    Enter your delivery details
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Full Name *</Label>
                      <Input
                        id="fullName"
                        value={shippingInfo.fullName}
                        onChange={(e) => setShippingInfo(prev => ({ ...prev, fullName: e.target.value }))}
                        placeholder="John Doe"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={shippingInfo.email}
                        onChange={(e) => setShippingInfo(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="john@example.com"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      value={shippingInfo.phone}
                      onChange={(e) => setShippingInfo(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="address">Address *</Label>
                    <Textarea
                      id="address"
                      value={shippingInfo.address}
                      onChange={(e) => setShippingInfo(prev => ({ ...prev, address: e.target.value }))}
                      placeholder="Street address, apartment, suite, etc."
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city">City *</Label>
                      <Input
                        id="city"
                        value={shippingInfo.city}
                        onChange={(e) => setShippingInfo(prev => ({ ...prev, city: e.target.value }))}
                        placeholder="New York"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="postalCode">Postal Code *</Label>
                      <Input
                        id="postalCode"
                        value={shippingInfo.postalCode}
                        onChange={(e) => setShippingInfo(prev => ({ ...prev, postalCode: e.target.value }))}
                        placeholder="10001"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="notes">Delivery Notes (Optional)</Label>
                    <Textarea
                      id="notes"
                      value={shippingInfo.notes}
                      onChange={(e) => setShippingInfo(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Special delivery instructions..."
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 3: Payment Method */}
            {currentStep === 3 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <CreditCard className="w-5 h-5" />
                    <span>Payment Method</span>
                  </CardTitle>
                  <CardDescription>
                    Choose how you'd like to pay
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <RadioGroup
                    value={paymentInfo.method}
                    onValueChange={(value) => setPaymentInfo(prev => ({ ...prev, method: value as any }))}
                    className="space-y-4"
                  >
                    <div className="flex items-center space-x-2 p-4 border rounded-lg">
                      <RadioGroupItem value="cod" id="cod" />
                      <Label htmlFor="cod" className="flex-1 cursor-pointer">
                        <div className="flex items-center space-x-3">
                          <DollarSign className="w-5 h-5 text-green-600" />
                          <div>
                            <div className="font-medium">Cash on Delivery</div>
                            <div className="text-sm text-gray-600">Pay when your order arrives</div>
                          </div>
                        </div>
                      </Label>
                    </div>
                    
                    <div className="flex items-center space-x-2 p-4 border rounded-lg">
                      <RadioGroupItem value="bank_transfer" id="bank_transfer" />
                      <Label htmlFor="bank_transfer" className="flex-1 cursor-pointer">
                        <div className="flex items-center space-x-3">
                          <CreditCard className="w-5 h-5 text-blue-600" />
                          <div>
                            <div className="font-medium">Bank Transfer</div>
                            <div className="text-sm text-gray-600">Transfer to our bank account</div>
                          </div>
                        </div>
                      </Label>
                    </div>
                  </RadioGroup>

                  {paymentInfo.method === 'bank_transfer' && (
                    <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                      <h4 className="font-medium text-blue-900 mb-2">Bank Transfer Details</h4>
                      <div className="text-sm text-blue-800 space-y-1">
                        <div><strong>Bank:</strong> Wanterio Healthcare Bank</div>
                        <div><strong>Account Name:</strong> Wanterio Pharmacy Ltd</div>
                        <div><strong>Account Number:</strong> 1234567890</div>
                        <div><strong>Routing Number:</strong> 123456789</div>
                        <div><strong>Reference:</strong> Your order number will be provided after confirmation</div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Step 4: Confirmation */}
            {currentStep === 4 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span>Order Confirmed!</span>
                  </CardTitle>
                  <CardDescription>
                    Thank you for your order. We'll send you updates via email.
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-center py-8">
                  <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                  <h2 className="text-xl font-bold mb-2">Order Successfully Placed!</h2>
                  <p className="text-gray-600 mb-4">
                    Order confirmation has been sent to {shippingInfo.email}
                  </p>
                  <p className="text-sm text-gray-500">
                    Redirecting to your orders page...
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {(() => {
                    const subtotal = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
                    const tax = subtotal * 0.08 // 8% tax
                    const shipping = subtotal > 50 ? 0 : 9.99 // Free shipping over $50
                    const total = subtotal + tax + shipping
                    
                    return (
                      <>
                        <div className="flex justify-between text-sm">
                          <span>Subtotal ({cart.itemCount} items)</span>
                          <span>${subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Shipping</span>
                          <span>${shipping.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Tax</span>
                          <span>${tax.toFixed(2)}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between font-bold">
                          <span>Total</span>
                          <span>${total.toFixed(2)}</span>
                        </div>
                      </>
                    )
                  })()}
                </div>

                {currentStep < 4 && (
                  <div className="space-y-3">
                    {currentStep > 1 && (
                      <Button
                        variant="outline"
                        onClick={prevStep}
                        className="w-full"
                      >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Previous Step
                      </Button>
                    )}
                    
                    {currentStep < 3 && (
                      <Button
                        onClick={handleStepNavigation}
                        className="w-full"
                      >
                        Next Step
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    )}
                    
                    {currentStep === 3 && (
                      <Button
                        onClick={placeOrder}
                        disabled={loading}
                        className="w-full"
                      >
                        {loading ? 'Placing Order...' : 'Place Order'}
                        <CheckCircle className="w-4 h-4 ml-2" />
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}