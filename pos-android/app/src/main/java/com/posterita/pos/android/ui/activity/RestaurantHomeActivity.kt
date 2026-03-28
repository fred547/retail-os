package com.posterita.pos.android.ui.activity

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.TextView
import com.google.android.material.button.MaterialButton
import com.posterita.pos.android.R
import com.posterita.pos.android.data.local.AppDatabase
import com.posterita.pos.android.util.SharedPreferencesManager
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * Restaurant Hub — tables, kitchen orders, KDS setup, stations.
 * Accessible from home screen tile (visible when terminal is restaurant type).
 */
@AndroidEntryPoint
class RestaurantHomeActivity : BaseActivity() {

    @Inject lateinit var prefsManager: SharedPreferencesManager

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_restaurant_home)
        setupHelpButton("restaurant_home")

        findViewById<View>(R.id.buttonBack).setOnClickListener { finish() }

        // Tables
        findViewById<MaterialButton>(R.id.buttonTables).setOnClickListener {
            startActivity(Intent(this, ManageTablesActivity::class.java))
        }

        // Kitchen Orders
        findViewById<MaterialButton>(R.id.buttonKitchenOrders).setOnClickListener {
            startActivity(Intent(this, KitchenOrdersActivity::class.java))
        }

        // KDS Setup
        findViewById<MaterialButton>(R.id.buttonKdsSetup).setOnClickListener {
            startActivity(Intent(this, KdsSetupActivity::class.java))
        }

        // Stations — open web console
        findViewById<MaterialButton>(R.id.buttonStations).setOnClickListener {
            val intent = Intent(this, WebConsoleActivity::class.java)
            intent.putExtra("url_path", "/stations")
            intent.putExtra("title", "Stations")
            startActivity(intent)
        }

        // Menu Schedules — open web console
        findViewById<MaterialButton>(R.id.buttonMenuSchedules).setOnClickListener {
            val intent = Intent(this, WebConsoleActivity::class.java)
            intent.putExtra("url_path", "/menu-schedules")
            intent.putExtra("title", "Menu Schedules")
            startActivity(intent)
        }

        loadSummary()
    }

    override fun onResume() {
        super.onResume()
        loadSummary()
    }

    private fun loadSummary() {
        lifecycleScope.launch {
            try {
                val db = AppDatabase.getInstance(applicationContext, prefsManager.accountId)

                val tableCount = withContext(Dispatchers.IO) {
                    db.restaurantTableDao().getTableCount(prefsManager.storeId)
                }
                val occupiedCount = withContext(Dispatchers.IO) {
                    db.restaurantTableDao().getOccupiedCount(prefsManager.storeId)
                }

                findViewById<TextView>(R.id.textTotalTables).text = tableCount.toString()
                findViewById<TextView>(R.id.textOccupiedTables).text = occupiedCount.toString()
                findViewById<TextView>(R.id.textAvailableTables).text = (tableCount - occupiedCount).toString()
            } catch (_: Exception) {}
        }
    }
}
