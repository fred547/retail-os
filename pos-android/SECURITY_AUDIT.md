# Security Audit: Posterita Android POS

## Table of Contents

1. [Critical Issues](#critical-issues)
2. [High Issues](#high-issues)
3. [Medium Issues](#medium-issues)
4. [Recommendations](#recommendations)

---

## Critical Issues

### 1. Hardcoded Sentry DSN in AndroidManifest.xml

**Risk:** Credential Exposure / Information Disclosure

The `AndroidManifest.xml` contains Sentry DSN values -- both a commented-out DSN and an active one. Sentry DSNs embedded in the manifest are extractable from any APK using standard tools (`apktool`, `jadx`). An attacker with the DSN can:

- Send fabricated error reports to pollute monitoring data.
- Potentially access project-level information in the Sentry dashboard if the DSN grants broader permissions.
- Use the DSN as a foothold to enumerate other infrastructure.

**Remediation:** Move the Sentry DSN to a server-side configuration endpoint. Initialize Sentry at runtime after fetching the DSN from a secured API. At minimum, use BuildConfig fields populated from `local.properties` (which is gitignored).

---

### 2. Cleartext Traffic Enabled Globally

**Risk:** Man-in-the-Middle (MitM) Attack

Two configurations enable unencrypted HTTP traffic:

1. `android:usesCleartextTraffic="true"` in `AndroidManifest.xml` permits HTTP connections to any host.
2. `network_security_config.xml` explicitly allows cleartext traffic to IP address `192.168.100.152`.

In a retail environment, this means all API communication -- including authentication credentials, order data, and payment information -- can be intercepted by anyone on the same network segment. Public Wi-Fi in retail locations makes this especially dangerous.

**Remediation:** Set `usesCleartextTraffic="false"`. Remove the cleartext domain exception. Require HTTPS for all API endpoints. If local network communication is required for development, restrict cleartext to `debuggable` builds only using `<debug-overrides>` in the network security config.

---

### 3. SharedPreferences Stores Sensitive Data Unencrypted

**Risk:** Data Exposure on Rooted/Compromised Devices

The app stores sensitive data in plaintext `SharedPreferences` (preference file named "SharedPref"):

- `account_id`
- `user_id`
- `email`
- `base_url`
- `account_key` (used for API authentication)

On rooted devices or through ADB backup extraction, these values are trivially readable. The `account_key` in particular grants full API access to the merchant's Posterita account.

**Remediation:** Migrate to `EncryptedSharedPreferences` from the AndroidX Security library. This provides AES-256 encryption with keys stored in the Android Keystore.

```kotlin
val masterKey = MasterKey.Builder(context)
    .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
    .build()

val sharedPreferences = EncryptedSharedPreferences.create(
    context,
    "SecurePref",
    masterKey,
    EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
    EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
)
```

---

### 4. No HTTPS Enforcement

**Risk:** Man-in-the-Middle Attack

`RetrofitClient` builds the OkHttpClient and Retrofit instance without enforcing HTTPS on the base URL. The server endpoint URL is user-configurable via `CheckServerEndPointActivity` and stored in SharedPreferences. A user (or attacker with access to SharedPreferences) can set an HTTP URL, causing all API traffic to be sent unencrypted.

**Remediation:** Validate the base URL scheme before accepting it. Reject any URL that does not begin with `https://`. Add a URL validation utility:

```java
if (!url.startsWith("https://")) {
    throw new IllegalArgumentException("Only HTTPS endpoints are supported");
}
```

---

### 5. No Certificate Pinning

**Risk:** Man-in-the-Middle with Forged Certificates

The `OkHttpClient` is built without certificate pinning. An attacker who installs a rogue CA certificate on the device (common in corporate proxy scenarios or through social engineering) can intercept all HTTPS traffic.

**Remediation:** Implement certificate pinning using OkHttp's `CertificatePinner`:

```java
CertificatePinner pinner = new CertificatePinner.Builder()
    .add("api.posterita.com", "sha256/AAAA...")
    .build();

OkHttpClient client = new OkHttpClient.Builder()
    .certificatePinner(pinner)
    .build();
```

Also configure backup pins and a pin rotation strategy.

---

### 6. User Passwords Stored in Plaintext in Room Database

**Risk:** Credential Theft

The `User` entity in the Room database stores `password` and `pin` fields as plain `String` values in SQLite. On a rooted device or via ADB backup, the database file can be extracted and all user credentials read directly.

This is a severe issue because:

- POS systems often share devices among multiple employees.
- Employee PINs may be reused across systems.
- A compromised device exposes every user account that has logged in.

**Remediation:** Never store plaintext passwords. Store only bcrypt/scrypt hashes. For PINs, store a salted SHA-256 hash at minimum. Ideally, authenticate against the server and store only a short-lived session token locally.

---

### 7. Token/Session Management Is Absent

**Risk:** Persistent Unauthorized Access

The application has no concept of authentication tokens or session expiry. API authentication relies on an `account_key` stored in SharedPreferences that never expires and is never rotated. This means:

- A stolen `account_key` grants permanent API access.
- There is no way to revoke access to a compromised device.
- There is no session timeout, so a device left unattended remains fully authenticated indefinitely.

**Remediation:** Implement OAuth 2.0 or JWT-based authentication with:

- Short-lived access tokens (15-30 minutes).
- Refresh tokens stored in EncryptedSharedPreferences.
- Server-side token revocation.
- Automatic session timeout after inactivity.

---

### 8. Hardcoded Sendinblue API Key in DebuggerUtils.java

**Risk:** API Key Compromise / Financial Exposure

`DebuggerUtils.java` contains a hardcoded Sendinblue (now Brevo) API key in the `sendDatabaseByEmail` method. This key can be extracted from the APK using any Java decompiler. An attacker can use this key to:

- Send emails from the company's Sendinblue account (phishing, spam).
- Read contact lists and email campaign data.
- Consume the account's email quota, incurring financial costs.
- Access other Sendinblue API endpoints depending on key permissions.

**Remediation:** Remove the API key from the codebase immediately. Rotate the compromised key in the Sendinblue dashboard. Move email-sending functionality to a backend service. If client-side email is required, use a proxy endpoint that authenticates the request before forwarding to Sendinblue.

---

## High Issues

### 1. SQL Injection Risk in Search Queries

**Risk:** Data Exfiltration / Data Manipulation

`ProductDao.searchProducts` uses `LIKE` queries with string concatenation patterns. While Room's use of parameterized queries (`@Query` annotations with `:parameter` syntax) mitigates direct SQL injection, any DAO methods that build queries through string concatenation or `@RawQuery` are vulnerable.

**Severity Mitigation:** Room's compile-time query validation reduces the practical risk, but a thorough review of all DAO methods for raw query usage is warranted.

---

### 2. Exported Activities Without Proper Intent Filters

**Risk:** Intent Spoofing / Unauthorized Access

The following Activities are declared with `exported="true"` in the manifest:

- `SelectUserLoginActivity`
- `SelectTerminalActivity`
- `SignInActivity`

Any app on the device can launch these Activities with crafted Intent extras. This could be used to:

- Bypass the normal login flow.
- Pre-populate login fields with malicious data.
- Trigger unintended state transitions in the application.

**Remediation:** Set `exported="false"` on all Activities that are not intended to be launched by external apps. Only the main launcher Activity and Activities handling deep links or system intents need to be exported.

---

### 3. No Input Validation on Server Endpoint

**Risk:** Server-Side Request Forgery (SSRF) / Phishing

`CheckServerEndPointActivity` accepts any URL as the server endpoint without validation. An attacker with brief physical access to the device could redirect the POS app to a malicious server that:

- Captures all API requests (credentials, order data, customer info).
- Returns manipulated product/pricing data.
- Serves a phishing interface.

**Remediation:** Validate the server URL against an allowlist of known Posterita domains. At minimum, enforce HTTPS and validate the URL format.

---

### 4. allowBackup Enabled

**Risk:** Data Extraction via ADB

`android:allowBackup="true"` in the manifest allows the entire app data directory to be extracted via `adb backup`. This includes:

- The Room database (with plaintext passwords and PINs).
- SharedPreferences (with account_key and user data).
- Any cached files.

**Remediation:** Set `android:allowBackup="false"` or implement a `BackupAgent` that excludes sensitive data. Additionally, set `android:fullBackupContent` to specify a backup rules XML that excludes databases and preferences.

---

### 5. No ProGuard/R8 in Release Builds

**Risk:** Reverse Engineering

The build configuration has `minifyEnabled false` for release builds. This means:

- All class names, method names, and field names are preserved in the APK.
- String constants (including any remaining hardcoded secrets) are trivially findable.
- The application logic can be fully reconstructed using tools like `jadx` or `apktool`.
- Business logic and proprietary algorithms are exposed.

**Remediation:** Enable R8 minification and obfuscation:

```groovy
buildTypes {
    release {
        minifyEnabled true
        shrinkResources true
        proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
    }
}
```

---

### 6. Logging Sensitive Data

**Risk:** Information Disclosure

`HttpLoggingInterceptor` is configured with `Level.BODY`, which logs complete HTTP request and response bodies. This includes:

- `account_key` values in request headers or parameters.
- User credentials in login requests.
- Order and payment details.
- Customer information.

These logs are accessible via `adb logcat` on debuggable builds and may persist in log files on the device.

**Remediation:** Set logging level to `Level.NONE` for release builds. Use `Level.HEADERS` or `Level.BASIC` for debug builds. Implement a custom interceptor that redacts sensitive fields before logging.

---

### 7. No Explicit Timeouts on OkHttpClient

**Risk:** Resource Exhaustion / Slowloris Attack

If the `OkHttpClient` is built without explicit timeout configuration, it relies on default values which may be excessively long. A malicious or compromised server can hold connections open indefinitely, exhausting device resources.

**Remediation:** Set explicit timeouts:

```java
OkHttpClient client = new OkHttpClient.Builder()
    .connectTimeout(15, TimeUnit.SECONDS)
    .readTimeout(30, TimeUnit.SECONDS)
    .writeTimeout(30, TimeUnit.SECONDS)
    .build();
```

---

## Medium Issues

### 1. No NFC Security

**Risk:** Data Interception / Relay Attack

`NfcActivity` requests NFC permissions but implements no secure NFC handling. NFC communications can be eavesdropped or relayed. If NFC is used for payment or authentication, this is a significant gap.

**Remediation:** Implement NFC Host Card Emulation (HCE) security best practices. Use secure channels for NFC data exchange. Validate NFC tag authenticity.

---

### 2. Bluetooth Printer Communication Unencrypted

**Risk:** Data Interception

Bluetooth communication with receipt printers is unencrypted. Receipt data -- which may include customer names, partial card numbers, order details, and transaction amounts -- can be intercepted by nearby Bluetooth-capable devices.

**Remediation:** Use Bluetooth Secure Simple Pairing (SSP) with encryption. Validate printer identity before sending data. Consider using Bluetooth LE with encrypted characteristics for newer printer models.

---

### 3. No Rate Limiting on Login Attempts

**Risk:** Brute Force Attack

Neither the client nor (apparently) the server implements rate limiting on login attempts. An attacker with physical access to the device can attempt unlimited PIN or password combinations.

**Remediation:** Implement client-side lockout after N failed attempts (e.g., 5 attempts, then 30-second delay doubling with each subsequent failure). Coordinate with server-side rate limiting.

---

### 4. Database Name Includes Account ID

**Risk:** Information Disclosure

The Room database filename includes the `account_id`, making it possible to determine which Posterita account is associated with a device by examining the filesystem. On a shared or compromised device, this leaks business identity information.

**Remediation:** Use a generic database name or a hashed/obfuscated identifier.

---

### 5. BASE_URL Is a Mutable Static Field

**Risk:** Runtime Manipulation

`Constants.BASE_URL` is a mutable static field that can be changed at runtime. In a compromised app or through reflection-based attacks, an attacker could redirect API traffic to a malicious server without modifying SharedPreferences.

**Remediation:** Declare the field as `static final`. Load the URL from a secure, immutable source at startup.

---

## Recommendations

### Immediate Actions (Critical)

| Priority | Action | Effort |
|---|---|---|
| P0 | Remove hardcoded API keys (Sentry DSN, Sendinblue key) and rotate compromised keys | Low |
| P0 | Disable cleartext traffic (`usesCleartextTraffic="false"`) | Low |
| P0 | Hash passwords and PINs before storing in Room database | Medium |
| P0 | Migrate sensitive SharedPreferences data to EncryptedSharedPreferences | Medium |

### Short-Term Actions (High)

| Priority | Action | Effort |
|---|---|---|
| P1 | Implement token-based authentication with session expiry | High |
| P1 | Enable ProGuard/R8 for release builds | Medium |
| P1 | Set `exported="false"` on non-launcher Activities | Low |
| P1 | Set `allowBackup="false"` or configure backup exclusion rules | Low |
| P1 | Add HTTPS enforcement and server URL validation | Medium |
| P1 | Reduce logging level for release builds | Low |
| P1 | Set explicit OkHttpClient timeouts | Low |

### Medium-Term Actions

| Priority | Action | Effort |
|---|---|---|
| P2 | Implement certificate pinning | Medium |
| P2 | Add BiometricPrompt for sensitive operations (refunds, till close) | Medium |
| P2 | Add rate limiting on login attempts | Low |
| P2 | Secure NFC and Bluetooth communications | Medium |
| P2 | Add input validation on all user-facing inputs | Medium |
| P2 | Make BASE_URL immutable | Low |
| P2 | Obfuscate database naming | Low |

### Compliance Considerations

If this POS application processes payment card data, PCI DSS compliance requirements apply. The following findings are potential PCI DSS violations:

- **Requirement 2.3:** Encrypt all non-console administrative access (cleartext traffic violation).
- **Requirement 3.4:** Render PAN unreadable anywhere it is stored (plaintext storage concern).
- **Requirement 4.1:** Use strong cryptography and security protocols to safeguard sensitive data during transmission (no HTTPS enforcement, no cert pinning).
- **Requirement 6.5:** Address common coding vulnerabilities in software development processes (SQL injection risk, missing input validation).
- **Requirement 8.2:** Employ at least one method to authenticate all users (weak session management).

A full PCI DSS assessment is recommended before deploying this application in a payment-processing environment.
