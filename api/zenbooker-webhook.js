/* Zenbooker webhook receiver — R.L. Hayes landing pages
   ------------------------------------------------------
   On job.created: pull the Google Ads click id (gclid / wbraid / gbraid) out
   of the visit data Zenbooker captured, and upload the booking to Google Ads
   as an offline conversion via the Data Manager API.

   Why this exists: Zenbooker's client-side `submission` widget event failed
   to deliver for a real paid booking on 2026-08-10 (iPhone traffic), so the
   on-page gtag conversion never fired. This server-side path can't miss:
   Zenbooker's servers call us on every real booking.

   Conversion action: "Zenbooker Booking (Import)" (UPLOAD_CLICKS type,
   customers/1849118892/conversionActions/7724671566). The old on-page
   "Book appointment" tag stays as a secondary/diagnostic signal.

   Env vars required on this Vercel project (Production):
     GOOGLE_SERVICE_ACCOUNT      full service-account JSON (same as Command Center)
     GOOGLE_ADS_SUBJECT          the Workspace user the SA impersonates
     ZENBOOKER_WEBHOOK_TOKEN     shared secret; must match ?t= on the webhook URL

   Zenbooker webhook URL:
   https://rlhayes.vercel.app/api/zenbooker-webhook?t=<ZENBOOKER_WEBHOOK_TOKEN>  */

var crypto = require('crypto');

var ADS_CUSTOMER_ID = '1849118892';
var MCC_ID = '4068974799';
var CONVERSION_ACTION_ID = '7724671566';

function b64u(obj) {
  return Buffer.from(typeof obj === 'string' ? obj : JSON.stringify(obj)).toString('base64url');
}

/* Service-account JWT -> OAuth token with the Data Manager scope. */
function getToken(cb) {
  var sa = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
  var now = Math.floor(Date.now() / 1000);
  var header = b64u({ alg: 'RS256', typ: 'JWT' });
  var claim = b64u({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/datamanager',
    aud: 'https://oauth2.googleapis.com/token',
    sub: process.env.GOOGLE_ADS_SUBJECT,
    iat: now,
    exp: now + 3600,
  });
  var sig = crypto.createSign('RSA-SHA256').update(header + '.' + claim).sign(sa.private_key).toString('base64url');
  fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: header + '.' + claim + '.' + sig,
    }),
  })
    .then(function (r) { return r.json(); })
    .then(function (j) { cb(j.access_token ? null : new Error('token: ' + JSON.stringify(j)), j.access_token); })
    .catch(cb);
}

/* Find gclid / wbraid / gbraid in Zenbooker's captured landing-page URLs. */
function extractClickId(conv) {
  if (!conv) return null;
  var urls = [conv.landingpage, conv.session_landing_page].filter(Boolean);
  for (var i = 0; i < urls.length; i++) {
    var m = String(urls[i]).match(/[?&](gclid|wbraid|gbraid)=([^&#]+)/);
    if (m) return { kind: m[1], value: decodeURIComponent(m[2]) };
  }
  return null;
}

module.exports = function (req, res) {
  if ((req.query && req.query.t) !== process.env.ZENBOOKER_WEBHOOK_TOKEN) {
    res.status(404).end();
    return;
  }

  var body = req.body || {};
  var data = body.data || {};

  // Always log what arrived (PII-light: no name/email/phone in the log line).
  console.log(
    'ZENBOOKER_WEBHOOK ' +
      JSON.stringify({
        at: new Date().toISOString(),
        event: body.event || null,
        job_id: data.id || null,
        retry: body.retry_count || 0,
        landingpage: (data.conversion_summary || {}).landingpage || null,
      })
  );

  if (body.event !== 'job.created') {
    res.status(200).json({ ok: true, skipped: 'event ' + body.event });
    return;
  }

  var click = extractClickId(data.conversion_summary);
  if (!click) {
    console.log('ZENBOOKER_NO_CLICK_ID job=' + (data.id || '?') + ' — booking not from an ad click, nothing to upload');
    res.status(200).json({ ok: true, skipped: 'no click id' });
    return;
  }

  getToken(function (err, token) {
    if (err) {
      console.error('ZENBOOKER_UPLOAD_TOKEN_FAIL ' + String(err));
      // 200 anyway: Zenbooker retries are not going to fix a config problem,
      // and the log line is the alert.
      res.status(200).json({ ok: false, error: 'token' });
      return;
    }

    var adIdentifiers = {};
    adIdentifiers[click.kind] = click.value;

    fetch('https://datamanager.googleapis.com/v1/events:ingest', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        destinations: [
          {
            operatingAccount: { accountType: 'GOOGLE_ADS', accountId: ADS_CUSTOMER_ID },
            loginAccount: { accountType: 'GOOGLE_ADS', accountId: MCC_ID },
            productDestinationId: CONVERSION_ACTION_ID,
          },
        ],
        events: [
          {
            eventTimestamp: new Date().toISOString(),
            // Zenbooker job id dedupes webhook retries into one conversion.
            transactionId: 'zb-' + (data.id || Date.now()),
            conversionValue: 1.0,
            currency: 'USD',
            adIdentifiers: adIdentifiers,
          },
        ],
      }),
    })
      .then(function (r) { return r.json().then(function (j) { return { status: r.status, json: j }; }); })
      .then(function (out) {
        console.log('ZENBOOKER_UPLOAD_RESULT ' + JSON.stringify({ job: data.id || null, click: click.kind, status: out.status, response: out.json }));
        res.status(200).json({ ok: out.status === 200 });
      })
      .catch(function (e) {
        console.error('ZENBOOKER_UPLOAD_FAIL ' + String(e));
        res.status(200).json({ ok: false });
      });
  });
};
