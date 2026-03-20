package com.posterita.bo.action.app;

import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.opensymphony.xwork2.ActionSupport;
import org.apache.struts2.interceptor.ServletRequestAware;
import org.apache.struts2.interceptor.ServletResponseAware;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.PrintWriter;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;

/**
 * PushDataAction — Struts 2 action that receives local POS data from the
 * Android app and imports it into the Posterita back office database.
 *
 * Endpoint:  POST /app/push-data
 * Parameters:
 *   - account_key (String): the local account identifier from the device
 *   - data (String): JSON payload containing all entity arrays
 *
 * The JSON payload structure mirrors pull-data format:
 * {
 *   "email": "user@example.com",
 *   "password": "secret",
 *   "business_name": "My Store",
 *   "currency": "MUR",
 *   "account": [...],
 *   "store": [...],
 *   "terminal": [...],
 *   "user": [...],
 *   "productcategory": [...],
 *   "product": [...],
 *   "tax": [...],
 *   "modifier": [...]
 * }
 *
 * DEPLOYMENT:
 * 1. Place this file in: src/main/java/com/posterita/bo/action/app/PushDataAction.java
 * 2. Add to struts.xml (inside <package name="app" namespace="/app" ...>):
 *       <action name="push-data" class="com.posterita.bo.action.app.PushDataAction">
 *           <result type="json" />
 *       </action>
 * 3. Rebuild and deploy the WAR
 */
public class PushDataAction extends ActionSupport
        implements ServletRequestAware, ServletResponseAware {

    private HttpServletRequest request;
    private HttpServletResponse response;

    // Input parameters (from form fields)
    private String account_key;
    private String data;

    // Setters for Struts parameter injection
    public void setAccount_key(String account_key) { this.account_key = account_key; }
    public void setData(String data) { this.data = data; }

    @Override
    public void setServletRequest(HttpServletRequest request) { this.request = request; }

    @Override
    public void setServletResponse(HttpServletResponse response) { this.response = response; }

    @Override
    public String execute() throws Exception {
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        PrintWriter out = response.getWriter();
        Gson gson = new Gson();

        try {
            if (data == null || data.isEmpty()) {
                out.print(gson.toJson(errorResponse("No data provided")));
                return NONE;
            }

            JsonObject payload = JsonParser.parseString(data).getAsJsonObject();

            String email = getJsonString(payload, "email");
            String password = getJsonString(payload, "password");
            String businessName = getJsonString(payload, "business_name");
            String currency = getJsonString(payload, "currency");

            if (email == null || email.isEmpty() || password == null || password.isEmpty()) {
                out.print(gson.toJson(errorResponse("Email and password are required")));
                return NONE;
            }

            // Authenticate the user against the existing login system
            // IMPORTANT: Adapt this to your actual authentication method
            Connection conn = null;
            try {
                conn = getConnection(); // Get your DB connection (adapt to your connection pool)

                // 1. Authenticate — check email/password against user table
                int accountId = authenticateUser(conn, email, password);
                if (accountId <= 0) {
                    // If no account exists, create a new one
                    accountId = createAccount(conn, email, password, businessName, currency);
                    if (accountId <= 0) {
                        out.print(gson.toJson(errorResponse("Authentication failed and could not create account")));
                        return NONE;
                    }
                }

                String accountKey = String.valueOf(accountId);

                // 2. Import all entities
                int storesCreated = importStores(conn, payload, accountId);
                int terminalsCreated = importTerminals(conn, payload, accountId);
                int taxesCreated = importTaxes(conn, payload, accountId);
                int categoriesCreated = importCategories(conn, payload, accountId);
                int productsCreated = importProducts(conn, payload, accountId);
                int modifiersCreated = importModifiers(conn, payload, accountId);
                int usersCreated = importUsers(conn, payload, accountId);

                // 3. Build success response
                JsonObject result = new JsonObject();
                result.addProperty("success", true);
                result.addProperty("message", "Data imported successfully");
                result.addProperty("account_id", String.valueOf(accountId));
                result.addProperty("account_key", accountKey);
                result.addProperty("stores_created", storesCreated);
                result.addProperty("terminals_created", terminalsCreated);
                result.addProperty("taxes_created", taxesCreated);
                result.addProperty("categories_created", categoriesCreated);
                result.addProperty("products_created", productsCreated);
                result.addProperty("modifiers_created", modifiersCreated);
                result.addProperty("users_created", usersCreated);
                result.addProperty("customers_created", 0);

                out.print(gson.toJson(result));

            } finally {
                if (conn != null) {
                    try { conn.close(); } catch (SQLException ignored) {}
                }
            }

        } catch (Exception e) {
            e.printStackTrace();
            out.print(gson.toJson(errorResponse("Server error: " + e.getMessage())));
        }

        return NONE;
    }

    // ──────────────────────────────────────────────────────────
    // Authentication
    // ──────────────────────────────────────────────────────────

    /**
     * Authenticates the user and returns the account_id.
     * ADAPT THIS to match your existing login/auth system.
     */
    private int authenticateUser(Connection conn, String email, String password) throws SQLException {
        // Option A: Check against your existing user/account tables
        String sql = "SELECT a.account_id FROM account a " +
                     "JOIN appuser u ON a.account_id = u.account_id " +
                     "WHERE u.email = ? AND u.password = ? AND a.isactive = 'Y' " +
                     "LIMIT 1";
        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, email);
            ps.setString(2, password); // ADAPT: use your password hashing
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return rs.getInt("account_id");
                }
            }
        }
        return -1;
    }

    /**
     * Creates a new account for the given email/password.
     * Returns the new account_id or -1 on failure.
     */
    private int createAccount(Connection conn, String email, String password,
                              String businessName, String currency) throws SQLException {
        // Create the account
        String insertAccount = "INSERT INTO account (businessname, currency, isactive, created) " +
                               "VALUES (?, ?, 'Y', NOW())";
        int accountId;
        try (PreparedStatement ps = conn.prepareStatement(insertAccount,
                PreparedStatement.RETURN_GENERATED_KEYS)) {
            ps.setString(1, businessName != null ? businessName : "My Business");
            ps.setString(2, currency != null ? currency : "USD");
            ps.executeUpdate();
            try (ResultSet keys = ps.getGeneratedKeys()) {
                if (keys.next()) {
                    accountId = keys.getInt(1);
                } else {
                    return -1;
                }
            }
        }

        // Create the admin user for this account
        String insertUser = "INSERT INTO appuser (account_id, email, password, firstname, " +
                            "isadmin, isactive, issalesrep, role, created) " +
                            "VALUES (?, ?, ?, 'Admin', 'Y', 'Y', 'Y', 'owner', NOW())";
        try (PreparedStatement ps = conn.prepareStatement(insertUser)) {
            ps.setInt(1, accountId);
            ps.setString(2, email);
            ps.setString(3, password); // ADAPT: hash the password
            ps.executeUpdate();
        }

        return accountId;
    }

    // ──────────────────────────────────────────────────────────
    // Entity importers
    // ──────────────────────────────────────────────────────────

    private int importStores(Connection conn, JsonObject payload, int accountId) throws SQLException {
        JsonArray stores = getJsonArray(payload, "store");
        if (stores == null || stores.size() == 0) return 0;

        String sql = "INSERT INTO store (account_id, name, address, city, country, currency, zip, state, isactive, created) " +
                     "VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Y', NOW()) " +
                     "ON DUPLICATE KEY UPDATE name=VALUES(name), address=VALUES(address), " +
                     "city=VALUES(city), country=VALUES(country), currency=VALUES(currency), updated=NOW()";

        int count = 0;
        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            for (JsonElement elem : stores) {
                JsonObject s = elem.getAsJsonObject();
                ps.setInt(1, accountId);
                ps.setString(2, getJsonString(s, "name"));
                ps.setString(3, getJsonString(s, "address"));
                ps.setString(4, getJsonString(s, "city"));
                ps.setString(5, getJsonString(s, "country"));
                ps.setString(6, getJsonString(s, "currency"));
                ps.setString(7, getJsonString(s, "zip"));
                ps.setString(8, getJsonString(s, "state"));
                ps.addBatch();
                count++;
            }
            ps.executeBatch();
        }
        return count;
    }

    private int importTerminals(Connection conn, JsonObject payload, int accountId) throws SQLException {
        JsonArray terminals = getJsonArray(payload, "terminal");
        if (terminals == null || terminals.size() == 0) return 0;

        // First, get the mapping of local store IDs to server store IDs
        // For simplicity, we insert terminals with store_id = 1 (first store)
        // ADAPT: implement proper store ID mapping if multi-store

        String sql = "INSERT INTO terminal (account_id, store_id, name, prefix, isactive, created) " +
                     "VALUES (?, ?, ?, ?, 'Y', NOW()) " +
                     "ON DUPLICATE KEY UPDATE name=VALUES(name), prefix=VALUES(prefix), updated=NOW()";

        int count = 0;
        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            for (JsonElement elem : terminals) {
                JsonObject t = elem.getAsJsonObject();
                ps.setInt(1, accountId);
                ps.setInt(2, getJsonInt(t, "store_id", 1));
                ps.setString(3, getJsonString(t, "name"));
                ps.setString(4, getJsonString(t, "prefix"));
                ps.addBatch();
                count++;
            }
            ps.executeBatch();
        }
        return count;
    }

    private int importTaxes(Connection conn, JsonObject payload, int accountId) throws SQLException {
        JsonArray taxes = getJsonArray(payload, "tax");
        if (taxes == null || taxes.size() == 0) return 0;

        String sql = "INSERT INTO tax (account_id, name, rate, taxcode, isactive, created) " +
                     "VALUES (?, ?, ?, ?, 'Y', NOW()) " +
                     "ON DUPLICATE KEY UPDATE name=VALUES(name), rate=VALUES(rate), updated=NOW()";

        int count = 0;
        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            for (JsonElement elem : taxes) {
                JsonObject t = elem.getAsJsonObject();
                ps.setInt(1, accountId);
                ps.setString(2, getJsonString(t, "name"));
                ps.setDouble(3, getJsonDouble(t, "rate", 0));
                ps.setString(4, getJsonString(t, "taxcode"));
                ps.addBatch();
                count++;
            }
            ps.executeBatch();
        }
        return count;
    }

    private int importCategories(Connection conn, JsonObject payload, int accountId) throws SQLException {
        JsonArray categories = getJsonArray(payload, "productcategory");
        if (categories == null || categories.size() == 0) return 0;

        String sql = "INSERT INTO productcategory (account_id, name, position, isactive, created) " +
                     "VALUES (?, ?, ?, 'Y', NOW()) " +
                     "ON DUPLICATE KEY UPDATE name=VALUES(name), position=VALUES(position), updated=NOW()";

        int count = 0;
        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            for (JsonElement elem : categories) {
                JsonObject c = elem.getAsJsonObject();
                ps.setInt(1, accountId);
                ps.setString(2, getJsonString(c, "name"));
                ps.setInt(3, getJsonInt(c, "position", count + 1));
                ps.addBatch();
                count++;
            }
            ps.executeBatch();
        }
        return count;
    }

    private int importProducts(Connection conn, JsonObject payload, int accountId) throws SQLException {
        JsonArray products = getJsonArray(payload, "product");
        if (products == null || products.size() == 0) return 0;

        String sql = "INSERT INTO product (account_id, name, sellingprice, costprice, " +
                     "productcategory_id, tax_id, taxamount, description, image, upc, " +
                     "isactive, ismodifier, iseditable, isvariableitem, iskitchenitem, " +
                     "isfavourite, created) " +
                     "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Y', ?, ?, ?, ?, ?, NOW()) " +
                     "ON DUPLICATE KEY UPDATE name=VALUES(name), sellingprice=VALUES(sellingprice), " +
                     "costprice=VALUES(costprice), description=VALUES(description), " +
                     "image=VALUES(image), updated=NOW()";

        int count = 0;
        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            for (JsonElement elem : products) {
                JsonObject p = elem.getAsJsonObject();
                ps.setInt(1, accountId);
                ps.setString(2, getJsonString(p, "name"));
                ps.setDouble(3, getJsonDouble(p, "sellingprice", 0));
                ps.setDouble(4, getJsonDouble(p, "costprice", 0));
                ps.setInt(5, getJsonInt(p, "productcategory_id", 0));
                ps.setInt(6, getJsonInt(p, "tax_id", 0));
                ps.setDouble(7, getJsonDouble(p, "taxamount", 0));
                ps.setString(8, getJsonString(p, "description"));
                ps.setString(9, getJsonString(p, "image"));
                ps.setString(10, getJsonString(p, "upc"));
                ps.setString(11, getJsonString(p, "ismodifier"));
                ps.setString(12, getJsonString(p, "iseditable"));
                ps.setString(13, getJsonString(p, "isvariableitem"));
                ps.setString(14, getJsonString(p, "iskitchenitem"));
                ps.setString(15, getJsonString(p, "isfavourite"));
                ps.addBatch();
                count++;
            }
            ps.executeBatch();
        }
        return count;
    }

    private int importModifiers(Connection conn, JsonObject payload, int accountId) throws SQLException {
        JsonArray modifiers = getJsonArray(payload, "modifier");
        if (modifiers == null || modifiers.size() == 0) return 0;

        String sql = "INSERT INTO modifier (account_id, name, sellingprice, costprice, " +
                     "product_id, productcategory_id, tax_id, taxamount, isactive, created) " +
                     "VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Y', NOW()) " +
                     "ON DUPLICATE KEY UPDATE name=VALUES(name), sellingprice=VALUES(sellingprice), updated=NOW()";

        int count = 0;
        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            for (JsonElement elem : modifiers) {
                JsonObject m = elem.getAsJsonObject();
                ps.setInt(1, accountId);
                ps.setString(2, getJsonString(m, "name"));
                ps.setDouble(3, getJsonDouble(m, "sellingprice", 0));
                ps.setDouble(4, getJsonDouble(m, "costprice", 0));
                ps.setInt(5, getJsonInt(m, "product_id", 0));
                ps.setInt(6, getJsonInt(m, "productcategory_id", 0));
                ps.setInt(7, getJsonInt(m, "tax_id", 0));
                ps.setDouble(8, getJsonDouble(m, "taxamount", 0));
                ps.addBatch();
                count++;
            }
            ps.executeBatch();
        }
        return count;
    }

    private int importUsers(Connection conn, JsonObject payload, int accountId) throws SQLException {
        JsonArray users = getJsonArray(payload, "user");
        if (users == null || users.size() == 0) return 0;

        String sql = "INSERT INTO appuser (account_id, firstname, lastname, username, email, " +
                     "pin, password, isadmin, isactive, issalesrep, role, created) " +
                     "VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Y', ?, ?, NOW()) " +
                     "ON DUPLICATE KEY UPDATE firstname=VALUES(firstname), lastname=VALUES(lastname), " +
                     "email=VALUES(email), updated=NOW()";

        int count = 0;
        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            for (JsonElement elem : users) {
                JsonObject u = elem.getAsJsonObject();
                ps.setInt(1, accountId);
                ps.setString(2, getJsonString(u, "firstname"));
                ps.setString(3, getJsonString(u, "lastname"));
                ps.setString(4, getJsonString(u, "username"));
                ps.setString(5, getJsonString(u, "email"));
                ps.setString(6, getJsonString(u, "pin"));
                ps.setString(7, getJsonString(u, "password")); // ADAPT: hash
                ps.setString(8, getJsonString(u, "isadmin"));
                ps.setString(9, getJsonString(u, "issalesrep"));
                ps.setString(10, getJsonString(u, "role"));
                ps.addBatch();
                count++;
            }
            ps.executeBatch();
        }
        return count;
    }

    // ──────────────────────────────────────────────────────────
    // Helpers
    // ──────────────────────────────────────────────────────────

    private JsonObject errorResponse(String message) {
        JsonObject obj = new JsonObject();
        obj.addProperty("success", false);
        obj.addProperty("message", message);
        return obj;
    }

    private String getJsonString(JsonObject obj, String key) {
        if (obj == null || !obj.has(key) || obj.get(key).isJsonNull()) return null;
        return obj.get(key).getAsString();
    }

    private int getJsonInt(JsonObject obj, String key, int defaultValue) {
        if (obj == null || !obj.has(key) || obj.get(key).isJsonNull()) return defaultValue;
        try { return obj.get(key).getAsInt(); } catch (Exception e) { return defaultValue; }
    }

    private double getJsonDouble(JsonObject obj, String key, double defaultValue) {
        if (obj == null || !obj.has(key) || obj.get(key).isJsonNull()) return defaultValue;
        try { return obj.get(key).getAsDouble(); } catch (Exception e) { return defaultValue; }
    }

    private JsonArray getJsonArray(JsonObject obj, String key) {
        if (obj == null || !obj.has(key) || !obj.get(key).isJsonArray()) return null;
        return obj.getAsJsonArray(key);
    }

    /**
     * Gets a database connection from your connection pool.
     *
     * IMPORTANT: Adapt this to match your actual DB connection strategy.
     * Common patterns:
     *   - JNDI: InitialContext.lookup("java:comp/env/jdbc/posterita")
     *   - Your custom ConnectionManager
     *   - HikariCP pool
     */
    private Connection getConnection() throws Exception {
        // OPTION 1: JNDI (most common for Struts 2 apps)
        javax.naming.InitialContext ctx = new javax.naming.InitialContext();
        javax.sql.DataSource ds = (javax.sql.DataSource) ctx.lookup("java:comp/env/jdbc/posterita");
        return ds.getConnection();

        // OPTION 2: If you have a custom ConnectionManager, use that instead:
        // return com.posterita.bo.util.ConnectionManager.getConnection();
    }
}
