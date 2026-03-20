## Posterita Loyalty – Zoho CRM modules and fields

Copy this structure when creating custom modules and fields in Zoho CRM. Adjust API names to match your account conventions, but keep them in sync with the Deluge and Zobot files.

---

### 1. Contacts (standard module) – new fields

Add these custom fields:

- **Posterita_Loyalty_Enrolled**  
  - Label: `Posterita Loyalty Enrolled`  
  - Type: Checkbox  
  - API name: `Posterita_Loyalty_Enrolled`

- **WhatsApp_Marketing_Consent**  
  - Label: `WhatsApp Marketing Consent`  
  - Type: Picklist  
  - Values: `Granted`, `Denied`, `Withdrawn`  
  - API name: `WhatsApp_Marketing_Consent`

- **Consent_Timestamp**  
  - Label: `Consent Timestamp`  
  - Type: Date-Time  
  - API name: `Consent_Timestamp`

- **Consent_Source**  
  - Label: `Consent Source`  
  - Type: Single Line  
  - API name: `Consent_Source`

Enable field history (audit trail) for:  
- `WhatsApp_Marketing_Consent`  
- `Posterita_Loyalty_Enrolled`

---

### 2. Custom module: Loyalty_Points

Create a custom module:

- Module name: `Loyalty Points`  
- Plural name: `Loyalty Points`  
- API name (module): `Loyalty_Points`

Fields:

- **Contact**  
  - Type: Lookup to `Contacts`  
  - API name: `Contact`

- **Total_Points**  
  - Label: `Total Points`  
  - Type: Number (integer)  
  - API name: `Total_Points`

- **Status**  
  - Label: `Status`  
  - Type: Picklist  
  - Values: `Active`, `Opted-out`, `Suspended`  
  - API name: `Status`

- **Channel** (optional)  
  - Label: `Channel`  
  - Type: Picklist  
  - Values: `WhatsApp`, `Web`, `Other`  
  - API name: `Channel`

- **Last_Updated_On**  
  - Label: `Last Updated On`  
  - Type: Date-Time  
  - API name: `Last_Updated_On`

Enable field history (audit trail) for at least:  
- `Total_Points`  
- `Status`

---

### 3. Custom module: Loyalty_Transactions

Create a custom module:

- Module name: `Loyalty Transactions`  
- Plural name: `Loyalty Transactions`  
- API name (module): `Loyalty_Transactions`

Fields:

- **Contact**  
  - Type: Lookup to `Contacts`  
  - API name: `Contact`

- **Loyalty_Points**  
  - Type: Lookup to `Loyalty Points`  
  - API name: `Loyalty_Points`

- **Points_Change**  
  - Label: `Points Change`  
  - Type: Number (can be positive or negative)  
  - API name: `Points_Change`

- **Reason**  
  - Label: `Reason`  
  - Type: Picklist  
  - Values: `Registration`, `Survey`, `Redemption`, `Manual Adjustment`, `Other`  
  - API name: `Reason`

- **Channel**  
  - Label: `Channel`  
  - Type: Picklist  
  - Values: `WhatsApp`, `Web`, `Other`  
  - API name: `Channel`

- **Description**  
  - Label: `Description`  
  - Type: Multi-line  
  - API name: `Description`

- **Transaction_Date** (optional if you want explicit date)  
  - Label: `Transaction Date`  
  - Type: Date-Time  
  - API name: `Transaction_Date`

Enable field history (audit trail) on:  
- `Points_Change` (optional, as you already have full records)

---

### 4. What you need to configure in Zoho UI

1. **Create the two custom modules** above with the exact API names.  
2. **Add the contact fields** to `Contacts` with matching API names.  
3. **Turn on field history** for consent and points fields.  
4. **Create the Deluge function** `posterita_loyalty_handler` in Zoho CRM and paste the contents of `zoho_crm_function_posterita_loyalty_handler.deluge`.  
5. **Create a connection** (e.g. `loyalty_connection`) that allows SalesIQ to call this function using `invokeurl`.  
6. **In Zoho SalesIQ**, create a Zobot (SalesIQ Scripts platform) and paste the contents of `zobot_whatsapp_posterita_loyalty_salesiq_script.txt` into the script editor, adjusting the URLs and connection name if needed.

