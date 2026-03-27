package com.posterita.pos.android.ui.activity

import android.os.Handler
import android.os.Looper
import android.graphics.Rect
import android.view.MotionEvent
import android.view.TouchDelegate
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.widget.Toolbar
import android.widget.ImageButton
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import com.posterita.pos.android.util.SessionTimeoutManager

open class BaseActivity : AppCompatActivity() {

    private var backPressedOnce = false
    private val backPressHandler = Handler(Looper.getMainLooper())

    override fun onResume() {
        super.onResume()
        // Check idle timeout — redirect to lock screen if timed out
        SessionTimeoutManager.checkAndLock(this)
    }

    override fun setContentView(layoutResID: Int) {
        super.setContentView(layoutResID)
        applySystemBarInsets()
    }

    override fun setContentView(view: View?) {
        super.setContentView(view)
        applySystemBarInsets()
    }

    /**
     * Ensures content is not obscured by transparent system bars (status bar, navigation bar).
     * Applies top + bottom padding to the content frame so ALL layouts are properly inset,
     * regardless of root view type (ConstraintLayout, DrawerLayout, etc).
     */
    private fun applySystemBarInsets() {
        val contentFrame = findViewById<View>(android.R.id.content) ?: return
        ViewCompat.setOnApplyWindowInsetsListener(contentFrame) { view, windowInsets ->
            val insets = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars())
            view.setPadding(insets.left, insets.top, insets.right, insets.bottom)
            WindowInsetsCompat.CONSUMED
        }
    }

    override fun onDestroy() {
        backPressHandler.removeCallbacksAndMessages(null)
        super.onDestroy()
    }

    override fun dispatchTouchEvent(ev: MotionEvent?): Boolean {
        // Reset idle timer on every touch
        SessionTimeoutManager.onUserActivity()
        return super.dispatchTouchEvent(ev)
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        // Only require double-back on Home screen to prevent accidental exit
        // All other screens: normal back behavior (finish)
        if (this::class.java.simpleName == "HomeActivity") {
            if (backPressedOnce) {
                @Suppress("DEPRECATION")
                super.onBackPressed()
                return
            }
            backPressedOnce = true
            Toast.makeText(this, "Press again to exit", Toast.LENGTH_SHORT).show()
            backPressHandler.postDelayed({ backPressedOnce = false }, 2000)
        } else {
            @Suppress("DEPRECATION")
            super.onBackPressed()
        }
    }

    /**
     * Wire a ? help button (if present in layout) to show the contextual help bottom sheet.
     * Call in onCreate after setContentView. Does nothing if buttonHelp is not in the layout.
     */
    protected fun setupHelpButton(screen: String) {
        findViewById<View>(com.posterita.pos.android.R.id.buttonHelp)?.setOnClickListener {
            com.posterita.pos.android.util.HelpSheet.show(this, screen)
        }
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
