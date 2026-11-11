/* =========================================================
   Cookieboy — store settings (the one file to edit)
   ========================================================= */
window.COOKIEBOY = {
  // 'demo'   = full order flow, no card is charged (safe for the showcase)
  // 'stripe' = real Stripe Checkout via checkout.php. Needs stripe-secret.php
  //            (the SHOP'S OWN Stripe secret key) on the server, never in git.
  PAYMENTS_MODE: 'demo',
  CHECKOUT_ENDPOINT: 'checkout.php',

  // Collection slots
  SLOT_MINUTES: 15,       // gap between collection times
  PREP_MINUTES: 20,       // earliest pickup = now + this
  LAST_ORDER_MINUTES: 15, // stop taking orders this long before closing
  DAYS_AHEAD: 2,          // today + 2 days
  MAX_PER_ITEM: 12,

  // Opening hours (0 = Sunday). [open, close] 24h "HH:MM"
  HOURS: {
    0: ['10:00', '17:00'],
    1: ['08:00', '17:00'],
    2: ['08:00', '17:00'],
    3: ['08:00', '17:00'],
    4: ['08:00', '17:00'],
    5: ['08:00', '17:00'],
    6: ['09:00', '18:00']
  }
};
