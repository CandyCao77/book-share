/*
scripts/import-books-to-supabase.js
Usage:
  1) Export localStorage books to books.json in your project root:
       - Open site in browser -> DevTools Console ->
           copy(localStorage.getItem('books'))
       - Paste into a file named books.json

  2) Install deps and run:
       npm init -y
       npm install @supabase/supabase-js
       SUPABASE_URL=https://<your-project>.supabase.co SUPABASE_SERVICE_ROLE_KEY=<service_role_key> node scripts/import-books-to-supabase.js books.json

Notes: Use the SERVICE_ROLE key (not anon) for migration so RLS doesn't block inserts.
*/

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

async function main() {
  const fileArg = process.argv[2] || 'books.json';
  const filePath = path.resolve(process.cwd(), fileArg);
  if (!fs.existsSync(filePath)) {
    console.error('books.json not found. Export localStorage and save as books.json then retry.');
    process.exit(1);
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment.');
    process.exit(1);
  }

  const raw = fs.readFileSync(filePath, 'utf8');
  let books = [];
  try { books = JSON.parse(raw); } catch (e) { console.error('Failed to parse JSON:', e); process.exit(1); }
  if (!Array.isArray(books)) { console.error('books.json should be an array.'); process.exit(1); }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    global: { headers: { 'x-from-import': 'true' } }
  });

  // Map local structure to DB columns
  const records = books.map(b => ({
    id: b.id || Date.now(),
    name: b.name || null,
    author: b.author || null,
    category: b.category || null,
    city: b.city || null,
    condition: b.condition || null,
    desc: b.desc || null,
    image: b.image || null,
    publisher: b.publisher || null,
    publisher_email: b.publisherEmail || null,
    publisher_city: b.publisherCity || null,
    created_at: b.createdAt ? new Date(b.createdAt).toISOString() : new Date().toISOString(),
    requested: !!b.requested,
    requested_by: b.requestedBy || null,
    requester_email: b.requesterEmail || null,
    requested_at: b.requestedAt ? new Date(b.requestedAt).toISOString() : null
  }));

  // Upsert in chunks to avoid large payloads
  const chunkSize = 50;
  for (let i = 0; i < records.length; i += chunkSize) {
    const chunk = records.slice(i, i + chunkSize);
    console.log(`Upserting ${chunk.length} records (offset ${i})`);
    const { data, error } = await supabase.from('books').upsert(chunk, { onConflict: 'id' });
    if (error) {
      console.error('Upsert error:', error);
      process.exit(1);
    }
  }

  console.log('Import complete.');
}

main().catch(err => { console.error(err); process.exit(1); });
