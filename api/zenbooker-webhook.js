/* Zenbooker webhook receiver — R.L. Hayes landing pages
   ------------------------------------------------------
   PHASE 1 (current): payload catcher. Logs everything Zenbooker sends so we
   can see which fields the job.created payload actually carries (the docs
   list no attribution fields, but the dashboard shows landing-page info —
   this settles it). Read the output in Vercel → Project → Logs.

   PHASE 2 (next): once we know the fields, this same endpoint uploads the
   booking to Google Ads as an offline / enhanced conversion.

   The ?t= token keeps random crawlers out. Zenbooker webhook URL:
   https://rlhayes.vercel.app/api/zenbooker-webhook?t=0a87c5878388           */

var SECRET = '0a87c5878388';

module.exports = function (req, res) {
  if ((req.query && req.query.t) !== SECRET) {
    res.status(404).end();
    return;
  }

  console.log(
    'ZENBOOKER_WEBHOOK ' +
      JSON.stringify({
        at: new Date().toISOString(),
        method: req.method,
        headers: {
          'content-type': req.headers['content-type'] || null,
          'user-agent': req.headers['user-agent'] || null,
          // Zenbooker may sign payloads — capture anything that looks like it
          signature:
            req.headers['x-zenbooker-signature'] ||
            req.headers['x-signature'] ||
            null,
        },
        body: req.body || null,
      })
  );

  res.status(200).json({ ok: true });
};
