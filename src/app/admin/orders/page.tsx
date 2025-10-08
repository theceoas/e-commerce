'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

import { ProductModal } from '@/components/product-modal';
import { 
  Eye, 
  Download, 
  Search, 
  Filter, 
  RefreshCw,
  Package,
  ChevronDown,
  ChevronUp,
  MapPin,
  Mail,
  Phone,
  Calendar,
  DollarSign,
  LayoutGrid,
  List,
  Check,
  X
} from 'lucide-react';
import Image from 'next/image';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface Order {
  id: string;
  order_number: string;
  user_id?: string;
  total_amount: number;
  subtotal: number;
  status: string;
  payment_status: string;
  created_at: string;
  guest_email?: string;
  shipping_address?: {
    full_name: string;
    address_line_1: string;
    address_line_2?: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
    phone?: string;
  };
  order_items: Array<{
    id: string;
    quantity: number;
    size?: string;
    unit_price: number;
    total_price: number;
    products: {
      id: string;
      name: string;
      description?: string;
      thumbnail_url: string;
      additional_images: string[];
      price: number;
      in_stock?: boolean;
      category?: string;
      brand_id?: string;
      sizes?: Array<{
        size: string;
        stock: number;
      }>;
    };
  }>;
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isFixingOrders, setIsFixingOrders] = useState(false);
  const [selectedProductForModal, setSelectedProductForModal] = useState<any>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [groupByStatus, setGroupByStatus] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [pendingStatusChange, setPendingStatusChange] = useState<{orderId: string, newStatus: string, currentStatus: string} | null>(null);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            id,
            quantity,
            size,
            unit_price,
            total_price,
            products (
              id,
              name,
              thumbnail_url,
              additional_images,
              price
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChangeRequest = (orderId: string, newStatus: string, currentStatus: string) => {
    setPendingStatusChange({ orderId, newStatus, currentStatus });
  };

  const confirmStatusChange = async () => {
    if (pendingStatusChange) {
      await updateOrderStatus(pendingStatusChange.orderId, pendingStatusChange.newStatus);
      setPendingStatusChange(null);
    }
  };

  const cancelStatusChange = () => {
    setPendingStatusChange(null);
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      // First, get the current order to understand its structure
      const { data: currentOrder, error: fetchError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (fetchError) {
        console.error('Error fetching current order:', fetchError);
        throw fetchError;
      }

      const updateData: any = { 
        status: newStatus,
        updated_at: new Date().toISOString()
      };
      
      // If status is completed, automatically mark as paid
      if (newStatus === 'completed') {
        updateData.payment_status = 'paid';
      }

      // Ensure the constraint is satisfied by preserving the current user identification
      if (currentOrder.user_id && !currentOrder.guest_email) {
        // This is a user order, ensure guest_email stays null
        updateData.guest_email = null;
      } else if (!currentOrder.user_id && currentOrder.guest_email) {
        // This is a guest order, ensure user_id stays null
        updateData.user_id = null;
      } else {
        // Handle edge case where constraint might be violated
        console.warn('Order has invalid user identification, fixing...');
        if (currentOrder.guest_email) {
          updateData.user_id = null;
        } else {
          // If no guest_email, this might be an old order, keep as is but log
          console.warn('Order has no proper user identification');
        }
      }

      const { error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId);

      if (error) {
        console.error('Database error:', error);
        throw error;
      }

      // Trigger shipping_update webhook for order status change
      try {
        const webhookResponse = await fetch('/api/webhooks', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            event_type: 'shipping_update',
            data: {
              action: 'status_changed',
              order: {
                id: orderId,
                order_number: currentOrder.order_number,
                previous_status: currentOrder.status,
                new_status: newStatus,
                total_amount: currentOrder.total_amount,
                subtotal: currentOrder.subtotal,
                payment_status: currentOrder.payment_status,
                created_at: currentOrder.created_at,
                updated_at: new Date().toISOString(),
                customer: {
                  email: currentOrder.guest_email || 'N/A',
                  user_id: currentOrder.user_id || null,
                  is_guest: !currentOrder.user_id
                },
                shipping_address: currentOrder.shipping_address || null,
                order_items: currentOrder.order_items || [],
                shipping_cost: currentOrder.shipping_cost || 0
              }
            }
          })
        });

        const webhookResult = await webhookResponse.json();
        console.log('Webhook triggered:', webhookResult);
        
        if (webhookResult.triggered > 0) {
          toast.success(`Order status updated and ${webhookResult.triggered} webhook(s) triggered`);
        } else {
          toast.success('Order status updated successfully');
        }
      } catch (webhookError) {
        console.error('Error triggering webhook:', webhookError);
        toast.success('Order status updated (webhook failed)');
      }
      
      // Refresh orders list
      loadOrders();
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error('Failed to update order status. Please try again.');
    }
  };

  const fixOrdersConstraints = async () => {
    setIsFixingOrders(true);
    try {
      const response = await fetch('/api/admin/fix-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      
      if (result.success) {
        alert(`Successfully fixed ${result.fixed} orders!`);
        loadOrders(); // Refresh the orders list
      } else {
        alert('Failed to fix orders: ' + result.error);
      }
    } catch (error) {
      console.error('Error fixing orders:', error);
      alert('Failed to fix orders. Please try again.');
    } finally {
      setIsFixingOrders(false);
    }
  };

  const handleProductClick = async (productId: string) => {
    try {
      // Fetch full product details from the database
      const { data: product, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();

      if (error) {
        console.error('Error fetching product:', error);
        alert('Failed to load product details');
        return;
      }

      if (product) {
        // Transform the data to match the ProductModal interface
        const modalProduct = {
          ...product,
          sizes: product.sizes || []
        };
        
        setSelectedProductForModal(modalProduct);
        setIsProductModalOpen(true);
      }
    } catch (error) {
      console.error('Error fetching product:', error);
      alert('Failed to load product details');
    }
  };

  const toggleOrderExpansion = (orderId: string) => {
    const newExpanded = new Set(expandedOrders);
    if (newExpanded.has(orderId)) {
      newExpanded.delete(orderId);
    } else {
      newExpanded.add(orderId);
    }
    setExpandedOrders(newExpanded);
  };

  const toggleGroupCollapse = (status: string) => {
    setCollapsedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(status)) {
        newSet.delete(status);
      } else {
        newSet.add(status);
      }
      return newSet;
    });
  };

  const groupOrdersByStatus = (orders: Order[]) => {
    const grouped = orders.reduce((acc, order) => {
      const status = order.status;
      if (!acc[status]) {
        acc[status] = [];
      }
      acc[status].push(order);
      return acc;
    }, {} as Record<string, Order[]>);

    // Sort groups by status priority
    const statusOrder = ['pending', 'processing', 'shipped', 'completed', 'cancelled'];
    const sortedGroups: Record<string, Order[]> = {};
    
    statusOrder.forEach(status => {
      if (grouped[status]) {
        sortedGroups[status] = grouped[status];
      }
    });

    // Add any other statuses not in the predefined order
    Object.keys(grouped).forEach(status => {
      if (!statusOrder.includes(status)) {
        sortedGroups[status] = grouped[status];
      }
    });

    return sortedGroups;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'processing': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'shipped': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPaymentColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800 border-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'failed': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    const matchesPayment = paymentFilter === 'all' || order.payment_status === paymentFilter;
    const matchesSearch = searchTerm === '' || 
      order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.guest_email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesStatus && matchesPayment && matchesSearch;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-50 w-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-50 w-full overflow-auto">
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-3">
                <div className="p-2 bg-yellow-500 rounded-lg">
                  <Package className="w-5 h-5 sm:w-6 sm:h-6 text-black" />
                </div>
                <span className="hidden sm:inline">Orders Management</span>
                <span className="sm:hidden">Orders</span>
              </h1>
              <p className="text-sm sm:text-base text-gray-600 mt-2">Manage and track customer orders</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <Button 
                onClick={loadOrders}
                className="bg-yellow-500 hover:bg-yellow-600 text-black text-xs sm:text-sm"
                size="sm"
              >
                <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Refresh</span>
                <span className="sm:hidden">Refresh</span>
              </Button>
              <Button 
                onClick={fixOrdersConstraints}
                disabled={isFixingOrders}
                variant="outline" 
                className="border-red-200 hover:bg-red-50 text-red-600 text-xs sm:text-sm"
                size="sm"
              >
                {isFixingOrders ? (
                  <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-red-600 mr-1 sm:mr-2" />
                ) : (
                  <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                )}
                <span className="hidden sm:inline">Fix DB Issues</span>
                <span className="sm:hidden">Fix DB</span>
              </Button>
              <Button variant="outline" className="border-yellow-200 hover:bg-yellow-50 text-xs sm:text-sm" size="sm">
                <Download className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Export</span>
                <span className="sm:hidden">Export</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-yellow-100 p-4 sm:p-6 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="sm:col-span-2 lg:col-span-1">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Search Orders</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3 sm:w-4 sm:h-4" />
                <input
                  type="text"
                  placeholder="Order number or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 sm:pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="shipped">Shipped</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Payment</label>
              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              >
                <option value="all">All Payments</option>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>
            </div>
            
            <div className="flex flex-col sm:flex-row sm:items-end gap-3">
              <Button
                variant={groupByStatus ? "default" : "outline"}
                size="sm"
                onClick={() => setGroupByStatus(!groupByStatus)}
                className={groupByStatus ? "bg-yellow-500 hover:bg-yellow-600 text-black" : "border-yellow-200 hover:bg-yellow-50"}
              >
                {groupByStatus ? <LayoutGrid className="w-4 h-4 mr-2" /> : <List className="w-4 h-4 mr-2" />}
                {groupByStatus ? "Grouped" : "Group by Status"}
              </Button>
              <div className="text-sm text-gray-600 bg-yellow-50 px-3 py-2 rounded-lg border border-yellow-200">
                <span className="font-medium">{filteredOrders.length}</span> orders found
              </div>
            </div>
          </div>
        </div>

        {/* Orders Display */}
        {groupByStatus ? (
          /* Grouped View */
          <div className="space-y-6">
            {Object.entries(groupOrdersByStatus(filteredOrders)).map(([status, orders]) => (
              <div key={status} className="bg-white rounded-xl shadow-sm border border-yellow-100 overflow-hidden">
                {/* Status Group Header */}
                <div 
                  className="bg-gradient-to-r from-yellow-500 to-orange-500 text-black px-6 py-4 cursor-pointer flex items-center justify-between"
                  onClick={() => toggleGroupCollapse(status)}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0">
                      {collapsedGroups.has(status) ? (
                        <ChevronDown className="w-5 h-5" />
                      ) : (
                        <ChevronUp className="w-5 h-5" />
                      )}
                    </div>
                    <h3 className="text-lg font-semibold capitalize">{status} Orders</h3>
                    <Badge className="bg-black/20 text-black border-black/20">
                      {orders.length}
                    </Badge>
                  </div>
                  <div className="text-sm font-medium">
                    Total: ₦{orders.reduce((sum, order) => sum + order.total_amount, 0).toLocaleString()}
                  </div>
                </div>

                {/* Orders in this status group */}
                {!collapsedGroups.has(status) && (
                  <>
                    {/* Desktop Table View */}
                    <div className="hidden lg:block overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {orders.map((order) => (
                            <React.Fragment key={order.id}>
                              <tr 
                                className="hover:bg-yellow-50 transition-colors cursor-pointer"
                                onClick={() => toggleOrderExpansion(order.id)}
                              >
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-3">
                                    <div className="flex-shrink-0">
                                      {expandedOrders.has(order.id) ? (
                                        <ChevronUp className="w-4 h-4 text-gray-400" />
                                      ) : (
                                        <ChevronDown className="w-4 h-4 text-gray-400" />
                                      )}
                                    </div>
                                    <div>
                                      <div className="font-medium text-gray-900">#{order.order_number}</div>
                                      <div className="text-sm text-gray-500">{order.order_items.length} items</div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="text-sm text-gray-900">{order.guest_email || 'Guest Customer'}</div>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="text-sm text-gray-900">
                                    {new Date(order.created_at).toLocaleDateString()}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {new Date(order.created_at).toLocaleTimeString()}
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <Badge className={`${getPaymentColor(order.payment_status)} border`}>
                                    {order.payment_status}
                                  </Badge>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="font-medium text-gray-900">₦{order.total_amount.toLocaleString()}</div>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-2">
                                    <select
                                      value={order.status}
                                      onChange={(e) => {
                                        e.stopPropagation();
                                        handleStatusChangeRequest(order.id, e.target.value, order.status);
                                      }}
                                      className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(order.status)} cursor-pointer`}
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <option value="pending">Pending</option>
                                      <option value="processing">Processing</option>
                                      <option value="shipped">Shipped</option>
                                      <option value="completed">Completed</option>
                                      <option value="cancelled">Cancelled</option>
                                    </select>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedOrder(order);
                                      }}
                                      className="hover:bg-yellow-100"
                                    >
                                      <Eye className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                              
                              {/* Expanded Order Details for Desktop */}
                              {expandedOrders.has(order.id) && (
                                <tr>
                                  <td colSpan={6} className="px-6 py-4 bg-gray-50">
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                      {/* Shipping Address */}
                                      <div className="bg-white rounded-lg p-4 border border-gray-200">
                                        <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                          <MapPin className="w-4 h-4 text-yellow-500" />
                                          Shipping Address
                                        </h4>
                                        {order.shipping_address ? (
                                          <div className="space-y-1 text-sm text-gray-600">
                                            <div className="font-medium">{order.shipping_address.full_name}</div>
                                            <div>{order.shipping_address.address_line_1}</div>
                                            {order.shipping_address.address_line_2 && (
                                              <div>{order.shipping_address.address_line_2}</div>
                                            )}
                                            <div>
                                              {order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.postal_code}
                                            </div>
                                            <div>{order.shipping_address.country}</div>
                                            {order.shipping_address.phone && (
                                              <div className="flex items-center gap-1 mt-2">
                                                <Phone className="w-3 h-3" />
                                                {order.shipping_address.phone}
                                              </div>
                                            )}
                                          </div>
                                        ) : (
                                          <div className="text-sm text-gray-500">No shipping address</div>
                                        )}
                                      </div>

                                      {/* Order Items */}
                                      <div className="bg-white rounded-lg p-4 border border-gray-200">
                                        <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                          <Package className="w-4 h-4 text-yellow-500" />
                                          Order Items
                                        </h4>
                                        <div className="space-y-3">
                                          {order.order_items.map((item) => (
                                            <div 
                                              key={item.id} 
                                              className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                                              onClick={() => handleProductClick(item.products.id)}
                                              title="Click to view product details"
                                            >
                                              <div className="w-12 h-12 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                                                {item.products.thumbnail_url ? (
                                                  <Image
                                                    src={item.products.thumbnail_url}
                                                    alt={item.products.name}
                                                    width={48}
                                                    height={48}
                                                    className="w-full h-full object-cover"
                                                  />
                                                ) : (
                                                  <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                                                    <Package className="w-4 h-4 text-gray-400" />
                                                  </div>
                                                )}
                                              </div>
                                              <div className="flex-1 min-w-0">
                                                <div className="text-sm font-medium text-gray-900 truncate hover:text-yellow-600">
                                                  {item.products.name}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                  Qty: {item.quantity} {item.size && `• Size: ${item.size}`}
                                                </div>
                                              </div>
                                              <div className="text-sm font-medium text-gray-900">
                                                ₦{item.total_price.toLocaleString()}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Card View */}
                    <div className="lg:hidden space-y-3 p-4">
                      {orders.map((order) => (
                        <div key={order.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                          <div 
                            className="cursor-pointer"
                            onClick={() => toggleOrderExpansion(order.id)}
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <div className="flex-shrink-0">
                                  {expandedOrders.has(order.id) ? (
                                    <ChevronUp className="w-4 h-4 text-gray-400" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4 text-gray-400" />
                                  )}
                                </div>
                                <div>
                                  <div className="font-medium text-gray-900 text-sm">#{order.order_number}</div>
                                  <div className="text-xs text-gray-500">{order.order_items.length} items</div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-medium text-gray-900 text-sm">₦{order.total_amount.toLocaleString()}</div>
                                <Badge className={`${getPaymentColor(order.payment_status)} border text-xs`}>
                                  {order.payment_status}
                                </Badge>
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                              <div>{order.guest_email || 'Guest Customer'}</div>
                              <div>{new Date(order.created_at).toLocaleDateString()}</div>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between gap-2">
                            <select
                              value={order.status}
                              onChange={(e) => {
                                e.stopPropagation();
                                handleStatusChangeRequest(order.id, e.target.value, order.status);
                              }}
                              className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(order.status)} cursor-pointer flex-1`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <option value="pending">Pending</option>
                              <option value="processing">Processing</option>
                              <option value="shipped">Shipped</option>
                              <option value="completed">Completed</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedOrder(order);
                              }}
                              className="hover:bg-yellow-100 h-7 w-7 p-0"
                            >
                              <Eye className="w-3 h-3" />
                            </Button>
                          </div>
                          
                          {/* Expanded Order Details for Mobile */}
                          {expandedOrders.has(order.id) && (
                            <div className="mt-4 pt-4 border-t border-gray-200 space-y-4">
                              {/* Shipping Address */}
                              <div className="bg-gray-50 rounded-lg p-3">
                                <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2 text-sm">
                                  <MapPin className="w-3 h-3 text-yellow-500" />
                                  Shipping Address
                                </h4>
                                {order.shipping_address ? (
                                  <div className="space-y-1 text-xs text-gray-600">
                                    <div className="font-medium">{order.shipping_address.full_name}</div>
                                    <div>{order.shipping_address.address_line_1}</div>
                                    {order.shipping_address.address_line_2 && (
                                      <div>{order.shipping_address.address_line_2}</div>
                                    )}
                                    <div>
                                      {order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.postal_code}
                                    </div>
                                    <div>{order.shipping_address.country}</div>
                                    {order.shipping_address.phone && (
                                      <div className="flex items-center gap-1 mt-1">
                                        <Phone className="w-2 h-2" />
                                        {order.shipping_address.phone}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="text-xs text-gray-500">No shipping address</div>
                                )}
                              </div>

                              {/* Order Items */}
                              <div className="bg-gray-50 rounded-lg p-3">
                                <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2 text-sm">
                                  <Package className="w-3 h-3 text-yellow-500" />
                                  Order Items
                                </h4>
                                <div className="space-y-2">
                                  {order.order_items.map((item) => (
                                    <div 
                                      key={item.id} 
                                      className="flex items-center gap-2 p-2 bg-white rounded cursor-pointer hover:bg-gray-100 transition-colors"
                                      onClick={() => handleProductClick(item.products.id)}
                                      title="Click to view product details"
                                    >
                                      <div className="w-8 h-8 bg-gray-200 rounded overflow-hidden flex-shrink-0">
                                        {item.products.thumbnail_url ? (
                                          <Image
                                            src={item.products.thumbnail_url}
                                            alt={item.products.name}
                                            width={32}
                                            height={32}
                                            className="w-full h-full object-cover"
                                          />
                                        ) : (
                                          <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                                            <Package className="w-2 h-2 text-gray-400" />
                                          </div>
                                        )}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="text-xs font-medium text-gray-900 truncate hover:text-yellow-600">
                                          {item.products.name}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                          Qty: {item.quantity} {item.size && `• Size: ${item.size}`}
                                        </div>
                                      </div>
                                      <div className="text-xs font-medium text-gray-900">
                                        ₦{item.total_price.toLocaleString()}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ))}
            
            {filteredOrders.length === 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-yellow-100 p-12 text-center">
                <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
                <p className="text-gray-500">Try adjusting your filters or search terms.</p>
              </div>
            )}
          </div>
        ) : (
          /* Regular Table View */
          <div className="bg-white rounded-xl shadow-sm border border-yellow-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-yellow-500 to-orange-500 text-black">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Order</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Customer</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Date</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Status</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Payment</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Total</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredOrders.map((order) => (
                    <React.Fragment key={order.id}>
                      <tr 
                        className="hover:bg-yellow-50 transition-colors cursor-pointer"
                        onClick={() => toggleOrderExpansion(order.id)}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex-shrink-0">
                              {expandedOrders.has(order.id) ? (
                                <ChevronUp className="w-4 h-4 text-gray-400" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-gray-400" />
                              )}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">#{order.order_number}</div>
                              <div className="text-sm text-gray-500">{order.order_items.length} items</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">{order.guest_email || 'Guest Customer'}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">
                            {new Date(order.created_at).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(order.created_at).toLocaleTimeString()}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <select
                            value={order.status}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleStatusChangeRequest(order.id, e.target.value, order.status);
                            }}
                            className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(order.status)} cursor-pointer`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <option value="pending">Pending</option>
                            <option value="processing">Processing</option>
                            <option value="shipped">Shipped</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </td>
                        <td className="px-6 py-4">
                          <Badge className={`${getPaymentColor(order.payment_status)} border`}>
                            {order.payment_status}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900">₦{order.total_amount.toLocaleString()}</div>
                        </td>
                        <td className="px-6 py-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedOrder(order);
                            }}
                            className="hover:bg-yellow-100"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                      
                      {/* Expanded Order Details */}
                      {expandedOrders.has(order.id) && (
                        <tr>
                          <td colSpan={7} className="px-6 py-4 bg-gray-50">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                              {/* Shipping Address */}
                              <div className="bg-white rounded-lg p-4 border border-gray-200">
                                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                  <MapPin className="w-4 h-4 text-yellow-500" />
                                  Shipping Address
                                </h4>
                                {order.shipping_address ? (
                                  <div className="space-y-1 text-sm text-gray-600">
                                    <div className="font-medium">{order.shipping_address.full_name}</div>
                                    <div>{order.shipping_address.address_line_1}</div>
                                    {order.shipping_address.address_line_2 && (
                                      <div>{order.shipping_address.address_line_2}</div>
                                    )}
                                    <div>
                                      {order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.postal_code}
                                    </div>
                                    <div>{order.shipping_address.country}</div>
                                    {order.shipping_address.phone && (
                                      <div className="flex items-center gap-1 mt-2">
                                        <Phone className="w-3 h-3" />
                                        {order.shipping_address.phone}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="text-sm text-gray-500">No shipping address</div>
                                )}
                              </div>

                              {/* Order Items */}
                              <div className="bg-white rounded-lg p-4 border border-gray-200">
                                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                  <Package className="w-4 h-4 text-yellow-500" />
                                  Order Items
                                </h4>
                                <div className="space-y-3">
                                  {order.order_items.map((item) => (
                                    <div 
                                      key={item.id} 
                                      className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                                      onClick={() => handleProductClick(item.products.id)}
                                      title="Click to view product details"
                                    >
                                      <div className="w-12 h-12 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                                        {item.products.thumbnail_url ? (
                                          <Image
                                            src={item.products.thumbnail_url}
                                            alt={item.products.name}
                                            width={48}
                                            height={48}
                                            className="w-full h-full object-cover"
                                          />
                                        ) : (
                                          <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                                            <Package className="w-4 h-4 text-gray-400" />
                                          </div>
                                        )}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium text-gray-900 truncate hover:text-yellow-600">
                                          {item.products.name}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                          Qty: {item.quantity} {item.size && `• Size: ${item.size}`}
                                        </div>
                                      </div>
                                      <div className="text-sm font-medium text-gray-900">
                                        ₦{item.total_price.toLocaleString()}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
            
            {filteredOrders.length === 0 && (
              <div className="text-center py-12">
                <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
                <p className="text-gray-500">Try adjusting your filters or search terms.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Status Change Confirmation Dialog */}
      {pendingStatusChange && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Confirm Status Change
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to change the order status from{' '}
              <span className="font-medium text-gray-900">
                {pendingStatusChange.currentStatus}
              </span>{' '}
              to{' '}
              <span className="font-medium text-gray-900">
                {pendingStatusChange.newStatus}
              </span>
              ?
            </p>
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={cancelStatusChange}
                className="flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Cancel
              </Button>
              <Button
                onClick={confirmStatusChange}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
              >
                <Check className="w-4 h-4" />
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Product Modal */}
      <ProductModal
        product={selectedProductForModal}
        isOpen={isProductModalOpen}
        onClose={() => {
          setIsProductModalOpen(false);
          setSelectedProductForModal(null);
        }}
      />
    </div>
  );
}