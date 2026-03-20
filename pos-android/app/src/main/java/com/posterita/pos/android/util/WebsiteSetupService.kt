package com.posterita.pos.android.util

import android.util.Base64
import android.util.Log
import com.google.gson.Gson
import com.google.gson.annotations.SerializedName
import com.google.gson.reflect.TypeToken
import com.posterita.pos.android.BuildConfig
import com.posterita.pos.android.data.local.AppDatabase
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.util.concurrent.TimeUnit
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Uses Claude AI to analyze a business website and extract store setup data
 * (categories, products with prices and images).
 */
@Singleton
class WebsiteSetupService @Inject constructor(
    private val prefsManager: SharedPreferencesManager,
    private val db: AppDatabase
) {

    companion object {
        private const val TAG = "WebsiteSetupService"
        private const val CLAUDE_API_URL = "https://api.anthropic.com/v1/messages"
        private const val MODEL = "claude-sonnet-4-6"
        private const val WEB_SEARCH_BETA = "web-search-2025-03-05"
    }

    private val httpClient = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(120, TimeUnit.SECONDS) // Claude can take a while
        .writeTimeout(30, TimeUnit.SECONDS)
        .build()

    private val gson = Gson()

    /** Optional listener for detailed status updates (set by AiImportService) */
    var statusListener: ((String) -> Unit)? = null

    private fun reportStatus(msg: String) {
        Log.d(TAG, msg)
        statusListener?.invoke(msg)
    }

    /**
     * Returns the AI API key: preference table (synced from web back office) takes priority,
     * then falls back to SharedPreferences, then BuildConfig default.
     */
    private fun getApiKey(): String {
        // Check preference table (set via web back office)
        val prefKey = runBlocking {
            db.preferenceDao().getAllPreferences().firstOrNull()?.ai_api_key
        }
        if (!prefKey.isNullOrBlank()) return prefKey

        // Fallback to local SharedPreferences
        val userKey = prefsManager.aiApiKey
        if (userKey.isNotBlank()) return userKey

        return BuildConfig.ANTHROPIC_API_KEY
    }

    private fun getCloudAiEndpoint(): String? {
        val cloudSyncUrl = prefsManager.cloudSyncUrl.trim()
        if (cloudSyncUrl.isBlank()) return null
        val normalizedBase = if (cloudSyncUrl.endsWith("/")) {
            cloudSyncUrl.dropLast(1)
        } else {
            cloudSyncUrl
        }
        return "$normalizedBase/ai-import"
    }

    /** Returns true if either the cloud AI endpoint or a local Claude key is available. */
    fun isConfigured(): Boolean = getCloudAiEndpoint() != null || getApiKey().isNotBlank()

    // ── Data classes for Claude's structured response ──

    data class StoreLocationData(
        @SerializedName("store_name") val storeName: String? = "",
        @SerializedName("address") val address: String? = "",
        @SerializedName("city") val city: String? = "",
        @SerializedName("country") val country: String? = "",
        @SerializedName("currency") val currency: String? = "",
        @SerializedName("phone") val phone: String? = "",
        @SerializedName("opening_hours") val openingHours: String? = ""
    )

    data class StoreSetupResult(
        @SerializedName("store_name") val storeName: String? = "",
        @SerializedName("store_description") val storeDescription: String? = "",
        @SerializedName("address") val address: String? = "",
        @SerializedName("city") val city: String? = "",
        @SerializedName("country") val country: String? = "",
        @SerializedName("phone") val phone: String? = "",
        @SerializedName("opening_hours") val openingHours: String? = "",
        @SerializedName("currency") val currency: String? = "USD",
        @SerializedName("business_type") val businessType: String? = "retail",
        @SerializedName("tax_rate") val taxRate: Double = 0.0,
        @SerializedName("tax_name") val taxName: String? = "Tax",
        @SerializedName("categories") val categories: List<CategoryData> = emptyList(),
        @SerializedName("stores") val stores: List<StoreLocationData> = emptyList()
    )

    data class CategoryData(
        @SerializedName("name") val name: String? = "",
        @SerializedName("products") val products: List<ProductData> = emptyList()
    )

    data class ProductData(
        @SerializedName("name") val name: String? = "",
        @SerializedName("price") val price: Double = 0.0,
        @SerializedName("description") val description: String? = "",
        @SerializedName("image_url") val imageUrl: String? = ""
    )

    // ── Product image analysis result ──

    data class ProductAnalysisResult(
        @SerializedName("name") val name: String = "",
        @SerializedName("price") val price: Double = 0.0,
        @SerializedName("description") val description: String = "",
        @SerializedName("category") val category: String = ""
    )

    // ── Bulk import analysis result (includes image quality) ──

    data class BulkProductAnalysisResult(
        @SerializedName("name") val name: String = "",
        @SerializedName("price") val price: Double = 0.0,
        @SerializedName("description") val description: String = "",
        @SerializedName("category") val category: String = "",
        @SerializedName("image_quality") val imageQuality: Int = 50,
        @SerializedName("quality_issues") val qualityIssues: List<String> = emptyList(),
        @SerializedName("search_terms") val searchTerms: String = ""
    )

    // ── Business discovery ──

    data class BusinessCandidate(
        @SerializedName("url") val url: String = "",
        @SerializedName("name") val name: String = "",
        @SerializedName("description") val description: String = "",
        @SerializedName("confidence") val confidence: String = "low"
    )

    private data class CloudDiscoverResponse(
        @SerializedName("success") val success: Boolean = false,
        @SerializedName("candidates") val candidates: List<BusinessCandidate> = emptyList(),
        @SerializedName("error") val error: String? = null
    )

    private data class CloudSetupResponse(
        @SerializedName("success") val success: Boolean = false,
        @SerializedName("setup") val setup: StoreSetupResult? = null,
        @SerializedName("error") val error: String? = null
    )

    /**
     * Uses Claude's built-in web search tool to find business websites,
     * with fallback to manual Google/DuckDuckGo scraping.
     */
    suspend fun findBusinessWebsites(
        businessName: String,
        location: String,
        businessType: String
    ): Result<List<BusinessCandidate>> = withContext(Dispatchers.IO) {
        try {
            val cloudResult = findBusinessWebsitesViaCloud(businessName, location, businessType)
            if (cloudResult != null) {
                return@withContext Result.success(cloudResult)
            }

            val apiKey = getApiKey()
            if (apiKey.isBlank()) {
                return@withContext Result.failure(Exception("AI discovery is unavailable right now"))
            }

            // Primary: Use Claude's web search tool (much more reliable than scraping)
            val webSearchResult = findBusinessWithWebSearch(apiKey, businessName, location, businessType)
            if (webSearchResult != null && webSearchResult.isNotEmpty()) {
                Log.d(TAG, "Claude web search found ${webSearchResult.size} candidates")
                return@withContext Result.success(webSearchResult)
            }
            Log.d(TAG, "Claude web search returned no results, falling back to manual scraping")

            // Fallback: Manual Google/DuckDuckGo scraping
            val searchUrls = searchGoogle(businessName, location, businessType)
            Log.d(TAG, "Google search found ${searchUrls.size} URLs")

            if (searchUrls.isEmpty()) {
                return@withContext Result.success(emptyList())
            }

            val verifiedCandidates = coroutineScope {
                searchUrls.map { url ->
                    async(Dispatchers.IO) { probeWebsite(url) }
                }.awaitAll().filterNotNull()
            }
            Log.d(TAG, "Probed ${verifiedCandidates.size} live URLs")

            if (verifiedCandidates.isEmpty()) {
                return@withContext Result.success(emptyList())
            }

            val ranked = askClaudeToRankCandidates(
                apiKey, businessName, location, businessType, verifiedCandidates
            )

            Result.success(ranked)
        } catch (e: Exception) {
            Log.e(TAG, "Business discovery failed", e)
            Result.failure(Exception("Failed to find business: ${e.message}"))
        }
    }

    private fun findBusinessWebsitesViaCloud(
        businessName: String,
        location: String,
        businessType: String
    ): List<BusinessCandidate>? {
        val endpoint = getCloudAiEndpoint() ?: return null

        return try {
            val requestBody = gson.toJson(
                mapOf(
                    "mode" to "discover",
                    "business_name" to businessName,
                    "location" to location,
                    "business_type" to businessType
                )
            ).toRequestBody("application/json".toMediaType())

            val request = Request.Builder()
                .url(endpoint)
                .post(requestBody)
                .build()

            httpClient.newCall(request).execute().use { response ->
                val responseText = response.body?.string().orEmpty()
                if (!response.isSuccessful) {
                    Log.w(TAG, "Cloud discover failed (${response.code}): $responseText")
                    return null
                }

                val cloudResponse = gson.fromJson(responseText, CloudDiscoverResponse::class.java)
                if (!cloudResponse.success) {
                    Log.w(TAG, "Cloud discover returned unsuccessful response: ${cloudResponse.error}")
                    return null
                }

                cloudResponse.candidates
            }
        } catch (e: Exception) {
            Log.w(TAG, "Cloud discover unavailable: ${e.message}")
            null
        }
    }

    suspend fun analyzeBusinessWithServer(
        urls: List<String>,
        businessName: String,
        location: String,
        businessType: String
    ): Result<StoreSetupResult> = withContext(Dispatchers.IO) {
        val endpoint = getCloudAiEndpoint()
            ?: return@withContext Result.failure(Exception("Cloud AI endpoint not configured"))

        try {
            val requestBody = gson.toJson(
                mapOf(
                    "mode" to "device_setup",
                    "urls" to urls,
                    "business_name" to businessName,
                    "location" to location,
                    "business_type" to businessType
                )
            ).toRequestBody("application/json".toMediaType())

            val request = Request.Builder()
                .url(endpoint)
                .post(requestBody)
                .build()

            reportStatus("Posterita AI is processing your business online...")

            httpClient.newCall(request).execute().use { response ->
                val responseText = response.body?.string().orEmpty()
                if (!response.isSuccessful) {
                    val message = try {
                        gson.fromJson(responseText, CloudSetupResponse::class.java)?.error
                    } catch (_: Exception) {
                        null
                    }
                    return@withContext Result.failure(
                        Exception(message ?: "Cloud AI import failed (${response.code})")
                    )
                }

                val cloudResponse = gson.fromJson(responseText, CloudSetupResponse::class.java)
                val setup = cloudResponse.setup
                if (!cloudResponse.success || setup == null) {
                    return@withContext Result.failure(
                        Exception(cloudResponse.error ?: "Cloud AI import returned no data")
                    )
                }

                Result.success(setup)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Cloud AI import failed", e)
            Result.failure(Exception("Cloud AI import failed: ${e.message}"))
        }
    }

    /**
     * Uses Claude API with the web_search tool to find business websites.
     * Claude searches the internet itself, which is far more reliable than
     * scraping Google/DuckDuckGo HTML results.
     */
    private fun findBusinessWithWebSearch(
        apiKey: String,
        businessName: String,
        location: String,
        businessType: String
    ): List<BusinessCandidate>? {
        val typeHint = if (businessType.isNotBlank()) "\n- What they sell: $businessType" else ""

        val prompt = """Search the internet to find the official website, social media pages, and any online presence for this business:

- Business name: $businessName
- Location: $location$typeHint

Search for their:
1. Official website
2. Facebook page
3. Instagram page
4. Google Maps / Google Business listing
5. Review pages (TripAdvisor, Yelp, Zomato, etc.)
6. Delivery platform listings (Uber Eats, DoorDash, Deliveroo, etc.)
7. Any other relevant online presence

After searching, return a JSON array of ALL relevant URLs you found, ranked by usefulness for extracting their product catalog or menu. For each URL, provide:
- "url": the actual full URL
- "name": a clean name for this source
- "description": what useful information this page contains (e.g. "Official website with full product catalog", "Facebook business page with menu photos", "TripAdvisor listing with menu and reviews")
- "confidence": "high" if it's clearly this business, "medium" if likely, "low" if uncertain

Return ONLY a JSON array, no other text. Example:
[{"url": "https://example.com", "name": "Example Business", "description": "Official website with product listings", "confidence": "high"}]

If you cannot find any relevant websites, return an empty array: []"""

        val tools = listOf(
            mapOf(
                "type" to "web_search_20250305",
                "name" to "web_search",
                "max_uses" to 5
            )
        )

        val requestBody = gson.toJson(
            ClaudeRequest(
                model = MODEL,
                max_tokens = 4096,
                messages = listOf(ClaudeMessage("user", prompt)),
                tools = tools
            )
        )

        val request = Request.Builder()
            .url(CLAUDE_API_URL)
            .header("x-api-key", apiKey)
            .header("anthropic-version", "2023-06-01")
            .header("anthropic-beta", WEB_SEARCH_BETA)
            .header("content-type", "application/json")
            .post(requestBody.toRequestBody("application/json".toMediaType()))
            .build()

        return try {
            val response = executeWithRetry(request, "Business web search") ?: return null
            val body = response.body?.string() ?: return null

            if (!response.isSuccessful) {
                Log.e(TAG, "Claude web search API error ${response.code}: $body")
                return null
            }

            val text = extractTextFromResponse(body) ?: return null

            val jsonStr = extractJsonArray(text)
            val listType = object : TypeToken<List<BusinessCandidate>>() {}.type
            gson.fromJson<List<BusinessCandidate>>(jsonStr, listType)
        } catch (e: Exception) {
            Log.e(TAG, "Claude web search failed", e)
            null
        }
    }

    /**
     * Performs real Google searches with multiple queries to find the business
     * across websites, social media, review sites, maps, etc.
     */
    private fun searchGoogle(
        businessName: String,
        location: String,
        businessType: String
    ): List<String> {
        val allUrls = mutableSetOf<String>()

        // Build multiple search queries to cast a wide net
        val queries = mutableListOf<String>()
        val nameAndLocation = "$businessName $location".trim()

        // Main search
        queries.add("\"$businessName\" $location")
        // Social media specific
        queries.add("\"$businessName\" $location site:facebook.com OR site:instagram.com")
        // Review/listing sites
        if (businessType.isNotBlank()) {
            queries.add("\"$businessName\" $location $businessType menu OR products OR catalog")
        }
        // Google Maps / Places
        queries.add("\"$businessName\" $location address phone")

        for (query in queries) {
            try {
                val urls = scrapeGoogleResults(query)
                allUrls.addAll(urls)
                Log.d(TAG, "Query '$query' returned ${urls.size} URLs")
            } catch (e: Exception) {
                Log.d(TAG, "Google search failed for '$query': ${e.message}")
            }
        }

        // Also try DuckDuckGo as fallback (different results, no captcha issues)
        try {
            val ddgUrls = scrapeDuckDuckGoResults(nameAndLocation)
            allUrls.addAll(ddgUrls)
            Log.d(TAG, "DuckDuckGo returned ${ddgUrls.size} URLs")
        } catch (e: Exception) {
            Log.d(TAG, "DuckDuckGo search failed: ${e.message}")
        }

        // Filter out generic/irrelevant URLs
        return allUrls.filter { url ->
            !url.contains("google.com/search") &&
            !url.contains("google.com/maps/dir") &&
            !url.contains("accounts.google.com") &&
            !url.contains("support.google.com") &&
            !url.contains("translate.google.com") &&
            !url.contains("webcache.googleusercontent") &&
            !url.startsWith("https://www.google.") &&
            !url.contains("duckduckgo.com") &&
            url.startsWith("http")
        }.take(15) // cap at 15 to keep probing fast
    }

    private fun scrapeGoogleResults(query: String): List<String> {
        val encodedQuery = java.net.URLEncoder.encode(query, "UTF-8")
        val searchUrl = "https://www.google.com/search?q=$encodedQuery&num=10&hl=en"

        val request = Request.Builder()
            .url(searchUrl)
            .header("User-Agent", "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36")
            .header("Accept-Language", "en-US,en;q=0.9")
            .get()
            .build()

        val searchClient = httpClient.newBuilder()
            .connectTimeout(10, TimeUnit.SECONDS)
            .readTimeout(15, TimeUnit.SECONDS)
            .followRedirects(true)
            .build()

        val response = searchClient.newCall(request).execute()
        val html = response.body?.string() ?: return emptyList()

        return extractGoogleLinks(html)
    }

    private fun extractGoogleLinks(html: String): List<String> {
        val urls = mutableListOf<String>()

        // Pattern 1: href="/url?q=ACTUAL_URL&..." (Google redirect links)
        val redirectRegex = Regex("""/url\?q=(https?://[^&"]+)""")
        for (match in redirectRegex.findAll(html)) {
            val url = java.net.URLDecoder.decode(match.groupValues[1], "UTF-8")
            urls.add(url)
        }

        // Pattern 2: Direct links in href="https://..."
        val directRegex = Regex("""href="(https?://(?:www\.)?(?:facebook|instagram|tripadvisor|yelp|zomato|foursquare|yellowpages|linkedin)[^"]+)""")
        for (match in directRegex.findAll(html)) {
            urls.add(match.groupValues[1])
        }

        // Pattern 3: data-href or data-url attributes
        val dataRegex = Regex("""data-(?:href|url)="(https?://[^"]+)""")
        for (match in dataRegex.findAll(html)) {
            urls.add(match.groupValues[1])
        }

        return urls.distinct()
    }

    private fun scrapeDuckDuckGoResults(query: String): List<String> {
        val encodedQuery = java.net.URLEncoder.encode(query, "UTF-8")
        val searchUrl = "https://html.duckduckgo.com/html/?q=$encodedQuery"

        val request = Request.Builder()
            .url(searchUrl)
            .header("User-Agent", "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36")
            .get()
            .build()

        val searchClient = httpClient.newBuilder()
            .connectTimeout(10, TimeUnit.SECONDS)
            .readTimeout(15, TimeUnit.SECONDS)
            .followRedirects(true)
            .build()

        val response = searchClient.newCall(request).execute()
        val html = response.body?.string() ?: return emptyList()

        val urls = mutableListOf<String>()
        // DuckDuckGo HTML version has links like href="//duckduckgo.com/l/?uddg=ENCODED_URL"
        val ddgRegex = Regex("""uddg=(https?[^&"]+)""")
        for (match in ddgRegex.findAll(html)) {
            val url = java.net.URLDecoder.decode(match.groupValues[1], "UTF-8")
            urls.add(url)
        }
        // Also try direct href patterns
        val directRegex = Regex("""class="result__a"[^>]*href="(https?://[^"]+)""")
        for (match in directRegex.findAll(html)) {
            urls.add(match.groupValues[1])
        }

        return urls.distinct()
    }

    /**
     * Probes a URL to check if it's live and extracts the page title + description.
     */
    private fun probeWebsite(url: String): BusinessCandidate? {
        val normalizedUrl = if (!url.startsWith("http")) "https://$url" else url

        val request = Request.Builder()
            .url(normalizedUrl)
            .header("User-Agent", "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36")
            .get()
            .build()

        return try {
            val probeClient = httpClient.newBuilder()
                .connectTimeout(8, TimeUnit.SECONDS)
                .readTimeout(10, TimeUnit.SECONDS)
                .followRedirects(true)
                .build()

            probeClient.newCall(request).execute().use { response ->
                if (!response.isSuccessful) return null
                val html = response.body?.string() ?: return null
                if (html.length < 100) return null // too short, probably not a real page

                val title = extractHtmlTitle(html)
                val description = extractMetaDescription(html)
                val finalUrl = response.request.url.toString()

                BusinessCandidate(
                    url = finalUrl,
                    name = title.ifBlank { normalizedUrl },
                    description = description,
                    confidence = "unranked"
                )
            }
        } catch (e: Exception) {
            Log.d(TAG, "Probe failed for $url: ${e.message}")
            null
        }
    }

    private fun extractHtmlTitle(html: String): String {
        val titleRegex = Regex("<title[^>]*>([^<]*)</title>", RegexOption.IGNORE_CASE)
        return titleRegex.find(html)?.groupValues?.get(1)?.trim()?.take(120) ?: ""
    }

    private fun extractMetaDescription(html: String): String {
        val descRegex = Regex(
            """<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']""",
            RegexOption.IGNORE_CASE
        )
        val match = descRegex.find(html)
        if (match != null) return match.groupValues[1].trim().take(200)

        // Try reversed attribute order
        val descRegex2 = Regex(
            """<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["']""",
            RegexOption.IGNORE_CASE
        )
        return descRegex2.find(html)?.groupValues?.get(1)?.trim()?.take(200) ?: ""
    }

    private fun askClaudeToRankCandidates(
        apiKey: String,
        businessName: String,
        location: String,
        businessType: String,
        candidates: List<BusinessCandidate>
    ): List<BusinessCandidate> {
        val candidateList = candidates.mapIndexed { i, c ->
            "${i + 1}. URL: ${c.url}\n   Title: ${c.name}\n   Description: ${c.description}"
        }.joinToString("\n\n")

        val prompt = """
A user described their business as:
- Name: $businessName
- Location: $location
- What they sell: $businessType

We found these websites that are live:

$candidateList

Analyze each website and determine which ones are likely to be this specific business or contain their product/menu information.

Return a JSON array of the matching websites, ranked by confidence (best match first). Only include websites that seem relevant. For each, provide:
- "url": the website URL
- "name": a clean business name from the page title
- "description": a one-line description of what this page contains (e.g. "Official website with full product catalog", "Facebook business page", "Restaurant menu on TripAdvisor")
- "confidence": "high", "medium", or "low"

Return ONLY a JSON array, no other text. Example:
[{"url": "https://example.com", "name": "Example Business", "description": "Official website with product listings", "confidence": "high"}]

If NONE of the websites match, return an empty array: []
""".trimIndent()

        val requestBody = gson.toJson(
            ClaudeRequest(
                model = MODEL,
                max_tokens = 2048,
                messages = listOf(ClaudeMessage("user", prompt))
            )
        )

        val request = Request.Builder()
            .url(CLAUDE_API_URL)
            .header("x-api-key", apiKey)
            .header("anthropic-version", "2023-06-01")
            .header("content-type", "application/json")
            .post(requestBody.toRequestBody("application/json".toMediaType()))
            .build()

        return try {
            val response = httpClient.newCall(request).execute()
            val body = response.body?.string() ?: return candidates
            if (!response.isSuccessful) return candidates

            val claudeResponse = gson.fromJson(body, ClaudeResponse::class.java)
            val text = claudeResponse.content?.firstOrNull { it.type == "text" }?.text
                ?: return candidates

            val jsonStr = extractJsonArray(text)
            val listType = object : TypeToken<List<BusinessCandidate>>() {}.type
            gson.fromJson(jsonStr, listType) ?: candidates
        } catch (e: Exception) {
            Log.e(TAG, "Failed to rank candidates", e)
            candidates
        }
    }

    private fun extractJsonArray(text: String): String {
        // Try markdown code block
        val codeBlockRegex = Regex("```(?:json)?\\s*\\n?(\\[[\\s\\S]*?\\])\\s*\\n?```")
        val match = codeBlockRegex.find(text)
        if (match != null) return match.groupValues[1]

        // Try raw JSON array
        val arrStart = text.indexOf('[')
        val arrEnd = text.lastIndexOf(']')
        if (arrStart != -1 && arrEnd != -1 && arrEnd > arrStart) {
            return text.substring(arrStart, arrEnd + 1)
        }

        return text
    }

    // ── Claude API request/response models ──

    private data class ClaudeRequest(
        val model: String,
        val max_tokens: Int,
        val messages: List<ClaudeMessage>,
        val tools: List<Map<String, Any>>? = null
    )

    private data class ClaudeMessage(
        val role: String,
        val content: Any // String for text-only, List<Map> for vision
    )

    private data class ClaudeResponse(
        val content: List<ClaudeContent>? = null,
        val error: ClaudeError? = null
    )

    private data class ClaudeContent(
        val type: String = "",
        val text: String = ""
    )

    private data class ClaudeError(
        val type: String = "",
        val message: String = ""
    )

    /**
     * Fetches the website HTML, sends it to Claude for analysis, and returns
     * structured store setup data.
     */
    suspend fun analyzeWebsite(websiteUrl: String): Result<StoreSetupResult> = withContext(Dispatchers.IO) {
        try {
            // Step 1: Fetch website HTML
            reportStatus("Fetching $websiteUrl...")
            val html = fetchWebsiteHtml(websiteUrl)

            if (html != null) {
                reportStatus("Got page (${html.length / 1024}KB), sending to AI...")
                // Truncate HTML to avoid token limits (keep first ~80KB)
                val truncatedHtml = if (html.length > 80_000) html.take(80_000) else html

                // Step 2: Send to Claude for analysis
                val setupData = callClaudeApi(truncatedHtml, websiteUrl)
                if (setupData != null) {
                    return@withContext Result.success(setupData)
                }
                reportStatus("AI couldn't extract products from page, trying web search...")
            } else {
                reportStatus("Couldn't load page, using AI web search instead...")
            }

            // Fallback: Use Claude web search to analyze the URL
            val apiKey = getApiKey()
            if (apiKey.isNotBlank()) {
                val webSearchResult = analyzeBusinessWithWebSearch(
                    apiKey, "", "", "", listOf(websiteUrl)
                )
                if (webSearchResult != null) {
                    return@withContext Result.success(webSearchResult)
                }
            }

            Result.failure(Exception("Could not fetch or analyze the website. Check the URL and try again."))
        } catch (e: Exception) {
            Log.e(TAG, "Website analysis failed", e)
            Result.failure(Exception("Failed to analyze website: ${e.message}"))
        }
    }

    /**
     * Fetches HTML from multiple sources in parallel (website, Facebook, Instagram,
     * review sites, etc.), combines all content, and sends to Claude for a comprehensive
     * store setup extraction.
     *
     * @param urls List of URLs to scrape (official site, social media, review pages, etc.)
     * @param businessName The business name for context
     * @param location The business location for context
     * @param businessType What the business sells
     */
    suspend fun analyzeMultipleSources(
        urls: List<String>,
        businessName: String,
        location: String,
        businessType: String
    ): Result<StoreSetupResult> = withContext(Dispatchers.IO) {
        try {
            val apiKey = getApiKey()
            if (apiKey.isBlank()) {
                return@withContext Result.failure(Exception("API key not configured"))
            }

            // Fetch all URLs in parallel (but max 4 at a time to be nice to servers)
            reportStatus("Fetching ${urls.size} web pages...")
            var fetchedCount = 0
            val fetchResults = coroutineScope {
                urls.map { url ->
                    async(Dispatchers.IO) {
                        try {
                            val html = fetchWebsiteHtml(url)
                            fetchedCount++
                            reportStatus("Fetched $fetchedCount/${urls.size} pages...")
                            if (html != null && html.length >= 100) url to html else null
                        } catch (e: Exception) {
                            fetchedCount++
                            reportStatus("Fetched $fetchedCount/${urls.size} pages (${url.take(30)}... failed)")
                            null
                        }
                    }
                }.awaitAll().filterNotNull()
            }

            if (fetchResults.isEmpty()) {
                // Fallback: use Claude web search to analyze the business directly
                reportStatus("Web pages unreachable — using AI web search instead...")
                val webSearchResult = analyzeBusinessWithWebSearch(
                    apiKey, businessName, location, businessType, urls
                )
                if (webSearchResult != null) {
                    return@withContext Result.success(webSearchResult)
                }
                return@withContext Result.failure(
                    Exception("Could not fetch any of the websites. Check URLs and try again.")
                )
            }

            reportStatus("Got ${fetchResults.size}/${urls.size} pages, sending to AI...")

            // Build a combined prompt with all sources
            // Keep total under ~8KB to stay within rate limits (~2K tokens)
            val combinedSources = buildString {
                for ((url, html) in fetchResults) {
                    val budget = (8_000 / fetchResults.size).coerceAtMost(4_000)
                    val truncated = if (html.length > budget) html.take(budget) else html
                    append("═══ SOURCE: $url ═══\n")
                    append(truncated)
                    append("\n\n")
                }
            }

            reportStatus("Asking AI to extract products and prices...")
            val setupData = callClaudeApiMultiSource(
                combinedSources, fetchResults.map { it.first },
                businessName, location, businessType
            ) ?: return@withContext Result.failure(
                Exception("AI could not extract products. Try different sources or set up manually.")
            )

            Result.success(setupData)
        } catch (e: Exception) {
            Log.e(TAG, "Multi-source analysis failed", e)
            Result.failure(Exception("Failed to analyze sources: ${e.message}"))
        }
    }

    /**
     * Uses Claude with web_search tool to analyze a business directly,
     * bypassing the need to scrape URLs ourselves.
     * This is the fallback when URL fetching fails.
     */
    private fun analyzeBusinessWithWebSearch(
        apiKey: String,
        businessName: String,
        location: String,
        businessType: String,
        hintUrls: List<String>
    ): StoreSetupResult? {
        val urlHints = if (hintUrls.isNotEmpty()) {
            "\n\nHere are some URLs that may belong to this business (visit them if possible):\n" +
                hintUrls.joinToString("\n") { "- $it" }
        } else ""

        val prompt = """You are a business intelligence expert. Search the internet to find complete product/menu information for this business and set up their Point of Sale system.

Business details:
- Name: $businessName
- Location: $location
- What they sell: $businessType$urlHints

Search for this business across their official website, social media (Facebook, Instagram), review sites (TripAdvisor, Yelp, Zomato), delivery platforms (Uber Eats, DoorDash, Deliveroo), and any other sources.

YOUR JOB: Find and extract ALL their products/menu items with prices, plus store information.

Return a JSON object with this EXACT structure (no other text, just JSON):
{
  "store_name": "The actual business name",
  "store_description": "What this business sells",
  "address": "Full street address",
  "city": "City name",
  "country": "Country name",
  "phone": "Phone number with country code",
  "opening_hours": "e.g. Mon-Sat 9:00-18:00",
  "currency": "3-letter code (USD, EUR, GBP, MUR, etc.)",
  "business_type": "retail" or "restaurant",
  "tax_rate": 15.0,
  "tax_name": "VAT or appropriate tax name",
  "categories": [
    {
      "name": "Category Name",
      "products": [
        {"name": "Product Name", "price": 9.99, "description": "Brief description", "image_url": "https://example.com/product-image.jpg"}
      ]
    }
  ],
  "stores": [
    {
      "store_name": "Brand — Branch Name",
      "address": "Full address",
      "city": "City",
      "country": "Country",
      "currency": "MUR",
      "phone": "Phone",
      "opening_hours": "Hours"
    }
  ]
}

CRITICAL RULES:
- Extract EVERY product/menu item you can find — be thorough
- Use REAL prices from the sources. If no prices found, estimate realistic local prices
- Include at LEAST 10 products if the business has that many
- If multiple locations exist, list each in the "stores" array
- IMAGES: For each product, search for a real product photo URL. Look on the business website, social media, delivery platforms (Uber Eats, Deliveroo), review sites with photos. The image_url MUST be a full absolute URL starting with https://. If you truly cannot find an image for a product, use empty string "".
- Return ONLY valid JSON, no markdown, no explanation"""

        val tools = listOf(
            mapOf(
                "type" to "web_search_20250305",
                "name" to "web_search",
                "max_uses" to 10
            )
        )

        val requestBody = gson.toJson(
            ClaudeRequest(
                model = MODEL,
                max_tokens = 8192,
                messages = listOf(ClaudeMessage("user", prompt)),
                tools = tools
            )
        )

        val request = Request.Builder()
            .url(CLAUDE_API_URL)
            .header("x-api-key", apiKey)
            .header("anthropic-version", "2023-06-01")
            .header("anthropic-beta", WEB_SEARCH_BETA)
            .header("content-type", "application/json")
            .post(requestBody.toRequestBody("application/json".toMediaType()))
            .build()

        return try {
            reportStatus("AI is searching the web for business info...")
            val response = executeWithRetry(request, "Web search analysis") ?: return null
            val body = response.body?.string() ?: return null

            if (!response.isSuccessful) {
                Log.e(TAG, "Claude web search analysis error ${response.code}: $body")
                reportStatus("AI web search failed (HTTP ${response.code})")
                return null
            }

            reportStatus("AI finished searching, extracting product data...")
            val text = extractTextFromResponse(body) ?: return null

            val jsonStr = extractJson(text)
            gson.fromJson(jsonStr, StoreSetupResult::class.java)
        } catch (e: Exception) {
            Log.e(TAG, "Web search analysis failed", e)
            null
        }
    }

    /**
     * Executes an OkHttp request with retry on 429 rate limit errors.
     * Waits 60s between retries (rate limit is per minute).
     * Reports status via statusListener so the user sees what's happening.
     */
    private fun executeWithRetry(request: Request, tag: String, maxRetries: Int = 3): okhttp3.Response? {
        for (attempt in 0..maxRetries) {
            val response = httpClient.newCall(request).execute()
            if (response.code != 429) return response
            val body = response.body?.string() ?: ""
            Log.w(TAG, "$tag rate limited (attempt ${attempt + 1}/${maxRetries + 1}): $body")
            response.close()
            if (attempt < maxRetries) {
                val waitSecs = 30 + attempt * 15 // 30s, 45s, 60s — escalating backoff
                reportStatus("Rate limited — waiting ${waitSecs}s before retry (${attempt + 1}/${maxRetries})...")
                Thread.sleep(waitSecs * 1000L)
                reportStatus("Retrying $tag...")
            }
        }
        reportStatus("Rate limit exceeded after ${maxRetries + 1} attempts")
        return null
    }

    private fun callClaudeApiMultiSource(
        combinedHtml: String,
        sourceUrls: List<String>,
        businessName: String,
        location: String,
        businessType: String
    ): StoreSetupResult? {
        val apiKey = getApiKey()
        if (apiKey.isBlank()) return null

        val prompt = buildMultiSourcePrompt(
            combinedHtml, sourceUrls, businessName, location, businessType
        )

        val requestBody = gson.toJson(
            ClaudeRequest(
                model = MODEL,
                max_tokens = 4096,
                messages = listOf(ClaudeMessage("user", prompt))
            )
        )

        val request = Request.Builder()
            .url(CLAUDE_API_URL)
            .header("x-api-key", apiKey)
            .header("anthropic-version", "2023-06-01")
            .header("content-type", "application/json")
            .post(requestBody.toRequestBody("application/json".toMediaType()))
            .build()

        reportStatus("Waiting for AI to analyze ${sourceUrls.size} sources...")
        val response = executeWithRetry(request, "Claude multi-source") ?: return null
        val responseBody = response.body?.string() ?: return null

        if (!response.isSuccessful) {
            Log.e(TAG, "Claude multi-source API error ${response.code}: $responseBody")
            reportStatus("AI analysis failed (HTTP ${response.code})")
            return null
        }

        reportStatus("AI responded, parsing product data...")
        val claudeResponse = gson.fromJson(responseBody, ClaudeResponse::class.java)
        if (claudeResponse.error != null) {
            Log.e(TAG, "Claude error: ${claudeResponse.error.message}")
            return null
        }

        val text = claudeResponse.content?.firstOrNull { it.type == "text" }?.text ?: return null
        val jsonStr = extractJson(text)

        return try {
            gson.fromJson(jsonStr, StoreSetupResult::class.java)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to parse multi-source response: $jsonStr", e)
            null
        }
    }

    private fun buildMultiSourcePrompt(
        combinedHtml: String,
        sourceUrls: List<String>,
        businessName: String,
        location: String,
        businessType: String
    ): String = """
You are a business intelligence expert analyzing MULTIPLE online sources to set up a Point of Sale system for a real business.

The business owner told us:
- Business name: $businessName
- Location: $location
- What they sell: $businessType

We scraped the following ${sourceUrls.size} sources about this business:
${sourceUrls.mapIndexed { i, url -> "${i + 1}. $url" }.joinToString("\n")}

Here is the combined HTML content from ALL sources:
```
$combinedHtml
```

YOUR JOB: Cross-reference ALL sources to build the MOST COMPLETE picture of this business. Be thorough!

Where to find data:
- Official website → product catalog, prices, store info
- Facebook page → menu/product posts, photos with prices, business info, phone, hours
- Instagram → product photos, stories with prices, tagged menu items
- Google Maps/Business → address, phone, hours, reviews mentioning products
- TripAdvisor/Yelp → detailed menu items, prices from reviews
- Delivery platforms (Uber Eats, Zomato, etc.) → full structured menu with prices
- Yellow pages / local directories → phone, address, business category

Return a JSON object with this EXACT structure (no other text, just JSON):
{
  "store_name": "The actual legal/trading business name (brand name)",
  "store_description": "What this business sells — be specific",
  "address": "Full street address of the main/first location from ANY source",
  "city": "City name",
  "country": "Country name",
  "phone": "Phone number if found in ANY source (with country code if possible)",
  "opening_hours": "e.g. Mon-Sat 9:00-18:00, Sun Closed",
  "currency": "3-letter code (USD, EUR, GBP, MUR, etc.) — infer from prices shown or country",
  "business_type": "retail" or "restaurant",
  "tax_rate": 15.0,
  "tax_name": "VAT" or "GST" or "Sales Tax" — appropriate for the country,
  "categories": [
    {
      "name": "Category Name",
      "products": [
        {
          "name": "Product Name — be specific (include size/variant if known)",
          "price": 9.99,
          "description": "Brief product description",
          "image_url": "Full absolute URL to product image (must start with https://)"
        }
      ]
    }
  ],
  "stores": [
    {
      "store_name": "Brand Name — Location/Branch Name",
      "address": "Full street address of this specific location",
      "city": "City name",
      "phone": "Phone for this specific location",
      "opening_hours": "Hours for this specific location"
    }
  ]
}

CRITICAL RULES:
- Extract EVERY product/menu item you can find across ALL sources — do NOT summarize or skip items
- Merge duplicates: if "Cappuccino" appears on website AND Facebook, combine into one entry with best price/image
- Prices: use REAL prices from the sources. Look for price patterns like "Rs 250", "MUR 500", "$12.99", etc.
- If prices are in posts/reviews like "had the pizza for Rs 350", extract that price
- If NO prices at all, estimate realistic prices for this type of business in this country
- Images: prefer high-res images. Facebook/Instagram images are fine — use the full URL
- Categories: create logical groupings. For restaurants: Starters, Mains, Desserts, Drinks, etc. For retail: group by product type
- Phone: look in Facebook "About" section, website footer/contact page, Google listing, directories
- Address: look everywhere — Facebook info, Google Maps, website footer, review sites
- Opening hours: Facebook business info, Google Maps listing, website
- Return ONLY valid JSON, no markdown, no explanation, no preamble
- Include at LEAST 10 products if the business clearly has that many — dig deep into every source
- MULTI-STORE: If the business has MULTIPLE locations/branches (look for "Our Locations", "Branches", "Find Us", store locator, multiple addresses across ANY source — website, Facebook pages, Google Maps listings, review sites), list EACH location in the "stores" array with its own name, address, city, phone, and hours. Use format "Brand — Branch" for store_name (e.g. "Café XYZ — Grand Baie", "Café XYZ — Port Louis"). If only ONE location exists, still include it in the "stores" array.
""".trimIndent()

    /**
     * Analyzes a product photo using Claude Vision and returns product details.
     * @param imageBytes JPEG image data from the camera
     */
    suspend fun analyzeProductImage(imageBytes: ByteArray): Result<ProductAnalysisResult> = withContext(Dispatchers.IO) {
        try {
            val apiKey = getApiKey()
            if (apiKey.isBlank()) {
                return@withContext Result.failure(Exception("API key not configured"))
            }

            val base64Image = Base64.encodeToString(imageBytes, Base64.NO_WRAP)

            // Build vision request with image content block
            val contentBlocks = listOf(
                mapOf(
                    "type" to "image",
                    "source" to mapOf(
                        "type" to "base64",
                        "media_type" to "image/jpeg",
                        "data" to base64Image
                    )
                ),
                mapOf(
                    "type" to "text",
                    "text" to """Look at this product photo and extract the following information.
Return ONLY a JSON object with this exact structure (no other text):
{
  "name": "Product name - be specific (e.g. 'Coca-Cola 330ml' not just 'Soda')",
  "price": 0.0,
  "description": "Brief 1-2 sentence description of the product",
  "category": "Suggested category name (e.g. 'Drinks', 'Snacks', 'Electronics')"
}

RULES:
- If you can see a price tag or label, use that exact price
- If no price is visible, set price to 0.0 (the user will fill it in)
- Read any text/labels on the product for accurate naming
- Return ONLY valid JSON"""
                )
            )

            val requestBody = gson.toJson(
                ClaudeRequest(
                    model = MODEL,
                    max_tokens = 1024,
                    messages = listOf(ClaudeMessage("user", contentBlocks))
                )
            )

            val request = Request.Builder()
                .url(CLAUDE_API_URL)
                .header("x-api-key", apiKey)
                .header("anthropic-version", "2023-06-01")
                .header("content-type", "application/json")
                .post(requestBody.toRequestBody("application/json".toMediaType()))
                .build()

            val response = httpClient.newCall(request).execute()
            val responseBody = response.body?.string() ?: return@withContext Result.failure(Exception("Empty response"))

            if (!response.isSuccessful) {
                Log.e(TAG, "Claude Vision API error ${response.code}: $responseBody")
                return@withContext Result.failure(Exception("AI analysis failed (${response.code})"))
            }

            val claudeResponse = gson.fromJson(responseBody, ClaudeResponse::class.java)
            if (claudeResponse.error != null) {
                return@withContext Result.failure(Exception(claudeResponse.error.message))
            }

            val text = claudeResponse.content?.firstOrNull { it.type == "text" }?.text
                ?: return@withContext Result.failure(Exception("No response from AI"))

            val jsonStr = extractJson(text)
            val result = gson.fromJson(jsonStr, ProductAnalysisResult::class.java)
            Result.success(result)
        } catch (e: Exception) {
            Log.e(TAG, "Product image analysis failed", e)
            Result.failure(Exception("Failed to analyze image: ${e.message}"))
        }
    }

    /**
     * Analyzes a product image with quality assessment for bulk import.
     * Returns product details plus image quality score and search terms for finding better images.
     */
    suspend fun analyzeProductImageWithQuality(imageBytes: ByteArray, folderHint: String = ""): Result<BulkProductAnalysisResult> = withContext(Dispatchers.IO) {
        try {
            val apiKey = getApiKey()
            if (apiKey.isBlank()) {
                return@withContext Result.failure(Exception("API key not configured"))
            }

            val base64Image = Base64.encodeToString(imageBytes, Base64.NO_WRAP)

            val contentBlocks = listOf(
                mapOf(
                    "type" to "image",
                    "source" to mapOf(
                        "type" to "base64",
                        "media_type" to "image/jpeg",
                        "data" to base64Image
                    )
                ),
                mapOf(
                    "type" to "text",
                    "text" to """Look at this product photo and extract details plus assess the image quality.
${if (folderHint.isNotBlank()) "HINT: This image was in a folder named \"$folderHint\" — this is likely the product name or category. Use this as context." else ""}
Return ONLY a JSON object with this exact structure (no other text):
{
  "name": "Product name - be specific (e.g. 'Coca-Cola 330ml' not just 'Soda')",
  "price": 0.0,
  "description": "Brief 1-2 sentence description of the product",
  "category": "Suggested category name (e.g. 'Drinks', 'Snacks', 'Electronics')",
  "image_quality": 75,
  "quality_issues": ["list", "of", "issues"],
  "search_terms": "best search query to find a professional stock photo of this exact product"
}

RULES:
- If you can see a price tag or label, use that exact price
- If no price is visible, set price to 0.0
- Read any text/labels on the product for accurate naming
- image_quality: 0-100 score. Consider: lighting, focus/sharpness, background cleanliness, product visibility, professional appearance. A clear product photo on white/clean background = 80+. Dark/blurry/cluttered = below 50.
- quality_issues: list specific problems like "blurry", "dark lighting", "cluttered background", "partial view", "low resolution". Empty list if quality >= 70.
- search_terms: a Google Images search query that would find a professional/stock photo of this exact product. Be specific with brand and variant.
- Return ONLY valid JSON"""
                )
            )

            val requestBody = gson.toJson(
                ClaudeRequest(
                    model = MODEL,
                    max_tokens = 1024,
                    messages = listOf(ClaudeMessage("user", contentBlocks))
                )
            )

            val request = Request.Builder()
                .url(CLAUDE_API_URL)
                .header("x-api-key", apiKey)
                .header("anthropic-version", "2023-06-01")
                .header("content-type", "application/json")
                .post(requestBody.toRequestBody("application/json".toMediaType()))
                .build()

            val response = httpClient.newCall(request).execute()
            val responseBody = response.body?.string() ?: return@withContext Result.failure(Exception("Empty response"))

            if (!response.isSuccessful) {
                Log.e(TAG, "Claude Vision API error ${response.code}: $responseBody")
                return@withContext Result.failure(Exception("AI analysis failed (${response.code})"))
            }

            val claudeResponse = gson.fromJson(responseBody, ClaudeResponse::class.java)
            if (claudeResponse.error != null) {
                return@withContext Result.failure(Exception(claudeResponse.error.message))
            }

            val text = claudeResponse.content?.firstOrNull { it.type == "text" }?.text
                ?: return@withContext Result.failure(Exception("No response from AI"))

            val jsonStr = extractJson(text)
            val result = gson.fromJson(jsonStr, BulkProductAnalysisResult::class.java)
            Result.success(result)
        } catch (e: Exception) {
            Log.e(TAG, "Product image quality analysis failed", e)
            Result.failure(Exception("Failed to analyze image: ${e.message}"))
        }
    }

    // ── Document-based bulk product extraction ──

    data class DocumentProductsResult(
        @SerializedName("products") val products: List<ExtractedProduct> = emptyList()
    )

    data class ExtractedProduct(
        @SerializedName("name") val name: String = "",
        @SerializedName("price") val price: Double = 0.0,
        @SerializedName("description") val description: String = "",
        @SerializedName("category") val category: String = ""
    )

    private val documentPrompt = """Analyze this document and extract ALL products/items with their details.
Return ONLY a JSON object with this exact structure (no other text):
{
  "products": [
    {
      "name": "Specific product name (e.g. 'Coca-Cola 330ml' not just 'Drink')",
      "price": 0.0,
      "description": "Brief 1-2 sentence description",
      "category": "Category name (e.g. 'Beverages', 'Food', 'Electronics')"
    }
  ]
}

RULES:
- Extract EVERY product/item found in the document
- Use exact prices from the document when available; set to 0.0 if not found
- Be specific with product names — include brand, size, variant when visible
- Group similar items under logical categories
- For menus/price lists, include ALL items — don't skip any
- Return ONLY valid JSON"""

    /**
     * Analyzes a text document (CSV, plain text, extracted DOCX/XLSX content)
     * and extracts product information using Claude.
     */
    suspend fun analyzeDocumentForProducts(textContent: String): Result<DocumentProductsResult> = withContext(Dispatchers.IO) {
        try {
            val apiKey = getApiKey()
            if (apiKey.isBlank()) {
                return@withContext Result.failure(Exception("API key not configured"))
            }

            val requestBody = gson.toJson(
                ClaudeRequest(
                    model = MODEL,
                    max_tokens = 4096,
                    messages = listOf(
                        ClaudeMessage("user", "Here is a document containing product/item information:\n\n$textContent\n\n$documentPrompt")
                    )
                )
            )

            val request = Request.Builder()
                .url(CLAUDE_API_URL)
                .header("x-api-key", apiKey)
                .header("anthropic-version", "2023-06-01")
                .header("content-type", "application/json")
                .post(requestBody.toRequestBody("application/json".toMediaType()))
                .build()

            val response = httpClient.newCall(request).execute()
            val responseBody = response.body?.string() ?: return@withContext Result.failure(Exception("Empty response"))

            if (!response.isSuccessful) {
                Log.e(TAG, "Claude API error ${response.code}: $responseBody")
                return@withContext Result.failure(Exception("AI analysis failed (${response.code})"))
            }

            val claudeResponse = gson.fromJson(responseBody, ClaudeResponse::class.java)
            if (claudeResponse.error != null) {
                return@withContext Result.failure(Exception(claudeResponse.error.message))
            }

            val text = claudeResponse.content?.firstOrNull { it.type == "text" }?.text
                ?: return@withContext Result.failure(Exception("No response from AI"))

            val jsonStr = extractJson(text)
            val result = gson.fromJson(jsonStr, DocumentProductsResult::class.java)
            Result.success(result)
        } catch (e: Exception) {
            Log.e(TAG, "Document analysis failed", e)
            Result.failure(Exception("Failed to analyze document: ${e.message}"))
        }
    }

    /**
     * Analyzes a PDF document by sending it to Claude as a native document type.
     */
    suspend fun analyzePdfForProducts(pdfBytes: ByteArray): Result<DocumentProductsResult> = withContext(Dispatchers.IO) {
        try {
            val apiKey = getApiKey()
            if (apiKey.isBlank()) {
                return@withContext Result.failure(Exception("API key not configured"))
            }

            val base64Pdf = Base64.encodeToString(pdfBytes, Base64.NO_WRAP)

            val contentBlocks = listOf(
                mapOf(
                    "type" to "document",
                    "source" to mapOf(
                        "type" to "base64",
                        "media_type" to "application/pdf",
                        "data" to base64Pdf
                    )
                ),
                mapOf("type" to "text", "text" to documentPrompt)
            )

            val requestBody = gson.toJson(
                ClaudeRequest(
                    model = MODEL,
                    max_tokens = 4096,
                    messages = listOf(ClaudeMessage("user", contentBlocks))
                )
            )

            val request = Request.Builder()
                .url(CLAUDE_API_URL)
                .header("x-api-key", apiKey)
                .header("anthropic-version", "2023-06-01")
                .header("content-type", "application/json")
                .post(requestBody.toRequestBody("application/json".toMediaType()))
                .build()

            val response = httpClient.newCall(request).execute()
            val responseBody = response.body?.string() ?: return@withContext Result.failure(Exception("Empty response"))

            if (!response.isSuccessful) {
                Log.e(TAG, "Claude PDF API error ${response.code}: $responseBody")
                return@withContext Result.failure(Exception("AI analysis failed (${response.code})"))
            }

            val claudeResponse = gson.fromJson(responseBody, ClaudeResponse::class.java)
            if (claudeResponse.error != null) {
                return@withContext Result.failure(Exception(claudeResponse.error.message))
            }

            val text = claudeResponse.content?.firstOrNull { it.type == "text" }?.text
                ?: return@withContext Result.failure(Exception("No response from AI"))

            val jsonStr = extractJson(text)
            val result = gson.fromJson(jsonStr, DocumentProductsResult::class.java)
            Result.success(result)
        } catch (e: Exception) {
            Log.e(TAG, "PDF analysis failed", e)
            Result.failure(Exception("Failed to analyze PDF: ${e.message}"))
        }
    }

    /**
     * Searches Google/DuckDuckGo Images for a better product photo.
     * Returns the URL of a professional-looking image, or null if none found.
     */
    suspend fun searchBetterProductImage(productName: String, searchTerms: String): String? = withContext(Dispatchers.IO) {
        val query = if (searchTerms.isNotBlank()) searchTerms else "$productName product photo high quality"
        val encoded = java.net.URLEncoder.encode(query, "UTF-8")

        // Try Google Images first
        try {
            val url = "https://www.google.com/search?q=$encoded&tbm=isch&hl=en"
            val request = Request.Builder()
                .url(url)
                .header("User-Agent", "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36")
                .build()

            val client = OkHttpClient.Builder()
                .connectTimeout(10, TimeUnit.SECONDS)
                .readTimeout(15, TimeUnit.SECONDS)
                .followRedirects(true)
                .build()

            val response = client.newCall(request).execute()
            if (response.isSuccessful) {
                val html = response.body?.string() ?: ""
                val imageUrls = extractGoogleImageUrls(html)
                if (imageUrls.isNotEmpty()) {
                    return@withContext imageUrls.first()
                }
            }
        } catch (e: Exception) {
            Log.w(TAG, "Google Images search failed: ${e.message}")
        }

        // Fallback: DuckDuckGo Images
        try {
            val url = "https://duckduckgo.com/?q=$encoded&iax=images&ia=images"
            val request = Request.Builder()
                .url(url)
                .header("User-Agent", "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36")
                .build()

            val client = OkHttpClient.Builder()
                .connectTimeout(10, TimeUnit.SECONDS)
                .readTimeout(15, TimeUnit.SECONDS)
                .followRedirects(true)
                .build()

            val response = client.newCall(request).execute()
            if (response.isSuccessful) {
                val html = response.body?.string() ?: ""
                val pattern = Regex(""""image":"(https?://[^"]+)""")
                val matches = pattern.findAll(html).map { it.groupValues[1] }.toList()
                if (matches.isNotEmpty()) {
                    return@withContext matches.first()
                }
            }
        } catch (e: Exception) {
            Log.w(TAG, "DuckDuckGo Images search failed: ${e.message}")
        }

        null
    }

    /**
     * Extracts image URLs from Google Images HTML response.
     */
    private fun extractGoogleImageUrls(html: String): List<String> {
        val urls = mutableListOf<String>()

        // Google Images embeds URLs in JSON-like structures within script tags
        val patterns = listOf(
            Regex("""\["(https?://[^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"""),
            Regex("""data-src="(https?://[^"]+)""""),
            Regex(""""ou":"(https?://[^"]+)"""")
        )

        for (pattern in patterns) {
            val matches = pattern.findAll(html)
            for (match in matches) {
                val url = match.groupValues[1]
                // Skip Google's own thumbnails and tracking URLs
                if (!url.contains("gstatic.com") &&
                    !url.contains("google.com") &&
                    !url.contains("googleapis.com") &&
                    url.length < 500
                ) {
                    urls.add(url)
                }
            }
            if (urls.size >= 5) break
        }

        return urls.distinct().take(5)
    }

    /**
     * Downloads an image from a URL and saves it to a local file.
     * Returns true on success.
     */
    suspend fun downloadImageToFile(imageUrl: String, outputFile: java.io.File): Boolean = withContext(Dispatchers.IO) {
        try {
            val request = Request.Builder()
                .url(imageUrl)
                .header("User-Agent", "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36")
                .build()

            val response = httpClient.newCall(request).execute()
            if (response.isSuccessful) {
                val bytes = response.body?.bytes() ?: return@withContext false
                outputFile.writeBytes(bytes)
                true
            } else {
                false
            }
        } catch (e: Exception) {
            Log.w(TAG, "Failed to download image: ${e.message}")
            false
        }
    }

    /**
     * Searches for product images for all products that don't have one.
     * Uses Google/DuckDuckGo image search (no Claude API needed).
     * Downloads images to app storage and returns updated StoreSetupResult.
     * @param context Android context for accessing app storage
     * @param data The store setup result with products
     * @param businessName The business name to help with search queries
     * @param maxConcurrent Max concurrent image searches (default 3)
     */
    suspend fun fetchImagesForProducts(
        context: android.content.Context,
        data: StoreSetupResult,
        businessName: String,
        onProgress: ((completed: Int, total: Int) -> Unit)? = null
    ): StoreSetupResult = withContext(Dispatchers.IO) {
        val picturesDir = java.io.File(context.getExternalFilesDir(android.os.Environment.DIRECTORY_PICTURES), "products")
        picturesDir.mkdirs()

        // Count total products needing images for progress reporting
        val totalNeedingImages = data.categories.sumOf { cat ->
            cat.products.count { product ->
                val url = product.imageUrl
                url.isNullOrBlank() || url == "" ||
                    !(url.startsWith("http") || java.io.File(url).exists())
            }
        }
        var completedImages = 0

        val updatedCategories = data.categories.map { category ->
            val updatedProducts = category.products.map { product ->
                // Skip if already has a valid image
                if (!product.imageUrl.isNullOrBlank() && product.imageUrl != "" &&
                    (product.imageUrl.startsWith("http") || java.io.File(product.imageUrl).exists())) {
                    return@map product
                }

                val productName = product.name.orEmpty()
                if (productName.isBlank()) {
                    completedImages++
                    onProgress?.invoke(completedImages, totalNeedingImages)
                    return@map product
                }

                try {
                    val searchQuery = "$businessName $productName"
                    Log.d(TAG, "Searching image for: $searchQuery")

                    val imageUrl = searchBetterProductImage(productName, searchQuery)
                    val result = if (imageUrl != null) {
                        // Download to local file
                        val safeFileName = productName.replace(Regex("[^a-zA-Z0-9]"), "_").take(50)
                        val imageFile = java.io.File(picturesDir, "${safeFileName}_${System.currentTimeMillis()}.jpg")

                        val downloaded = downloadImageToFile(imageUrl, imageFile)
                        if (downloaded && imageFile.exists() && imageFile.length() > 1000) {
                            Log.d(TAG, "Downloaded image for '$productName': ${imageFile.absolutePath}")
                            product.copy(imageUrl = imageFile.absolutePath)
                        } else {
                            // Use remote URL directly — Glide can load it
                            Log.d(TAG, "Using remote URL for '$productName': $imageUrl")
                            imageFile.delete()
                            product.copy(imageUrl = imageUrl)
                        }
                    } else {
                        Log.d(TAG, "No image found for '$productName'")
                        product
                    }
                    completedImages++
                    onProgress?.invoke(completedImages, totalNeedingImages)
                    result
                } catch (e: Exception) {
                    Log.w(TAG, "Image search failed for '${product.name}': ${e.message}")
                    completedImages++
                    onProgress?.invoke(completedImages, totalNeedingImages)
                    product
                }
            }
            category.copy(products = updatedProducts)
        }

        data.copy(categories = updatedCategories)
    }

    /**
     * Searches specifically for menu/product pages for a known business.
     * Targets delivery platforms, menu aggregators, and "{business} menu" queries.
     */
    suspend fun searchForMenuSources(
        businessName: String,
        location: String,
        businessType: String
    ): List<String> = withContext(Dispatchers.IO) {
        val allUrls = mutableSetOf<String>()

        // Try Claude web search first for menu sources
        try {
            val apiKey = getApiKey()
            if (apiKey.isNotBlank()) {
                val webSearchUrls = searchMenuWithWebSearch(apiKey, businessName, location, businessType)
                if (webSearchUrls.isNotEmpty()) {
                    Log.d(TAG, "Web search found ${webSearchUrls.size} menu sources")
                    return@withContext webSearchUrls
                }
            }
        } catch (e: Exception) {
            Log.d(TAG, "Web search for menu sources failed: ${e.message}")
        }

        // Fallback: manual Google/DuckDuckGo scraping
        val menuQueries = mutableListOf(
            "\"$businessName\" $location menu",
            "\"$businessName\" $location menu prices",
            "\"$businessName\" $location site:ubereats.com OR site:doordash.com OR site:deliveroo.com OR site:zomato.com OR site:grubhub.com",
            "\"$businessName\" $location site:tripadvisor.com OR site:yelp.com"
        )
        if (businessType.equals("retail", ignoreCase = true)) {
            menuQueries.add("\"$businessName\" $location products catalog prices")
            menuQueries.add("\"$businessName\" $location shop online store")
        }

        for (query in menuQueries) {
            try {
                val urls = scrapeGoogleResults(query)
                allUrls.addAll(urls)
            } catch (_: Exception) {}
            try {
                val urls = scrapeDuckDuckGoResults(query)
                allUrls.addAll(urls)
            } catch (_: Exception) {}
        }

        // Filter and probe
        val filtered = allUrls.filter { url ->
            !url.contains("google.com/search") &&
            !url.contains("accounts.google.com") &&
            !url.contains("duckduckgo.com") &&
            url.startsWith("http")
        }.take(10)

        // Quick probe to verify they're live
        val live = coroutineScope {
            filtered.map { url ->
                async(Dispatchers.IO) {
                    val candidate = probeWebsite(url)
                    if (candidate != null) url else null
                }
            }.awaitAll().filterNotNull()
        }

        live
    }

    /**
     * Uses Claude web search to find menu/product pages for a business.
     */
    private fun searchMenuWithWebSearch(
        apiKey: String,
        businessName: String,
        location: String,
        businessType: String
    ): List<String> {
        val prompt = """Search the internet for menu, product catalog, or price list pages for this business:

- Business name: $businessName
- Location: $location
- What they sell: $businessType

Look specifically for:
1. Their menu or product catalog on their own website
2. Delivery platform listings (Uber Eats, DoorDash, Deliveroo, Zomato, etc.)
3. Review sites with menu/product details (TripAdvisor, Yelp, etc.)
4. Any page that lists their products with prices

Return ONLY a JSON array of URLs (strings), no other text. Example:
["https://www.ubereats.com/store/example", "https://www.tripadvisor.com/Restaurant-example"]

If no menu/product pages found, return: []"""

        val tools = listOf(
            mapOf(
                "type" to "web_search_20250305",
                "name" to "web_search",
                "max_uses" to 3
            )
        )

        val requestBody = gson.toJson(
            ClaudeRequest(
                model = MODEL,
                max_tokens = 2048,
                messages = listOf(ClaudeMessage("user", prompt)),
                tools = tools
            )
        )

        val request = Request.Builder()
            .url(CLAUDE_API_URL)
            .header("x-api-key", apiKey)
            .header("anthropic-version", "2023-06-01")
            .header("anthropic-beta", WEB_SEARCH_BETA)
            .header("content-type", "application/json")
            .post(requestBody.toRequestBody("application/json".toMediaType()))
            .build()

        return try {
            val response = executeWithRetry(request, "Menu web search") ?: return emptyList()
            val body = response.body?.string() ?: return emptyList()

            if (!response.isSuccessful) {
                Log.e(TAG, "Menu web search error ${response.code}: $body")
                return emptyList()
            }

            val text = extractTextFromResponse(body) ?: return emptyList()

            val jsonStr = extractJsonArray(text)
            val listType = object : TypeToken<List<String>>() {}.type
            gson.fromJson<List<String>>(jsonStr, listType) ?: emptyList()
        } catch (e: Exception) {
            Log.e(TAG, "Menu web search failed", e)
            emptyList()
        }
    }

    /**
     * Asks Claude to generate realistic products for a business based on its
     * knowledge, when web scraping didn't yield enough products.
     * This is the fallback when no menu/product data could be scraped.
     */
    suspend fun generateProductsFromKnowledge(
        businessName: String,
        location: String,
        businessType: String,
        existingResult: StoreSetupResult? = null
    ): Result<StoreSetupResult> = withContext(Dispatchers.IO) {
        try {
            val apiKey = getApiKey()
            if (apiKey.isBlank()) {
                return@withContext Result.failure(Exception("API key not configured"))
            }

            val existingInfo = if (existingResult != null) """
We already know the following about this business from web scraping:
- Store name: ${existingResult.storeName}
- Address: ${existingResult.address}
- City: ${existingResult.city}
- Country: ${existingResult.country}
- Phone: ${existingResult.phone}
- Hours: ${existingResult.openingHours}
- Currency: ${existingResult.currency}
- Business type: ${existingResult.businessType}
- Tax: ${existingResult.taxName} ${existingResult.taxRate}%
- Products found so far: ${existingResult.categories.sumOf { it.products.size }}

Keep all this store info. Add MORE products to fill out their likely catalog/menu.
""" else ""

            val prompt = """
You are a business intelligence expert. A POS (Point of Sale) system is being set up for a real business, but we could not scrape enough products from their website or online presence.

Business details:
- Name: $businessName
- Location: $location
- What they sell/type: $businessType
$existingInfo

YOUR TASK: Based on your knowledge of this specific business (or similar businesses of this type in this location), generate a REALISTIC and COMPLETE product catalog / menu.

IMPORTANT GUIDELINES:
- If you recognize this specific business, use products and prices you know they actually sell
- If you don't recognize the exact business, create a realistic catalog for a "$businessType" business in "$location"
- Use LOCAL pricing appropriate for the country/city (e.g., MUR for Mauritius, USD for USA, EUR for Europe)
- Create at least 15-25 products organized into logical categories
- For restaurants: include starters, mains, sides, desserts, drinks with realistic local prices
- For retail: include common product categories with realistic local prices
- Every product MUST have a realistic price — do NOT use 0.0
- Leave image_url as empty string "" (images will be fetched separately)

Return a JSON object with this EXACT structure (no other text, just JSON):
{
  "store_name": "$businessName",
  "store_description": "What this business sells",
  "address": "Best known address or empty",
  "city": "City",
  "country": "Country",
  "phone": "Phone if known or empty",
  "opening_hours": "Hours if known or empty",
  "currency": "3-letter code appropriate for the location",
  "business_type": "$businessType",
  "tax_rate": 15.0,
  "tax_name": "VAT or appropriate tax name for the country",
  "categories": [
    {
      "name": "Category Name",
      "products": [
        {"name": "Product Name", "price": 9.99, "description": "Brief description", "image_url": ""}
      ]
    }
  ]
}

Return ONLY valid JSON, no markdown, no explanation.
""".trimIndent()

            val requestBody = gson.toJson(
                ClaudeRequest(
                    model = MODEL,
                    max_tokens = 4096,
                    messages = listOf(ClaudeMessage("user", prompt))
                )
            )

            val request = Request.Builder()
                .url(CLAUDE_API_URL)
                .header("x-api-key", apiKey)
                .header("anthropic-version", "2023-06-01")
                .header("content-type", "application/json")
                .post(requestBody.toRequestBody("application/json".toMediaType()))
                .build()

            val response = executeWithRetry(request, "Claude generation")
                ?: return@withContext Result.failure(Exception("Rate limited, please try again later"))
            val responseBody = response.body?.string()
                ?: return@withContext Result.failure(Exception("Empty response"))

            if (!response.isSuccessful) {
                Log.e(TAG, "Claude generation API error ${response.code}: $responseBody")
                return@withContext Result.failure(Exception("AI generation failed (${response.code})"))
            }

            val claudeResponse = gson.fromJson(responseBody, ClaudeResponse::class.java)
            if (claudeResponse.error != null) {
                return@withContext Result.failure(Exception(claudeResponse.error.message))
            }

            val text = claudeResponse.content?.firstOrNull { it.type == "text" }?.text
                ?: return@withContext Result.failure(Exception("No response from AI"))

            val jsonStr = extractJson(text)
            val result = gson.fromJson(jsonStr, StoreSetupResult::class.java)

            // If we had an existing result, merge: keep existing store info, combine products
            if (existingResult != null && result != null) {
                val mergedCategories = mergeCategories(existingResult.categories, result.categories)
                val merged = existingResult.copy(categories = mergedCategories)
                Result.success(merged)
            } else {
                Result.success(result)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Product generation failed", e)
            Result.failure(Exception("Failed to generate products: ${e.message}"))
        }
    }

    /**
     * Merges two lists of categories, combining products from categories with the same name
     * and adding new categories from the generated list.
     */
    private fun mergeCategories(
        existing: List<CategoryData>,
        generated: List<CategoryData>
    ): List<CategoryData> {
        val merged = existing.toMutableList()

        for (genCat in generated) {
            val matchIdx = merged.indexOfFirst { it.name.equals(genCat.name, ignoreCase = true) }
            if (matchIdx >= 0) {
                // Merge products, avoiding duplicates by name
                val existingProducts = merged[matchIdx].products
                val existingProductNames = existingProducts.map { it.name.orEmpty().lowercase() }.toSet()
                val newProducts = genCat.products.filter {
                    it.name.orEmpty().lowercase() !in existingProductNames
                }
                merged[matchIdx] = merged[matchIdx].copy(
                    products = existingProducts + newProducts
                )
            } else {
                merged.add(genCat)
            }
        }
        return merged
    }

    private fun fetchWebsiteHtml(url: String): String? {
        val normalizedUrl = if (!url.startsWith("http")) "https://$url" else url

        val request = Request.Builder()
            .url(normalizedUrl)
            .header("User-Agent", "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36")
            .get()
            .build()

        return try {
            httpClient.newCall(request).execute().use { response ->
                if (response.isSuccessful) {
                    response.body?.string()
                } else {
                    Log.e(TAG, "HTTP ${response.code} fetching $url")
                    null
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to fetch $url", e)
            null
        }
    }

    private fun callClaudeApi(html: String, websiteUrl: String): StoreSetupResult? {
        val apiKey = getApiKey()
        if (apiKey.isBlank()) {
            Log.e(TAG, "Anthropic API key not configured")
            return null
        }

        val prompt = buildPrompt(html, websiteUrl)

        val requestBody = gson.toJson(
            ClaudeRequest(
                model = MODEL,
                max_tokens = 4096,
                messages = listOf(ClaudeMessage("user", prompt))
            )
        )

        val request = Request.Builder()
            .url(CLAUDE_API_URL)
            .header("x-api-key", apiKey)
            .header("anthropic-version", "2023-06-01")
            .header("content-type", "application/json")
            .post(requestBody.toRequestBody("application/json".toMediaType()))
            .build()

        val response = httpClient.newCall(request).execute()
        val responseBody = response.body?.string() ?: return null

        if (!response.isSuccessful) {
            Log.e(TAG, "Claude API error ${response.code}: $responseBody")
            return null
        }

        val claudeResponse = gson.fromJson(responseBody, ClaudeResponse::class.java)
        if (claudeResponse.error != null) {
            Log.e(TAG, "Claude error: ${claudeResponse.error.message}")
            return null
        }

        val text = claudeResponse.content?.firstOrNull { it.type == "text" }?.text ?: return null

        // Extract JSON from response (Claude may wrap it in markdown code blocks)
        val jsonStr = extractJson(text)

        return try {
            gson.fromJson(jsonStr, StoreSetupResult::class.java)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to parse Claude response: $jsonStr", e)
            null
        }
    }

    private fun buildPrompt(html: String, websiteUrl: String): String = """
You are a business intelligence expert analyzing a website to set up a Point of Sale system.
Extract ALL product/service information and business details you can find.

Website URL: $websiteUrl

Website HTML content:
```
$html
```

Return a JSON object with this EXACT structure (no other text, just JSON):
{
  "store_name": "The brand/business name",
  "store_description": "What this business sells",
  "address": "Full street address of the main/first location",
  "city": "City name",
  "country": "Country name",
  "phone": "Phone number if found (with country code if possible)",
  "opening_hours": "e.g. Mon-Sat 9:00-18:00",
  "currency": "3-letter code (USD, EUR, GBP, MUR, etc.)",
  "business_type": "retail" or "restaurant",
  "tax_rate": 15.0,
  "tax_name": "VAT" or "GST" or "Sales Tax",
  "categories": [
    {
      "name": "Category Name",
      "products": [
        {
          "name": "Product Name — be specific",
          "price": 9.99,
          "description": "Brief product description",
          "image_url": "Full absolute URL to product image (must start with https://)"
        }
      ]
    }
  ],
  "stores": [
    {
      "store_name": "Brand Name — Location/Branch Name",
      "address": "Full street address of this location",
      "city": "City name",
      "phone": "Phone for this specific location",
      "opening_hours": "Hours for this specific location"
    }
  ]
}

RULES:
- Extract EVERY product/menu item — do NOT summarize or skip items
- Use REAL prices. Convert relative image URLs to absolute using the website domain.
- If no prices found, estimate realistic prices for this business type and country
- Group into logical categories
- Return ONLY valid JSON
- Look in footer/contact/about for phone, address, hours
- Tax rate: standard rate for the country (15% Mauritius, 20% UK, etc.)
- Include at LEAST 10 products if available
- MULTI-STORE: If the business has MULTIPLE locations/branches (look for "Our Locations", "Branches", "Find Us", store locator pages, multiple addresses in contact/footer), list EACH location in the "stores" array with its own name, address, city, phone, and hours. Use format "Brand — Branch" for store_name (e.g. "Café XYZ — Grand Baie", "Café XYZ — Port Louis"). If only ONE location exists, still include it in the "stores" array.
""".trimIndent()

    /**
     * Extracts the text content from a Claude API response body.
     * Handles web search responses which contain multiple content block types
     * (server_tool_use, web_search_tool_result, text) by parsing the raw JSON
     * and finding the last text block.
     */
    private fun extractTextFromResponse(responseBody: String): String? {
        try {
            val jsonObj = gson.fromJson(responseBody, com.google.gson.JsonObject::class.java)

            // Check for API error
            val error = jsonObj.getAsJsonObject("error")
            if (error != null) {
                Log.e(TAG, "Claude API error: ${error.get("message")?.asString}")
                return null
            }

            val content = jsonObj.getAsJsonArray("content") ?: return null

            // Find the last text block (web search responses have tool blocks before the text)
            for (i in content.size() - 1 downTo 0) {
                val block = content[i].asJsonObject
                if (block.get("type")?.asString == "text") {
                    return block.get("text")?.asString
                }
            }

            return null
        } catch (e: Exception) {
            Log.e(TAG, "Failed to parse Claude response", e)
            return null
        }
    }

    private fun extractJson(text: String): String {
        // Try to extract JSON from markdown code blocks
        val codeBlockRegex = Regex("```(?:json)?\\s*\\n?(\\{[\\s\\S]*?\\})\\s*\\n?```")
        val match = codeBlockRegex.find(text)
        if (match != null) return match.groupValues[1]

        // If no code block, try to find raw JSON object
        val jsonStart = text.indexOf('{')
        val jsonEnd = text.lastIndexOf('}')
        if (jsonStart != -1 && jsonEnd != -1 && jsonEnd > jsonStart) {
            return text.substring(jsonStart, jsonEnd + 1)
        }

        return text
    }
}
