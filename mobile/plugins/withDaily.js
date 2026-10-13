const { AndroidConfig, withAndroidManifest, withAppBuildGradle, withInfoPlist } = require("@expo/config-plugins");

module.exports = function withDaily(config) {
  config = AndroidConfig.Permissions.withPermissions(config, [
    "android.permission.ACCESS_NETWORK_STATE", "android.permission.INTERNET", "android.permission.WAKE_LOCK",
    "android.permission.POST_NOTIFICATIONS", "android.permission.FOREGROUND_SERVICE", "android.permission.CAMERA",
    "android.permission.FOREGROUND_SERVICE_CAMERA", "android.permission.RECORD_AUDIO",
    "android.permission.MODIFY_AUDIO_SETTINGS", "android.permission.FOREGROUND_SERVICE_MICROPHONE",
  ]);
  config = withInfoPlist(config, current => {
    current.modResults.NSCameraUsageDescription ||= "StageFront uses your camera when you join a live stage.";
    current.modResults.NSMicrophoneUsageDescription ||= "StageFront uses your microphone when you join a live stage.";
    current.modResults.UIBackgroundModes = [...new Set([...(current.modResults.UIBackgroundModes || []), "voip"])];
    return current;
  });
  config = withAndroidManifest(config, current => {
    const application = AndroidConfig.Manifest.getMainApplication(current.modResults);
    application.service ||= [];
    if (!application.service.some(service => service.$?.["android:name"] === "com.daily.reactlibrary.DailyOngoingMeetingForegroundService")) {
      application.service.push({ $: { "android:name": "com.daily.reactlibrary.DailyOngoingMeetingForegroundService", "android:exported": "false", "android:foregroundServiceType": "camera|microphone" } });
    }
    return current;
  });
  return withAppBuildGradle(config, current => {
    if (!current.modResults.contents.includes("android.packagingOptions.jniLibs.useLegacyPackaging")) current.modResults.contents += "\nandroid.packagingOptions.jniLibs.useLegacyPackaging = true\n";
    return current;
  });
};
