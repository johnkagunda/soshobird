/**
 * Applies storage RLS policies by inserting directly into storage.policies.
 * Run: node scripts/apply_storage_policies.mjs
 */

const SUPABASE_URL = 'https://ywgrsqkqpmomvlevlebl.supabase.co';
const SERVICE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3Z3JzcWtxcG1vbXZsZXZsZWJsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MjIzMTA2OSwiZXhwIjoyMTA3ODA3MDY5fQ.EE-RhLGR3eQAY4aCfbYbSQywQ3PTsllLSMdsrSzR01A';

const headers = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'return=minimal',
};

// ── Ensure buckets are public ──────────────────────────────────────────────────
async function ensureBucket(name) {
  const r = await fetch(`${SUPABASE_URL}/storage/v1/bucket/${name}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ id: name, name, public: true, file_size_limit: 52428800 }),
  });
  console.log(`bucket ${name}: ${r.status}`);
}

// ── Upsert a single policy via the storage REST API ───────────────────────────
// Supabase exposes storage.policies as a REST table under the storage schema.
async function upsertPolicy({ name, bucket_id, operation, definition, check_option }) {
  // Try insert first
  const body = { name, bucket_id, operation };
  if (definition) body.definition = definition;
  if (check_option) body.check = check_option;

  const r = await fetch(`${SUPABASE_URL}/rest/v1/storage_policies`, {
    method: 'POST',
    headers: { ...headers, Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(body),
  });
  const text = await r.text();

  if (r.status === 201 || r.status === 200 || r.ok) {
    console.log(`✅  ${name}`);
  } else {
    console.log(`❌  ${name} (${r.status}): ${text.slice(0, 200)}`);
  }
}

// ── Check current policies ─────────────────────────────────────────────────────
async function listPolicies() {
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/storage_policies?select=name,bucket_id,operation`,
    { headers }
  );
  const data = await r.json();
  console.log('\nCurrent policies:', JSON.stringify(data, null, 2));
}

// ── Main ───────────────────────────────────────────────────────────────────────
await ensureBucket('avatars');
await ensureBucket('media');

console.log('\nApplying policies...');

const policies = [
  // avatars — anyone can view, authenticated can write
  { name: 'avatars_select', bucket_id: 'avatars', operation: 'SELECT', definition: 'true' },
  { name: 'avatars_insert', bucket_id: 'avatars', operation: 'INSERT', check_option: "(bucket_id = 'avatars'::text)" },
  { name: 'avatars_update', bucket_id: 'avatars', operation: 'UPDATE', definition: "(auth.role() = 'authenticated'::text)" },
  { name: 'avatars_delete', bucket_id: 'avatars', operation: 'DELETE', definition: "(auth.role() = 'authenticated'::text)" },
  // media
  { name: 'media_select',   bucket_id: 'media',   operation: 'SELECT', definition: 'true' },
  { name: 'media_insert',   bucket_id: 'media',   operation: 'INSERT', check_option: "(bucket_id = 'media'::text)" },
  { name: 'media_update',   bucket_id: 'media',   operation: 'UPDATE', definition: "(auth.role() = 'authenticated'::text)" },
  { name: 'media_delete',   bucket_id: 'media',   operation: 'DELETE', definition: "(auth.role() = 'authenticated'::text)" },
];

for (const p of policies) {
  await upsertPolicy(p);
}

await listPolicies();
