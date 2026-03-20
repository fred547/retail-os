package com.posterita.pos.android.ui.activity

import android.os.Bundle
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.posterita.pos.android.databinding.ActivitySettingBinding
import com.posterita.pos.android.util.SharedPreferencesManager
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject

@AndroidEntryPoint
class SettingActivity : AppCompatActivity() {

    private lateinit var binding: ActivitySettingBinding

    @Inject
    lateinit var prefsManager: SharedPreferencesManager

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivitySettingBinding.inflate(layoutInflater)
        setContentView(binding.root)

        // Load saved settings
        binding.editTextIpAddress.setText(prefsManager.getString("printer_ip_address", ""))
        binding.switchPrintMode.isChecked = prefsManager.getString("use_bluetooth", "false").toBoolean()

        binding.back.setOnClickListener {
            finish()
        }

        binding.buttonSaveSettings.setOnClickListener {
            val ipAddress = binding.editTextIpAddress.text.toString().trim()
            val useBluetooth = binding.switchPrintMode.isChecked

            prefsManager.setString("printer_ip_address", ipAddress)
            prefsManager.setString("use_bluetooth", useBluetooth.toString())

            Toast.makeText(this, "Settings saved", Toast.LENGTH_SHORT).show()
            finish()
        }
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        finish()
        @Suppress("DEPRECATION")
        super.onBackPressed()
    }
}
