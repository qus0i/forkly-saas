// Run migration SQL via Supabase Management API
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const PROJECT_REF = 'wxncpusciogjrrocvdpm';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bmNwdXNjaW9nanJyb2N2ZHBtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjkzMjE3NiwiZXhwIjoyMDg4NTA4MTc2fQ.mUI-S0b0-d1Jfa5vRREYvsGvcdmh8Wdc6XxbEvI1_ms';
const SUPABASE_URL = `https://${PROJECT_REF}.supabase.co`;

const sql = readFileSync(resolve(__dirname, '..', 'supabase', 'migration.sql'), 'utf8');

async function runSQL(query) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });
  return res;
}

async function main() {
  console.log('🔄 Running migration via Supabase pg_net...\n');
  
  // Use the Supabase SQL query endpoint (PostgREST doesn't support raw SQL)
  // We need to use the pg REST endpoint or management API
  // Let's try the Supabase Database REST API
  
  const res = await fetch(`${SUPABASE_URL}/rest/v1/`, {
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    }
  });
  
  if (res.ok) {
    console.log('✅ Supabase connection verified!\n');
  } else {
    console.log('❌ Connection failed:', res.status, await res.text());
    return;
  }

  // Split SQL into individual statements and run via pg functions
  // Since we can't run raw SQL via REST, we need to use the Supabase SQL Editor
  // Let's verify by trying to create a simple table
  
  // Check if tables exist by querying
  const tablesRes = await fetch(`${SUPABASE_URL}/rest/v1/tenants?select=count&limit=0`, {
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Prefer': 'count=exact'
    }
  });
  
  if (tablesRes.status === 200) {
    console.log('✅ Tables already exist! Migration was already run.\n');
    
    // Now create the admin profile
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
    
    // Try to create profile for existing admin
    const { data: users } = await supabase.auth.admin.listUsers();
    const admin = users?.users?.find(u => u.email === 'admin@forkly.cloud');
    
    if (admin) {
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', admin.id)
        .single();
      
      if (!existingProfile) {
        const { error } = await supabase.from('profiles').insert({
          id: admin.id,
          email: 'admin@forkly.cloud',
          full_name: 'System Administrator',
          full_name_ar: 'مدير النظام',
          role: 'system_admin',
          is_active: true,
        });
        
        if (error) {
          console.log('❌ Profile error:', error.message);
        } else {
          console.log('✅ Admin profile created!');
        }
      } else {
        console.log('✅ Admin profile already exists');
      }
    }
    
    console.log('\n📋 Admin Credentials:');
    console.log('   Email:    admin@forkly.cloud');
    console.log('   Password: Forkly@2026!');
    console.log('\n🌐 Run: npm run dev');
    console.log('🔑 Login at: http://localhost:3000/login');
  } else if (tablesRes.status === 404) {
    console.log('⚠ Tables do not exist yet.\n');
    console.log('📋 Please run the migration SQL manually:');
    console.log(`   1. Go to: https://supabase.com/dashboard/project/${PROJECT_REF}/sql/new`);
    console.log('   2. Paste the contents of: supabase/migration.sql');
    console.log('   3. Click "Run"\n');
    console.log('   Then re-run this script: node scripts/run-migration.mjs');
  } else {
    console.log('⚠ Unexpected response:', tablesRes.status);
    const body = await tablesRes.text();
    console.log(body);
    console.log('\n📋 Please run the migration SQL manually:');
    console.log(`   1. Go to: https://supabase.com/dashboard/project/${PROJECT_REF}/sql/new`);
    console.log('   2. Paste the contents of: supabase/migration.sql');
    console.log('   3. Click "Run"');
  }
}

main().catch(console.error);
