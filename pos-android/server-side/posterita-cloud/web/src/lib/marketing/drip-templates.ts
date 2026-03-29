/**
 * Drip email campaign templates.
 * Ready for integration with Brevo (formerly Sendinblue) or any transactional email provider.
 *
 * Usage: Import DRIP_TEMPLATES, find template by step number, replace {name} and {email} placeholders.
 */

export interface DripTemplate {
  step: number;
  subject: string;
  delayDays: number;
  body: string;
}

export const DRIP_TEMPLATES: DripTemplate[] = [
  {
    step: 1,
    subject: "Welcome to Posterita — your POS is ready",
    delayDays: 1,
    body: `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;font-family:Inter,system-ui,sans-serif;background:#f8fafc;">
<div style="max-width:560px;margin:0 auto;padding:32px 20px;">
  <img src="https://www.posterita.com/img/posterita-logo.png" alt="Posterita" style="height:32px;margin-bottom:24px;" />
  <h1 style="font-size:22px;color:#1e293b;margin:0 0 16px;">Welcome to Posterita, {name}!</h1>
  <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 16px;">
    Thanks for signing up. Your POS account is ready to go. Here's how to get started in under 5 minutes:
  </p>
  <ol style="font-size:15px;color:#475569;line-height:1.8;padding-left:20px;margin:0 0 24px;">
    <li><strong>Add your products</strong> — manually, via CSV, or use our AI import</li>
    <li><strong>Set up your store</strong> — name, address, currency, tax rates</li>
    <li><strong>Download the app</strong> — Android or install the PWA on desktop</li>
    <li><strong>Start selling</strong> — works offline from day one</li>
  </ol>
  <a href="https://web.posterita.com/customer/login" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">Log In to Your Dashboard</a>
  <p style="font-size:13px;color:#94a3b8;margin-top:32px;">
    Questions? Reply to this email or call us at +230 232 1079.
  </p>
</div>
</body></html>`,
  },
  {
    step: 2,
    subject: "Did you know? Posterita works completely offline",
    delayDays: 3,
    body: `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;font-family:Inter,system-ui,sans-serif;background:#f8fafc;">
<div style="max-width:560px;margin:0 auto;padding:32px 20px;">
  <img src="https://www.posterita.com/img/posterita-logo.png" alt="Posterita" style="height:32px;margin-bottom:24px;" />
  <h1 style="font-size:22px;color:#1e293b;margin:0 0 16px;">No internet? No problem.</h1>
  <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 16px;">
    Hi {name}, one of Posterita's most loved features is full offline mode. Every POS operation — scanning, receipts, payments, returns — works without internet.
  </p>
  <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 16px;">
    When connectivity returns, everything syncs automatically. No data loss, no manual uploads.
  </p>
  <div style="background:#eff6ff;border-left:4px solid #2563eb;padding:16px;border-radius:0 8px 8px 0;margin:0 0 24px;">
    <p style="font-size:14px;color:#1e40af;margin:0;"><strong>Pro tip:</strong> Install Posterita as a PWA on your Windows PC for the same offline experience as the Android app.</p>
  </div>
  <a href="https://web.posterita.com/download" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">Download Posterita</a>
  <p style="font-size:13px;color:#94a3b8;margin-top:32px;">
    Posterita Ltd, 2 Royal Road, Coromandel, Mauritius
  </p>
</div>
</body></html>`,
  },
  {
    step: 3,
    subject: "Save money: zero transaction fees with Posterita",
    delayDays: 7,
    body: `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;font-family:Inter,system-ui,sans-serif;background:#f8fafc;">
<div style="max-width:560px;margin:0 auto;padding:32px 20px;">
  <img src="https://www.posterita.com/img/posterita-logo.png" alt="Posterita" style="height:32px;margin-bottom:24px;" />
  <h1 style="font-size:22px;color:#1e293b;margin:0 0 16px;">How much are transaction fees costing you?</h1>
  <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 16px;">
    Hi {name}, did you know that Square charges 2.6% + 10 cents on every transaction? For a store doing $10,000/month, that's $270 lost to fees alone.
  </p>
  <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 16px;">
    <strong>Posterita charges zero transaction fees.</strong> Your plan price is your only cost.
  </p>
  <table style="width:100%;border-collapse:collapse;margin:0 0 24px;font-size:14px;">
    <tr style="background:#f1f5f9;"><th style="text-align:left;padding:10px;">POS</th><th style="padding:10px;">Monthly</th><th style="padding:10px;">Transaction fee</th></tr>
    <tr><td style="padding:10px;border-bottom:1px solid #e2e8f0;">Posterita Starter</td><td style="padding:10px;border-bottom:1px solid #e2e8f0;text-align:center;">$7</td><td style="padding:10px;border-bottom:1px solid #e2e8f0;text-align:center;color:#16a34a;font-weight:600;">0%</td></tr>
    <tr><td style="padding:10px;border-bottom:1px solid #e2e8f0;">Square</td><td style="padding:10px;border-bottom:1px solid #e2e8f0;text-align:center;">$60/loc</td><td style="padding:10px;border-bottom:1px solid #e2e8f0;text-align:center;color:#dc2626;">2.6%+10c</td></tr>
    <tr><td style="padding:10px;">Shopify POS</td><td style="padding:10px;text-align:center;">$89/loc</td><td style="padding:10px;text-align:center;color:#dc2626;">2.4-2.7%</td></tr>
  </table>
  <a href="https://www.posterita.com/#pricing" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">Compare Plans</a>
  <p style="font-size:13px;color:#94a3b8;margin-top:32px;">
    Posterita Ltd, 2 Royal Road, Coromandel, Mauritius
  </p>
</div>
</body></html>`,
  },
  {
    step: 4,
    subject: "Manage your restaurant with Posterita KDS",
    delayDays: 14,
    body: `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;font-family:Inter,system-ui,sans-serif;background:#f8fafc;">
<div style="max-width:560px;margin:0 auto;padding:32px 20px;">
  <img src="https://www.posterita.com/img/posterita-logo.png" alt="Posterita" style="height:32px;margin-bottom:24px;" />
  <h1 style="font-size:22px;color:#1e293b;margin:0 0 16px;">Run your restaurant smarter</h1>
  <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 16px;">
    Hi {name}, if you run a restaurant, cafe, or food service, Posterita has built-in features you won't find in most POS systems:
  </p>
  <ul style="font-size:15px;color:#475569;line-height:1.8;padding-left:20px;margin:0 0 24px;">
    <li><strong>Kitchen Display System (KDS)</strong> — orders route to kitchen/bar screens automatically</li>
    <li><strong>Table management</strong> — sections (indoor, patio, bar), table transfer, merge orders</li>
    <li><strong>Preparation stations</strong> — route items to the right station (kitchen, bar, dessert)</li>
    <li><strong>Order types</strong> — dine-in, takeaway, delivery with address capture</li>
    <li><strong>Menu scheduling</strong> — breakfast, lunch, dinner menus that switch automatically</li>
  </ul>
  <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 24px;">
    The KDS works over your local network — no internet required. Just set up a tablet in the kitchen and you're ready.
  </p>
  <a href="https://web.posterita.com/customer/signup" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">Try It Free</a>
  <p style="font-size:13px;color:#94a3b8;margin-top:32px;">
    Posterita Ltd, 2 Royal Road, Coromandel, Mauritius
  </p>
</div>
</body></html>`,
  },
  {
    step: 5,
    subject: "Ready to grow? Upgrade for loyalty, promotions & more",
    delayDays: 21,
    body: `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;font-family:Inter,system-ui,sans-serif;background:#f8fafc;">
<div style="max-width:560px;margin:0 auto;padding:32px 20px;">
  <img src="https://www.posterita.com/img/posterita-logo.png" alt="Posterita" style="height:32px;margin-bottom:24px;" />
  <h1 style="font-size:22px;color:#1e293b;margin:0 0 16px;">Take your business to the next level</h1>
  <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 16px;">
    Hi {name}, you've been using Posterita — great! Here's what you can unlock with our Growth plan (from just $19/month):
  </p>
  <ul style="font-size:15px;color:#475569;line-height:1.8;padding-left:20px;margin:0 0 16px;">
    <li><strong>Loyalty program</strong> — reward repeat customers with points they can redeem at checkout</li>
    <li><strong>Promotions engine</strong> — buy-X-get-Y, happy hour, percentage discounts that apply automatically</li>
    <li><strong>AI product import</strong> — tell us your business name and we'll find your products online</li>
    <li><strong>Supplier management</strong> — purchase orders, goods receiving, supplier directory</li>
    <li><strong>Quotations</strong> — create, email as PDF, convert to orders</li>
  </ul>
  <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 24px;">
    Or go all-in with Business ($39/mo) for warehouse management, Xero accounting, serialized inventory, and priority support.
  </p>
  <a href="https://www.posterita.com/#pricing" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">View Plans & Pricing</a>
  <p style="font-size:13px;color:#94a3b8;margin-top:32px;">
    Need help choosing? Reply to this email or call +230 232 1079.<br/>
    Posterita Ltd, 2 Royal Road, Coromandel, Mauritius
  </p>
</div>
</body></html>`,
  },
];
