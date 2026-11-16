/**
 * BhaGoMo iRide — lead capture to Google Sheets
 *
 * Setup (5 minutes):
 * 1. Create a Google Sheet. Extensions → Apps Script. Paste this file. Save.
 * 2. Run `setup` once (authorise when asked). It creates the "Leads" and "Summary" tabs.
 * 3. Deploy → New deployment → Web app. Execute as: Me. Who has access: Anyone.
 * 4. Copy the web-app URL into SHEET_ENDPOINT in index.html and host the page.
 *
 * Duplicate phone numbers are ignored (one row per mobile number).
 * The Summary tab updates itself: total leads, station-wise and plan-wise counts.
 */

const STATIONS = ['IP Extension', 'Mandi House', 'Dwarka Sector 14', 'Nehru Enclave', 'ITO', 'Guru Dronacharya'];
const PLANS = [2, 4, 6, 8];
const HEADERS = ['Submitted at', 'Name', 'Phone', 'Metro station', 'Plan (hours)', 'Consent', 'Source'];

function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const leads = ss.getSheetByName('Leads') || ss.insertSheet('Leads');
  leads.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold');
  leads.setFrozenRows(1);
  leads.getRange('C:C').setNumberFormat('@'); // keep phone numbers as text

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
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const p = (e && e.parameter) || {};
    const phone = String(p.phone || '').replace(/\D/g, '');
    const station = String(p.station || '');
    const plan = Number(p.planHours);
    const name = String(p.name || '').trim().slice(0, 60);

    // Server-side validation mirrors the form.
    if (!name || !/^[6-9]\d{9}$/.test(phone) || STATIONS.indexOf(station) < 0 || PLANS.indexOf(plan) < 0 || p.consent !== 'true') {
      return json({ ok: false, error: 'invalid' });
    }

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Leads');
    const last = sheet.getLastRow();
    if (last > 1) {
      const phones = sheet.getRange(2, 3, last - 1, 1).getDisplayValues().flat();
      if (phones.indexOf(phone) >= 0) return json({ ok: true, duplicate: true });
    }

    // Prefix with ' so Sheets never treats input as a formula.
    const safe = v => (/^[=+\-@]/.test(v) ? "'" + v : v);
    sheet.appendRow([new Date(), safe(name), phone, station, plan, 'Yes', safe(String(p.source || 'web'))]);
    return json({ ok: true });
  } finally {
    lock.releaseLock();
  }
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
