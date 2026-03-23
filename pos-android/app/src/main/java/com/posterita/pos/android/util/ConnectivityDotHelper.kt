package com.posterita.pos.android.util

import android.content.Intent
import android.graphics.drawable.GradientDrawable
import android.view.View
import androidx.appcompat.app.AppCompatActivity
import com.posterita.pos.android.R
import com.posterita.pos.android.ui.activity.DatabaseSynchonizerActivity

/**
 * Wires up the connectivity dot (green/red circle) in any activity.
 * Call from onCreate() after setContentView().
 * The layout must have a View with id `connectivity_dot`.
 */
fun setupConnectivityDot(activity: AppCompatActivity, monitor: ConnectivityMonitor) {
    val dot = activity.findViewById<View>(R.id.connectivity_dot) ?: return
    monitor.isConnected.observe(activity) { connected ->
        val color = if (connected) {
            activity.resources.getColor(R.color.posterita_secondary, activity.theme)
        } else {
            activity.resources.getColor(R.color.posterita_error, activity.theme)
        }
        val bg = dot.background
        if (bg is GradientDrawable) {
            bg.setColor(color)
        }
    }
    dot.setOnClickListener {
        activity.startActivity(Intent(activity, DatabaseSynchonizerActivity::class.java))
    }
}
