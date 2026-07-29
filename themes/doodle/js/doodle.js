/**
 * Doodle Theme — decoration loader
 * Injects floating stars/strings when <body class="doodle-page">.
 * Requires css/doodle.css from this folder.
 */
(function () {
  'use strict';

  if (!document.body || !document.body.classList.contains('doodle-page')) {
    return;
  }

  if (document.querySelector('.page-deco')) {
    return;
  }

  var deco = document.createElement('div');
  deco.className = 'page-deco';
  deco.setAttribute('aria-hidden', 'true');
  deco.innerHTML =
    '<svg class="page-deco-star page-deco-star-1" viewBox="0 0 24 24" fill="#ffd166" stroke="#323232" stroke-width="1.5" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>' +
    '<svg class="page-deco-star page-deco-star-2" viewBox="0 0 24 24" fill="#ff6b6b" stroke="#323232" stroke-width="1.5" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>' +
    '<svg class="page-deco-star page-deco-star-3" viewBox="0 0 24 24" fill="#4ecdc4" stroke="#323232" stroke-width="1.5" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>' +
    '<svg class="page-deco-star page-deco-star-4" viewBox="0 0 24 24" fill="#06d6a0" stroke="#323232" stroke-width="1.5" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>' +
    '<svg class="page-deco-star page-deco-star-5" viewBox="0 0 24 24" fill="#ffd166" stroke="#323232" stroke-width="1.5" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>' +
    '<svg class="page-deco-star page-deco-star-6" viewBox="0 0 24 24" fill="#ff6b6b" stroke="#323232" stroke-width="1.5" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>' +
    '<svg class="page-deco-sparkle page-deco-sparkle-1" viewBox="0 0 24 24" fill="#06d6a0" stroke="#323232" stroke-width="1.5"><path d="M12 2 Q12 12 22 12 Q12 12 12 22 Q12 12 2 12 Q12 12 12 2 Z"/></svg>' +
    '<svg class="page-deco-sparkle page-deco-sparkle-2" viewBox="0 0 24 24" fill="#ffd166" stroke="#323232" stroke-width="1.5"><path d="M12 2 Q12 12 22 12 Q12 12 12 22 Q12 12 2 12 Q12 12 12 2 Z"/></svg>' +
    '<svg class="page-deco-sparkle page-deco-sparkle-3" viewBox="0 0 24 24" fill="#4ecdc4" stroke="#323232" stroke-width="1.5"><path d="M12 2 Q12 12 22 12 Q12 12 12 22 Q12 12 2 12 Q12 12 12 2 Z"/></svg>' +
    '<svg class="page-deco-string page-deco-string-1" viewBox="0 0 80 140" fill="none"><path d="M40 0 C28 40 18 80 36 120" stroke="#323232" stroke-width="2" stroke-linecap="round"/><polygon fill="#ffd166" stroke="#323232" stroke-width="1.5" points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" transform="translate(18, 108) scale(0.5)"/></svg>' +
    '<svg class="page-deco-string page-deco-string-2" viewBox="0 0 80 120" fill="none"><path d="M40 0 C52 35 62 70 44 100" stroke="#323232" stroke-width="2" stroke-linecap="round"/><polygon fill="#06d6a0" stroke="#323232" stroke-width="1.5" points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" transform="translate(18, 88) scale(0.5)"/></svg>' +
    '<svg class="page-deco-string page-deco-string-3" viewBox="0 0 100 24" fill="none"><path d="M0 12 Q25 4 50 12 T100 10" stroke="#323232" stroke-width="1.5" stroke-linecap="round" stroke-dasharray="4 6"/></svg>';

  document.body.insertBefore(deco, document.body.firstChild);
})();
