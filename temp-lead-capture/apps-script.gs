/**
 * TEMPORARY — BhaGoMo iRide lead capture to a Google Sheet, until the CRM endpoint is live.
 * Delete the whole temp-lead-capture/ folder (and its <script> line in index.html) after CRM integration.
 *
 * Speaks the SAME contract the page expects from the CRM:
 *   Request : POST JSON lead  { name, phone, station, planHours, consent, submittedAt, source }
 *   Success : {"status":"saved"}  or  {"status":"duplicate"}
 *   Failure : {"error":{"code":"VALIDATION_FAILED","message":"…","field":"phone"}}
 * (Apps Script always answers HTTP 200, so errors travel in the body; the page reads them the same way.)
 *
 * Setup: see README.md in this folder.
 */

const STATIONS = ['IP Extension', 'Mandi House', 'Dwarka Sector 14', 'Nehru Enclave', 'ITO', 'Guru Dronacharya'];
const PLANS = [2, 4, 6, 8];
const HEADERS = ['Submitted at', 'Name', 'Phone', 'Metro station', 'Plan (hours)', 'Consent', 'Source', 'Submitted at (browser)'];

/** Run once from the editor: creates the Leads and Summary tabs (total, station-wise, plan-wise). */
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const leads = ss.getSheetByName('Leads') || ss.insertSheet('Leads');
  leads.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold');
  leads.setFrozenRows(1);
  leads.getRange('C:C').setNumberFormat('@'); // phone numbers stay text

  const sum = ss.getSheetByName('Summary') || ss.insertSheet('Summary');
  sum.clear();
  const rows = [['Total leads', '=COUNTA(Leads!C2:C)'], ['', ''], ['Station', 'Enquiries']];
  STATIONS.forEach(s => rows.push([s, `=COUNTIF(Leads!D2:D,"${s}")`]));
  rows.push(['', ''], ['Plan', 'Interest']);
  PLANS.forEach(p => rows.push([`${p} hours`, `=COUNTIF(Leads!E2:E,${p})`]));
  sum.getRange(1, 1, rows.length, 2).setValues(rows);
  sum.getRange('A1:B1').setFontWeight('bold').setFontSize(14);
  [3, 5 + STATIONS.length].forEach(r => sum.getRange(r, 1, 1, 2).setFontWeight('bold'));
  sum.autoResizeColumn(1);
}

function doPost(e) {
  let lead;
  try {
    const raw = e && e.postData && e.postData.contents;
    if (!raw) return fail('VALIDATION_FAILED', 'Empty request body.');
    try { lead = JSON.parse(raw); } catch (_) { return fail('VALIDATION_FAILED', 'Body is not valid JSON.'); }
    if (!lead || typeof lead !== 'object' || Array.isArray(lead)) return fail('VALIDATION_FAILED', 'Body must be a JSON object.');

    const bad = invalidField(lead);
    if (bad) return fail('VALIDATION_FAILED', bad.message, bad.field);

    const lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) return fail('SERVER_BUSY', 'Too many submissions at once. Try again in a moment.');
    try {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      if (!ss.getSheetByName('Leads')) setup();
      const sheet = ss.getSheetByName('Leads');
      const phone = String(lead.phone);
      const last = sheet.getLastRow();
      if (last > 1) {
        const phones = sheet.getRange(2, 3, last - 1, 1).getDisplayValues().flat();
        if (phones.indexOf(phone) >= 0) return ok('duplicate');
      }
      const name = String(lead.name).trim().replace(/\s+/g, ' ');
      sheet.appendRow([
        new Date(), safe(name), phone, lead.station, Number(lead.planHours), 'Yes',
        safe(String(lead.source || 'web-lead-form').slice(0, 40)), safe(String(lead.submittedAt || '').slice(0, 40)),
      ]);
      return ok('saved');
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    console.error(err);
    return fail('SERVER_ERROR', 'Could not store the lead: ' + (err && err.message ? err.message : String(err)));
  }
}

/** A browser opening the URL directly gets a clear answer instead of an Apps Script error page. */
function doGet() {
  return fail('METHOD_NOT_ALLOWED', 'This endpoint only accepts POST requests from the lead form.');
}

/** Mirrors the form's own validation. Returns {field, message} for the first problem, or null. */
function invalidField(lead) {
  const name = String(lead.name || '').trim();
  if (name.length < 2 || name.length > 60 || !/^[\p{L} .'-]+$/u.test(name)) return { field: 'name', message: 'Enter your full name using letters only.' };
  if (!/^[6-9]\d{9}$/.test(String(lead.phone || ''))) return { field: 'phone', message: 'Enter a valid 10-digit Indian mobile number.' };
  if (STATIONS.indexOf(lead.station) < 0) return { field: 'station', message: 'Select a pickup station from the list.' };
  if (PLANS.indexOf(Number(lead.planHours)) < 0) return { field: 'plan', message: 'Select a plan from the list.' };
  if (lead.consent !== true) return { field: 'consent', message: 'Consent is required so we can contact you.' };
  return null;
}

/** Never let Sheets treat visitor input as a formula. */
function safe(v) { return /^[=+\-@]/.test(v) ? "'" + v : v; }

function ok(status) { return json({ status: status }); }
function fail(code, message, field) {
  const error = { code: code, message: message };
  if (field) error.field = field;
  return json({ error: error });
}
function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
