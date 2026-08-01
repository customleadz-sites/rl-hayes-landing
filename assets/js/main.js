/* ==========================================================================
   R.L. Hayes landing pages — tracking + scroll reveals
   --------------------------------------------------------------------------
   TRACKING SETUP (do this before running ads):
   1. In Google Ads, create three conversion actions:
        "Phone Call — Landing Page", "Booking Started", "Booking Completed"
      ("Booking Completed" should be the primary conversion — it's a real,
      confirmed booking fired by Zenbooker's official widget event.)
   2. Google Ads gives you a conversion ID (AW-XXXXXXXXXX) and a label for each.
   3. Paste them into the CONVERSIONS object below.
   4. Paste the AW- ID into the gtag snippet in the <head> of every page.
   Until that's done these calls are harmless no-ops — nothing breaks.
   ========================================================================== */

var CONVERSIONS = {
  callClick:       'AW-XXXXXXXXXX/XXXXXXXXXXXXXXXXXX',   // <- replace
  bookingStart:    'AW-XXXXXXXXXX/XXXXXXXXXXXXXXXXXX',   // <- replace
  bookingComplete: 'AW-XXXXXXXXXX/XXXXXXXXXXXXXXXXXX'    // <- replace
};

function fire(sendTo, label) {
  if (sendTo.indexOf('XXXX') !== -1) return;           // not configured yet
  if (typeof gtag !== 'function') return;
  gtag('event', 'conversion', { send_to: sendTo, event_label: label });
}

(function () {
  'use strict';

  var page = document.body.getAttribute('data-page') || 'unknown';

  /* --- Phone call clicks ------------------------------------------------ */
  document.addEventListener('click', function (e) {
    var link = e.target.closest && e.target.closest('a[href^="tel:"]');
    if (!link) return;
    fire(CONVERSIONS.callClick, page + ' | ' + (link.getAttribute('data-loc') || 'call'));
    if (typeof gtag === 'function') {
      gtag('event', 'phone_call_click', { page_variant: page });
    }
  });

  /* --- Booking widget engagement ----------------------------------------
     Three signals, weakest to strongest:
       a) "booking_viewed"  — the booking section scrolled into view
       b) "booking_interaction" — the Zenbooker iframe posted a message
       c) "booking_completed" — Zenbooker's OFFICIAL widget event fired on a
          real confirmed booking (Zenbooker.on "submission" — see
          developers.zenbooker.com/docs/widget-events). This one is the
          conversion that matters.
     ---------------------------------------------------------------------- */
  var counted = false;
  var book = document.getElementById('book');

  if (book && 'IntersectionObserver' in window) {
    var bo = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting && !counted) {
          counted = true;
          if (typeof gtag === 'function') {
            gtag('event', 'booking_viewed', { page_variant: page });
          }
          bo.disconnect();
        }
      });
    }, { threshold: 0.4 });
    bo.observe(book);
  }

  window.addEventListener('message', function (e) {
    if (!/zenbooker\.com$/.test((e.origin || '').replace(/^https?:\/\//, ''))) return;
    fire(CONVERSIONS.bookingStart, page + ' | zenbooker');
    if (typeof gtag === 'function') {
      gtag('event', 'booking_interaction', { page_variant: page });
    }
  }, false);

  /* zenbooker.js loads with `defer`, so poll briefly until its API exists,
     then attach the completed-booking listener. */
  var zbTries = 0;
  (function hookZenbooker() {
    if (window.Zenbooker && typeof window.Zenbooker.on === 'function') {
      window.Zenbooker.on('submission', function (ev) {
        fire(CONVERSIONS.bookingComplete, page + ' | booking-complete');
        if (typeof gtag === 'function') {
          gtag('event', 'booking_completed', {
            page_variant: page,
            service: (ev && ev.service_name) || ''
          });
        }
      });
    } else if (zbTries++ < 50) {
      setTimeout(hookZenbooker, 200);
    }
  })();

  /* --- Scroll reveals ---------------------------------------------------- */
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var items = document.querySelectorAll('.reveal');

  if (reduce || !('IntersectionObserver' in window)) {
    items.forEach(function (el) { el.classList.add('in'); });
    return;
  }

  var ro = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      var el = en.target;
      var i = Number(el.getAttribute('data-i') || 0);
      setTimeout(function () { el.classList.add('in'); }, i * 70);
      ro.unobserve(el);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });

  items.forEach(function (el) { ro.observe(el); });
})();
