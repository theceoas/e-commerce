'use client';

import { useState, useEffect } from 'react';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  User,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  Lock,
  ShoppingBag,
  ArrowLeft,
  Check,
  Eye,
  EyeOff,
  Tag,
  X,
  Truck
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client'

const supabase = createClient();
import { toast } from 'sonner';
import { reduceStock, checkStockAvailability } from '@/lib/inventory';
import { recordPromotionUsage } from '@/lib/promotions';
import { generateUniqueOrderNumber } from '@/lib/order-utils';
import dynamic from 'next/dynamic';

// Dynamically import PaystackButton to avoid SSR issues
const PaystackButton = dynamic(
  () => import('react-paystack').then((mod) => mod.PaystackButton),
  { ssr: false }
);

interface CheckoutForm {
  // Contact Info
  email: string;

  // Shipping Address
  firstName: string;
  lastName: string;
  company?: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string;

  // Shipping Options
  shippingZoneId: string;

  // Address Options
  saveAddress: boolean;

  // Account Creation (for guests)
  createAccount: boolean;
  password?: string;
  confirmPassword?: string;
}

interface ShippingZone {
  id: string;
  name: string;
  price: number;
  description: string;
  is_active: boolean;
}

export default function CheckoutPage() {
  const {
    items,
    loading: cartLoading,
    getCartTotal,
    getCartCount,
    clearCart,
    appliedPromotion,
    promotionLoading,
    getSubtotal,
    getDiscountAmount,
    getFinalTotal,
    applyPromotionCode,
    removePromotionCode
  } = useCart();
  const { user, signUp } = useAuth();
  const router = useRouter();

  const [form, setForm] = useState<CheckoutForm>({
    email: user?.email || '',
    firstName: '',
    lastName: '',
    company: '',
    address1: '',
    address2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'Nigeria',
    phone: '',
    shippingZoneId: '',
    saveAddress: false,
    createAccount: false,
    password: '',
    confirmPassword: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userAddresses, setUserAddresses] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [promoCode, setPromoCode] = useState('');
  const [shippingZones, setShippingZones] = useState<ShippingZone[]>([]);
  const [selectedShippingZone, setSelectedShippingZone] = useState<ShippingZone | null>(null);
  const [paymentConfig, setPaymentConfig] = useState<any>(null);

  // Load user addresses if logged in and shipping zones
  useEffect(() => {
    if (user) {
      loadUserAddresses();
    }
    loadShippingZones();
  }, [user]);

  const loadUserAddresses = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('addresses')
        .select('*')
        .eq('user_id', user.id)
        .eq('type', 'Shipping')
        .order('is_default', { ascending: false });

      if (error) {
        console.error('Error loading addresses:', error);
        throw error;
      }

      console.log('Loaded addresses:', data);
      setUserAddresses(data || []);

      // Auto-select default address
      const defaultAddress = data?.find(addr => addr.is_default);
      if (defaultAddress) {
        setSelectedAddressId(defaultAddress.id);
        setForm(prev => ({
          ...prev,
          firstName: defaultAddress.first_name,
          lastName: defaultAddress.last_name,
          company: defaultAddress.company || '',
          address1: defaultAddress.address_line_1,
          address2: defaultAddress.address_line_2 || '',
          city: defaultAddress.city,
          state: defaultAddress.state,
          postalCode: defaultAddress.postal_code,
          country: defaultAddress.country,
          phone: defaultAddress.phone || ''
        }));
      }
    } catch (error) {
      console.error('Error loading addresses:', error);
      toast.error('Failed to load saved addresses');
    }
  };

  const loadShippingZones = async () => {
    try {
      const { data, error } = await supabase
        .from('shipping_zones')
        .select('*')
        .eq('is_active', true)
        .order('price', { ascending: true });

      if (error) {
        console.error('Error loading shipping zones:', error);
        throw error;
      }

      setShippingZones(data || []);

      // Auto-select the first (cheapest) shipping zone
      if (data && data.length > 0) {
        setSelectedShippingZone(data[0]);
        setForm(prev => ({ ...prev, shippingZoneId: data[0].id }));
      }
    } catch (error) {
      console.error('Error loading shipping zones:', error);
      toast.error('Failed to load shipping options');
    }
  };

  const handleShippingZoneChange = (zoneId: string) => {
    const zone = shippingZones.find(z => z.id === zoneId);
    if (zone) {
      setSelectedShippingZone(zone);
      setForm(prev => ({ ...prev, shippingZoneId: zoneId }));
    }
  };

  const handleInputChange = (field: keyof CheckoutForm, value: string | boolean) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    const required = ['email', 'firstName', 'lastName', 'address1', 'city', 'state', 'postalCode', 'phone', 'shippingZoneId'];

    for (const field of required) {
      if (!form[field as keyof CheckoutForm]) {
        const fieldName = field === 'shippingZoneId' ? 'shipping option' : field.replace(/([A-Z])/g, ' $1').toLowerCase();
        toast.error(`Please select ${fieldName}`);
        return false;
      }
    }

    if (form.createAccount) {
      if (!form.password || form.password.length < 6) {
        toast.error('Password must be at least 6 characters');
        return false;
      }
      if (form.password !== form.confirmPassword) {
        toast.error('Passwords do not match');
        return false;
      }
    }

    return true;
  };

  const handleApplyPromoCode = async () => {
    if (!promoCode.trim()) return;

    if (!user) {
      toast.error('Please sign in to use promotion codes');
      return;
    }

    await applyPromotionCode(promoCode.trim());
    setPromoCode('');
  };

  const handleRemovePromoCode = () => {
    removePromotionCode();
  };

  const generateOrderNumber = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'FT';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  // Setup Paystack payment configuration when form is valid
  useEffect(() => {
    if (!validateFormSilently()) {
      setPaymentConfig(null);
      return;
    }

    if (items.length === 0) {
      setPaymentConfig(null);
      return;
    }

    const shippingCost = selectedShippingZone?.price || 0;
    const totalWithShipping = getFinalTotal() + shippingCost;

    const config = {
      reference: `FT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      email: form.email,
      amount: Math.round(totalWithShipping * 100), // Paystack expects amount in kobo
      publicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY!,
      text: `Pay ₦${totalWithShipping.toLocaleString()}`,
      onSuccess: handlePaymentSuccess,
      onClose: handlePaymentClose,
    };

    setPaymentConfig(config);
  }, [form, items, selectedShippingZone, getFinalTotal]);

  const validateFormSilently = () => {
    const required = ['email', 'firstName', 'lastName', 'address1', 'city', 'state', 'postalCode', 'phone', 'shippingZoneId'];

    for (const field of required) {
      if (!form[field as keyof CheckoutForm]) {
        return false;
      }
    }

    if (form.createAccount) {
      if (!form.password || form.password.length < 6) {
        return false;
      }
      if (form.password !== form.confirmPassword) {
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Form submission is handled by Paystack button
  };

  // Handle successful payment
  const handlePaymentSuccess = async (reference: any) => {
    setLoading(true);

    try {
      // Validate form first
      if (!validateForm()) {
        setLoading(false);
        return;
      }

      if (items.length === 0) {
        toast.error('Your cart is empty');
        setLoading(false);
        return;
      }

      // Check stock availability before processing the order
      const stockCheck = await checkStockAvailability(items);
      if (!stockCheck.success) {
        if (stockCheck.insufficientStock && stockCheck.insufficientStock.length > 0) {
          const insufficientItems = stockCheck.insufficientStock
            .map(item => `${item.productName} (${item.size}): ${item.requested} requested, ${item.available} available`)
            .join('\n');
          toast.error(`Insufficient stock for:\n${insufficientItems}`);
        } else {
          toast.error(stockCheck.error || 'Stock availability check failed');
        }
        setLoading(false);
        return;
      }

      let userId = user?.id;

      // Create account if guest chose to
      if (!user && form.createAccount) {
        toast.loading('Creating your account...');
        const { error } = await signUp(form.email, form.password!, {
          firstName: form.firstName,
          lastName: form.lastName,
          phone: form.phone
        });

        if (error) {
          toast.dismiss();
          toast.error('Failed to create account: ' + (error.message || 'Unknown error'));
          setLoading(false);
          return;
        }

        // Get the newly created user
        const { data: { user: newUser } } = await supabase.auth.getUser();
        userId = newUser?.id;
      }

      toast.loading('Generating order number...');

      // Calculate total with shipping
      const shippingCost = selectedShippingZone?.price || 0;
      const subtotalAmount = getSubtotal();
      const discountAmount = getDiscountAmount();
      const totalWithShipping = subtotalAmount - discountAmount + shippingCost;

      // Generate unique order number
      const orderNumber = await generateUniqueOrderNumber();

      toast.loading('Finalizing order...');

      // Verify we have an active session before trying to use userId
      // This prevents RLS errors where we have a userId but auth.uid() is null
      const { data: { session } } = await supabase.auth.getSession();
      const activeUserId = session?.user?.id;

      // If we don't have an active session, we MUST save as guest (guest_email)
      // even if we just created an account. The account page will link it by email later.
      const finalUserId = activeUserId || null;
      const finalGuestEmail = activeUserId ? null : form.email;

      // Create order with paid status since payment was successful
      const orderData = {
        user_id: finalUserId,
        guest_email: finalGuestEmail,
        subtotal: subtotalAmount,
        total_amount: totalWithShipping,
        shipping_address: {
          first_name: form.firstName,
          last_name: form.lastName,
          company: form.company,
          address_line_1: form.address1,
          address_line_2: form.address2,
          city: form.city,
          state: form.state,
          postal_code: form.postalCode,
          country: form.country,
          phone: form.phone
        },
        shipping_zone_id: form.shippingZoneId,
        shipping_cost: shippingCost,
        payment_status: 'paid',
        payment_reference: reference.reference,
        status: 'pending',
        order_number: orderNumber
      };

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert(orderData)
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = items.map(item => {
        // Use size-specific price if available (for MiniMe products), otherwise use product price
        const basePrice = (item as any).size_price !== undefined && (item as any).size_price !== null
          ? (item as any).size_price
          : (item.product?.price || 0);

        const effectivePrice = item.product?.has_active_discount && item.product?.discounted_price
          ? item.product.discounted_price
          : basePrice;

        return {
          order_id: order.id,
          product_id: item.product_id,
          quantity: item.quantity,
          size: item.size,
          price: basePrice, // Store the base price (size-specific or product price)
          unit_price: effectivePrice, // Store the effective price (after discount)
          total_price: effectivePrice * item.quantity
        };
      });

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;
      // Reduce stock for ordered items
      await reduceStock(items, order.id);

      // Record promotion usage if a promotion was applied
      if (appliedPromotion && userId) {
        try {
          const promotionUsageRecorded = await recordPromotionUsage(
            appliedPromotion.promotionId,
            userId,
            order.id,
            discountAmount
          );

          if (!promotionUsageRecorded) {
            console.error('Failed to record promotion usage');
          }
        } catch (promotionError) {
          console.error('Error recording promotion usage:', promotionError);
        }
      }

      // Save address if user is logged in, it's a new address, and they chose to save it
      if (userId && !selectedAddressId && form.saveAddress) {
        try {
          const { error: addressError } = await supabase
            .from('addresses')
            .insert({
              user_id: userId,
              type: 'Shipping',
              first_name: form.firstName,
              last_name: form.lastName,
              company: form.company,
              address_line_1: form.address1,
              address_line_2: form.address2,
              city: form.city,
              state: form.state,
              postal_code: form.postalCode,
              country: form.country,
              phone: form.phone,
              is_default: userAddresses.length === 0
            });

          if (addressError) {
            console.error('Error saving address:', addressError);
          }
        } catch (addressSaveError) {
          console.error('Error saving address:', addressSaveError);
        }
      }

      // Trigger purchase webhook (non-blocking / short timeout)
      try {
        // Don't await the full response if it takes too long
        // We use a shorter timeout of 2 seconds to avoid blocking the UI
        const webhookResponse = await fetch('/api/webhooks', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            event_type: 'purchase',
            data: {
              order_id: order.id,
              order_number: order.order_number,
              total_amount: totalWithShipping,
              subtotal: subtotalAmount,
              shipping_cost: shippingCost,
              discount_amount: discountAmount,
              customer_email: userId ? null : form.email,
              user_id: userId,
              items: orderItems.map(item => ({
                product_id: item.product_id,
                quantity: item.quantity,
                size: item.size,
                unit_price: item.unit_price,
                total_price: item.total_price
              })),
              shipping_address: order.shipping_address,
              payment_reference: reference.reference,
              created_at: new Date().toISOString()
            }
          }),
          signal: AbortSignal.timeout(2000) // Reduced to 2 seconds
        });

        if (webhookResponse.ok) {
          const webhookResult = await webhookResponse.json();
          console.log('Purchase webhook triggered successfully:', webhookResult);
        } else {
          console.error('Failed to trigger purchase webhook:', await webhookResponse.text());
        }
      } catch (webhookError) {
        if (webhookError instanceof Error && webhookError.name === 'AbortError') {
          console.log('Purchase webhook request sent (timed out waiting for response, which is expected)');
        } else {
          console.error('Error triggering purchase webhook:', webhookError);
        }
      }

      // Clear cart and redirect to order confirmation
      await clearCart();
      toast.dismiss(); // Clear loading toasts
      toast.success('Payment successful! Redirecting...');
      router.push(`/order-confirmation?order=${order.order_number}`);

    } catch (error) {
      console.error('Payment success handling error:', error);
      toast.error('Payment was successful but there was an error processing your order. Please contact support.');
      setLoading(false);
    }
  };

  // Handle payment close/cancellation
  const handlePaymentClose = () => {
    toast.error('Payment was cancelled.');
    setLoading(false);
  };


  if (cartLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading checkout...</p>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ShoppingBag className="w-24 h-24 text-gray-300 mx-auto mb-6" />
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Your cart is empty</h2>
          <p className="text-gray-600 mb-8">Add some items to your cart before checking out.</p>
          <Link href="/">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3">
              Continue Shopping
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <Link href="/cart" className="flex items-center text-gray-600 hover:text-orange-600 transition-colors">
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
              <span className="text-sm sm:text-base">Back to Cart</span>
            </Link>
            <h1 className="text-lg sm:text-xl font-semibold text-gray-900">Checkout</h1>
            <div className="flex items-center space-x-1 sm:space-x-2">
              <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />
              <span className="text-xs sm:text-sm text-gray-600 hidden sm:inline">Secure Checkout</span>
              <span className="text-xs text-gray-600 sm:hidden">Secure</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          {/* Checkout Form */}
          <div className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Contact Information */}
              <div className="bg-white rounded-lg shadow-sm border p-4 sm:p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />
                  <h2 className="text-base sm:text-lg font-semibold">Contact Information</h2>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="email" className="text-sm">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={form.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="your@email.com"
                      required
                      disabled={!!user}
                      className="mt-1"
                    />
                  </div>

                  {!user && (
                    <div className="flex items-start space-x-2">
                      <Checkbox
                        id="createAccount"
                        checked={form.createAccount}
                        onCheckedChange={(checked) => handleInputChange('createAccount', checked as boolean)}
                        className="mt-1"
                      />
                      <Label htmlFor="createAccount" className="text-xs sm:text-sm font-normal leading-relaxed">
                        Create an account for faster checkout next time
                      </Label>
                    </div>
                  )}

                  {!user && form.createAccount && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="password" className="text-sm">Password</Label>
                        <div className="relative mt-1">
                          <Input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            value={form.password}
                            onChange={(e) => handleInputChange('password', e.target.value)}
                            placeholder="Minimum 6 characters"
                            required={form.createAccount}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="confirmPassword">Confirm Password</Label>
                        <div className="relative">
                          <Input
                            id="confirmPassword"
                            type={showConfirmPassword ? 'text' : 'password'}
                            value={form.confirmPassword}
                            onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                            placeholder="Confirm password"
                            required={form.createAccount}
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2"
                          >
                            {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Saved Addresses (for logged in users) */}
              {user && userAddresses.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <h3 className="text-lg font-semibold mb-4">Saved Addresses</h3>
                  <div className="space-y-3">
                    {userAddresses.map((address) => (
                      <div
                        key={address.id}
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${selectedAddressId === address.id
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-gray-200 hover:border-gray-300'
                          }`}
                        onClick={() => {
                          setSelectedAddressId(address.id);
                          setForm(prev => ({
                            ...prev,
                            firstName: address.first_name,
                            lastName: address.last_name,
                            company: address.company || '',
                            address1: address.address_line_1,
                            address2: address.address_line_2 || '',
                            city: address.city,
                            state: address.state,
                            postalCode: address.postal_code,
                            country: address.country,
                            phone: address.phone || ''
                          }));
                        }}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium">
                              {address.first_name} {address.last_name}
                            </p>
                            <p className="text-sm text-gray-600">
                              {address.address_line_1}
                              {address.address_line_2 && `, ${address.address_line_2}`}
                            </p>
                            <p className="text-sm text-gray-600">
                              {address.city}, {address.state} {address.postal_code}
                            </p>
                          </div>
                          {selectedAddressId === address.id && (
                            <Check className="w-5 h-5 text-blue-600" />
                          )}
                        </div>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setSelectedAddressId('')}
                      className="w-full"
                    >
                      Use a different address
                    </Button>
                  </div>
                </div>
              )}

              {/* Shipping Address */}
              {(!user || !selectedAddressId) && (
                <div className="bg-white rounded-lg shadow-sm border p-4 sm:p-6">
                  <div className="flex items-center space-x-2 mb-4">
                    <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />
                    <h2 className="text-base sm:text-lg font-semibold">Shipping Address</h2>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="firstName" className="text-sm">First Name</Label>
                        <Input
                          id="firstName"
                          value={form.firstName}
                          onChange={(e) => handleInputChange('firstName', e.target.value)}
                          required
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="lastName" className="text-sm">Last Name</Label>
                        <Input
                          id="lastName"
                          value={form.lastName}
                          onChange={(e) => handleInputChange('lastName', e.target.value)}
                          required
                          className="mt-1"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="company" className="text-sm">Company (Optional)</Label>
                      <Input
                        id="company"
                        value={form.company}
                        onChange={(e) => handleInputChange('company', e.target.value)}
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="address1" className="text-sm">Address Line 1</Label>
                      <Input
                        id="address1"
                        value={form.address1}
                        onChange={(e) => handleInputChange('address1', e.target.value)}
                        required
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="address2" className="text-sm">Address Line 2 (Optional)</Label>
                      <Input
                        id="address2"
                        value={form.address2}
                        onChange={(e) => handleInputChange('address2', e.target.value)}
                        className="mt-1"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="city" className="text-sm">City</Label>
                        <Input
                          id="city"
                          value={form.city}
                          onChange={(e) => handleInputChange('city', e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="state" className="text-sm">State</Label>
                        <Input
                          id="state"
                          value={form.state}
                          onChange={(e) => handleInputChange('state', e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="postalCode" className="text-sm">Postal Code</Label>
                        <Input
                          id="postalCode"
                          value={form.postalCode}
                          onChange={(e) => handleInputChange('postalCode', e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="phone" className="text-sm">Phone Number</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={form.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        required
                      />
                    </div>

                    {/* Shipping Zone Selection */}
                    <div>
                      <Label htmlFor="shippingZone">Shipping Area</Label>
                      <Select
                        value={form.shippingZoneId}
                        onValueChange={handleShippingZoneChange}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select shipping area" />
                        </SelectTrigger>
                        <SelectContent>
                          {shippingZones.map((zone) => (
                            <SelectItem key={zone.id} value={zone.id}>
                              <div className="flex items-center space-x-3">
                                <Truck className="w-4 h-4" />
                                <div className="flex-1">
                                  <div className="flex items-center justify-between gap-4">
                                    <span className="font-medium">{zone.name}</span>
                                    <span className="text-sm font-semibold text-green-600 ml-auto">
                                      ₦{zone.price.toLocaleString()}
                                    </span>
                                  </div>
                                  {zone.description && (
                                    <div className="text-xs text-gray-500 mt-1">
                                      {zone.description}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Save Address Checkbox for logged in users */}
                    {user && (
                      <div className="flex items-center space-x-2 mt-4">
                        <Checkbox
                          id="saveAddress"
                          checked={form.saveAddress}
                          onCheckedChange={(checked) => handleInputChange('saveAddress', checked as boolean)}
                        />
                        <Label htmlFor="saveAddress" className="text-sm font-normal">
                          Save this address for future orders
                        </Label>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Payment Method */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <CreditCard className="w-5 h-5 text-orange-600" />
                  <h2 className="text-lg font-semibold">Payment Method</h2>
                </div>

                <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <CreditCard className="w-5 h-5 text-orange-600" />
                    <span className="font-medium">Paystack Payment</span>
                    <Badge variant="secondary">Test Mode</Badge>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    Secure payment processing via Paystack. This is in test mode.
                  </p>
                </div>
              </div>

              {/* Paystack Payment Button */}
              {paymentConfig ? (
                <PaystackButton
                  {...paymentConfig}
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white py-4 text-lg font-semibold rounded-md transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={loading || !validateFormSilently()}
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Processing Order...
                    </>
                  ) : (
                    <>
                      <Lock className="w-5 h-5 mr-2" />
                      Pay ₦{(getFinalTotal() + (selectedShippingZone?.price || 0)).toLocaleString()} with Paystack
                    </>
                  )}
                </PaystackButton>
              ) : (
                <Button
                  type="button"
                  disabled={true}
                  className="w-full bg-gray-400 text-white py-4 text-lg font-semibold cursor-not-allowed"
                >
                  <Lock className="w-5 h-5 mr-2" />
                  Complete all fields to continue
                </Button>
              )}
            </form>
          </div>

          {/* Order Summary */}
          <div className="lg:sticky lg:top-8 lg:h-fit">
            <div className="bg-white rounded-lg shadow-sm border p-4 sm:p-6">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Order Summary</h2>

              {/* Promotion Code Section */}
              {!appliedPromotion && (
                <div className="mb-6 p-3 sm:p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <div className="flex items-center gap-2 mb-3">
                    <Tag className="w-4 h-4 text-orange-600" />
                    <span className="text-xs sm:text-sm font-medium text-orange-800">Have a coupon code?</span>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter coupon code"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                      className="flex-1 border-orange-200 focus:border-orange-400 focus:ring-orange-400 text-sm"
                      disabled={promotionLoading}
                    />
                    <Button
                      onClick={handleApplyPromoCode}
                      disabled={!promoCode.trim() || promotionLoading || !user}
                      size="sm"
                      className="bg-orange-500 hover:bg-orange-600 text-white text-xs sm:text-sm px-3"
                    >
                      {promotionLoading ? 'Applying...' : 'Apply'}
                    </Button>
                  </div>
                  {!user && (
                    <p className="text-xs text-orange-600 mt-2">
                      Please sign in to use coupon codes
                    </p>
                  )}
                </div>
              )}

              {/* Applied Promotion Display */}
              {appliedPromotion && (
                <div className="mb-6 p-3 sm:p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-green-600" />
                      <span className="text-xs sm:text-sm font-medium text-green-800">
                        {appliedPromotion.code} Applied
                      </span>
                    </div>
                    <Button
                      onClick={handleRemovePromoCode}
                      variant="ghost"
                      size="sm"
                      className="text-green-600 hover:text-green-700 hover:bg-green-100 p-1"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-green-600 mt-1">
                    Coupon applied successfully!
                  </p>
                </div>
              )}

              {/* Cart Items */}
              <div className="space-y-4 mb-6">
                {items.map((item) => (
                  <div key={item.id} className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-16 h-16 bg-gray-200 rounded-lg overflow-hidden">
                        {item.product?.thumbnail_url ? (
                          <Image
                            src={item.product.thumbnail_url}
                            alt={item.product.name || 'Product'}
                            width={64}
                            height={64}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                            <ShoppingBag className="w-6 h-6 text-gray-400" />
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-gray-900 truncate">
                        {item.product?.name || 'Product'}
                      </h4>
                      <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                      {item.size && (
                        <p className="text-sm text-gray-500">Size: {item.size}</p>
                      )}
                    </div>
                    <div className="text-sm font-medium text-gray-900">
                      ₦{(() => {
                        // Use size-specific price if available (for MiniMe products)
                        const basePrice = (item as any).size_price !== undefined && (item as any).size_price !== null
                          ? (item as any).size_price
                          : (item.product?.price || 0)

                        const price = item.product?.has_active_discount && item.product?.discounted_price
                          ? item.product.discounted_price
                          : basePrice

                        return (price * item.quantity).toLocaleString()
                      })()}
                    </div>
                  </div>
                ))}
              </div>

              <Separator className="my-4" />

              {/* Totals */}
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal ({getCartCount()} items)</span>
                  <span className="font-medium">₦{getSubtotal().toLocaleString()}</span>
                </div>

                {appliedPromotion && getDiscountAmount() > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-green-600">Discount ({appliedPromotion.code})</span>
                    <span className="font-medium text-green-600">-₦{getDiscountAmount().toLocaleString()}</span>
                  </div>
                )}

                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    Shipping {selectedShippingZone ? `(${selectedShippingZone.name})` : ''}
                  </span>
                  <span className="font-medium">
                    ₦{(selectedShippingZone?.price || 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tax</span>
                  <span className="font-medium">₦0</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-semibold">
                  <span>Total</span>
                  <span className="text-orange-600">
                    ₦{(getFinalTotal() + (selectedShippingZone?.price || 0)).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}