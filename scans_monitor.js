#!/usr/bin/env node
"use strict"

const fs = require("fs")
const path = require("path")
const mariadb = require("mariadb")
const nodemailer = require("nodemailer")

const SCRIPT_DIR = __dirname

// .env
function loadEnv(envPath) {
  if (!fs.existsSync(envPath)) return
  const content = fs.readFileSync(envPath, "utf8")
  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim()
    if (!line || line.startsWith("#")) continue
    const eq = line.indexOf("=")
    if (eq === -1) continue
    const key = line.slice(0, eq).trim()
    let value = line.slice(eq + 1).trim()
    if (!(value.startsWith('"') || value.startsWith("'"))) {
      const hash = value.indexOf(" #")
      if (hash !== -1) value = value.slice(0, hash).trim()
    }
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (!(key in process.env)) process.env[key] = value
  }
}

loadEnv(path.join(SCRIPT_DIR, ".env"))

/* ---------- Config ---------- */
const SCANS_EXAMS_DIR = process.env.SCANS_EXAMS_DIR
const HOST = process.env.MYSQL_HOST || "cereal-app-db"
const DB = process.env.MYSQL_DATABASE
const USER = process.env.MYSQL_USER
const PASSWORD = process.env.MYSQL_PASSWORD
const IGNORED_DIRS = new Set(
  (process.env.IGNORED_DIRS || "ZZ_DONE")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
)
const ALERT_TO = process.env.SCANS_ALERT_TO || "cepro-exams@epfl.ch"

function fail(msg) {
  console.error(`ERROR: ${msg}`)
  process.exit(1)
}

if (!DB) fail("MYSQL_DATABASE missing in .env")
if (!USER) fail("MYSQL_USER missing in .env")
if (PASSWORD === undefined) fail("MYSQL_PASSWORD missing in .env")

// MySQL connection, reached over the Docker network (the script runs inside the cereal-app container)
const pool = mariadb.createPool({
  host: HOST,
  user: USER,
  password: PASSWORD,
  database: DB,
  connectionLimit: 1,
  connectTimeout: 5000,
})

// Reading already stored scans
async function readStoredScans() {
  const rows = await pool.query("SELECT scans FROM scans LIMIT 1")
  if (rows.length === 0) {
    // Aucune ligne dans la table.
    return { rowExists: false, list: [] }
  }
  const value = rows[0].scans
  if (value === null) {
    return { rowExists: true, list: [] }
  }
  // Depending on the server, the driver returns a JSON column either already parsed or as a string.
  let parsed = value
  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value)
    } catch (e) {
      fail(`Impossible de parser le JSON existant: ${e.message}`)
    }
  }
  return { rowExists: true, list: Array.isArray(parsed) ? parsed : [] }
}

// Trying to guess the exam code by folder name
function parseFolderName(folderName) {
  const prefix = folderName.match(/^(\d{4})_(\d{2})_(.+)$/)
  let year = null
  let month = null
  let rest = folderName
  if (prefix) {
    year = Number(prefix[1])
    month = Number(prefix[2])
    rest = prefix[3]
  }
  const codeMatch = rest.match(/[A-Za-z]{2,}-\d{2,4}(\([A-Za-z0-9]+\))?/)
  const code = codeMatch ? codeMatch[0].toUpperCase() : null
  return { year, month, code }
}

async function fetchPersonBySciper(sciper) {
  const url = `https://api.epfl.ch/v1/persons/${encodeURIComponent(sciper)}`
  const auth =
    "Basic " +
    Buffer.from(
      `${process.env.EPFL_API_USERNAME}:${process.env.EPFL_API_PASSWORD}`,
    ).toString("base64")
  const res = await fetch(url, { headers: { Authorization: auth } })
  if (!res.ok) return null
  const data = await res.json()
  if (!data || !data.id) return null
  return data // { id, firstname, lastname, email, display, ... }
}

// Trying to find responsible of the exam
async function resolveResponsible(folderName) {
  const { year, month, code } = parseFolderName(folderName)

  if (!code) {
    return { status: "no_code", code: null, sciper: null, name: null }
  }

  // Match exact du code (insensible à la casse), priorité à l'année/mois du
  // dossier, puis à la date d'examen la plus récente.
  const rows = await pool.query(
    `SELECT responsible_id FROM exam ` +
      `WHERE UPPER(code) = UPPER(?) ` +
      `ORDER BY (YEAR(exam_date) = ? AND MONTH(exam_date) = ?) DESC, ` +
      `exam_date IS NULL, exam_date DESC LIMIT 1`,
    [code, year, month],
  )

  if (rows.length === 0) {
    return { status: "no_exam", code, sciper: null, name: null }
  }

  // Kept as a string, like the scans already stored
  const sciper =
    rows[0].responsible_id === null ? null : String(rows[0].responsible_id)
  if (!sciper) {
    return { status: "no_responsible", code, sciper: null, name: null }
  }

  let person = null
  try {
    person = await fetchPersonBySciper(sciper)
  } catch (e) {
    return { status: "api_error", code, sciper, name: null, error: e.message }
  }

  if (!person) {
    return { status: "api_not_found", code, sciper, name: null }
  }

  const name =
    `${person.firstname ?? ""} ${person.lastname ?? ""}`.trim() ||
    person.display ||
    null
  return { status: "ok", code, sciper, name }
}

// Building log msg
function responsibleLogLine(r) {
  switch (r.status) {
    case "ok":
      return `Responsible : ${r.name} (sciper ${r.sciper}, examen ${r.code})`
    case "no_code":
      return `Responsible : NOT FOUND — no course code detected by folder name`
    case "no_exam":
      return `Responsible : NOT FOUND — no exam with the exact code "${r.code}" in the database`
    case "no_responsible":
      return `Responsible : NOT FOUND — exam "${r.code}" found but responsible_id is not set`
    case "api_not_found":
      return `Responsible : NOT FOUND — sciper ${r.sciper} (examen ${r.code}) not found by API`
    case "api_error":
      return `Responsible : NOT FOUND — sciper ${r.sciper} (examen ${r.code}), API error: ${r.error}`
    default:
      return `Responsible : NOT FOUND`
  }
}

// Human-readable responsible info for the email body.
function responsibleMailLine(r) {
  switch (r.status) {
    case "ok":
      return `${r.name}`
    case "no_code":
      return `Inconnu — aucun code de cours détecté dans le nom du dossier`
    case "no_exam":
      return `Inconnu — aucun examen avec le code exact "${r.code}" dans la base de données`
    case "no_responsible":
      return `Inconnu — examen "${r.code}" trouvé en base de données mais aucun responsable renseigné`
    case "api_not_found":
      return `Inconnu — sciper ${r.sciper} (examen ${r.code}) introuvable via l'API`
    case "api_error":
      return `Indéterminé — sciper ${r.sciper} (examen ${r.code}), erreur API: ${r.error}`
    default:
      return `Inconnu`
  }
}

// Reimplementation of sendMail (app/lib/mail/send-templated-mail.ts) for this standalone CLI script.
function getMailSubjectPrefix() {
  return process.env.CEREAL_ENV === "test" ? "TEST - " : ""
}

async function sendMail(to, subject, content, cc, replyTo) {
  const transporter = nodemailer.createTransport({
    host: process.env.MAIL_SMTP_HOST,
    port: 587,
    secure: false,
    auth: {
      user: process.env.MAIL_AUTH_USER,
      pass: process.env.MAIL_AUTH_PASS,
    },
  })

  return transporter.sendMail({
    from: process.env.MAIL_FROM_EMAIL,
    to,
    subject: `${getMailSubjectPrefix()}${subject}`,
    text: content,
    cc,
    replyTo,
  })
}

// Email alert for one newly detected scan.
async function sendNewScanMail(folderName, responsible) {
  const subject = `Nouveau scan d'examen ${folderName}`
  const content =
    `Un nouveau scan d'examen a été détecté sur le NAS.\n\n` +
    `Dossier   : ${folderName}\n` +
    `Responsable : ${responsibleMailLine(responsible)}\n`
  return sendMail(ALERT_TO, subject, content, "")
}

async function writeScans(list, rowExists) {
  const sql = rowExists
    ? "UPDATE scans SET scans = ?"
    : "INSERT INTO scans (scans) VALUES (?)"
  await pool.query(sql, [JSON.stringify(list)])
}

function listScanFolders(dir) {
  let entries
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
  } catch (e) {
    fail(`Can not read folder ${dir}: ${e.message}`)
  }
  return entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .filter((name) => !name.startsWith(".") && !IGNORED_DIRS.has(name))
    .sort()
}

async function main() {
  const folders = listScanFolders(SCANS_EXAMS_DIR)
  const { rowExists, list: stored } = await readStoredScans()

  const storedByName = new Map(stored.map((s) => [s.name, s]))
  const currentSet = new Set(folders)
  const now = new Date().toISOString()

  let newCount = 0
  let mailFailed = 0
  const updatedList = []

  for (const name of folders) {
    const existing = storedByName.get(name)
    if (existing) {
      // Scan already known
      updatedList.push(existing)
      continue
    }

    // New scan: resolve responsible and alert by email.
    const responsible = await resolveResponsible(name)
    console.log(`🆕 NEW SCAN : "${name}" (${now})`)
    console.log(`    ${responsibleLogLine(responsible)}`)

    try {
      await sendNewScanMail(name, responsible)
      console.log(`    ✉️  Email sent to ${ALERT_TO}`)
    } catch (e) {
      // Email failed: do NOT persist this scan so it is retried next run.
      console.error(
        `    ✉️  EMAIL FAILED for "${name}": ${e.message} — will retry next run`,
      )
      mailFailed++
      continue
    }

    updatedList.push({
      name,
      detected_at: now,
      status: "new",
      responsible_sciper: responsible.sciper,
      responsible_name: responsible.name,
      responsible_status: responsible.status,
    })
    newCount++
  }

  // Scans no longer in the active folder (archived in ZZ_DONE or deleted).
  const removed = stored.filter((s) => !currentSet.has(s.name))
  for (const s of removed) {
    console.log(`➖ Scan removed (not found in active folder) : "${s.name}"`)
  }

  /* ---------- Persistence ---------- */
  const changed = newCount > 0 || removed.length > 0 || !rowExists

  if (changed) {
    await writeScans(updatedList, rowExists)
    console.log(
      `List updated : ${updatedList.length} active scans ` +
        `(+${newCount} new, -${removed.length} removed).`,
    )
  } else {
    console.log(`No change. ${updatedList.length} active scans.`)
  }

  if (mailFailed > 0) {
    console.error(
      `${mailFailed} email(s) failed; those scans were not saved and will be retried.`,
    )
  }
}

main()
  .catch((e) => fail(e.stack || e.message))
  .finally(() => pool.end())
