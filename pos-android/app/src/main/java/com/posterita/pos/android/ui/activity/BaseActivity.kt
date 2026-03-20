package com.posterita.pos.android.ui.activity

import android.os.Handler
import android.os.Looper
import android.graphics.Rect
import android.view.TouchDelegate
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.widget.Toolbar
import android.widget.ImageButton

open class BaseActivity : AppCompatActivity() {

    private var backPressedOnce = false
    private val backPressHandler = Handler(Looper.getMainLooper())

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        if (backPressedOnce) {
            @Suppress("DEPRECATION")
            super.onBackPressed()
            return
        }

        backPressedOnce = true
        Toast.makeText(this, "Press again to exit", Toast.LENGTH_SHORT).show()

        backPressHandler.postDelayed({ backPressedOnce = false }, 2000)
    }

    protected fun expandTouchArea(target: View, extraPaddingDp: Int = 16) {
        val parent = target.parent as? View ?: return
        val extra = (extraPaddingDp * resources.displayMetrics.density).toInt()

        parent.post {
            val rect = Rect()
            target.getHitRect(rect)
            rect.left -= extra
            rect.top -= extra
            rect.right += extra
            rect.bottom += extra
            parent.touchDelegate = TouchDelegate(rect, target)
        }
    }

    protected fun expandToolbarNavigationTouchTarget(
        toolbar: Toolbar,
        extraPaddingDp: Int = 16
    ) {
        toolbar.post {
            val navButton = (0 until toolbar.childCount)
                .mapNotNull { index -> toolbar.getChildAt(index) as? ImageButton }
                .firstOrNull()
                ?: return@post

            expandTouchArea(navButton, extraPaddingDp)
        }
    }
}
