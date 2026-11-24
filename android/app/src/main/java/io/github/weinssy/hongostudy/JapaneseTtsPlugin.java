package io.github.weinssy.hongostudy;

import android.media.AudioAttributes;
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

    private TextToSpeech tts;
    private volatile boolean initialized = false;
    private volatile boolean japaneseAvailable = false;

    @PluginMethod
    public void isAvailable(PluginCall call) {
        ensureInit(() -> {
            JSObject res = new JSObject();
            res.put("available", initialized && japaneseAvailable);
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
                call.resolve(res);
                return;
            }
            if (!japaneseAvailable) {
                JSObject res = new JSObject();
                res.put("spoken", false);
                res.put("reason", "missing_voice");
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
                call.resolve(res);
            } catch (Exception e) {
                JSObject res = new JSObject();
                res.put("spoken", false);
                res.put("reason", "error");
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

    private synchronized void ensureInit(Runnable onReady) {
        if (initialized && tts != null) {
            onReady.run();
            return;
        }
            try {
                if (tts != null) {
                    tts.shutdown();
                    tts = null;
                }
            } catch (Exception ignored) {}
            try {
                tts = new TextToSpeech(getContext().getApplicationContext(), status -> {
                    if (status == TextToSpeech.SUCCESS && tts != null) {
                        tts.setAudioAttributes(
                            new AudioAttributes.Builder()
                                .setUsage(AudioAttributes.USAGE_MEDIA)
                                .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                                .build()
                        );
                        int langResult = tts.setLanguage(Locale.JAPAN);
                        if (langResult == TextToSpeech.LANG_MISSING_DATA || langResult == TextToSpeech.LANG_NOT_SUPPORTED) {
                            langResult = tts.setLanguage(Locale.JAPANESE);
                        }
                        japaneseAvailable =
                            langResult != TextToSpeech.LANG_MISSING_DATA &&
                            langResult != TextToSpeech.LANG_NOT_SUPPORTED;
                        initialized = true;
                    } else {
                        initialized = false;
                        japaneseAvailable = false;
                    }
                    onReady.run();
                });
            } catch (Exception ignored) {
                initialized = false;
                japaneseAvailable = false;
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
