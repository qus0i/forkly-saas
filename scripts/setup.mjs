// Setup script: Run migration & create system admin
// Usage: node scripts/setup.mjs

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = 'https://wxncpusciogjrrocvdpm.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bmNwdXNjaW9nanJyb2N2ZHBtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjkzMjE3NiwiZXhwIjoyMDg4NTA4MTc2fQ.mUI-S0b0-d1Jfa5vRREYvsGvcdmh8Wdc6XxbEvI1_ms';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function runMigration() {
  console.log('🔄 Running migration SQL...');
  const sql = readFileSync(resolve(__dirname, '..', 'supabase', 'migration.sql'), 'utf8');
  
  // Split by statements and run each
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  for (const stmt of statements) {
    try {
      const { error } = await supabase.rpc('exec_sql', { query: stmt + ';' });
      if (error) {
        // Try using the REST API directly
        console.log('  ⚠ RPC not available, using direct query...');
        break;
      }
    } catch {
      break;
    }
  }
  
  console.log('  ℹ️  Migration SQL must be run via Supabase SQL Editor');
  console.log('  📄 File: supabase/migration.sql');
  console.log('  🔗 URL: https://supabase.com/dashboard/project/wxncpusciogirrocvdpm/sql/new');
}

async function createSystemAdmin() {
  console.log('\n🔐 Creating system admin user...');
  
  const adminEmail = 'admin@forkly.cloud';
  const adminPassword = 'Forkly@2026!';
  
  // Check if already exists
  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const existing = existingUsers?.users?.find(u => u.email === adminEmail);
  
  if (existing) {
    console.log('  ⚠ Admin user already exists:', adminEmail);
    
    // Ensure profile exists
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', existing.id)
      .single();
    
    if (!profile) {
      const { error } = await supabase.from('profiles').insert({
        id: existing.id,
        email: adminEmail,
        full_name: 'System Administrator',
        full_name_ar: 'مدير النظام',
        role: 'system_admin',
        is_active: true,
      });
      if (error) console.log('  ❌ Profile creation error:', error.message);
      else console.log('  ✅ Profile created for existing user');
    } else {
      console.log('  ✅ Profile already exists');
    }
    return;
  }
  
  // Create auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: adminEmail,
    password: adminPassword,
    email_confirm: true,
  });

  if (authError) {
    console.log('  ❌ Auth error:', authError.message);
    return;
  }

  console.log('  ✅ Auth user created:', authData.user.id);

  // Create profile
  const { error: profileError } = await supabase.from('profiles').insert({
    id: authData.user.id,
    email: adminEmail,
    full_name: 'System Administrator',
    full_name_ar: 'مدير النظام',
    role: 'system_admin',
    is_active: true,
  });

  if (profileError) {
    console.log('  ❌ Profile error:', profileError.message);
    return;
  }

  console.log('  ✅ Profile created');
  console.log('\n📋 Admin Credentials:');
  console.log('   Email:    ', adminEmail);
  console.log('   Password: ', adminPassword);
}

async function main() {
  console.log('🚀 Forkly SaaS Setup\n');
  
  // Test connection
  const { error } = await supabase.from('tenants').select('count').limit(1);
  if (error && error.message.includes('does not exist')) {
    console.log('⚠ Tables not created yet. Please run migration first.');
    await runMigration();
    console.log('\n⚠ After running migration SQL in Supabase SQL Editor, re-run this script.');
    return;
  }
  
  await createSystemAdmin();
  
  console.log('\n✅ Setup complete!');
  console.log('🌐 Run: npm run dev');
  console.log('🔑 Login at: http://localhost:3000/login');
}

main().catch(console.error);
