package com.posterita.pos.android.ui.activity

import android.os.Bundle
import android.widget.TextView
import androidx.appcompat.widget.SwitchCompat
import com.posterita.pos.android.R
import com.posterita.pos.android.util.SharedPreferencesManager
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject

@AndroidEntryPoint
class PosCustomizationActivity : BaseActivity() {

    @Inject lateinit var prefsManager: SharedPreferencesManager

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_pos_customization)
        supportActionBar?.hide()

        findViewById<android.widget.ImageView>(R.id.back).setOnClickListener { finish() }

        setupBusinessTypeButtons()
        setupColumnButtons()
        setupCategoryLineButtons()
        setupCategoryColumnButtons()
        setupLandscapeCategoryRowButtons()
        setupLandscapeCategoryColumnButtons()
        setupSwitches()
    }

    private fun setupBusinessTypeButtons() {
        val btnRetail = findViewById<TextView>(R.id.btn_retail)
        val btnRestaurant = findViewById<TextView>(R.id.btn_restaurant)

        fun highlight(type: String) {
            if (type == "retail") {
                btnRetail.setBackgroundResource(R.drawable.btn_rounded)
                btnRetail.setTextColor(resources.getColor(R.color.white, null))
                btnRestaurant.setBackgroundResource(R.drawable.stroke_btn)
                btnRestaurant.setTextColor(resources.getColor(R.color.black, null))
            } else {
                btnRestaurant.setBackgroundResource(R.drawable.btn_rounded)
                btnRestaurant.setTextColor(resources.getColor(R.color.white, null))
                btnRetail.setBackgroundResource(R.drawable.stroke_btn)
                btnRetail.setTextColor(resources.getColor(R.color.black, null))
            }
        }

        highlight(prefsManager.businessType)

        btnRetail.setOnClickListener { prefsManager.businessType = "retail"; highlight("retail") }
        btnRestaurant.setOnClickListener { prefsManager.businessType = "restaurant"; highlight("restaurant") }
    }

    private fun setupColumnButtons() {
        val btn1 = findViewById<TextView>(R.id.btn_col_1)
        val btn2 = findViewById<TextView>(R.id.btn_col_2)
        val btn3 = findViewById<TextView>(R.id.btn_col_3)
        val btn4 = findViewById<TextView>(R.id.btn_col_4)
        val buttons = listOf(btn1, btn2, btn3, btn4)

        fun highlight(selected: Int) {
            buttons.forEachIndexed { index, btn ->
                if (index + 1 == selected) {
                    btn.setBackgroundResource(R.drawable.btn_rounded)
                    btn.setTextColor(resources.getColor(R.color.white, null))
                } else {
                    btn.setBackgroundResource(R.drawable.stroke_btn)
                    btn.setTextColor(resources.getColor(R.color.black, null))
                }
            }
        }

        highlight(prefsManager.productColumns)

        btn1.setOnClickListener { prefsManager.productColumns = 1; highlight(1) }
        btn2.setOnClickListener { prefsManager.productColumns = 2; highlight(2) }
        btn3.setOnClickListener { prefsManager.productColumns = 3; highlight(3) }
        btn4.setOnClickListener { prefsManager.productColumns = 4; highlight(4) }
    }

    private fun setupCategoryLineButtons() {
        val btn1 = findViewById<TextView>(R.id.btn_cat_1)
        val btn2 = findViewById<TextView>(R.id.btn_cat_2)
        val btn3 = findViewById<TextView>(R.id.btn_cat_3)
        val buttons = listOf(btn1, btn2, btn3)

        fun highlight(selected: Int) {
            buttons.forEachIndexed { index, btn ->
                if (index + 1 == selected) {
                    btn.setBackgroundResource(R.drawable.btn_rounded)
                    btn.setTextColor(resources.getColor(R.color.white, null))
                } else {
                    btn.setBackgroundResource(R.drawable.stroke_btn)
                    btn.setTextColor(resources.getColor(R.color.black, null))
                }
            }
        }

        highlight(prefsManager.categoryMaxLines)

        btn1.setOnClickListener { prefsManager.categoryMaxLines = 1; highlight(1) }
        btn2.setOnClickListener { prefsManager.categoryMaxLines = 2; highlight(2) }
        btn3.setOnClickListener { prefsManager.categoryMaxLines = 3; highlight(3) }
    }

    private fun setupCategoryColumnButtons() {
        val btn2 = findViewById<TextView>(R.id.btn_catcol_2)
        val btn3 = findViewById<TextView>(R.id.btn_catcol_3)
        val btn4 = findViewById<TextView>(R.id.btn_catcol_4)
        val buttons = listOf(btn2, btn3, btn4)

        fun highlight(selected: Int) {
            buttons.forEachIndexed { index, btn ->
                if (index + 2 == selected) {
                    btn.setBackgroundResource(R.drawable.btn_rounded)
                    btn.setTextColor(resources.getColor(R.color.white, null))
                } else {
                    btn.setBackgroundResource(R.drawable.stroke_btn)
                    btn.setTextColor(resources.getColor(R.color.black, null))
                }
            }
        }

        highlight(prefsManager.categoryColumns)

        btn2.setOnClickListener { prefsManager.categoryColumns = 2; highlight(2) }
        btn3.setOnClickListener { prefsManager.categoryColumns = 3; highlight(3) }
        btn4.setOnClickListener { prefsManager.categoryColumns = 4; highlight(4) }
    }

    private fun setupLandscapeCategoryRowButtons() {
        val btn1 = findViewById<TextView>(R.id.btn_land_cat_row_1)
        val btn2 = findViewById<TextView>(R.id.btn_land_cat_row_2)
        val buttons = listOf(btn1, btn2)

        fun highlight(selected: Int) {
            buttons.forEachIndexed { index, btn ->
                if (index + 1 == selected) {
                    btn.setBackgroundResource(R.drawable.btn_rounded)
                    btn.setTextColor(resources.getColor(R.color.white, null))
                } else {
                    btn.setBackgroundResource(R.drawable.stroke_btn)
                    btn.setTextColor(resources.getColor(R.color.black, null))
                }
            }
        }

        highlight(prefsManager.landscapeCategoryRows)

        btn1.setOnClickListener { prefsManager.landscapeCategoryRows = 1; highlight(1) }
        btn2.setOnClickListener { prefsManager.landscapeCategoryRows = 2; highlight(2) }
    }

    private fun setupLandscapeCategoryColumnButtons() {
        val btn3 = findViewById<TextView>(R.id.btn_land_catcol_3)
        val btn4 = findViewById<TextView>(R.id.btn_land_catcol_4)
        val btn5 = findViewById<TextView>(R.id.btn_land_catcol_5)
        val btn6 = findViewById<TextView>(R.id.btn_land_catcol_6)
        val buttons = listOf(btn3, btn4, btn5, btn6)

        fun highlight(selected: Int) {
            buttons.forEachIndexed { index, btn ->
                if (index + 3 == selected) {
                    btn.setBackgroundResource(R.drawable.btn_rounded)
                    btn.setTextColor(resources.getColor(R.color.white, null))
                } else {
                    btn.setBackgroundResource(R.drawable.stroke_btn)
                    btn.setTextColor(resources.getColor(R.color.black, null))
                }
            }
        }

        highlight(prefsManager.landscapeCategoryColumns)

        btn3.setOnClickListener { prefsManager.landscapeCategoryColumns = 3; highlight(3) }
        btn4.setOnClickListener { prefsManager.landscapeCategoryColumns = 4; highlight(4) }
        btn5.setOnClickListener { prefsManager.landscapeCategoryColumns = 5; highlight(5) }
        btn6.setOnClickListener { prefsManager.landscapeCategoryColumns = 6; highlight(6) }
    }

    private fun setupSwitches() {
        bindSwitch(R.id.switch_product_images, prefsManager.showProductImages) { prefsManager.showProductImages = it }
        bindSwitch(R.id.switch_product_price, prefsManager.showProductPrice) { prefsManager.showProductPrice = it }
        bindSwitch(R.id.switch_categories, prefsManager.showCategories) { prefsManager.showCategories = it }
        bindSwitch(R.id.switch_scan, prefsManager.showScanButton) { prefsManager.showScanButton = it }
        bindSwitch(R.id.switch_search, prefsManager.showSearchButton) { prefsManager.showSearchButton = it }
        bindSwitch(R.id.switch_clear, prefsManager.showClearButton) { prefsManager.showClearButton = it }
        bindSwitch(R.id.switch_cust, prefsManager.showCustButton) { prefsManager.showCustButton = it }
        bindSwitch(R.id.switch_more, prefsManager.showMoreButton) { prefsManager.showMoreButton = it }

        // Security
        bindSwitch(R.id.switch_require_removal_note, prefsManager.cartRemovalRequireNote) { prefsManager.cartRemovalRequireNote = it }
        bindSwitch(R.id.switch_require_removal_pin, prefsManager.cartRemovalRequirePin) { prefsManager.cartRemovalRequirePin = it }
    }

    private fun bindSwitch(id: Int, initialValue: Boolean, onChanged: (Boolean) -> Unit) {
        val switch = findViewById<SwitchCompat>(id)
        switch.isChecked = initialValue
        switch.setOnCheckedChangeListener { _, isChecked -> onChanged(isChecked) }
    }
}
