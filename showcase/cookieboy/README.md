# Cookieboy: concept site

Concept click-and-collect site for **Cookieboy**, a Korean cookie shop at 20 Stephen Street Lower, Dublin 2 (current site: cookieboy.ie).
Built by Agentic Services as a showcase. Live demo: `https://agenticservices.ie/showcase/cookieboy/`

Plain HTML/CSS/JS. No framework and no build step except the products file.

## Edit
- **Cookies and prices:** `data/products.json` (prices are in cents). Then run `node tools/build-products.js` to regenerate `js/products.js`.
- **Hours, slots and payment mode:** `js/store-config.js`.
- **Text, reviews and contact details:** `index.html`.

## Payments
- `PAYMENTS_MODE: 'demo'` (default): the full order flow runs, but no card is charged. Use this for showcasing.
- `PAYMENTS_MODE: 'stripe'`: `checkout.php` creates a Stripe Checkout Session using the server-side prices from `data/products.json`.
  It needs `stripe-secret.php` (`<?php return 'sk_live_...';`) holding **the shop's own** Stripe key, placed above `public_html`. That file is git-ignored.

## Going live on cookieboy.ie
1. Copy this folder to the new repo or host root.
2. Remove the `.concept-bar` element and the Agentic Services footer credit, and change `robots` to `index, follow`.
3. Add the shop's Stripe key and switch `PAYMENTS_MODE` to `stripe`.

## Sources (gathered 11 Nov 2026)
- Menu, hours, address, Instagram and press mentions: cookieboy.ie
- Rating (4.9 from 377 reviews), phone number and reviews: the Google Maps business profile
- €4.50 per cookie: mentioned in a Google review. **Confirm with the shop.**
- Cookie photos: cookieboy.ie
