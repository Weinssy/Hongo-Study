package io.github.weinssy.hongostudy;

import android.app.Activity;
import android.media.AudioAttributes;
import android.os.Handler;
import android.os.Looper;
import android.speech.tts.TextToSpeech;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.Locale;
import java.util.UUID;

@CapacitorPlugin(name = "JapaneseTts")
public class JapaneseTtsPlugin extends Plugin {

    private static final String GOOGLE_TTS_ENGINE = "com.google.android.tts";

    private TextToSpeech tts;
    private volatile boolean initialized = false;
    private volatile boolean japaneseAvailable = false;
    private volatile String activeEngine = "";
    private volatile int lastLangResult = TextToSpeech.LANG_NOT_SUPPORTED;
    private volatile int lastInitStatus = TextToSpeech.ERROR;

    @PluginMethod
    public void isAvailable(PluginCall call) {
        ensureInit(() -> {
            JSObject res = new JSObject();
            res.put("available", initialized && japaneseAvailable);
            res.put("engine", activeEngine);
            res.put("initStatus", lastInitStatus);
            res.put("langResult", lastLangResult);
            call.resolve(res);
        });
    }

    @PluginMethod
    public void speak(PluginCall call) {
        String rawText = call.getString("text", "");
        String text = rawText != null ? rawText.trim() : "";
        if (text.isEmpty()) {
            JSObject res = new JSObject();
            res.put("spoken", false);
            res.put("reason", "empty");
            call.resolve(res);
            return;
        }
        float rate = call.getFloat("rate", 0.92f);
        float clampedRate = Math.max(0.5f, Math.min(1.5f, rate));

        ensureInit(() -> {
            if (!initialized || tts == null) {
                JSObject res = new JSObject();
                res.put("spoken", false);
                res.put("reason", "init_failed");
                res.put("initStatus", lastInitStatus);
                res.put("engine", activeEngine);
                call.resolve(res);
                return;
            }
            if (!japaneseAvailable) {
                JSObject res = new JSObject();
                res.put("spoken", false);
                res.put("reason", "missing_voice");
                res.put("langResult", lastLangResult);
                res.put("engine", activeEngine);
                call.resolve(res);
                return;
            }
            try {
                tts.setSpeechRate(clampedRate);
                int status = tts.speak(
                    text,
                    TextToSpeech.QUEUE_FLUSH,
                    null,
                    "hongo-" + UUID.randomUUID()
                );
                JSObject res = new JSObject();
                res.put("spoken", status == TextToSpeech.SUCCESS);
                res.put("engine", activeEngine);
                res.put("langResult", lastLangResult);
                if (status != TextToSpeech.SUCCESS) {
                    res.put("reason", "speak_failed_" + status);
                }
                call.resolve(res);
            } catch (Exception e) {
                JSObject res = new JSObject();
                res.put("spoken", false);
                res.put("reason", "error");
                res.put("detail", e.getMessage());
                call.resolve(res);
            }
        });
    }

    @PluginMethod
    public void stop(PluginCall call) {
        if (tts != null) {
            try {
                tts.stop();
            } catch (Exception ignored) {}
        }
        call.resolve();
    }

    private void runOnMainThread(Runnable task) {
        Activity activity = getActivity();
        if (activity != null) {
            activity.runOnUiThread(task);
        } else {
            new Handler(Looper.getMainLooper()).post(task);
        }
    }

    private synchronized void ensureInit(Runnable onReady) {
        if (initialized && japaneseAvailable && tts != null) {
            onReady.run();
            return;
        }
        runOnMainThread(() -> initEngine(null, true, onReady));
    }

    private void initEngine(String enginePackage, boolean allowGoogleFallback, Runnable onReady) {
        try {
            if (tts != null) {
                tts.shutdown();
                tts = null;
            }
        } catch (Exception ignored) {}

        initialized = false;
        japaneseAvailable = false;

        try {
            TextToSpeech.OnInitListener listener = status -> {
                lastInitStatus = status;
                if (status == TextToSpeech.SUCCESS && tts != null) {
                    try {
                        tts.setAudioAttributes(
                            new AudioAttributes.Builder()
                                .setUsage(AudioAttributes.USAGE_MEDIA)
                                .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                                .build()
                        );
                    } catch (Exception ignored) {}

                    int langResult = tts.setLanguage(Locale.JAPAN);
                    if (langResult == TextToSpeech.LANG_MISSING_DATA || langResult == TextToSpeech.LANG_NOT_SUPPORTED) {
                        langResult = tts.setLanguage(Locale.JAPANESE);
                    }
                    lastLangResult = langResult;
                    japaneseAvailable =
                        langResult != TextToSpeech.LANG_MISSING_DATA &&
                        langResult != TextToSpeech.LANG_NOT_SUPPORTED;
                    initialized = true;
                    try {
                        activeEngine = enginePackage != null ? enginePackage : String.valueOf(tts.getDefaultEngine());
                    } catch (Exception ignored) {
                        activeEngine = enginePackage != null ? enginePackage : "";
                    }

                    if (!japaneseAvailable && allowGoogleFallback && !GOOGLE_TTS_ENGINE.equals(activeEngine)) {
                        runOnMainThread(() -> initEngine(GOOGLE_TTS_ENGINE, false, onReady));
                        return;
                    }
                    onReady.run();
                    return;
                }

                if (allowGoogleFallback && enginePackage == null) {
                    runOnMainThread(() -> initEngine(GOOGLE_TTS_ENGINE, false, onReady));
                    return;
                }

                initialized = false;
                japaneseAvailable = false;
                activeEngine = enginePackage != null ? enginePackage : "none";
                onReady.run();
            };

            if (enginePackage != null) {
                tts = new TextToSpeech(getContext().getApplicationContext(), listener, enginePackage);
            } else {
                tts = new TextToSpeech(getContext().getApplicationContext(), listener);
            }
        } catch (Exception e) {
            if (allowGoogleFallback && enginePackage == null) {
                runOnMainThread(() -> initEngine(GOOGLE_TTS_ENGINE, false, onReady));
                return;
            }
            initialized = false;
            japaneseAvailable = false;
            activeEngine = "exception:" + e.getClass().getSimpleName();
            onReady.run();
        }
    }

    @Override
    protected void handleOnDestroy() {
        if (tts != null) {
            try {
                tts.stop();
                tts.shutdown();
            } catch (Exception ignored) {}
            tts = null;
        }
        initialized = false;
        japaneseAvailable = false;
        super.handleOnDestroy();
    }
}
