// Load environment variables FIRST
import dotenv from 'dotenv';
dotenv.config();

import {
  testRazorpayConnection,
  testOrderDetails,
  testPaymentDetails,
  listRecentPayments
} from './razorpay.test';

async function runTests() {
  console.log('╔════════════════════════════════════╗');
  console.log('║   PayFlow Razorpay Test Suite      ║');
  console.log('╚════════════════════════════════════╝');

  // Check if keys exist
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    console.error('\n❌ Error: Razorpay keys not found in .env');
    console.error('\nPlease add to .env:');
    console.error('RAZORPAY_KEY_ID=rzp_test_XXXXX');
    console.error('RAZORPAY_KEY_SECRET=XXXXX');
    process.exit(1);
  }

  // Test 1: Connection test
  const connectionOk = await testRazorpayConnection();

  if (!connectionOk) {
    console.error('\n❌ Connection test failed. Please check your credentials.');
    process.exit(1);
  }

  // Test 2: List recent payments
  await listRecentPayments(3);

  console.log('\n✅ All tests completed successfully!');
  console.log('\n📝 Next steps:');
  console.log('   1. Go to Razorpay Dashboard: https://dashboard.razorpay.com');
  console.log('   2. Check "Orders" section for test orders');
  console.log('   3. Test payment via /api/upi/create-order endpoint');
}

runTests().catch(error => {
  console.error('Test error:', error);
  process.exit(1);
});
