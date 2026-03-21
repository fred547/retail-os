package com.posterita.pos.android.ui.activity

import android.graphics.drawable.GradientDrawable
import android.os.Bundle
import android.view.Gravity
import android.view.View
import android.widget.LinearLayout
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.res.ResourcesCompat
import com.google.android.material.card.MaterialCardView
import com.posterita.pos.android.R
import com.posterita.pos.android.databinding.ActivityDetailViewBinding

/**
 * Brochure-style detail view for any entity.
 *
 * Pass EXTRA_TITLE, EXTRA_FIELDS, and optional EXTRA_SUBTITLE / EXTRA_COLOR.
 *
 * Field format: ArrayList of "label|value" strings.
 * Special prefixes:
 *   "## SECTION NAME|"  → starts a new card section
 *   "---|"              → ignored (legacy divider, sections replace these)
 *   "~chipLabel|Yes"    → rendered as a colored chip in the hero area
 *   Any field with value "Yes"/"No" → rendered as a pill chip instead of text
 */
class DetailViewActivity : AppCompatActivity() {

    private lateinit var binding: ActivityDetailViewBinding

    companion object {
        const val EXTRA_TITLE = "detail_title"
        const val EXTRA_FIELDS = "detail_fields"
        const val EXTRA_SUBTITLE = "detail_subtitle"
        const val EXTRA_COLOR = "detail_color"
    }

    private val dp get() = resources.displayMetrics.density

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityDetailViewBinding.inflate(layoutInflater)
        setContentView(binding.root)

        binding.buttonBack.setOnClickListener { finish() }

        val title = intent.getStringExtra(EXTRA_TITLE) ?: "Details"
        val subtitle = intent.getStringExtra(EXTRA_SUBTITLE) ?: ""
        val heroColor = intent.getIntExtra(EXTRA_COLOR, getColor(R.color.posterita_primary))
        val fields = intent.getStringArrayListExtra(EXTRA_FIELDS) ?: arrayListOf()

        // Top bar title (short)
        binding.textTitle.text = title

        // Hero
        setupHero(title, subtitle, heroColor, fields)

        // Build section cards
        buildSections(fields)
    }

    private fun setupHero(title: String, subtitle: String, color: Int, fields: List<String>) {
        val initial = title.firstOrNull()?.uppercase() ?: "?"
        binding.heroInitial.text = initial
        binding.heroTitle.text = title

        // Set icon color
        val bg = binding.heroIconBg.background
        if (bg is GradientDrawable) bg.setColor(color)

        // Subtitle
        if (subtitle.isNotEmpty()) {
            binding.heroSubtitle.text = subtitle
            binding.heroSubtitle.visibility = View.VISIBLE
        } else {
            binding.heroSubtitle.visibility = View.GONE
        }

        // Collect chip fields (those with "Yes"/"No" values that are "Yes")
        val chipFields = fields.filter { field ->
            val parts = field.split("|", limit = 2)
            val label = parts.getOrElse(0) { "" }
            val value = parts.getOrElse(1) { "" }
            !label.startsWith("##") && !label.startsWith("---") &&
                    value.equals("Yes", ignoreCase = true) &&
                    isChipCandidate(label)
        }

        if (chipFields.isNotEmpty()) {
            binding.heroChips.visibility = View.VISIBLE
            binding.heroChips.removeAllViews()
            for (field in chipFields) {
                val label = field.split("|", limit = 2).getOrElse(0) { "" }
                addChip(binding.heroChips, label, true)
            }
        }
    }

    private fun isChipCandidate(label: String): Boolean {
        val chipLabels = setOf(
            "Active", "Admin", "Sales Rep", "Stock Item", "Kitchen Item",
            "Favourite", "Modifier", "BOM", "Variable Item", "Editable",
            "Print Order Copy", "Tax Included", "Needs Price Review",
            "Selected"
        )
        return label in chipLabels
    }

    private fun buildSections(fields: List<String>) {
        val container = binding.layoutFields
        var currentCard: MaterialCardView? = null
        var currentLayout: LinearLayout? = null

        for (field in fields) {
            val parts = field.split("|", limit = 2)
            val label = parts.getOrElse(0) { "" }
            val value = parts.getOrElse(1) { "" }

            // Skip dividers
            if (label == "---") continue

            // Section header → new card
            if (label.startsWith("##")) {
                currentCard = createSectionCard()
                currentLayout = currentCard.getChildAt(0) as LinearLayout

                // Section title
                val headerText = label.removePrefix("##").trim()
                val header = TextView(this).apply {
                    layoutParams = LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.MATCH_PARENT,
                        LinearLayout.LayoutParams.WRAP_CONTENT
                    ).apply {
                        bottomMargin = (10 * dp).toInt()
                    }
                    text = headerText
                    setTextColor(getColor(R.color.posterita_muted))
                    textSize = 11f
                    letterSpacing = 0.08f
                    typeface = ResourcesCompat.getFont(this@DetailViewActivity, R.font.lexend_semibold)
                }
                currentLayout.addView(header)
                container.addView(currentCard)
                continue
            }

            // Ensure we have a card
            if (currentLayout == null) {
                currentCard = createSectionCard()
                currentLayout = currentCard.getChildAt(0) as LinearLayout
                container.addView(currentCard)
            }

            // Skip chip-candidate "Yes" fields (already in hero)
            if (isChipCandidate(label) && (value.equals("Yes", ignoreCase = true) || value.equals("No", ignoreCase = true))) {
                // Render as inline chip row instead of text
                addChipRow(currentLayout, label, value.equals("Yes", ignoreCase = true))
                continue
            }

            // Normal field row
            addFieldRow(currentLayout, label, value)
        }
    }

    private fun createSectionCard(): MaterialCardView {
        val card = MaterialCardView(this).apply {
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                bottomMargin = (8 * dp).toInt()
            }
            radius = 14 * dp
            cardElevation = 0f
            strokeWidth = (1 * dp).toInt()
            strokeColor = getColor(R.color.posterita_line)
            setCardBackgroundColor(getColor(R.color.posterita_paper))
        }

        val inner = LinearLayout(this).apply {
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            )
            orientation = LinearLayout.VERTICAL
            setPadding((16 * dp).toInt(), (14 * dp).toInt(), (16 * dp).toInt(), (14 * dp).toInt())
        }
        card.addView(inner)
        return card
    }

    private fun addFieldRow(parent: LinearLayout, label: String, value: String) {
        val row = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                bottomMargin = (6 * dp).toInt()
            }
            gravity = Gravity.CENTER_VERTICAL
        }

        val labelView = TextView(this).apply {
            layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 0.4f)
            text = label
            setTextColor(getColor(R.color.posterita_muted))
            textSize = 13f
        }
        row.addView(labelView)

        val displayValue = value.ifEmpty { "—" }
        val valueView = TextView(this).apply {
            layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 0.6f)
            text = displayValue
            setTextColor(getColor(R.color.posterita_ink))
            textSize = 14f
            typeface = ResourcesCompat.getFont(this@DetailViewActivity, R.font.lexend_medium)
            gravity = Gravity.END
        }
        row.addView(valueView)

        parent.addView(row)
    }

    private fun addChipRow(parent: LinearLayout, label: String, isYes: Boolean) {
        val row = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                bottomMargin = (6 * dp).toInt()
            }
            gravity = Gravity.CENTER_VERTICAL
        }

        val labelView = TextView(this).apply {
            layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 0.6f)
            text = label
            setTextColor(getColor(R.color.posterita_muted))
            textSize = 13f
        }
        row.addView(labelView)

        val chipContainer = LinearLayout(this).apply {
            layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 0.4f)
            gravity = Gravity.END
        }

        val chip = createChipView(if (isYes) "Yes" else "No", isYes)
        chipContainer.addView(chip)
        row.addView(chipContainer)

        parent.addView(row)
    }

    private fun addChip(parent: android.view.ViewGroup, label: String, isPositive: Boolean) {
        val chip = createChipView(label, isPositive)
        val params = LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        ).apply {
            setMargins((3 * dp).toInt(), (3 * dp).toInt(), (3 * dp).toInt(), (3 * dp).toInt())
        }
        chip.layoutParams = params
        parent.addView(chip)
    }

    private fun createChipView(text: String, isPositive: Boolean): TextView {
        val textColor: Int
        val bgColor: Int
        if (isPositive) {
            textColor = getColor(R.color.posterita_secondary)
            bgColor = 0x1A2E7D32.toInt() // green 10% alpha
        } else {
            textColor = getColor(R.color.posterita_muted)
            bgColor = 0x0F6C6F76.toInt() // muted 6% alpha
        }

        return TextView(this).apply {
            this.text = text
            setTextColor(textColor)
            textSize = 11f
            typeface = ResourcesCompat.getFont(this@DetailViewActivity, R.font.lexend_semibold)
            setPadding((10 * dp).toInt(), (4 * dp).toInt(), (10 * dp).toInt(), (4 * dp).toInt())
            background = GradientDrawable().apply {
                cornerRadius = 999 * dp
                setColor(bgColor)
            }
        }
    }
}
