// runSeed.js — One-time script to create all default users in MongoDB
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const mongoose = require('mongoose');
const connectDB = require('../config/db');

const createAdmin   = require('./createAdmin');
const createHr      = require('./createHr');
const createManager = require('./createManager');

async function run() {
  console.log('\n🔧 Connecting to MongoDB...');
  await connectDB();
  console.log('✅ Connected!\n');

  console.log('👤 Creating Admin user...');
  const admin = await createAdmin();
  console.log(`   ✅ Admin: ${admin.email}`);

  console.log('👤 Creating HR Manager user...');
  const hr = await createHr();
  console.log(`   ✅ HR: ${hr.email}`);

  console.log('👤 Creating Project Manager user...');
  const mgr = await createManager();
  console.log(`   ✅ Manager: ${mgr.email}`);

  console.log('\n🎉 All seed users created!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  LOGIN CREDENTIALS:');
  console.log('  ─────────────────────────────────────────');
  console.log(`  ADMIN    → ${process.env.ADMIN_EMAIL || 'admin@jmkc.com'}`);
  console.log(`             Password: ${process.env.ADMIN_PASSWORD || 'AdminPassword123'}`);
  console.log('');
  console.log(`  HR       → ${process.env.HR_EMAIL || 'hr@enterprise.local'}`);
  console.log(`             Password: ${process.env.HR_PASSWORD || 'Hr@12345'}`);
  console.log('');
  console.log(`  MANAGER  → ${process.env.MANAGER_EMAIL || 'manager@enterprise.local'}`);
  console.log(`             Password: ${process.env.MANAGER_PASSWORD || 'Manager@123'}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  await mongoose.disconnect();
  process.exit(0);
}

run().catch(err => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});
