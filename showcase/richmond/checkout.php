<?php
/* =========================================================
   Richmond: Stripe Checkout for gift vouchers

   Only used when js/config.js has PAYMENTS_MODE: 'stripe'.
   Prices are checked here on the server (allowed range or a fixed
   experience price), so a buyer can't change them in the browser.

   SETUP: create stripe-secret.php containing ONLY
       <?php return 'sk_live_...';   // the RESTAURANT'S OWN Stripe key
   and place it one level above public_html (or next to this file).
   It is git-ignored. Without it this endpoint returns 503.
   ========================================================= */
header('Content-Type: application/json');
header('Cache-Control: no-store');
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); echo json_encode(['error' => 'POST only']); exit; }

$secret = null;
foreach ([dirname(__DIR__) . '/stripe-secret.php', __DIR__ . '/stripe-secret.php'] as $f) { if (is_file($f)) { $secret = require $f; break; } }
if (!$secret || !is_string($secret) || strpos($secret, 'sk_') !== 0) { http_response_code(503); echo json_encode(['error' => 'Online payments are not switched on yet.']); exit; }

$EXPERIENCES = [
  'early-evening-2' => ['Early Evening for Two', 110],
  'sunday-lunch-2'  => ['Sunday Lunch for Two', 90],
  'tasting-2'       => ['Tuesday Tasting for Two', 156],
];
$MIN = 25; $MAX = 1000; $MAXQTY = 10;

$in = json_decode(file_get_contents('php://input'), true) ?: [];
$clean = fn($v, $n) => mb_substr(trim(strip_tags((string)$v)), 0, $n);
$qty = (int)($in['qty'] ?? 1);
if ($qty < 1 || $qty > $MAXQTY) { http_response_code(400); echo json_encode(['error' => 'Please choose a quantity from 1 to ' . $MAXQTY . '.']); exit; }

if (($in['type'] ?? '') === 'experience') {
  $id = (string)($in['experience'] ?? '');
  if (!isset($EXPERIENCES[$id])) { http_response_code(400); echo json_encode(['error' => 'That experience is no longer available.']); exit; }
  [$name, $euros] = $EXPERIENCES[$id];
} else {
  $euros = round((float)($in['amount'] ?? 0), 2);
  if ($euros < $MIN || $euros > $MAX) { http_response_code(400); echo json_encode(['error' => "Please choose an amount between €$MIN and €$MAX."]); exit; }
  $name = 'Richmond gift voucher €' . (floor($euros) == $euros ? (int)$euros : number_format($euros, 2));
}

$email = filter_var($in['email'] ?? '', FILTER_VALIDATE_EMAIL);
if (!$email) { http_response_code(400); echo json_encode(['error' => 'Please add a valid email.']); exit; }

$base = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off' ? 'https' : 'http') . '://' . $_SERVER['HTTP_HOST'] . rtrim(dirname($_SERVER['SCRIPT_NAME']), '/');
$params = [
  'mode' => 'payment',
  'customer_email' => $email,
  'line_items' => [[ 'quantity' => $qty, 'price_data' => [ 'currency' => 'eur', 'unit_amount' => (int)round($euros * 100), 'product_data' => ['name' => $name] ] ]],
  'success_url' => $base . '/?voucher=thanks&session_id={CHECKOUT_SESSION_ID}#vouchers',
  'cancel_url' => $base . '/#vouchers',
  'metadata' => [
    'kind' => 'gift_voucher',
    'from' => $clean($in['from'] ?? '', 80),
    'to' => $clean($in['to'] ?? '', 80),
    'to_email' => $clean($in['toEmail'] ?? '', 120),
    'send_on' => $clean($in['sendOn'] ?? '', 10),
    'message' => $clean($in['message'] ?? '', 160),
  ],
];
$ch = curl_init('https://api.stripe.com/v1/checkout/sessions');
curl_setopt_array($ch, [CURLOPT_POST => true, CURLOPT_RETURNTRANSFER => true, CURLOPT_USERPWD => $secret . ':', CURLOPT_POSTFIELDS => http_build_query($params), CURLOPT_TIMEOUT => 20]);
$res = curl_exec($ch); $code = curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch);
$s = json_decode((string)$res, true);
if ($code !== 200 || empty($s['url'])) { http_response_code(502); echo json_encode(['error' => $s['error']['message'] ?? 'Payment provider error.']); exit; }
echo json_encode(['url' => $s['url']]);
