/**
 * InstaHelp hero form → Google Sheet
 * Target: https://docs.google.com/spreadsheets/d/1d_OP7QSblYraIfMDUBbbNZIAV4Gx7aJSy_wDNTX62pk/edit#gid=0
 * (Spreadsheet file above; tab must match URL gid, default first tab = 0)
 *
 * Deploy: Extensions → Apps Script → Deploy → New deployment →
 *   Type: Web app → Execute as: Me → Who has access: Anyone
 * Then paste the Web app URL into in2.html as SHEET_URL (or manage via Script properties).
 * The **Google account that owns the script deployment** must have *Editor* access
 * to this spreadsheet. Inviting a different @gmail.com in "Share" does not help unless
 * that person is the one who deployed the web app (or owns the project).
 * Deploy access: "Who has access" = **Anyone** (public form) or the POST may be rejected.
 *
 * Do NOT use SpreadsheetApp.getActiveSpreadsheet() in doPost: for a **standalone** web app
 * (script created at script.google.com) there is no "active" spreadsheet, so it returns
 * null and appendRow throws. Use openById + getSheetByName (or openById + sheet id) instead.
 * getActiveSpreadsheet() only works when the script is **container-bound** (File → from sheet).
 */
var SPREADSHEET_ID = '1d_OP7QSblYraIfMDUBbbNZIAV4Gx7aJSy_wDNTX62pk';

/** Tab name in that file (default first tab). If you rename it, change this. */
var SHEET_NAME = 'Sheet1';

/** If Sheet1 is missing, fall back to the tab with this gid (URL #gid=0). */
var TARGET_SHEET_GID = 0;

function getTargetSheet_() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sh = ss.getSheetByName(SHEET_NAME);
  if (sh) {
    return sh;
  }
  var sheets = ss.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    if (sheets[i].getSheetId() === TARGET_SHEET_GID) {
      return sheets[i];
    }
  }
  return sheets[0];
}

/** One row of headers — run installHeaders() once if the sheet is empty */
var COLUMN_HEADERS = [
  'Server received (UTC)',
  'Name',
  'Email',
  'Phone',
  'Address',
  'Service',
  'Message',
  'Source',
  'Prior payment',
  'Evidence consent',
  'Confusion instance',
  'Referrer URL',
  'UTM source',
  'UTM medium',
  'UTM campaign',
  'Landing page',
  'Confusion referral flag',
  'Form ID',
  'Form token',
  'Client timestamp (ISO)'
];

/**
 * Optional: Run once from the Apps Script editor (Run → installHeaders) to
 * create the header row on the first sheet.
 */
function installHeaders() {
  var sh = getTargetSheet_();
  if (sh.getMaxRows() < 1) {
    sh.insertRowBefore(1);
  }
  var hasHeader =
    sh.getLastRow() >= 1 && String(sh.getRange(1, 1).getValue() || '').trim() !== '';
  if (!hasHeader) {
    sh.getRange(1, 1, 1, COLUMN_HEADERS.length).setValues([COLUMN_HEADERS]);
    sh.setFrozenRows(1);
  }
}

/**
 * Strips leading = + - @ from cell text to avoid formula injection in Sheets.
 */
function safeCell_(v) {
  if (v == null || v === undefined) {
    return '';
  }
  var s = String(v);
  if (/^[=+\-@]/.test(s)) {
    return "'" + s;
  }
  return s;
}

function jsonOut_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Resolves body JSON. Urlencoded: e.parameter.data and/or e.postData.contents
 * (Apps Script is inconsistent; parse both + manual data= from body).
 */
function decodeUriFormValue_(s) {
  if (!s) {
    return '';
  }
  try {
    return decodeURIComponent(s.replace(/\+/g, ' '));
  } catch (err) {
    return s;
  }
}

function extractDataParamFromWwwForm_(body) {
  if (!body || String(body).indexOf('data=') === -1) {
    return '';
  }
  var s = String(body);
  var i = s.indexOf('data=') + 5;
  var v = s.substring(i);
  var amp = v.indexOf('&');
  if (amp > -1) {
    v = v.substring(0, amp);
  }
  return decodeUriFormValue_(v);
}

function readPayloadObject_(e) {
  if (!e) {
    return null;
  }
  var raw = '';
  if (e.parameter && e.parameter.data) {
    raw = String(e.parameter.data);
  }
  if (!raw && e.postData && e.postData.contents) {
    var body = String(e.postData.contents);
    if (body.indexOf('data=') === 0 || body.indexOf('&data=') > -1) {
      raw = extractDataParamFromWwwForm_(body) || body;
    } else {
      raw = body;
    }
  }
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch (err) {
    return null;
  }
}

function doPost(e) {
  var data = readPayloadObject_(e);
  if (!data) {
    return jsonOut_({ success: false, ok: false, error: 'No payload' });
  }

  var nowIso = new Date().toISOString();
  var row = [
    safeCell_(nowIso),
    safeCell_(data.name),
    safeCell_(data.email),
    safeCell_(data.phone),
    safeCell_(data.address),
    safeCell_(data.service),
    safeCell_(data.message),
    safeCell_(data.source),
    safeCell_(data.prior_payment),
    safeCell_(data.evidence_consent),
    safeCell_(data.confusion_instance),
    safeCell_(data.referrer_url),
    safeCell_(data.utm_source),
    safeCell_(data.utm_medium),
    safeCell_(data.utm_campaign),
    safeCell_(data.landing_page),
    safeCell_(data.confusion_referral_flag),
    safeCell_(data.form_id),
    safeCell_(data.token),
    safeCell_(data.timestamp)
  ];

  try {
    var sh = getTargetSheet_();
    sh.appendRow(row);
  } catch (err) {
    return jsonOut_({
      success: false,
      ok: false,
      error: err.message || 'Append failed'
    });
  }

  return jsonOut_({ success: true, ok: true });
}

/** Quick check that the web app URL is live */
function doGet() {
  return ContentService.createTextOutput('InstaHelp form handler OK');
}
