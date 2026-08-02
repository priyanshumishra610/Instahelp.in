/**
 * InstaHelp hero form → Google Sheet + HTML email notification
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
 * Email: set Script property NOTIFY_EMAIL (Project settings → Script properties)
 * or edit DEFAULT_NOTIFY_EMAIL below. After editing, redeploy the web app.
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

/** Default inbox for new-lead alerts (override via Script property NOTIFY_EMAIL). */
var DEFAULT_NOTIFY_EMAIL = 'mail@instahelp.in';

/** Brand colours (match instahelp.in style.css). */
var BRAND = {
  black: '#050505',
  yellow: '#FFD600',
  accent: '#004aad',
  gray50: '#fafafa',
  gray100: '#f2f2f2',
  gray400: '#9e9e9e',
  gray700: '#444',
  white: '#ffffff',
  danger: '#dc2626',
  dangerBg: '#fef2f2',
  success: '#16a34a',
  successBg: '#f0fdf4'
};

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

function getNotifyEmail_() {
  var fromProps = PropertiesService.getScriptProperties().getProperty('NOTIFY_EMAIL');
  return (fromProps && String(fromProps).trim()) || DEFAULT_NOTIFY_EMAIL;
}

/** One row of headers - run installHeaders() once if the sheet is empty */
var COLUMN_HEADERS = [
  'Server received (UTC)',
  'Name',
  'Email',
  'Phone',
  'Address',
  'Service',
  'Message',
  'Preferred when',
  'Preferred date',
  'Preferred time',
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

function escapeHtml_(s) {
  if (s == null || s === undefined) {
    return '';
  }
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function displayOrDash_(v) {
  var s = String(v == null ? '' : v).trim();
  return s || '-';
}

function formatIst_(isoOrDate) {
  try {
    var d = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate);
    if (isNaN(d.getTime())) {
      return displayOrDash_(isoOrDate);
    }
    return Utilities.formatDate(d, 'Asia/Kolkata', 'EEE, d MMM yyyy · h:mm a') + ' IST';
  } catch (err) {
    return displayOrDash_(isoOrDate);
  }
}

function normalizePhoneDigits_(phone) {
  return String(phone || '').replace(/\D/g, '');
}

function buildWhatsAppUrl_(phone, message) {
  var digits = normalizePhoneDigits_(phone);
  if (!digits) {
    return '';
  }
  if (digits.length === 10) {
    digits = '91' + digits;
  }
  var text = encodeURIComponent(message || 'Hi, this is InstaHelp regarding your service request.');
  return 'https://wa.me/' + digits + '?text=' + text;
}

var SOURCE_LABELS = {
  google: 'Google Search',
  some: 'Some App',
  playstore: 'Play Store',
  word_of_mouth: 'Word of Mouth',
  returning: 'Returning customer',
  other: 'Other'
};

var PRIOR_PAYMENT_LABELS = {
  no: 'No, not yet',
  yes_here: 'Yes - through instahelp.in',
  yes_elsewhere: 'Yes - different app / platform'
};

function labelFor_(map, key) {
  var k = String(key || '').trim().toLowerCase();
  if (!k) {
    return '-';
  }
  return map[k] || key;
}

function isConfusionLead_(data) {
  var ci = String(data.confusion_instance || '').toUpperCase();
  var flag = String(data.confusion_referral_flag || '').toUpperCase();
  var source = String(data.source || '').toLowerCase();
  var prior = String(data.prior_payment || '').toLowerCase();
  return (
    ci.indexOf('YES') === 0 ||
    flag === 'YES' ||
    source === 'some' ||
    source === 'playstore' ||
    prior === 'yes_elsewhere'
  );
}

/**
 * Prevents duplicate sheet rows / emails when the browser fires iframe + fetch POST.
 */
function isDuplicateSubmission_(token) {
  if (!token) {
    return false;
  }
  var cache = CacheService.getScriptCache();
  var key = 'lead_' + String(token);
  if (cache.get(key)) {
    return true;
  }
  cache.put(key, '1', 180);
  return false;
}

function buildEmailRow_(label, value, opts) {
  opts = opts || {};
  var val = displayOrDash_(value);
  var valueHtml = escapeHtml_(val);
  if (opts.link) {
    valueHtml = '<a href="' + escapeHtml_(opts.link) + '" style="color:' + BRAND.accent + ';text-decoration:none;font-weight:600;">' + valueHtml + '</a>';
  }
  if (opts.multiline) {
    valueHtml = '<div style="white-space:pre-wrap;line-height:1.55;">' + valueHtml + '</div>';
  }
  return (
    '<tr>' +
      '<td style="padding:10px 14px;border-bottom:1px solid ' + BRAND.gray100 + ';color:' + BRAND.gray400 + ';font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;width:34%;vertical-align:top;">' +
        escapeHtml_(label) +
      '</td>' +
      '<td style="padding:10px 14px;border-bottom:1px solid ' + BRAND.gray100 + ';color:' + BRAND.black + ';font-size:14px;vertical-align:top;">' +
        valueHtml +
      '</td>' +
    '</tr>'
  );
}

function buildSectionTable_(title, rowsHtml) {
  return (
    '<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:18px;border:1px solid ' + BRAND.gray100 + ';border-radius:12px;overflow:hidden;background:' + BRAND.white + ';">' +
      '<tr><td colspan="2" style="padding:12px 14px;background:' + BRAND.gray50 + ';border-bottom:1px solid ' + BRAND.gray100 + ';font-size:13px;font-weight:700;color:' + BRAND.black + ';">' +
        escapeHtml_(title) +
      '</td></tr>' +
      rowsHtml +
    '</table>'
  );
}

function buildLeadEmailHtml_(data, receivedAt) {
  var name = displayOrDash_(data.name);
  var phone = displayOrDash_(data.phone);
  var email = displayOrDash_(data.email);
  var message = displayOrDash_(data.message);
  var address = displayOrDash_(data.address);
  var service = displayOrDash_(data.service);
  var confusion = isConfusionLead_(data);
  var sheetUrl = 'https://docs.google.com/spreadsheets/d/' + SPREADSHEET_ID + '/edit#gid=' + TARGET_SHEET_GID;

  var waUrl = buildWhatsAppUrl_(phone, 'Hi ' + (data.name || '') + ', this is InstaHelp. We received your request: "' + (data.message || '').substring(0, 120) + '"');
  var telUrl = phone !== '-' ? 'tel:' + normalizePhoneDigits_(phone) : '';
  var mailUrl = email !== '-' ? 'mailto:' + encodeURIComponent(email) : '';

  var badgeBg = confusion ? BRAND.dangerBg : BRAND.successBg;
  var badgeColor = confusion ? BRAND.danger : BRAND.success;
  var badgeText = confusion ? '⚠ Review - possible confusion lead' : '✓ Standard lead';

  var taskRows =
    buildEmailRow_('Task / message', message, { multiline: true }) +
    buildEmailRow_('Preferred when', displayOrDash_(data.preferred_when)) +
    buildEmailRow_('Preferred date', displayOrDash_(data.preferred_date)) +
    buildEmailRow_('Preferred time', displayOrDash_(data.preferred_time)) +
    buildEmailRow_('Service category', service || 'Not specified');

  var contactRows =
    buildEmailRow_('Name', name) +
    buildEmailRow_('Phone / WhatsApp', phone, telUrl ? { link: telUrl } : {}) +
    buildEmailRow_('Email', email, mailUrl ? { link: mailUrl } : {}) +
    buildEmailRow_('Address', address, { multiline: true });

  var attributionRows =
    buildEmailRow_('How they found us', labelFor_(SOURCE_LABELS, data.source)) +
    buildEmailRow_('Prior InstaHelp use', labelFor_(PRIOR_PAYMENT_LABELS, data.prior_payment)) +
    buildEmailRow_('Provider consent', String(data.evidence_consent || '').toUpperCase() === 'YES' ? 'Yes - agreed' : displayOrDash_(data.evidence_consent)) +
    buildEmailRow_('Confusion flag', displayOrDash_(data.confusion_instance)) +
    buildEmailRow_('Referrer confusion', displayOrDash_(data.confusion_referral_flag));

  var trafficRows =
    buildEmailRow_('Landing page', data.landing_page, data.landing_page ? { link: data.landing_page } : {}) +
    buildEmailRow_('Referrer URL', data.referrer_url, data.referrer_url ? { link: data.referrer_url } : {}) +
    buildEmailRow_('UTM source', data.utm_source) +
    buildEmailRow_('UTM medium', data.utm_medium) +
    buildEmailRow_('UTM campaign', data.utm_campaign);

  var metaRows =
    buildEmailRow_('Form ID', data.form_id) +
    buildEmailRow_('Submission token', data.token) +
    buildEmailRow_('Client submitted', formatIst_(data.timestamp)) +
    buildEmailRow_('Server received', formatIst_(receivedAt));

  var actionBtn = function (label, url, bg, color) {
    if (!url) {
      return '';
    }
    return (
      '<a href="' + escapeHtml_(url) + '" style="display:inline-block;margin:0 8px 8px 0;padding:11px 18px;background:' + bg + ';color:' + color + ';text-decoration:none;font-size:13px;font-weight:700;border-radius:999px;">' +
        escapeHtml_(label) +
      '</a>'
    );
  };

  var actions =
    actionBtn('📞 Call', telUrl, BRAND.black, BRAND.white) +
    actionBtn('💬 WhatsApp', waUrl, '#25D366', BRAND.white) +
    actionBtn('✉ Reply', mailUrl, BRAND.accent, BRAND.white) +
    actionBtn('📊 Open sheet', sheetUrl, BRAND.yellow, BRAND.black);

  return (
    '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>' +
    '<body style="margin:0;padding:0;background:' + BRAND.gray100 + ';font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Helvetica,Arial,sans-serif;">' +
      '<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:' + BRAND.gray100 + ';padding:24px 12px;">' +
        '<tr><td align="center">' +
          '<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:620px;background:' + BRAND.white + ';border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">' +

            '<tr><td style="background:' + BRAND.black + ';padding:22px 24px;">' +
              '<div style="font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:' + BRAND.yellow + ';margin-bottom:6px;">InstaHelp</div>' +
              '<div style="font-size:22px;font-weight:800;color:' + BRAND.white + ';line-height:1.25;">New service request</div>' +
              '<div style="font-size:14px;color:rgba(255,255,255,0.72);margin-top:6px;">' + escapeHtml_(name) + ' · ' + formatIst_(receivedAt) + '</div>' +
            '</td></tr>' +

            '<tr><td style="padding:18px 24px 8px;">' +
              '<span style="display:inline-block;padding:6px 12px;border-radius:999px;background:' + badgeBg + ';color:' + badgeColor + ';font-size:12px;font-weight:700;">' + badgeText + '</span>' +
            '</td></tr>' +

            '<tr><td style="padding:8px 24px 6px;">' +
              '<div style="background:' + BRAND.gray50 + ';border-left:4px solid ' + BRAND.yellow + ';border-radius:8px;padding:16px 18px;margin-bottom:8px;">' +
                '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:' + BRAND.gray400 + ';margin-bottom:8px;">What they need</div>' +
                '<div style="font-size:16px;line-height:1.6;color:' + BRAND.black + ';white-space:pre-wrap;">' + escapeHtml_(message) + '</div>' +
              '</div>' +
            '</td></tr>' +

            '<tr><td style="padding:12px 24px;">' + actions + '</td></tr>' +

            '<tr><td style="padding:4px 24px 24px;">' +
              buildSectionTable_('Contact details', contactRows) +
              buildSectionTable_('Request details', taskRows) +
              buildSectionTable_('Attribution & consent', attributionRows) +
              buildSectionTable_('Traffic & campaign', trafficRows) +
              buildSectionTable_('Submission meta', metaRows) +
            '</td></tr>' +

            '<tr><td style="padding:16px 24px 22px;border-top:1px solid ' + BRAND.gray100 + ';font-size:12px;color:' + BRAND.gray400 + ';line-height:1.5;">' +
              'Logged automatically from <a href="https://instahelp.in" style="color:' + BRAND.accent + ';text-decoration:none;">instahelp.in</a> hero form. ' +
              'Row saved to the leads spreadsheet.' +
            '</td></tr>' +

          '</table>' +
        '</td></tr>' +
      '</table>' +
    '</body></html>'
  );
}

function buildLeadEmailPlain_(data, receivedAt) {
  var lines = [
    'INSTAHELP - NEW SERVICE REQUEST',
    '================================',
    '',
    'Priority: ' + (isConfusionLead_(data) ? 'REVIEW (possible confusion lead)' : 'Standard'),
    'Received: ' + formatIst_(receivedAt),
    '',
    '--- WHAT THEY NEED ---',
    displayOrDash_(data.message),
    'Service: ' + displayOrDash_(data.service),
    '',
    '--- CONTACT ---',
    'Name:    ' + displayOrDash_(data.name),
    'Phone:   ' + displayOrDash_(data.phone),
    'Email:   ' + displayOrDash_(data.email),
    'Address: ' + displayOrDash_(data.address),
    '',
    '--- ATTRIBUTION ---',
    'Source:           ' + labelFor_(SOURCE_LABELS, data.source),
    'Prior use:        ' + labelFor_(PRIOR_PAYMENT_LABELS, data.prior_payment),
    'Consent:          ' + displayOrDash_(data.evidence_consent),
    'Confusion flag:   ' + displayOrDash_(data.confusion_instance),
    'Referrer flag:    ' + displayOrDash_(data.confusion_referral_flag),
    '',
    '--- TRAFFIC ---',
    'Landing:  ' + displayOrDash_(data.landing_page),
    'Referrer: ' + displayOrDash_(data.referrer_url),
    'UTM:      ' + [data.utm_source, data.utm_medium, data.utm_campaign].filter(Boolean).join(' / ') || '-',
    '',
    '--- META ---',
    'Form:      ' + displayOrDash_(data.form_id),
    'Token:     ' + displayOrDash_(data.token),
    'Client at: ' + formatIst_(data.timestamp),
    '',
    'Sheet: https://docs.google.com/spreadsheets/d/' + SPREADSHEET_ID + '/edit'
  ];
  return lines.join('\n');
}

function sendLeadNotificationEmail_(data, receivedAt) {
  var to = getNotifyEmail_();
  if (!to) {
    return;
  }

  var name = displayOrDash_(data.name);
  var taskPreview = String(data.message || '').trim().substring(0, 60);
  var prefix = isConfusionLead_(data) ? '[Review] ' : '';
  var subject = prefix + 'New InstaHelp lead - ' + name + (taskPreview ? ': ' + taskPreview : '');

  MailApp.sendEmail({
    to: to,
    subject: subject,
    body: buildLeadEmailPlain_(data, receivedAt),
    htmlBody: buildLeadEmailHtml_(data, receivedAt),
    name: 'InstaHelp Leads',
    replyTo: data.email || undefined
  });
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

  if (isDuplicateSubmission_(data.token)) {
    return jsonOut_({ success: true, ok: true, duplicate: true });
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
    safeCell_(data.preferred_when),
    safeCell_(data.preferred_date),
    safeCell_(data.preferred_time),
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

  try {
    sendLeadNotificationEmail_(data, nowIso);
  } catch (mailErr) {
    console.warn('Lead email failed: ' + (mailErr.message || mailErr));
  }

  return jsonOut_({ success: true, ok: true });
}

/** Bump when redeploying so the /exec GET response confirms the latest script is live. */
var SCRIPT_VERSION = '2026-07-29';

/** Quick check that the web app URL is live (open /exec in a browser after deploy). */
function doGet() {
  return jsonOut_({
    ok: true,
    service: 'InstaHelp form handler',
    version: SCRIPT_VERSION,
    postSupported: true,
    spreadsheetId: SPREADSHEET_ID,
    sheetName: SHEET_NAME
  });
}

/**
 * Optional: Run once from the editor to send a sample notification email.
 */
function testLeadEmail() {
  var sample = {
    name: 'Test User',
    email: 'test@example.com',
    phone: '9876543210',
    address: '12 MG Road, Bangalore 560001',
    service: 'Home & Personal',
    message: 'Need a plumber to fix a leaking kitchen tap by tomorrow morning.',
    source: 'google',
    prior_payment: 'no',
    evidence_consent: 'YES',
    confusion_instance: 'no',
    referrer_url: 'https://google.com/',
    utm_source: 'google',
    utm_medium: 'cpc',
    utm_campaign: 'brand',
    landing_page: 'https://instahelp.in/',
    confusion_referral_flag: 'no',
    form_id: 'hero_form',
    token: 'test_' + new Date().getTime(),
    timestamp: new Date().toISOString()
  };
  sendLeadNotificationEmail_(sample, new Date().toISOString());
}
