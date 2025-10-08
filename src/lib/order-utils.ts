import { supabase } from './supabase';

export async function generateUniqueOrderNumber(maxRetries: number = 10): Promise<string> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Generate order number in format: KI-DDMM-XXX
      const now = new Date();
      const day = now.getDate().toString().padStart(2, '0');
      const month = (now.getMonth() + 1).toString().padStart(2, '0');
      const dateStr = `${day}${month}`; // DDMM format
      
      // Get the highest counter for today's date
      const { data: existingOrders, error } = await supabase
        .from('orders')
        .select('order_number')
        .like('order_number', `KI-${dateStr}-%`)
        .order('order_number', { ascending: false })
        .limit(1);

      if (error) {
        throw error;
      }

      let counter = 1;
      if (existingOrders && existingOrders.length > 0) {
        const lastOrderNumber = existingOrders[0].order_number;
        const lastCounterMatch = lastOrderNumber.match(/KI-\d{4}-(\d{3})/);
        if (lastCounterMatch) {
          counter = parseInt(lastCounterMatch[1], 10) + 1;
        }
      }

      const orderNumber = `KI-${dateStr}-${counter.toString().padStart(3, '0')}`;

      // Check if this order number already exists (to handle race conditions)
      const { data: duplicate, error: checkError } = await supabase
        .from('orders')
        .select('id')
        .eq('order_number', orderNumber)
        .limit(1);

      if (checkError) {
        throw checkError;
      }

      if (!duplicate || duplicate.length === 0) {
        return orderNumber;
      }

      // If there's a race condition, try again with a small delay
      console.log(`Order number ${orderNumber} already exists, retrying... (attempt ${attempt})`);
      await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));
      
    } catch (error) {
      console.error(`Error generating order number (attempt ${attempt}):`, error);
      if (attempt === maxRetries) {
        throw new Error(`Failed to generate unique order number after ${maxRetries} attempts`);
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, Math.random() * 200 + 100));
    }
  }

  throw new Error(`Failed to generate unique order number after ${maxRetries} attempts`);
}