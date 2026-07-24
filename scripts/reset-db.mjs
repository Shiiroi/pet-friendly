/* global console, process */
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Parse .env variables
const envPath = path.resolve(process.cwd(), '.env');
const env = {};
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf-8');
  content.split('\n').forEach((line) => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) env[match[1].trim()] = match[2].trim();
  });
}

const url = env.VITE_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('❌ Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env file.');
  process.exit(1);
}

const target = process.argv[2] || 'all';

console.log(`🐾 Resetting Compaws Database target [${target.toUpperCase()}]...`);

const supabase = createClient(url, key);

async function runReset() {
  try {
    const { error } = await supabase.rpc('admin_reset_database', { p_target: target });
    if (error) throw error;
    console.log(`✅ Compaws Database reset successfully! (${target.toUpperCase()} cleared)`);
  } catch (err) {
    console.error('❌ Database reset failed:', err.message || err);
    process.exit(1);
  }
}

runReset();
