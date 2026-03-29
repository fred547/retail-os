import Link from "next/link";

export const metadata = {
  title: "Terms & Conditions — Posterita",
  description: "Terms of Service for Posterita Retail OS, the cloud POS system by Tamak Group.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm">P</div>
            <span className="text-lg font-bold text-gray-900">Posterita</span>
          </Link>
          <Link href="/login" className="text-sm text-blue-600 hover:underline">Sign In</Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <h1 className="text-3xl font-bold text-gray-900">Terms &amp; Conditions</h1>
        <p className="text-sm text-gray-500 mt-2">Last updated: 29 March 2026</p>

        <div className="prose prose-gray prose-sm max-w-none mt-8 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-10 [&_h2]:mb-4 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mt-6 [&_h3]:mb-2 [&_p]:leading-relaxed [&_p]:text-gray-600 [&_li]:text-gray-600 [&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:pl-6">

          <p>
            These Terms &amp; Conditions (&ldquo;Terms&rdquo;) form a binding agreement between you (&ldquo;Customer,&rdquo; &ldquo;you,&rdquo; &ldquo;your&rdquo;) and <strong>Posterita</strong>, a product of Tamak Group Ltd, a company registered in the Republic of Mauritius (&ldquo;Posterita,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; &ldquo;our&rdquo;). By creating an account, installing the application, or using any part of the Services, you agree to be bound by these Terms.
          </p>
          <p>
            If you are entering into these Terms on behalf of a business entity, you represent that you have the authority to bind that entity. If you do not agree to these Terms, do not use the Services.
          </p>

          {/* ── 1. DEFINITIONS ─────────────────────────────── */}
          <h2>1. Definitions</h2>
          <ul>
            <li><strong>&ldquo;Account&rdquo;</strong> means the brand or business entity registered on the Posterita platform, identified by a unique account ID.</li>
            <li><strong>&ldquo;Account Owner&rdquo;</strong> means the individual who created the Account and has ultimate administrative control.</li>
            <li><strong>&ldquo;Authorized Users&rdquo;</strong> means staff, cashiers, supervisors, and administrators added to the Account by the Account Owner.</li>
            <li><strong>&ldquo;Services&rdquo;</strong> means, collectively, the Posterita Android POS application, web console at web.posterita.com, API endpoints, sync infrastructure, and any related tools or features.</li>
            <li><strong>&ldquo;Subscription Plan&rdquo;</strong> means the pricing tier selected by the Customer (Free, Starter, Growth, or Business).</li>
            <li><strong>&ldquo;Customer Data&rdquo;</strong> means all data entered by or generated through the Customer&rsquo;s use of the Services, including products, orders, customer records, staff data, inventory counts, and transaction history.</li>
            <li><strong>&ldquo;Terminal&rdquo;</strong> means a registered device (POS register, KDS screen, mobile staff device, or self-service kiosk) associated with a Store.</li>
            <li><strong>&ldquo;Store&rdquo;</strong> means a physical or virtual retail location within an Account.</li>
            <li><strong>&ldquo;Third-Party Services&rdquo;</strong> means services not operated by Posterita, including payment processors, accounting integrations, hardware vendors, and AI providers.</li>
          </ul>

          {/* ── 2. ACCOUNT REGISTRATION ────────────────────── */}
          <h2>2. Account Registration &amp; Eligibility</h2>
          <h3>2.1 Eligibility</h3>
          <p>You must be at least 18 years old and legally capable of entering into binding agreements. If you use the Services on behalf of a business, you must have the authority to bind that entity.</p>

          <h3>2.2 Registration</h3>
          <p>To use the Services, you must register for an Account by providing a valid email address, business name, and phone number. You agree to provide accurate, current, and complete information and to update it as necessary.</p>

          <h3>2.3 Account Security</h3>
          <p>You are responsible for maintaining the confidentiality of your account credentials, including passwords and device PINs. PINs are 4-digit device-level unlock codes and are not substitutes for passwords. You are responsible for all activity under your Account, including actions taken by Authorized Users. You must notify us immediately at <a href="mailto:security@posterita.com">security@posterita.com</a> if you suspect unauthorized access.</p>

          <h3>2.4 Account Hierarchy</h3>
          <p>Accounts follow an Owner &gt; Brand &gt; Store &gt; Terminal hierarchy. The Account Owner is responsible for managing all Authorized Users and their permissions. Adding an Authorized User grants them access according to their assigned role (owner, admin, supervisor, cashier, or staff).</p>

          <h3>2.5 Demo Accounts</h3>
          <p>Upon registration, we may create a demonstration account with sample data. Demo accounts are for evaluation only and may be deleted after 90 days of inactivity.</p>

          {/* ── 3. SUBSCRIPTION & BILLING ──────────────────── */}
          <h2>3. Subscription Plans &amp; Billing</h2>
          <h3>3.1 Plan Tiers</h3>
          <p>We offer four subscription tiers: Free, Starter, Growth, and Business. Features, limits, and pricing for each tier are described on our pricing page and may be updated from time to time.</p>

          <h3>3.2 Billing</h3>
          <p>Paid subscriptions are billed through our payment partner, <strong>Paddle.com Market Limited</strong>, which acts as the Merchant of Record. Paddle handles payment processing, invoicing, tax collection, and refunds on our behalf. By subscribing to a paid plan, you also agree to <a href="https://www.paddle.com/legal/terms" target="_blank" rel="noopener noreferrer">Paddle&rsquo;s Terms of Service</a>.</p>

          <h3>3.3 Billing Cycle &amp; Renewal</h3>
          <p>Subscriptions are billed on a monthly or annual cycle as selected at checkout. Subscriptions auto-renew at the end of each billing period unless cancelled before the renewal date.</p>

          <h3>3.4 Price Changes</h3>
          <p>We may change our pricing at any time. For existing subscribers, price changes take effect at the start of the next billing period with at least 30 days&rsquo; prior notice by email.</p>

          <h3>3.5 Taxes</h3>
          <p>Paddle collects applicable sales tax, VAT, or GST depending on your jurisdiction. You are responsible for any other taxes, levies, or duties imposed by your local tax authority in relation to the operation of your business.</p>

          <h3>3.6 Failed Payments</h3>
          <p>If a payment fails, we will notify you and provide a 7-day grace period. If payment is not resolved within 14 days, your Account may be suspended. Access will be restored upon successful payment.</p>

          <h3>3.7 Refunds</h3>
          <p>Monthly subscriptions are non-refundable after the billing period begins. Annual subscriptions may be refunded on a pro-rata basis if cancelled within 14 days of purchase or renewal. Refund requests should be directed to <a href="mailto:billing@posterita.com">billing@posterita.com</a>.</p>

          <h3>3.8 Free Tier</h3>
          <p>The Free tier is subject to limitations on the number of terminals, stores, users, and available features. We reserve the right to modify Free tier limits with 30 days&rsquo; notice.</p>

          {/* ── 4. USE OF SERVICES ─────────────────────────── */}
          <h2>4. Use of the Services</h2>
          <h3>4.1 License</h3>
          <p>Subject to these Terms, we grant you a non-exclusive, non-transferable, revocable license to access and use the Services for your internal business operations during your subscription term.</p>

          <h3>4.2 Offline Functionality</h3>
          <p>The Android POS application is designed to operate offline. Point-of-sale transactions, cart operations, and till management work without an internet connection. Data synchronises with the cloud when connectivity is restored. You acknowledge that during offline periods, data on the device may differ from the cloud until sync completes.</p>

          <h3>4.3 Sync &amp; Data Consistency</h3>
          <p>We use commercially reasonable efforts to ensure timely and accurate synchronisation between devices and the cloud. However, we do not guarantee real-time sync or zero data loss. Conflict resolution is handled server-side, and the server is the authoritative source of truth for master data.</p>

          <h3>4.4 API Usage</h3>
          <p>Our API is subject to fair-use rate limits (currently 30 requests per minute per IP). Automated access beyond fair use, scraping, or unauthorised automation is prohibited without our prior written consent.</p>

          {/* ── 5. ACCEPTABLE USE ──────────────────────────── */}
          <h2>5. Acceptable Use &amp; Prohibited Conduct</h2>
          <p>You agree not to:</p>
          <ol>
            <li>Use the Services to sell illegal goods or services, or for any unlawful purpose.</li>
            <li>Reverse engineer, decompile, disassemble, or otherwise attempt to derive the source code of the software.</li>
            <li>Circumvent, disable, or interfere with security features, authentication mechanisms, or access controls.</li>
            <li>Share Account credentials with unauthorized parties or allow credential sharing between businesses.</li>
            <li>Use automated means (bots, crawlers, scrapers) to access the Services without prior written consent.</li>
            <li>Upload or transmit malicious code, viruses, or any content designed to disrupt the Services.</li>
            <li>Resell, sublicense, or provide the Services to third parties as a service bureau.</li>
            <li>Use the AI-powered features (product import, discovery) to generate misleading, harmful, or illegal content.</li>
            <li>Intentionally manipulate transaction data, audit logs, or sync payloads to commit fraud.</li>
            <li>Interfere with other Customers&rsquo; use of the Services or access their data.</li>
          </ol>
          <p>We reserve the right to suspend or terminate your Account for violation of these restrictions, with or without prior notice depending on severity.</p>

          {/* ── 6. CUSTOMER DATA & PRIVACY ─────────────────── */}
          <h2>6. Customer Data &amp; Privacy</h2>
          <h3>6.1 Data Ownership</h3>
          <p>You retain full ownership of all Customer Data. We claim no intellectual property rights over your products, orders, customer records, or any other data you enter into the Services.</p>

          <h3>6.2 License to Process</h3>
          <p>You grant us a limited, non-exclusive license to host, process, transmit, and display Customer Data solely for the purpose of providing and improving the Services. This license terminates when your Account is deleted.</p>

          <h3>6.3 Data Processing Roles</h3>
          <p>For the purposes of applicable data protection law (including the Mauritius Data Protection Act 2017 and the EU General Data Protection Regulation), you are the <strong>Data Controller</strong> and Posterita is the <strong>Data Processor</strong> with respect to personal data contained in Customer Data.</p>

          <h3>6.4 Data Location &amp; Transfers</h3>
          <p>Customer Data is stored on infrastructure provided by Supabase (hosted on Amazon Web Services). Data may be processed in jurisdictions outside the Republic of Mauritius. We ensure appropriate safeguards are in place for international transfers, including Standard Contractual Clauses where required by GDPR.</p>

          <h3>6.5 Sub-Processors</h3>
          <p>We use the following sub-processors to provide the Services:</p>
          <ul>
            <li><strong>Supabase</strong> (database, authentication)</li>
            <li><strong>Vercel</strong> (web hosting, serverless functions)</li>
            <li><strong>Render</strong> (backend services, cron jobs)</li>
            <li><strong>Cloudinary</strong> (product image hosting)</li>
            <li><strong>Paddle</strong> (billing, payment processing)</li>
            <li><strong>Anthropic</strong> (AI product import — Claude)</li>
          </ul>
          <p>We will notify you before adding new sub-processors that materially affect the processing of Customer Data.</p>

          <h3>6.6 Data Export</h3>
          <p>You may export your Customer Data at any time via the web console or API. We provide data in standard formats (CSV, JSON) to facilitate portability.</p>

          <h3>6.7 Data Retention &amp; Deletion</h3>
          <p>Customer Data is retained during your active subscription and for 90 days following termination to allow for data export. After the retention period, data is permanently deleted unless retention is required by law. You may request early deletion by contacting <a href="mailto:privacy@posterita.com">privacy@posterita.com</a>.</p>

          <h3>6.8 Data Breach Notification</h3>
          <p>In the event of a confirmed data breach affecting Customer Data, we will notify the Account Owner within 72 hours of discovery, in compliance with the Mauritius Data Protection Act 2017 and GDPR Article 33.</p>

          <h3>6.9 Aggregated &amp; Anonymised Data</h3>
          <p>We may use anonymised, aggregated data derived from Customer Data for analytics, benchmarking, and service improvement. Aggregated data cannot be used to identify any individual Customer or their end-customers.</p>

          <h3>6.10 Your Obligations</h3>
          <p>You are responsible for the personal data you collect from your own end-customers at the point of sale (names, phone numbers, email addresses, loyalty data). You must ensure you have an appropriate legal basis for collecting and processing such data and must provide your own privacy notice to your end-customers.</p>

          <h3>6.11 Privacy Policy</h3>
          <p>Our collection and use of personal data is further described in our <Link href="/privacy">Privacy Policy</Link>, which is incorporated into these Terms by reference.</p>

          {/* ── 7. THIRD-PARTY SERVICES ────────────────────── */}
          <h2>7. Third-Party Services &amp; Integrations</h2>
          <h3>7.1 General</h3>
          <p>The Services may integrate with or contain links to Third-Party Services. We do not control, endorse, or assume responsibility for any Third-Party Services. Your use of Third-Party Services is governed by their respective terms and privacy policies.</p>

          <h3>7.2 Payment Processing</h3>
          <p>Posterita does not directly process customer payments. Payment processing is handled by third-party payment terminal providers (e.g., blink, MauCAS). You are responsible for your own relationship with your payment processor, including compliance with Payment Card Industry Data Security Standards (PCI DSS) where applicable.</p>

          <h3>7.3 Accounting Integrations</h3>
          <p>If you connect the Services to accounting software (e.g., Xero), data is shared per your configuration. You are responsible for verifying the accuracy of data pushed to your accounting system.</p>

          <h3>7.4 AI Features</h3>
          <p>Our AI-powered product import and discovery features use Anthropic&rsquo;s Claude AI. When you use these features, product data you provide is sent to Anthropic for processing. Anthropic does not use your data to train their models. AI-generated content may contain errors and should be reviewed before use.</p>

          <h3>7.5 Hardware</h3>
          <p>Hardware listed on our website is sold via affiliate arrangements with third-party vendors. Posterita is not the manufacturer, seller, or warrantor of any hardware. All hardware warranties, returns, and support are handled directly by the respective manufacturer or seller. We make no guarantees regarding hardware compatibility beyond our listed recommendations.</p>

          {/* ── 8. INTELLECTUAL PROPERTY ────────────────────── */}
          <h2>8. Intellectual Property</h2>
          <h3>8.1 Our Property</h3>
          <p>The Services, including all software, designs, interfaces, documentation, trademarks, and trade secrets, are and remain the exclusive property of Posterita and its licensors. Nothing in these Terms transfers any intellectual property ownership to you.</p>

          <h3>8.2 Your Content</h3>
          <p>You retain all rights to your content, branding, product images, and business data. We do not claim any ownership interest in Customer Data.</p>

          <h3>8.3 Feedback</h3>
          <p>If you provide suggestions, feature requests, or other feedback about the Services, you grant us a perpetual, irrevocable, royalty-free license to use, modify, and incorporate such feedback without obligation to you.</p>

          <h3>8.4 Customer Reference</h3>
          <p>We may identify you as a customer on our website and marketing materials. You may opt out by notifying us at <a href="mailto:hello@posterita.com">hello@posterita.com</a>.</p>

          {/* ── 9. SERVICE AVAILABILITY ─────────────────────── */}
          <h2>9. Service Availability &amp; Support</h2>
          <h3>9.1 Availability</h3>
          <p>We use commercially reasonable efforts to maintain availability of the web console and sync infrastructure. We do not guarantee uninterrupted access. The Android POS application is designed to operate offline and is not dependent on service availability for core POS operations.</p>

          <h3>9.2 Scheduled Maintenance</h3>
          <p>We may perform scheduled maintenance with reasonable advance notice. Where possible, maintenance will be performed during low-traffic periods.</p>

          <h3>9.3 Support</h3>
          <p>Support is provided via email and in-app channels. Response times and support scope vary by Subscription Plan. Free tier support is limited to self-service documentation.</p>

          <h3>9.4 Updates</h3>
          <p>We may update the Services from time to time to add features, fix issues, or improve performance. Material changes that reduce functionality will be communicated with at least 30 days&rsquo; notice.</p>

          {/* ── 10. LIMITATION OF LIABILITY ─────────────────── */}
          <h2>10. Limitation of Liability</h2>
          <h3>10.1 Disclaimer of Warranties</h3>
          <p><strong>THE SERVICES ARE PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.</strong></p>

          <h3>10.2 Specific Disclaimers</h3>
          <p>Without limiting the above, we do not warrant that:</p>
          <ul>
            <li>The Services will be uninterrupted, timely, secure, or error-free.</li>
            <li>Data synchronisation will be real-time or without data loss.</li>
            <li>AI-generated product data will be accurate or complete.</li>
            <li>Tax calculations, e-invoicing, or compliance tools will be error-free &mdash; you are responsible for verifying compliance with applicable laws.</li>
            <li>Third-party hardware or payment processors will be compatible or reliable.</li>
          </ul>

          <h3>10.3 Limitation of Damages</h3>
          <p><strong>TO THE MAXIMUM EXTENT PERMITTED BY LAW, IN NO EVENT SHALL POSTERITA, ITS DIRECTORS, EMPLOYEES, OR AFFILIATES BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, BUSINESS, OR GOODWILL, REGARDLESS OF THE CAUSE OF ACTION OR THE THEORY OF LIABILITY.</strong></p>

          <h3>10.4 Liability Cap</h3>
          <p><strong>OUR TOTAL AGGREGATE LIABILITY ARISING FROM OR RELATING TO THESE TERMS OR THE SERVICES SHALL NOT EXCEED THE GREATER OF: (A) THE TOTAL AMOUNTS PAID BY YOU TO POSTERITA IN THE TWELVE (12) MONTHS PRECEDING THE EVENT GIVING RISE TO LIABILITY, OR (B) ONE HUNDRED US DOLLARS (US$100).</strong></p>

          <h3>10.5 Exceptions</h3>
          <p>Nothing in these Terms excludes or limits liability for: (a) death or personal injury caused by negligence, (b) fraud or fraudulent misrepresentation, (c) any liability that cannot be excluded under the laws of the Republic of Mauritius, or (d) breaches of Section 6 (Data &amp; Privacy) caused by our gross negligence.</p>

          <h3>10.6 Basis of the Bargain</h3>
          <p>You acknowledge that these limitations reflect a reasonable allocation of risk and are a fundamental element of the bargain between you and Posterita. The Services would not be provided without these limitations.</p>

          {/* ── 11. INDEMNIFICATION ─────────────────────────── */}
          <h2>11. Indemnification</h2>
          <h3>11.1 Your Indemnification</h3>
          <p>You agree to indemnify, defend, and hold harmless Posterita and its officers, directors, employees, and agents from and against any claims, liabilities, damages, losses, and expenses (including reasonable legal fees) arising from:</p>
          <ol>
            <li>Your breach of these Terms or applicable law.</li>
            <li>Your use of the Services to conduct your business, including claims from your end-customers.</li>
            <li>Your collection, processing, or storage of personal data from your end-customers.</li>
            <li>Any content or data you upload to the Services.</li>
            <li>Actions taken by your Authorized Users.</li>
          </ol>

          <h3>11.2 Our Indemnification</h3>
          <p>We will indemnify and defend you against third-party claims alleging that the Services, as provided by us, infringe a third party&rsquo;s intellectual property rights, provided that this obligation does not apply to claims arising from: (a) your modifications to the Services, (b) use in combination with third-party software not authorised by us, or (c) use after we have notified you to cease.</p>

          {/* ── 12. TERMINATION ─────────────────────────────── */}
          <h2>12. Termination &amp; Suspension</h2>
          <h3>12.1 Termination by You</h3>
          <p>You may cancel your subscription at any time through the web console or by contacting <a href="mailto:billing@posterita.com">billing@posterita.com</a>. Cancellation takes effect at the end of the current billing period.</p>

          <h3>12.2 Termination by Us</h3>
          <p>We may terminate your Account for material breach of these Terms, subject to 30 days&rsquo; notice and an opportunity to cure the breach, unless the breach involves illegal activity, security threats, or repeated violations, in which case we may terminate immediately.</p>

          <h3>12.3 Suspension</h3>
          <p>We may suspend access to the Services immediately and without notice if: (a) your payment is overdue by more than 14 days, (b) we reasonably believe your Account poses a security risk, (c) your use violates applicable law, or (d) required by a court order or regulatory authority.</p>

          <h3>12.4 Effect of Termination</h3>
          <p>Upon termination:</p>
          <ul>
            <li>Access to the web console, API, and sync services is revoked.</li>
            <li>The Android POS application will continue to function in offline mode with previously cached data (read-only).</li>
            <li>You may export your Customer Data for 90 days after termination.</li>
            <li>After 90 days, all Customer Data is permanently deleted.</li>
          </ul>

          <h3>12.5 Inactive Free Accounts</h3>
          <p>Free tier Accounts that have been inactive for 12 or more months may be suspended or deleted after 30 days&rsquo; notice to the registered email address.</p>

          <h3>12.6 Survival</h3>
          <p>Sections relating to intellectual property, limitation of liability, indemnification, confidentiality, and dispute resolution survive termination.</p>

          {/* ── 13. CONFIDENTIALITY ────────────────────────── */}
          <h2>13. Confidentiality</h2>
          <p>Each party agrees to hold the other party&rsquo;s Confidential Information in strict confidence and not to disclose it to third parties except as necessary to perform under these Terms. Confidential Information does not include information that: (a) is or becomes publicly available without breach, (b) was known prior to disclosure, (c) is received from a third party without restriction, or (d) is required to be disclosed by law.</p>

          {/* ── 14. DISPUTE RESOLUTION ─────────────────────── */}
          <h2>14. Dispute Resolution</h2>
          <h3>14.1 Informal Resolution</h3>
          <p>Before initiating formal proceedings, both parties agree to attempt to resolve any dispute informally by contacting the other party. You may contact us at <a href="mailto:legal@posterita.com">legal@posterita.com</a>. We will attempt to resolve disputes within 30 days of notice.</p>

          <h3>14.2 Governing Law</h3>
          <p>These Terms are governed by and construed in accordance with the laws of the <strong>Republic of Mauritius</strong>, without regard to conflict of law provisions.</p>

          <h3>14.3 Jurisdiction</h3>
          <p>For Customers located in Mauritius, the courts of Mauritius shall have exclusive jurisdiction. For international Customers, any dispute that cannot be resolved informally shall be submitted to binding arbitration administered by the <strong>Mauritius International Arbitration Centre (MIAC)</strong> under its applicable rules.</p>

          <h3>14.4 Class Action Waiver</h3>
          <p>To the extent permitted by applicable law, you agree that any dispute resolution proceedings will be conducted only on an individual basis and not in a class, consolidated, or representative action.</p>

          {/* ── 15. CHANGES TO TERMS ──────────────────────── */}
          <h2>15. Modifications to These Terms</h2>
          <p>We may update these Terms from time to time. For material changes, we will provide at least 30 days&rsquo; notice by email to the Account Owner. Non-material changes (e.g., formatting, clarification) may be made without notice. Continued use of the Services after the effective date of changes constitutes acceptance. If you disagree with the updated Terms, you may terminate your Account before the changes take effect.</p>

          {/* ── 16. GENERAL PROVISIONS ────────────────────── */}
          <h2>16. General Provisions</h2>
          <ul>
            <li><strong>Entire Agreement.</strong> These Terms, together with the Privacy Policy and any applicable addenda, constitute the entire agreement between you and Posterita.</li>
            <li><strong>Severability.</strong> If any provision is found invalid or unenforceable, the remaining provisions remain in full force.</li>
            <li><strong>Waiver.</strong> Our failure to enforce any provision does not constitute a waiver of that provision.</li>
            <li><strong>Assignment.</strong> You may not assign these Terms without our prior written consent. We may assign our rights in connection with a merger, acquisition, or sale of assets.</li>
            <li><strong>Notices.</strong> Notices to you will be sent to the email address on your Account. Notices to us should be sent to <a href="mailto:legal@posterita.com">legal@posterita.com</a>.</li>
            <li><strong>Relationship.</strong> Nothing in these Terms creates a partnership, joint venture, or agency relationship between the parties.</li>
            <li><strong>Force Majeure.</strong> Neither party is liable for delays or failures caused by circumstances beyond reasonable control, including natural disasters, war, pandemics, or infrastructure failures.</li>
            <li><strong>Language.</strong> These Terms are drafted in English. In the event of a conflict between the English version and any translation, the English version prevails.</li>
          </ul>

          {/* ── 17. CONTACT ───────────────────────────────── */}
          <h2>17. Contact Information</h2>
          <p>If you have questions about these Terms, please contact us:</p>
          <ul>
            <li><strong>Email:</strong> <a href="mailto:legal@posterita.com">legal@posterita.com</a></li>
            <li><strong>Company:</strong> Tamak Group Ltd</li>
            <li><strong>Location:</strong> Republic of Mauritius</li>
            <li><strong>Website:</strong> <a href="https://www.posterita.com">www.posterita.com</a></li>
          </ul>

        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-200 py-8 mt-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center text-sm text-gray-500">
          <div className="flex items-center justify-center gap-4">
            <Link href="/" className="hover:text-gray-900 transition-colors">Home</Link>
            <Link href="/terms" className="font-medium text-gray-900">Terms</Link>
            <Link href="/privacy" className="hover:text-gray-900 transition-colors">Privacy</Link>
            <Link href="/hardware" className="hover:text-gray-900 transition-colors">Hardware</Link>
            <Link href="/download" className="hover:text-gray-900 transition-colors">Download</Link>
          </div>
          <p className="mt-4">&copy; {new Date().getFullYear()} Tamak Group Ltd. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
