# Richmond: concept site

Concept site for **Richmond**, a Michelin Bib Gourmand restaurant at 43 Richmond St South, Portobello, Dublin 2 (current site: richmondrestaurant.ie).
Built by Agentic Services. Live demo: `https://agenticservices.ie/showcase/richmond/`

## What's in it
- **OpenTable-style booking.** You pick party size, date and preferred time and get the five nearest free times, plus "View full availability". The details step (seating, occasion, voucher code) opens after a time is picked, and the booking can be added to a calendar. This is the same flow as `octoberchinese.ie/js/booking.js`.
- **Gift vouchers.** Fixed amounts (€25–€250), a custom amount (€25–€1,000), or dining experiences priced from the real menus. You can send to yourself or straight to the recipient on a chosen date, with a live preview of the card and a printable voucher.
- **Menus.** Dinner, Early Evening, Sunday Lunch and Tuesday Tasting, with real dishes and prices taken from richmondrestaurant.ie on 11 Nov 2026.
- **Also included:** a gallery of their dishes (from today's Google Maps screenshots), Google reviews (4.8 from 928), hours and a map.

## Edit
Everything editable lives in `js/config.js`: hours and seatings, voucher amounts and experiences, and menus.

## Demo vs real
- **Booking:** the demo generates availability in the browser. In the real build, copy the PHP booking backend from `octoberchinese.ie` (`includes/booking-picker.php`, `slots.php`, `booking-handler.php`, `staff/`). Then point `availability()` in `js/app.js` at `slots.php?date=…&guests=…`, as October's `js/booking.js` does.
- **Vouchers:** set `PAYMENTS_MODE: 'stripe'` and add `stripe-secret.php` with **the restaurant's own** Stripe key. `checkout.php` validates prices on the server.

## Going live
Remove `.concept-bar` and the footer credit, and change `robots` to `index, follow`.
