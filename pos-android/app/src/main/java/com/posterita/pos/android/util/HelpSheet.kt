package com.posterita.pos.android.util

import android.content.Context
import android.view.LayoutInflater
import android.view.View
import android.widget.LinearLayout
import android.widget.TextView
import com.google.android.material.bottomsheet.BottomSheetDialog
import com.posterita.pos.android.R

/**
 * Shows a contextual help bottom sheet for any screen.
 * Usage: HelpSheet.show(context, "warehouse_home")
 */
object HelpSheet {

    fun show(context: Context, screen: String) {
        val help = HelpContent.get(screen) ?: return

        val dialog = BottomSheetDialog(context)
        val view = LayoutInflater.from(context).inflate(R.layout.sheet_help, null)

        view.findViewById<TextView>(R.id.textHelpTitle).text = help.title

        val container = view.findViewById<LinearLayout>(R.id.helpPointsContainer)
        for (point in help.points) {
            val item = LayoutInflater.from(context).inflate(R.layout.item_help_point, container, false)
            item.findViewById<TextView>(R.id.textPoint).text = point
            container.addView(item)
        }

        view.findViewById<View>(R.id.buttonClose).setOnClickListener { dialog.dismiss() }

        dialog.setContentView(view)
        dialog.show()
    }
}
