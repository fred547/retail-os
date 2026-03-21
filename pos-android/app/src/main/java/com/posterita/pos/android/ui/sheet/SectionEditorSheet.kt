package com.posterita.pos.android.ui.sheet

import android.app.Dialog
import android.os.Bundle
import android.text.InputType
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.LinearLayout
import androidx.appcompat.app.AlertDialog
import com.google.android.material.bottomsheet.BottomSheetBehavior
import com.google.android.material.bottomsheet.BottomSheetDialog
import com.google.android.material.bottomsheet.BottomSheetDialogFragment
import com.google.android.material.switchmaterial.SwitchMaterial
import com.google.android.material.textfield.TextInputEditText
import com.google.android.material.textfield.TextInputLayout
import com.posterita.pos.android.R

/**
 * Reusable bottom sheet for editing a section of an entity.
 *
 * Usage:
 *   val sheet = SectionEditorSheet.create(
 *       title = "Pricing",
 *       fields = listOf(
 *           FieldDef("sellingprice", "Selling Price", FieldType.CURRENCY, "45.00"),
 *           FieldDef("costprice", "Cost Price", FieldType.CURRENCY, "28.00"),
 *       ),
 *       onSave = { values -> /* Map<String, String> */ }
 *   )
 *   sheet.show(supportFragmentManager, "pricing")
 */
class SectionEditorSheet : BottomSheetDialogFragment() {

    enum class FieldType {
        TEXT,          // Plain text input
        NUMBER,        // Numeric input
        CURRENCY,      // Decimal number (price)
        MULTILINE,     // Multi-line text
        TOGGLE,        // On/off switch
        DROPDOWN,      // Single-choice picker
    }

    data class FieldDef(
        val key: String,
        val label: String,
        val type: FieldType = FieldType.TEXT,
        val currentValue: String = "",
        val options: List<String> = emptyList(), // For DROPDOWN
        val hint: String = "",
    )

    private var title: String = ""
    private var fields: List<FieldDef> = emptyList()
    private var onSave: ((Map<String, String>) -> Unit)? = null

    private val inputViews = mutableMapOf<String, View>()

    companion object {
        fun create(
            title: String,
            fields: List<FieldDef>,
            onSave: (Map<String, String>) -> Unit
        ): SectionEditorSheet {
            return SectionEditorSheet().apply {
                this.title = title
                this.fields = fields
                this.onSave = onSave
            }
        }
    }

    override fun onCreateDialog(savedInstanceState: Bundle?): Dialog {
        val dialog = super.onCreateDialog(savedInstanceState) as BottomSheetDialog
        dialog.behavior.state = BottomSheetBehavior.STATE_EXPANDED
        dialog.behavior.skipCollapsed = true
        return dialog
    }

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        return inflater.inflate(R.layout.sheet_section_editor, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        view.findViewById<android.widget.TextView>(R.id.sheetTitle).text = title

        val container = view.findViewById<LinearLayout>(R.id.fieldContainer)
        val density = resources.displayMetrics.density

        for (field in fields) {
            when (field.type) {
                FieldType.TOGGLE -> {
                    val toggle = SwitchMaterial(requireContext()).apply {
                        text = field.label
                        isChecked = field.currentValue.equals("Y", ignoreCase = true) ||
                                field.currentValue.equals("Yes", ignoreCase = true) ||
                                field.currentValue.equals("true", ignoreCase = true)
                        layoutParams = LinearLayout.LayoutParams(
                            LinearLayout.LayoutParams.MATCH_PARENT,
                            LinearLayout.LayoutParams.WRAP_CONTENT
                        ).apply {
                            bottomMargin = (12 * density).toInt()
                        }
                        setTextColor(resources.getColor(R.color.posterita_ink, context.theme))
                    }
                    container.addView(toggle)
                    inputViews[field.key] = toggle
                }

                FieldType.DROPDOWN -> {
                    val layout = TextInputLayout(requireContext(), null,
                        com.google.android.material.R.attr.textInputOutlinedStyle).apply {
                        hint = field.label
                        layoutParams = LinearLayout.LayoutParams(
                            LinearLayout.LayoutParams.MATCH_PARENT,
                            LinearLayout.LayoutParams.WRAP_CONTENT
                        ).apply {
                            bottomMargin = (12 * density).toInt()
                        }
                        endIconMode = TextInputLayout.END_ICON_DROPDOWN_MENU
                    }
                    val editText = TextInputEditText(layout.context).apply {
                        setText(field.currentValue)
                        isFocusable = false
                        isClickable = true
                        setOnClickListener {
                            showDropdown(field, this)
                        }
                    }
                    layout.addView(editText)
                    container.addView(layout)
                    inputViews[field.key] = editText
                }

                else -> {
                    val layout = TextInputLayout(requireContext(), null,
                        com.google.android.material.R.attr.textInputOutlinedStyle).apply {
                        hint = field.label
                        layoutParams = LinearLayout.LayoutParams(
                            LinearLayout.LayoutParams.MATCH_PARENT,
                            LinearLayout.LayoutParams.WRAP_CONTENT
                        ).apply {
                            bottomMargin = (12 * density).toInt()
                        }
                    }
                    val editText = TextInputEditText(layout.context).apply {
                        setText(field.currentValue)
                        inputType = when (field.type) {
                            FieldType.NUMBER -> InputType.TYPE_CLASS_NUMBER
                            FieldType.CURRENCY -> InputType.TYPE_CLASS_NUMBER or InputType.TYPE_NUMBER_FLAG_DECIMAL
                            FieldType.MULTILINE -> InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_FLAG_MULTI_LINE
                            else -> InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_FLAG_CAP_WORDS
                        }
                        if (field.type == FieldType.MULTILINE) {
                            minLines = 2
                            maxLines = 4
                        }
                        if (field.hint.isNotEmpty()) {
                            hint = field.hint
                        }
                    }
                    layout.addView(editText)
                    container.addView(layout)
                    inputViews[field.key] = editText
                }
            }
        }

        view.findViewById<View>(R.id.btnSave).setOnClickListener {
            val values = mutableMapOf<String, String>()
            for (field in fields) {
                val view = inputViews[field.key] ?: continue
                values[field.key] = when (view) {
                    is SwitchMaterial -> if (view.isChecked) "Y" else "N"
                    is TextInputEditText -> view.text?.toString()?.trim() ?: ""
                    else -> ""
                }
            }
            onSave?.invoke(values)
            dismiss()
        }
    }

    private fun showDropdown(field: FieldDef, editText: TextInputEditText) {
        val options = field.options.toTypedArray()
        val currentIndex = options.indexOf(field.currentValue).coerceAtLeast(0)

        AlertDialog.Builder(requireContext())
            .setTitle(field.label)
            .setSingleChoiceItems(options, currentIndex) { dialog, which ->
                editText.setText(options[which])
                dialog.dismiss()
            }
            .show()
    }
}
