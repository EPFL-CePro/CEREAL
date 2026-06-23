#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const SCRIPT_DIR = __dirname;

// .env
function loadEnv(envPath) {
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, 'utf8');
  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (!(value.startsWith('"') || value.startsWith("'"))) {
      const hash = value.indexOf(' #');
      if (hash !== -1) value = value.slice(0, hash).trim();
    }
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnv(path.join(SCRIPT_DIR, '.env'));

/* ---------- Config ---------- */
const SCANS_EXAMS_DIR =
  process.env.SCANS_EXAMS_DIR;
const CONTAINER = process.env.MYSQL_HOST || 'cereal-app-db';
const DB = process.env.MYSQL_DATABASE;
const USER = process.env.MYSQL_USER;
const PASSWORD = process.env.MYSQL_PASSWORD;
const IGNORED_DIRS = new Set(
  (process.env.IGNORED_DIRS || 'ZZ_DONE')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
);

function fail(msg) {
  console.error(`ERROR: ${msg}`);
  process.exit(1);
}

if (!DB) fail('MYSQL_DATABASE missing in .env');
if (!USER) fail('MYSQL_USER missing in .env');
if (PASSWORD === undefined) fail('MYSQL_PASSWORD missing in .env');

// MySQL helper
function mysql(args, input) {
  return execFileSync(
    'docker',
    ['exec', '-i', '-e', `MYSQL_PWD=${PASSWORD}`, CONTAINER, 'mysql', ...args],
    { input: input ?? '', encoding: 'utf8' }
  );
}

// Reading already stored scans
function readStoredScans() {
  const out = mysql([
    '-N',
    '-B',
    '--raw',
    '-u',
    USER,
    DB,
    '-e',
    'SELECT scans FROM scans LIMIT 1;',
  ]);
  const trimmed = out.replace(/\n$/, '');
  if (trimmed === '') {
    // Aucune ligne dans la table.
    return { rowExists: false, list: [] };
  }
  // Ligne présente mais valeur NULL → mysql -N affiche "NULL".
  if (trimmed === 'NULL') {
    return { rowExists: true, list: [] };
  }
  try {
    const parsed = JSON.parse(trimmed);
    return { rowExists: true, list: Array.isArray(parsed) ? parsed : [] };
  } catch (e) {
    fail(`Impossible de parser le JSON existant: ${e.message}`);
  }
}

function mysqlSelect(sql) {
  const out = mysql(['-N', '-B', '-u', USER, DB, '-e', sql]);
  return out
    .replace(/\n$/, '')
    .split('\n')
    .filter((line) => line !== '')
    .map((line) => line.split('\t').map((v) => (v === 'NULL' ? null : v)));
}

function sqlEscape(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

// Trying to guess the exam code by folder name
function parseFolderName(folderName) {
  const prefix = folderName.match(/^(\d{4})_(\d{2})_(.+)$/);
  let year = null;
  let month = null;
  let rest = folderName;
  if (prefix) {
    year = Number(prefix[1]);
    month = Number(prefix[2]);
    rest = prefix[3];
  }
  const codeMatch = rest.match(/[A-Za-z]{2,}-\d{2,4}(\([A-Za-z0-9]+\))?/);
  const code = codeMatch ? codeMatch[0].toUpperCase() : null;
  return { year, month, code };
}

async function fetchPersonBySciper(sciper) {
  const url = `https://api.epfl.ch/v1/persons/${encodeURIComponent(sciper)}`;
  const auth =
    'Basic ' +
    Buffer.from(
      `${process.env.EPFL_API_USERNAME}:${process.env.EPFL_API_PASSWORD}`
    ).toString('base64');
  const res = await fetch(url, { headers: { Authorization: auth } });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data || !data.id) return null;
  return data; // { id, firstname, lastname, email, display, ... }
}

// Trying to find responsible of the exam
async function resolveResponsible(folderName) {
  const { year, month, code } = parseFolderName(folderName);

  if (!code) {
    return { status: 'no_code', code: null, sciper: null, name: null };
  }

  // Match exact du code (insensible à la casse), priorité à l'année/mois du
  // dossier, puis à la date d'examen la plus récente.
  const rows = mysqlSelect(
    `SELECT responsible_id, exam_date FROM exam ` +
      `WHERE UPPER(code) = UPPER('${sqlEscape(code)}') ` +
      `ORDER BY (YEAR(exam_date) = ${year ?? 'NULL'} AND MONTH(exam_date) = ${month ?? 'NULL'}) DESC, ` +
      `exam_date IS NULL, exam_date DESC LIMIT 1;`
  );

  if (rows.length === 0) {
    return { status: 'no_exam', code, sciper: null, name: null };
  }

  const sciper = rows[0][0];
  if (!sciper) {
    return { status: 'no_responsible', code, sciper: null, name: null };
  }

  let person = null;
  try {
    person = await fetchPersonBySciper(sciper);
  } catch (e) {
    return { status: 'api_error', code, sciper, name: null, error: e.message };
  }

  if (!person) {
    return { status: 'api_not_found', code, sciper, name: null };
  }

  const name =
    `${person.firstname ?? ''} ${person.lastname ?? ''}`.trim() ||
    person.display ||
    null;
  return { status: 'ok', code, sciper, name };
}

// Building log msg
function responsibleLogLine(r) {
  switch (r.status) {
    case 'ok':
      return `Responsible : ${r.name} (sciper ${r.sciper}, examen ${r.code})`;
    case 'no_code':
      return `Responsible : NOT FOUND — no course code detected by folder name`;
    case 'no_exam':
      return `Responsible : NOT FOUND — no exam with the exact code "${r.code}" in the database`;
    case 'no_responsible':
      return `Responsible : NOT FOUND — exam "${r.code}" found but responsible_id is not set`;
    case 'api_not_found':
      return `Responsible : NOT FOUND — sciper ${r.sciper} (examen ${r.code}) not found by API`;
    case 'api_error':
      return `Responsible : NOT FOUND — sciper ${r.sciper} (examen ${r.code}), API error: ${r.error}`;
    default:
      return `Responsible : NOT FOUND`;
  }
}

function writeScans(list, rowExists) {
  const json = JSON.stringify(list);
  const escaped = json.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const sql = rowExists
    ? `UPDATE scans SET scans = '${escaped}';`
    : `INSERT INTO scans (scans) VALUES ('${escaped}');`;
  mysql(['-u', USER, DB], sql);
}

function listScanFolders(dir) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (e) {
    fail(`Can not read folder ${dir}: ${e.message}`);
  }
  return entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .filter((name) => !name.startsWith('.') && !IGNORED_DIRS.has(name))
    .sort();
}

async function main() {
  const folders = listScanFolders(SCANS_EXAMS_DIR);
  const { rowExists, list: stored } = readStoredScans();

  const storedByName = new Map(stored.map((s) => [s.name, s]));
  const currentSet = new Set(folders);
  const now = new Date().toISOString();

  const newScans = [];
  const updatedList = [];

  for (const name of folders) {
    const existing = storedByName.get(name);
    if (existing) {
      // Scan already known
      updatedList.push(existing);
    } else {
      // New scan
      const responsible = await resolveResponsible(name);
      const entry = {
        name,
        detected_at: now,
        status: 'new',
        responsible_sciper: responsible.sciper,
        responsible_name: responsible.name,
        responsible_status: responsible.status,
      };
      updatedList.push(entry);
      newScans.push({ entry, responsible });
    }
  }

  // Scans disparus du dossier actif (archivés dans ZZ_DONE ou supprimés).
  const removed = stored.filter((s) => !currentSet.has(s.name));

  /* ---------- Alertes ---------- */
  for (const { entry, responsible } of newScans) {
    console.log(`🆕 NEW SCAN : "${entry.name}" (${entry.detected_at})`);
    console.log(`    ${responsibleLogLine(responsible)}`);
  }
  for (const s of removed) {
    console.log(`➖ Scan removed (not found in active folder) : "${s.name}"`);
  }

  /* ---------- Persistance ---------- */
  const changed =
    newScans.length > 0 || removed.length > 0 || !rowExists;

  if (changed) {
    writeScans(updatedList, rowExists);
    console.log(
      `List updated : ${updatedList.length} active scans` +
        `(+${newScans.length} new, -${removed.length} removed).`
    );
  } else {
    console.log(
      `No change. ${updatedList.length} active scans.`
    );
  }
}

main().catch((e) => fail(e.stack || e.message));