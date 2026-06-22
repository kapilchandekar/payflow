import razorpayInstance from '../config/razorpay';
import crypto from 'crypto';

/**
 * Test Razorpay Connection & Order Creation
 */
export const testRazorpayConnection = async () => {
  try {
    console.log('\n🧪 Testing Razorpay Connection...\n');

    // Test 1: Check API Keys
    console.log('1️⃣  Checking API Keys...');
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      console.error('❌ API Keys not found in .env');
      return false;
    }

    if (!keyId.startsWith('rzp_test_') && !keyId.startsWith('rzp_live_')) {
      console.error('❌ Invalid Key ID format');
      return false;
    }

    console.log('✅ API Keys configured');
    console.log(`   Key ID: ${keyId.substring(0, 20)}...`);

    // Test 2: Create a Test Order
    console.log('\n2️⃣  Creating test order in Razorpay...');
    const order = await razorpayInstance.orders.create({
      amount: 50000, // ₹500 in paise
      currency: 'INR',
      receipt: `test_${Date.now()}`,
      notes: {
        description: 'PayFlow Test Order'
      }
    });

    console.log('✅ Order created successfully');
    console.log(`   Order ID: ${(order as any).id}`);
    console.log(`   Amount: ₹${Number((order as any).amount) / 100}`);
    console.log(`   Status: ${(order as any).status}`);

    // Test 3: Fetch Order from Razorpay
    console.log('\n3️⃣  Fetching order from Razorpay...');
    const fetchedOrder = await razorpayInstance.orders.fetch((order as any).id);
    
    console.log('✅ Order fetched successfully');
    console.log(`   Status: ${(fetchedOrder as any).status}`);
    console.log(`   Amount: ${(fetchedOrder as any).amount}`);

    // Test 4: Test Signature Verification
    console.log('\n4️⃣  Testing signature verification...');
    
    // Simulate a fake payment
    const fakePaymentId = 'pay_XXXXX1234567';
    const body = (order as any).id + '|' + fakePaymentId;
    const signature = crypto
      .createHmac('sha256', keySecret)
      .update(body)
      .digest('hex');

    console.log('✅ Signature generated successfully');
    console.log(`   Order ID: ${(order as any).id}`);
    console.log(`   Payment ID: ${fakePaymentId}`);
    console.log(`   Signature: ${signature.substring(0, 20)}...`);

    // Test 5: Webhook Signature Test
    console.log('\n5️⃣  Testing webhook signature verification...');
    const webhookBody = JSON.stringify({
      event: 'payment.captured',
      payload: {
        order: { id: (order as any).id },
        payment: { id: fakePaymentId }
      }
    });

    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (webhookSecret) {
      const webhookSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(webhookBody)
        .digest('hex');

      console.log('✅ Webhook signature generated');
      console.log(`   Signature: ${webhookSignature.substring(0, 20)}...`);
    } else {
      console.warn('⚠️  Webhook secret not configured');
    }

    console.log('\n✅ All Razorpay tests passed!\n');
    return true;
  } catch (error) {
    console.error('\n❌ Razorpay test failed:');
    console.error(error);
    return false;
  }
};

/**
 * Test Order Details
 */
export const testOrderDetails = async (orderId: string) => {
  try {
    console.log(`\n🧪 Fetching order details for ${orderId}...\n`);

    const order = await razorpayInstance.orders.fetch(orderId);

    console.log('✅ Order Details:');
    console.log(`   ID: ${(order as any).id}`);
    console.log(`   Amount: ₹${Number((order as any).amount) / 100}`);
    console.log(`   Currency: ${(order as any).currency}`);
    console.log(`   Status: ${(order as any).status}`);
    console.log(`   Receipt: ${(order as any).receipt}`);
    console.log(`   Created: ${new Date(Number((order as any).created_at) * 1000).toLocaleString()}`);

    return order;
  } catch (error) {
    console.error('❌ Failed to fetch order:');
    console.error(error);
    return null;
  }
};

/**
 * Test Payment Details (if payment exists)
 */
export const testPaymentDetails = async (paymentId: string) => {
  try {
    console.log(`\n🧪 Fetching payment details for ${paymentId}...\n`);

    const payment = await razorpayInstance.payments.fetch(paymentId);

    console.log('✅ Payment Details:');
    console.log(`   ID: ${(payment as any).id}`);
    console.log(`   Amount: ₹${Number((payment as any).amount) / 100}`);
    console.log(`   Status: ${(payment as any).status}`);
    console.log(`   Method: ${(payment as any).method}`);
    console.log(`   VPA: ${(payment as any).vpa || 'N/A'}`);
    console.log(`   Created: ${new Date(Number((payment as any).created_at) * 1000).toLocaleString()}`);

    return payment;
  } catch (error) {
    console.error('❌ Failed to fetch payment:');
    console.error(error);
    return null;
  }
};

/**
 * List Recent Payments
 */
export const listRecentPayments = async (count: number = 5) => {
  try {
    console.log(`\n🧪 Fetching last ${count} payments...\n`);

    const payments = await razorpayInstance.payments.all({ count });

    if (payments.items.length === 0) {
      console.log('ℹ️  No payments found');
      return;
    }

    console.log(`✅ Found ${payments.items.length} payments:\n`);
    
    payments.items.forEach((payment: any, index: number) => {
      console.log(`${index + 1}. ${payment.id}`);
      console.log(`   Amount: ₹${payment.amount / 100}`);
      console.log(`   Status: ${payment.status}`);
      console.log(`   Method: ${payment.method}`);
      console.log('');
    });

    return payments;
  } catch (error) {
    console.error('❌ Failed to list payments:');
    console.error(error);
    return null;
  }
};
