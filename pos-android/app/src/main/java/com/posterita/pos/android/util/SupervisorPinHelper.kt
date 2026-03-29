package com.posterita.pos.android.util

import android.app.AlertDialog
import android.content.Context
import android.text.InputType
import android.widget.EditText
import android.widget.Toast
import com.posterita.pos.android.data.local.AppDatabase
import com.posterita.pos.android.data.local.entity.User
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/**
 * Reusable supervisor PIN verification with built-in rate limiting.
 * Max 5 attempts per 5 minutes per dialog instance.
 */
class SupervisorPinHelper(
    private val context: Context,
    private val db: AppDatabase,
    private val auditLogger: AuditLogger,
) {
    companion object {
        private const val MAX_ATTEMPTS = 5
        private const val LOCKOUT_MS = 5 * 60 * 1000L // 5 minutes
        // Static: persist across instances so re-creating the helper doesn't reset the counter
        private var failedAttempts = 0
        private var lockoutUntil = 0L
    }

    /**
     * Show a supervisor PIN dialog. On valid PIN, calls [onApproved] with the supervisor's User.
     * On cancel or lockout, calls [onDenied].
     */
    fun show(
        title: String = "Supervisor Approval Required",
        message: String = "Enter a supervisor PIN to continue.",
        onApproved: (supervisor: User) -> Unit,
        onDenied: () -> Unit = {},
    ) {
        val now = System.currentTimeMillis()
        if (now < lockoutUntil) {
            val remaining = ((lockoutUntil - now) / 1000).toInt()
            Toast.makeText(context, "Too many attempts. Try again in ${remaining}s.", Toast.LENGTH_LONG).show()
            onDenied()
            return
        }

        val pinInput = EditText(context).apply {
            hint = "Supervisor PIN"
            inputType = InputType.TYPE_CLASS_NUMBER or InputType.TYPE_NUMBER_VARIATION_PASSWORD
            setPadding(48, 32, 48, 32)
        }

        AlertDialog.Builder(context)
            .setTitle(title)
            .setMessage(message)
            .setView(pinInput)
            .setPositiveButton("Verify", null) // set below to prevent auto-dismiss
            .setNegativeButton("Cancel") { _, _ -> onDenied() }
            .create()
            .also { dialog ->
                dialog.setOnShowListener {
                    dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener {
                        val pin = pinInput.text.toString().trim()
                        if (pin.isEmpty()) {
                            Toast.makeText(context, "Enter a PIN", Toast.LENGTH_SHORT).show()
                            return@setOnClickListener
                        }
                        verifyPin(pin, dialog, onApproved, onDenied)
                    }
                }
                dialog.show()
            }
    }

    private fun verifyPin(
        pin: String,
        dialog: AlertDialog,
        onApproved: (User) -> Unit,
        onDenied: () -> Unit,
    ) {
        CoroutineScope(Dispatchers.Main).launch {
            try {
                val users = withContext(Dispatchers.IO) { db.userDao().getAllUsers() }
                val supervisor = users.find { it.pin == pin && it.isSupervisor }

                if (supervisor != null) {
                    failedAttempts = 0
                    withContext(Dispatchers.IO) {
                        auditLogger.log(
                            AuditLogger.Actions.SUPERVISOR_PIN_OK,
                            detail = "Supervisor ${supervisor.firstname ?: supervisor.username} approved",
                            supervisorId = supervisor.user_id,
                        )
                    }
                    dialog.dismiss()
                    onApproved(supervisor)
                } else {
                    failedAttempts++
                    withContext(Dispatchers.IO) {
                        auditLogger.log(
                            AuditLogger.Actions.SUPERVISOR_PIN_FAIL,
                            detail = "Invalid supervisor PIN (attempt $failedAttempts)",
                        )
                    }
                    if (failedAttempts >= MAX_ATTEMPTS) {
                        lockoutUntil = System.currentTimeMillis() + LOCKOUT_MS
                        withContext(Dispatchers.IO) {
                            auditLogger.log(
                                AuditLogger.Actions.PIN_LOCKOUT,
                                detail = "Supervisor PIN lockout after $failedAttempts attempts",
                            )
                        }
                        Toast.makeText(context, "Too many attempts. Locked for 5 minutes.", Toast.LENGTH_LONG).show()
                        dialog.dismiss()
                        onDenied()
                    } else {
                        Toast.makeText(context, "Invalid supervisor PIN (${MAX_ATTEMPTS - failedAttempts} attempts left)", Toast.LENGTH_SHORT).show()
                    }
                }
            } catch (e: Exception) {
                AppErrorLogger.warn(context, "SupervisorPinHelper", "PIN verification error", e)
                Toast.makeText(context, "Error: ${e.message}", Toast.LENGTH_SHORT).show()
            }
        }
    }

}
