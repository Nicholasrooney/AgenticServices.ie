<?php
/* =========================================================
   Cookieboy: Stripe Checkout endpoint (click & collect)

   Only used when js/store-config.js has PAYMENTS_MODE: 'stripe'.
   Creates a Stripe Checkout Session using SERVER-SIDE prices from
   data/products.json, so a customer can't change prices in the browser.

   SETUP (when the shop goes live on its own domain):
   1. Create stripe-secret.php containing ONLY:
        <?php return 'sk_live_...';   // the SHOP'S OWN Stripe secret key
      Put it ONE LEVEL ABOVE public_html (safest) or next to this file.
      It is git-ignored. Never commit it.
   2. Set PAYMENTS_MODE: 'stripe' in js/store-config.js.
   Until the key file exists this endpoint returns 503 and nothing is charged.
   ========================================================= */

header('Content-Type: application/json');
header('Cache-Control: no-store');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); echo json_encode(['error' => 'POST only']); exit; }

$secret = null;
foreach ([dirname(__DIR__) . '/stripe-secret.php', __DIR__ . '/stripe-secret.php'] as $f) {
  if (is_file($f)) { $secret = require $f; break; }
}
if (!$secret || !is_string($secret) || strpos($secret, 'sk_') !== 0) {
  http_response_code(503); echo json_encode(['error' => 'Online payments are not switched on yet.']); exit;
}

$in = json_decode(file_get_contents('php://input'), true);
if (!is_array($in) || empty($in['items']) || !is_array($in['items'])) {
  http_response_code(400); echo json_encode(['error' => 'Your bag is empty.']); exit;
}

/* Trusted catalogue */
$cat = json_decode(file_get_contents(__DIR__ . '/data/products.json'), true);
$byId = [];
foreach ($cat['products'] as $p) $byId[$p['id']] = $p;

$line = [];
$summary = [];
foreach ($in['items'] as $it) {
  $id = (string)($it['id'] ?? '');
  $qty = (int)($it['qty'] ?? 0);
  if (!isset($byId[$id]) || $qty < 1 || $qty > 12) { http_response_code(400); echo json_encode(['error' => 'Something in your bag is no longer available.']); exit; }
  $p = $byId[$id];
  $line[] = [
    'quantity' => $qty,
    'price_data' => [
      'currency' => $cat['currency'],
      'unit_amount' => (int)$p['price'],
      'product_data' => ['name' => $p['name']],
    ],
  ];
  $summary[] = $qty . 'x ' . $p['name'];
}

/* Customer + collection details */
$clean = fn($v, $n) => mb_substr(trim(strip_tags((string)$v)), 0, $n);
$name  = $clean($in['name'] ?? '', 80);
$phone = $clean($in['phone'] ?? '', 30);
$email = filter_var($in['email'] ?? '', FILTER_VALIDATE_EMAIL) ?: null;
$label = $clean($in['pickupLabel'] ?? '', 60);
$note  = $clean($in['note'] ?? '', 200);
$pickup = strtotime((string)($in['pickup'] ?? ''));
if (!$name || !$phone || !$pickup || $pickup < time() - 300 || $pickup > time() + 4 * 86400) {
  http_response_code(400); echo json_encode(['error' => 'Please check your details and collection time.']); exit;
}

$base = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off' ? 'https' : 'http') . '://' . $_SERVER['HTTP_HOST'] . rtrim(dirname($_SERVER['SCRIPT_NAME']), '/');

$params = [
  'mode' => 'payment',
  'line_items' => $line,
  'success_url' => $base . '/success.html?session_id={CHECKOUT_SESSION_ID}&pickup=' . rawurlencode($label),
  'cancel_url' => $base . '/#cookies',
  'payment_intent_data' => ['description' => 'Cookieboy click & collect: ' . $label],
  'metadata' => [
    'collection' => $label,
    'customer_name' => $name,
    'customer_phone' => $phone,
    'items' => mb_substr(implode(', ', $summary), 0, 480),
    'note' => $note,
  ],
];
if ($email) $params['customer_email'] = $email;

$ch = curl_init('https://api.stripe.com/v1/checkout/sessions');
curl_setopt_array($ch, [
  CURLOPT_POST => true,
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_USERPWD => $secret . ':',
  CURLOPT_POSTFIELDS => http_build_query($params),
  CURLOPT_TIMEOUT => 20,
]);
$res = curl_exec($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

$session = json_decode((string)$res, true);
if ($code !== 200 || empty($session['url'])) {
  http_response_code(502);
  echo json_encode(['error' => $session['error']['message'] ?? 'Payment provider error.']);
  exit;
}
echo json_encode(['url' => $session['url']]);
