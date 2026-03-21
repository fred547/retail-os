package com.posterita.pos.android.ui.activity

import android.content.Intent
import android.os.Bundle
import android.widget.ArrayAdapter
import android.widget.Toast
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import com.posterita.pos.android.databinding.ActivitySelectTerminalBinding
import com.posterita.pos.android.data.local.entity.Store
import com.posterita.pos.android.data.local.entity.Terminal
import com.posterita.pos.android.ui.viewmodel.TerminalSelectionViewModel
import com.posterita.pos.android.util.SharedPreferencesManager
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject

@AndroidEntryPoint
class SelectTerminalActivity : AppCompatActivity() {

    private lateinit var binding: ActivitySelectTerminalBinding

    private val terminalSelectionViewModel: TerminalSelectionViewModel by viewModels()

    @Inject
    lateinit var prefsManager: SharedPreferencesManager

    private var selectedStore: Store? = null
    private var selectedTerminal: Terminal? = null
    private var storeList: List<Store> = emptyList()
    private var terminalList: List<Terminal> = emptyList()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivitySelectTerminalBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setSupportActionBar(binding.toolbar)
        supportActionBar?.setDisplayShowTitleEnabled(false)

        setupStoreDropdown()
        setupTerminalDropdown()
        setupNextButton()
        observeViewModel()

        terminalSelectionViewModel.loadStores()
    }

    private fun setupStoreDropdown() {
        binding.autoCompleteStore.setOnItemClickListener { _, _, position, _ ->
            if (position < storeList.size) {
                selectedStore = storeList[position]
                selectedTerminal = null
                binding.autoCompleteTerminal.setText("", false)
                terminalSelectionViewModel.loadTerminalsForStore(selectedStore!!.storeId)
            }
        }
    }

    private fun setupTerminalDropdown() {
        binding.autoCompleteTerminal.setOnItemClickListener { _, _, position, _ ->
            if (position < terminalList.size) {
                selectedTerminal = terminalList[position]
            }
        }
    }

    private fun setupNextButton() {
        binding.buttonNext.setOnClickListener {
            val store = selectedStore
            val terminal = selectedTerminal

            if (store == null) {
                Toast.makeText(this, "Please select a store", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            if (terminal == null) {
                Toast.makeText(this, "Please select a terminal", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            terminalSelectionViewModel.selectTerminal(store, terminal)
        }
    }

    private fun observeViewModel() {
        terminalSelectionViewModel.stores.observe(this) { stores ->
            storeList = stores
            val storeNames = stores.map { it.name ?: "" }
            val adapter = ArrayAdapter(this, android.R.layout.simple_dropdown_item_1line, storeNames)
            binding.autoCompleteStore.setAdapter(adapter)
        }

        terminalSelectionViewModel.terminals.observe(this) { terminals ->
            terminalList = terminals
            val terminalNames = terminals.map { it.name ?: "" }
            val adapter = ArrayAdapter(this, android.R.layout.simple_dropdown_item_1line, terminalNames)
            binding.autoCompleteTerminal.setAdapter(adapter)
        }

        terminalSelectionViewModel.selectionComplete.observe(this) { complete ->
            if (complete) {
                val intent = Intent(this, SelectUserLoginActivity::class.java)
                intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                startActivity(intent)
                finish()
            }
        }

    }

    override fun onCreateOptionsMenu(menu: android.view.Menu?): Boolean {
        menuInflater.inflate(com.posterita.pos.android.R.menu.menu_select_terminal, menu)
        return true
    }

    override fun onOptionsItemSelected(item: android.view.MenuItem): Boolean {
        return when (item.itemId) {
            android.R.id.home -> {
                onBackPressedDispatcher.onBackPressed()
                true
            }
            com.posterita.pos.android.R.id.action_sign_out -> {
                // Clear all session data and return to login
                prefsManager.resetAccount()
                val intent = Intent(this, SignInActivity::class.java)
                intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                startActivity(intent)
                finish()
                true
            }
            else -> super.onOptionsItemSelected(item)
        }
    }
}
