package com.posterita.pos.android.ui.viewmodel

import androidx.lifecycle.*
import com.posterita.pos.android.data.local.dao.UserDao
import com.posterita.pos.android.data.local.entity.User
import com.posterita.pos.android.util.SharedPreferencesManager
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class UserSelectionViewModel @Inject constructor(
    private val userDao: UserDao,
    private val prefsManager: SharedPreferencesManager
) : ViewModel() {

    private val _users = MutableLiveData<List<User>>()
    val users: LiveData<List<User>> = _users

    private val _loginResult = MutableLiveData<Result<User>>()
    val loginResult: LiveData<Result<User>> = _loginResult

    private val _biometricLoginResult = MutableLiveData<Result<User>>()
    val biometricLoginResult: LiveData<Result<User>> = _biometricLoginResult

    private val _promptBiometricEnrollment = MutableLiveData<User>()
    val promptBiometricEnrollment: LiveData<User> = _promptBiometricEnrollment

    fun loadUsers() {
        viewModelScope.launch {
            _users.postValue(userDao.getAllUsers())
        }
    }

    fun validatePin(user: User, pin: String) {
        if (user.pin == pin) {
            prefsManager.userId = user.user_id
            prefsManager.userName = user.username ?: ""
            _loginResult.postValue(Result.success(user))
        } else {
            _loginResult.postValue(Result.failure(Exception("Incorrect Password")))
        }
    }

    fun isBiometricEnrolled(): Boolean = prefsManager.biometricEnabled

    fun getBiometricEnrolledUserId(): Int = prefsManager.biometricEnrolledUserId

    fun getBiometricEnrolledUserName(): String = prefsManager.biometricEnrolledUserName

    fun onBiometricAuthSuccess() {
        viewModelScope.launch {
            val enrolledUserId = prefsManager.biometricEnrolledUserId
            val user = userDao.getUserById(enrolledUserId)
            if (user != null) {
                prefsManager.userId = user.user_id
                prefsManager.userName = user.username ?: ""
                _biometricLoginResult.postValue(Result.success(user))
            } else {
                // Enrolled user no longer exists in DB — clear enrollment
                prefsManager.clearBiometricEnrollment()
                _biometricLoginResult.postValue(
                    Result.failure(Exception("Enrolled user not found. Please log in with PIN."))
                )
            }
        }
    }

    fun checkShouldPromptBiometricEnrollment(user: User, canUseBiometric: Boolean) {
        if (canUseBiometric && !prefsManager.biometricEnabled) {
            _promptBiometricEnrollment.postValue(user)
        }
    }

    fun enrollBiometric(user: User) {
        prefsManager.biometricEnabled = true
        prefsManager.biometricEnrolledUserId = user.user_id
        prefsManager.biometricEnrolledUserName = user.username ?: ""
    }
}
