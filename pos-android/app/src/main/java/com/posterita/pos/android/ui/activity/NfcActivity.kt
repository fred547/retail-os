package com.posterita.pos.android.ui.activity

import android.content.Intent
import android.nfc.NfcAdapter
import android.os.Bundle
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.posterita.pos.android.databinding.ActivityNfcBinding
import com.posterita.pos.android.util.NfcUtils
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class NfcActivity : AppCompatActivity() {

    private lateinit var binding: ActivityNfcBinding
    private var nfcUtils: NfcUtils? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityNfcBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setSupportActionBar(binding.toolbar)
        supportActionBar?.setDisplayHomeAsUpEnabled(true)
        supportActionBar?.title = "NFC"

        initializeNfc()

        binding.fab.setOnClickListener {
            if (nfcUtils?.isNfcSupported == true) {
                if (nfcUtils?.isNfcEnabled == true) {
                    Toast.makeText(this, "Ready to scan NFC tag. Hold tag near device.", Toast.LENGTH_LONG).show()
                } else {
                    Toast.makeText(this, "Please enable NFC in device settings", Toast.LENGTH_SHORT).show()
                }
            } else {
                Toast.makeText(this, "NFC is not supported on this device", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun initializeNfc() {
        if (NfcAdapter.getDefaultAdapter(this) != null) {
            nfcUtils = NfcUtils(this)

            if (!nfcUtils!!.isNfcEnabled) {
                Toast.makeText(this, "NFC is disabled. Please enable it in settings.", Toast.LENGTH_LONG).show()
            }
        } else {
            Toast.makeText(this, "NFC is not supported on this device", Toast.LENGTH_SHORT).show()
        }
    }

    override fun onResume() {
        super.onResume()
        nfcUtils?.enableForegroundDispatch()
    }

    override fun onPause() {
        super.onPause()
        nfcUtils?.disableForegroundDispatch()
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        nfcUtils?.let { nfc ->
            val tagId = nfc.processTag(intent)
            if (tagId != null) {
                Toast.makeText(this, "NFC Tag ID: $tagId", Toast.LENGTH_LONG).show()
            }
        }
    }

    override fun onSupportNavigateUp(): Boolean {
        finish()
        return true
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        finish()
        @Suppress("DEPRECATION")
        super.onBackPressed()
    }
}
