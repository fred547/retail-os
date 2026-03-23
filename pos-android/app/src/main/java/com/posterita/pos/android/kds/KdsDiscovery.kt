package com.posterita.pos.android.kds

import android.content.Context
import android.net.nsd.NsdManager
import android.net.nsd.NsdServiceInfo
import android.util.Log

/**
 * mDNS registration (server side) and discovery (client side)
 * for KDS auto-connect on LAN.
 *
 * Service type: _posterita-kds._tcp.
 */
class KdsDiscovery(private val context: Context) {

    companion object {
        const val SERVICE_TYPE = "_posterita-kds._tcp."
        private const val TAG = "KdsDiscovery"
    }

    private val nsdManager: NsdManager by lazy {
        context.getSystemService(Context.NSD_SERVICE) as NsdManager
    }

    private var registrationListener: NsdManager.RegistrationListener? = null
    private var discoveryListener: NsdManager.DiscoveryListener? = null

    // ── Server: Register ──

    fun registerService(terminalId: Int, port: Int) {
        val serviceInfo = NsdServiceInfo().apply {
            serviceName = "PosteritaPOS-$terminalId"
            serviceType = SERVICE_TYPE
            setPort(port)
        }

        registrationListener = object : NsdManager.RegistrationListener {
            override fun onServiceRegistered(info: NsdServiceInfo) {
                Log.i(TAG, "mDNS service registered: ${info.serviceName}")
            }

            override fun onRegistrationFailed(info: NsdServiceInfo, errorCode: Int) {
                Log.w(TAG, "mDNS registration failed: error=$errorCode")
            }

            override fun onServiceUnregistered(info: NsdServiceInfo) {
                Log.d(TAG, "mDNS service unregistered: ${info.serviceName}")
            }

            override fun onUnregistrationFailed(info: NsdServiceInfo, errorCode: Int) {
                Log.w(TAG, "mDNS unregistration failed: error=$errorCode")
            }
        }

        try {
            nsdManager.registerService(serviceInfo, NsdManager.PROTOCOL_DNS_SD, registrationListener)
        } catch (e: Exception) {
            Log.w(TAG, "Failed to register mDNS: ${e.message}")
        }
    }

    fun unregister() {
        registrationListener?.let {
            try {
                nsdManager.unregisterService(it)
            } catch (e: Exception) {
                Log.w(TAG, "Failed to unregister mDNS: ${e.message}")
            }
        }
        registrationListener = null
    }

    // ── Client: Discover ──

    data class DiscoveredServer(
        val name: String,
        val host: String,
        val port: Int
    )

    interface DiscoveryCallback {
        fun onServerFound(server: DiscoveredServer)
        fun onServerLost(name: String)
        fun onError(message: String)
    }

    fun startDiscovery(callback: DiscoveryCallback) {
        discoveryListener = object : NsdManager.DiscoveryListener {
            override fun onDiscoveryStarted(serviceType: String) {
                Log.d(TAG, "mDNS discovery started for $serviceType")
            }

            override fun onServiceFound(serviceInfo: NsdServiceInfo) {
                Log.d(TAG, "mDNS service found: ${serviceInfo.serviceName}")
                // Resolve to get host + port
                nsdManager.resolveService(serviceInfo, object : NsdManager.ResolveListener {
                    override fun onResolveFailed(info: NsdServiceInfo, errorCode: Int) {
                        Log.w(TAG, "mDNS resolve failed for ${info.serviceName}: error=$errorCode")
                    }

                    override fun onServiceResolved(info: NsdServiceInfo) {
                        val host = info.host?.hostAddress ?: return
                        val port = info.port
                        Log.i(TAG, "Resolved: ${info.serviceName} → $host:$port")
                        callback.onServerFound(DiscoveredServer(info.serviceName, host, port))
                    }
                })
            }

            override fun onServiceLost(serviceInfo: NsdServiceInfo) {
                Log.d(TAG, "mDNS service lost: ${serviceInfo.serviceName}")
                callback.onServerLost(serviceInfo.serviceName)
            }

            override fun onDiscoveryStopped(serviceType: String) {
                Log.d(TAG, "mDNS discovery stopped")
            }

            override fun onStartDiscoveryFailed(serviceType: String, errorCode: Int) {
                Log.w(TAG, "mDNS discovery start failed: error=$errorCode")
                callback.onError("Discovery failed (error $errorCode)")
            }

            override fun onStopDiscoveryFailed(serviceType: String, errorCode: Int) {
                Log.w(TAG, "mDNS discovery stop failed: error=$errorCode")
            }
        }

        try {
            nsdManager.discoverServices(SERVICE_TYPE, NsdManager.PROTOCOL_DNS_SD, discoveryListener)
        } catch (e: Exception) {
            Log.w(TAG, "Failed to start mDNS discovery: ${e.message}")
            callback.onError("Failed to start discovery: ${e.message}")
        }
    }

    fun stopDiscovery() {
        discoveryListener?.let {
            try {
                nsdManager.stopServiceDiscovery(it)
            } catch (e: Exception) {
                Log.w(TAG, "Failed to stop mDNS discovery: ${e.message}")
            }
        }
        discoveryListener = null
    }
}
