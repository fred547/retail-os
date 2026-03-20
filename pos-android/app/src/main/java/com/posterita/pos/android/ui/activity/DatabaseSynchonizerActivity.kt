package com.posterita.pos.android.ui.activity

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.Toast
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import com.posterita.pos.android.databinding.ActivityDatabaseSynchonizerBinding
import com.posterita.pos.android.ui.viewmodel.SyncViewModel
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class DatabaseSynchonizerActivity : AppCompatActivity() {

    private lateinit var binding: ActivityDatabaseSynchonizerBinding

    private val syncViewModel: SyncViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityDatabaseSynchonizerBinding.inflate(layoutInflater)
        setContentView(binding.root)
        supportActionBar?.hide()

        observeViewModel()
        syncViewModel.pullData()
    }

    private fun observeViewModel() {
        syncViewModel.isLoading.observe(this) { isLoading ->
            binding.progressBar.visibility = if (isLoading) View.VISIBLE else View.GONE
            if (isLoading) {
                binding.syncText.text = "Synchronizing..."
            }
        }

        syncViewModel.syncResult.observe(this) { result ->
            result.fold(
                onSuccess = {
                    binding.syncText.text = "Sync complete"
                    navigateToSelectTerminal()
                },
                onFailure = { error ->
                    binding.syncText.text = "Sync failed: ${error.message}\nTap to retry"
                    binding.syncText.setOnClickListener {
                        syncViewModel.pullData()
                    }
                    Toast.makeText(
                        this,
                        "Sync failed: ${error.message}",
                        Toast.LENGTH_LONG
                    ).show()
                }
            )
        }
    }

    private fun navigateToSelectTerminal() {
        val intent = Intent(this, SelectTerminalActivity::class.java)
        intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        startActivity(intent)
        finish()
    }
}
