import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const RUNTIME_FILES = [
  'index.html',
  'styles.css',
  'src/options.js',
  'src/model.js',
  'src/insight.js',
  'src/copy.js',
  'src/visualisation.js',
  'src/config.js',
  'src/session.js',
  'src/api.js',
  'src/app.js'
];

test('Runtime files do not contain forbidden persistence or tracking APIs', () => {
  const forbiddenPatterns = [
    /localStorage/i,
    /indexedDB/i,
    /\bcookie\b/i,
    /serviceWorker/i,
    /XMLHttpRequest/i,
    /WebSocket/i,
    /EventSource/i,
    /analytics/i,
    /gtag/i,
    /telemetry/i
  ];

  for (const relPath of RUNTIME_FILES) {
    const fullPath = path.resolve(process.cwd(), relPath);
    if (!fs.existsSync(fullPath)) continue;
    const content = fs.readFileSync(fullPath, 'utf8');

    for (const pattern of forbiddenPatterns) {
      assert.equal(
        pattern.test(content),
        false,
        `File ${relPath} matches forbidden privacy pattern: ${pattern.toString()}`
      );
    }
  }
});

test('Network fetch requests are restricted strictly to configured Supabase origin', () => {
  const allowedOriginsPattern = /https:\/\/[a-z0-9_-]+\.supabase\.co/i;
  
  for (const relPath of RUNTIME_FILES) {
    const fullPath = path.resolve(process.cwd(), relPath);
    if (!fs.existsSync(fullPath)) continue;
    const content = fs.readFileSync(fullPath, 'utf8');

    const matches = content.match(/https?:\/\/[^\s"'`]+/gi) || [];
    for (const urlStr of matches) {
      const isPlaceholder = urlStr.includes('YOUR_SUPABASE_PROJECT_ID');
      const isAllowedOrigin = allowedOriginsPattern.test(urlStr) || urlStr.includes('localhost') || urlStr.includes('127.0.0.1');
      
      assert.equal(
        isAllowedOrigin || isPlaceholder,
        true,
        `File ${relPath} contains an unauthorized remote network URL: ${urlStr}`
      );
    }
  }
});

test('Runtime JavaScript files do not log participant choices or data to console', () => {
  const jsFiles = RUNTIME_FILES.filter(f => f.endsWith('.js'));

  for (const relPath of jsFiles) {
    const fullPath = path.resolve(process.cwd(), relPath);
    if (!fs.existsSync(fullPath)) continue;
    const content = fs.readFileSync(fullPath, 'utf8');

    assert.equal(
      /console\.(log|warn|error|debug|info)/i.test(content),
      false,
      `File ${relPath} contains console logging which is prohibited for privacy!`
    );
  }
});

test('Runtime code uses only tp_* prefixed RPC names', () => {
  const apiContent = fs.readFileSync(path.resolve(process.cwd(), 'src/api.js'), 'utf8');
  const genericRpcNames = ['"create_room"', '"get_public_room"', '"submit_room_vote"', '"get_facilitator_room_state"', '"close_room"', '"delete_room"'];

  for (const genericRpc of genericRpcNames) {
    assert.equal(
      apiContent.includes(genericRpc),
      false,
      `src/api.js should not use generic un-prefixed RPC name ${genericRpc}`
    );
  }
});

test('API wrapper sends apikey header ONLY and no Authorization Bearer header for publishable key', () => {
  const apiContent = fs.readFileSync(path.resolve(process.cwd(), 'src/api.js'), 'utf8');
  assert.equal(apiContent.includes("'apikey':"), true, 'Must send apikey header');
  assert.equal(apiContent.includes("Authorization"), false, 'Must NOT send Authorization Bearer header for publishable key');
});

test('API wrapper sends Content-Profile: public header on all production RPC POST requests', () => {
  const apiContent = fs.readFileSync(path.resolve(process.cwd(), 'src/api.js'), 'utf8');
  assert.equal(
    apiContent.includes("'Content-Profile': 'public'"),
    true,
    'src/api.js must explicitly include Content-Profile: public header for PostgREST schema selection'
  );
});

test('Installation SQL uses private schema team_pulse_private and search_path = "" for SECURITY DEFINER RPCs', () => {
  const installSql = fs.readFileSync(path.resolve(process.cwd(), 'supabase/install-team-pulse.sql'), 'utf8');
  
  assert.equal(installSql.includes('CREATE SCHEMA IF NOT EXISTS team_pulse_private'), true);
  assert.equal(installSql.includes("SET search_path = ''"), true);
  assert.equal(installSql.includes("ALTER DEFAULT PRIVILEGES"), false, 'Must not alter default privileges globally');
  assert.equal(installSql.includes("public.rooms"), false, 'Must not create generic public.rooms table');
});

test('Cleanup RPC execution is denied to anon and authenticated roles', () => {
  const installSql = fs.readFileSync(path.resolve(process.cwd(), 'supabase/install-team-pulse.sql'), 'utf8');
  assert.equal(
    installSql.includes('GRANT EXECUTE ON FUNCTION team_pulse_private.cleanup_expired_rooms() TO anon') ||
    installSql.includes('GRANT EXECUTE ON FUNCTION team_pulse_private.cleanup_expired_rooms() TO authenticated'),
    false,
    'Cleanup function MUST NOT be granted to anon or authenticated'
  );
});

test('Archived prototype schema carries warning header', () => {
  const archivePath = path.resolve(process.cwd(), 'supabase/_archive/public-schema-prototype-unsafe.sql');
  assert.equal(fs.existsSync(archivePath), true, 'Archived prototype schema file must exist');
  const archiveContent = fs.readFileSync(archivePath, 'utf8');
  assert.equal(archiveContent.includes('DO NOT EXECUTE'), true, 'Archived prototype schema must contain warning header');
});

test('SQL files do not contain improperly nested or conflicting dollar-quote delimiters', () => {
  const schedulePath = path.resolve(process.cwd(), 'supabase/schedule-team-pulse-cleanup.sql');
  const scheduleSql = fs.readFileSync(schedulePath, 'utf8');

  assert.equal(scheduleSql.includes('$do$'), true, 'Schedule script must use named $do$ tag for DO block');
  assert.equal(scheduleSql.includes('$chk$'), true, 'Schedule script must use named $chk$ tag for check EXECUTE');
  assert.equal(scheduleSql.includes('$sched$'), true, 'Schedule script must use named $sched$ tag for scheduling EXECUTE');
  assert.equal(scheduleSql.includes('$cron$'), true, 'Schedule script must use named $cron$ tag for cron job command');
  assert.equal(scheduleSql.includes('$$'), false, 'Schedule script must not use un-named $$ tags which cause nesting syntax errors');
});

test('Active Team Pulse SQL files do not contain invalid SQL special form pg_catalog qualifications (pg_catalog.trim, pg_catalog.coalesce)', () => {
  const activeSqlFiles = [
    'supabase/install-team-pulse.sql',
    'supabase/preflight-team-pulse.sql',
    'supabase/verify-team-pulse.sql',
    'supabase/schedule-team-pulse-cleanup.sql',
    'supabase/remove-team-pulse.sql',
    'supabase/migrations/20260806_enable_public_result_reveal.sql'
  ];

  for (const relPath of activeSqlFiles) {
    const fullPath = path.resolve(process.cwd(), relPath);
    if (!fs.existsSync(fullPath)) continue;
    const content = fs.readFileSync(fullPath, 'utf8');

    assert.equal(
      content.includes('pg_catalog.trim('),
      false,
      `File ${relPath} must not contain invalid pg_catalog.trim( — use pg_catalog.btrim or TRIM instead`
    );

    assert.equal(
      content.includes('pg_catalog.coalesce('),
      false,
      `File ${relPath} must not contain invalid pg_catalog.coalesce( — use SQL special form COALESCE instead`
    );
  }
});
