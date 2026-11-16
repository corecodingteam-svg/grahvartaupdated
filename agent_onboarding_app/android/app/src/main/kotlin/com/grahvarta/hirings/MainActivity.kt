package com.grahvarta.hirings

import android.annotation.SuppressLint
import android.provider.Settings
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity() {
    // ANDROID_ID is stable for this app on this device across reinstalls
    // (it only changes on factory reset), which is what the
    // "one registration per device" rule needs.
    @SuppressLint("HardwareIds")
    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, "grahvarta/device")
            .setMethodCallHandler { call, result ->
                if (call.method == "getDeviceId") {
                    result.success(Settings.Secure.getString(contentResolver, Settings.Secure.ANDROID_ID))
                } else {
                    result.notImplemented()
                }
            }
    }
}
