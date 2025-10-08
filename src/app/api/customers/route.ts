import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Get query parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search') || '';
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const tier = searchParams.get('tier') || '';
    
    // Calculate offset for pagination
    const offset = (page - 1) * limit;
    
    // Build the base query
    let query = supabase
      .from('profiles')
      .select(`
        id,
        email,
        first_name,
        last_name,
        phone,
        created_at,
        last_sign_in_at,
        addresses (
          id,
          type,
          address_line_1,
          address_line_2,
          city,
          state,
          postal_code,
          country,
          is_default
        )
      `, { count: 'exact' });

    // Apply search filter
    if (search) {
      query = query.or(`email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    // Apply sorting
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: customers, error, count } = await query;

    if (error) {
      console.error('Error fetching customers:', error);
      return NextResponse.json(
        { error: 'Failed to fetch customers' },
        { status: 500 }
      );
    }

    // Get order statistics for each customer
    const customersWithStats = await Promise.all(
      (customers || []).map(async (customer) => {
        try {
          // Get order statistics
          const { data: orderStats, error: orderError } = await supabase
            .from('orders')
            .select('total_amount, status, created_at')
            .eq('user_id', customer.id);

          if (orderError) {
            console.error('Error fetching order stats for customer:', customer.id, orderError);
            return {
              ...customer,
              orders_count: 0,
              total_spent: 0,
              last_order_date: null,
              tier: 'Bronze'
            };
          }

          const ordersCount = orderStats?.length || 0;
          const totalSpent = orderStats?.reduce((sum, order) => sum + order.total_amount, 0) || 0;
          const lastOrderDate = orderStats?.length > 0 
            ? orderStats.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0].created_at
            : null;

          // Determine customer tier based on total spent
          let customerTier = 'Bronze';
          if (totalSpent >= 500000) customerTier = 'VIP';
          else if (totalSpent >= 200000) customerTier = 'Gold';
          else if (totalSpent >= 50000) customerTier = 'Silver';

          return {
            ...customer,
            orders_count: ordersCount,
            total_spent: totalSpent,
            last_order_date: lastOrderDate,
            tier: customerTier
          };
        } catch (error) {
          console.error('Error processing customer stats:', error);
          return {
            ...customer,
            orders_count: 0,
            total_spent: 0,
            last_order_date: null,
            tier: 'Bronze'
          };
        }
      })
    );

    // Apply tier filter if specified
    let filteredCustomers = customersWithStats;
    if (tier && tier !== 'all') {
      filteredCustomers = customersWithStats.filter(customer => customer.tier === tier);
    }

    // Calculate pagination info
    const totalPages = Math.ceil((count || 0) / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    // Calculate summary statistics
    const totalCustomers = count || 0;
    const totalRevenue = customersWithStats.reduce((sum, customer) => sum + customer.total_spent, 0);
    const averageOrderValue = customersWithStats.length > 0 
      ? customersWithStats.reduce((sum, customer) => sum + customer.orders_count, 0) / customersWithStats.length
      : 0;

    // Get new customers this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count: newThisMonth } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startOfMonth.toISOString());

    return NextResponse.json({
      success: true,
      data: {
        customers: filteredCustomers,
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages,
          hasNextPage,
          hasPrevPage
        },
        stats: {
          totalCustomers,
          newThisMonth: newThisMonth || 0,
          totalRevenue,
          averageOrderValue
        }
      }
    });

  } catch (error) {
    console.error('Unexpected error in customers API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, first_name, last_name, phone } = body;

    // Validate required fields
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Check if customer already exists
    const { data: existingCustomer } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single();

    if (existingCustomer) {
      return NextResponse.json(
        { error: 'Customer with this email already exists' },
        { status: 409 }
      );
    }

    // Create new customer profile
    const { data: newCustomer, error } = await supabase
      .from('profiles')
      .insert({
        email,
        first_name,
        last_name,
        phone
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating customer:', error);
      return NextResponse.json(
        { error: 'Failed to create customer' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        customer: {
          ...newCustomer,
          orders_count: 0,
          total_spent: 0,
          tier: 'Bronze'
        }
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Unexpected error in customer creation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Get specific customer by ID
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('id');
    
    if (!customerId) {
      return NextResponse.json(
        { error: 'Customer ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { first_name, last_name, phone } = body;

    // Update customer profile
    const { data: updatedCustomer, error } = await supabase
      .from('profiles')
      .update({
        first_name,
        last_name,
        phone
      })
      .eq('id', customerId)
      .select()
      .single();

    if (error) {
      console.error('Error updating customer:', error);
      return NextResponse.json(
        { error: 'Failed to update customer' },
        { status: 500 }
      );
    }

    if (!updatedCustomer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { customer: updatedCustomer }
    });

  } catch (error) {
    console.error('Unexpected error in customer update:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}