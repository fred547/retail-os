package com.posterita.pos.android.ui.activity

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.Toast
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import com.posterita.pos.android.databinding.ActivityCheckServerEndPointBinding
import com.posterita.pos.android.ui.viewmodel.AuthViewModel
import com.posterita.pos.android.util.SharedPreferencesManager
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject

@AndroidEntryPoint
class CheckServerEndPointActivity : AppCompatActivity() {

    private lateinit var binding: ActivityCheckServerEndPointBinding

    private val authViewModel: AuthViewModel by viewModels()

    @Inject
    lateinit var prefsManager: SharedPreferencesManager

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityCheckServerEndPointBinding.inflate(layoutInflater)
        setContentView(binding.root)

        // Pre-fill with saved URL
        binding.baseUrlTextField.setText(prefsManager.baseUrl)

        binding.buttonContinue.setOnClickListener {
            val url = binding.baseUrlTextField.text.toString().trim()
            if (url.isEmpty()) {
                Toast.makeText(this, "Please enter a server URL", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            testAndSaveEndpoint(url)
        }

        observeViewModel()
    }

    private fun testAndSaveEndpoint(url: String) {
        binding.buttonContinue.isEnabled = false
        authViewModel.testEndpoint(url)
    }

    private fun observeViewModel() {
        authViewModel.testEndpointResult.observe(this) { result ->
            binding.buttonContinue.isEnabled = true
            result.fold(
                onSuccess = {
                    Toast.makeText(this, "Server endpoint verified", Toast.LENGTH_SHORT).show()
                    prefsManager.baseUrl = binding.baseUrlTextField.text.toString().trim()
                    val intent = Intent(this, SignInActivity::class.java)
                    intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                    startActivity(intent)
                    finish()
                },
                onFailure = { error ->
                    Toast.makeText(
                        this,
                        "Invalid Server Endpoint: ${error.message}",
                        Toast.LENGTH_LONG
                    ).show()
                }
            )
        }
    }
}
