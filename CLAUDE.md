# agenticservices.ie: notes for Claude

Nick's agency site (Agentic Services). Static HTML/CSS/JS on Hostinger, deployed from `main`.
Local copy: `C:\Claudework\Agentic Services`.

## Demo / showcase sites
Concept sites for prospects live in `showcase/<slug>/`, each fully self-contained (own css/js/images).
- The **Demos** dropdown in the nav (every page) and `showcase/index.html` both read `js/showcase-sites.js`.
  To add a demo, add one line there (newest first).
- Each demo keeps the `.concept-bar` ("Concept website by Agentic Services…"), `noindex`, and
  payments in **demo mode** (`PAYMENTS_MODE: 'demo'`). Never wire a demo to Nick's own Stripe account:
  live payments only go in once the business has its own key (`stripe-secret.php`, git-ignored).
- Also copy each demo into its own folder in `C:\Claudework\<business>` so it can become the real site.

## New demo from screenshots (usual workflow)
1. Screenshots arrive (phone) or sit in `C:\Users\Nicholas Rooney\Pictures\Screenshots`.
2. Look the business up on Google Maps (Chrome): address, hours, phone, rating, 5-star reviews, menu/prices.
3. Check their current website for menus and prices.
4. Build `showcase/<slug>/`, add it to `js/showcase-sites.js`, then commit and push.

Existing patterns to reuse:
- Click & collect with Stripe Checkout: `showcase/cookieboy/`
- OpenTable-style booking and gift vouchers: `showcase/richmond/` (the real PHP booking backend is in `octoberchinese.ie`)
