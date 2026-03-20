package com.posterita.pos.android.ui.activity

import android.os.Bundle
import android.view.View
import android.widget.LinearLayout
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import com.posterita.pos.android.R
import com.posterita.pos.android.databinding.ActivityDetailViewBinding

/**
 * Reusable full-screen detail view for any entity.
 * Pass EXTRA_TITLE and EXTRA_FIELDS (ArrayList of "label|value" strings).
 */
class DetailViewActivity : AppCompatActivity() {

    private lateinit var binding: ActivityDetailViewBinding

    companion object {
        const val EXTRA_TITLE = "detail_title"
        const val EXTRA_FIELDS = "detail_fields"
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityDetailViewBinding.inflate(layoutInflater)
        setContentView(binding.root)

        binding.buttonBack.setOnClickListener { finish() }

        val title = intent.getStringExtra(EXTRA_TITLE) ?: "Details"
        binding.textTitle.text = title

        val fields = intent.getStringArrayListExtra(EXTRA_FIELDS) ?: arrayListOf()
        val container = binding.layoutFields

        for (field in fields) {
            val parts = field.split("|", limit = 2)
            val label = parts.getOrElse(0) { "" }
            val value = parts.getOrElse(1) { "" }

            if (label == "---") {
                // Divider
                val divider = View(this).apply {
                    layoutParams = LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.MATCH_PARENT, (1 * resources.displayMetrics.density).toInt()
                    ).apply {
                        topMargin = (10 * resources.displayMetrics.density).toInt()
                        bottomMargin = (10 * resources.displayMetrics.density).toInt()
                    }
                    setBackgroundColor(getColor(R.color.posterita_line))
                }
                container.addView(divider)
                continue
            }

            if (label.startsWith("##")) {
                // Section header
                val header = TextView(this).apply {
                    layoutParams = LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.MATCH_PARENT,
                        LinearLayout.LayoutParams.WRAP_CONTENT
                    ).apply {
                        topMargin = (12 * resources.displayMetrics.density).toInt()
                        bottomMargin = (6 * resources.displayMetrics.density).toInt()
                    }
                    text = label.removePrefix("##").trim()
                    setTextColor(getColor(R.color.posterita_muted))
                    textSize = 11f
                    letterSpacing = 0.06f
                    typeface = resources.getFont(R.font.lexend_medium)
                }
                container.addView(header)
                continue
            }

            val row = LinearLayout(this).apply {
                orientation = LinearLayout.HORIZONTAL
                layoutParams = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
                ).apply {
                    bottomMargin = (8 * resources.displayMetrics.density).toInt()
                }
            }

            val labelView = TextView(this).apply {
                layoutParams = LinearLayout.LayoutParams(
                    (110 * resources.displayMetrics.density).toInt(),
                    LinearLayout.LayoutParams.WRAP_CONTENT
                )
                text = label
                setTextColor(getColor(R.color.posterita_muted))
                textSize = 14f
            }
            row.addView(labelView)

            val valueView = TextView(this).apply {
                layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
                text = value.ifEmpty { "—" }
                setTextColor(getColor(R.color.posterita_ink))
                textSize = 14f
                typeface = resources.getFont(R.font.lexend_medium)
            }
            row.addView(valueView)

            container.addView(row)
        }
    }
}
