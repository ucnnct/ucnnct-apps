package cc.uconnect.service;

import cc.uconnect.configs.NotificationServiceProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
public class NotificationEmailTemplateService {

    private static final String APP_URL_PLACEHOLDER = "{{app_url}}";
    private static final String CTA_LABEL_PLACEHOLDER = "{{cta_label}}";
    private static final String LOGO_CID_PLACEHOLDER = "{{logo_cid}}";

    private final NotificationServiceProperties properties;
    private final Map<String, String> templateCache = new ConcurrentHashMap<>();

    public String render(String templateFileName, String headline, String preview) {
        String key = templateFileName == null ? "" : templateFileName.trim();
        String template = templateCache.computeIfAbsent(key, this::loadTemplate);
        return template
                .replace(headlinePlaceholder(), valueOrEmpty(headline))
                .replace(previewPlaceholder(), valueOrEmpty(preview))
                .replace(APP_URL_PLACEHOLDER, appUrl())
                .replace(CTA_LABEL_PLACEHOLDER, ctaLabel())
                .replace(LOGO_CID_PLACEHOLDER, logoCid());
    }

    private String loadTemplate(String templateFileName) {
        if (templateFileName == null || templateFileName.isBlank()) {
            return defaultTemplate();
        }

        String resourcePath = templateDirectory() + templateFileName;
        try (InputStream inputStream = Thread.currentThread()
                .getContextClassLoader()
                .getResourceAsStream(resourcePath)) {
            if (inputStream == null) {
                return defaultTemplate();
            }
            return new String(inputStream.readAllBytes(), StandardCharsets.UTF_8);
        } catch (Exception ignored) {
            return defaultTemplate();
        }
    }

    private String templateDirectory() {
        return valueOrEmpty(properties.getNotifications().getDefaults().getEmailTemplateDirectory());
    }

    private String headlinePlaceholder() {
        return valueOrEmpty(properties.getNotifications().getDefaults().getHeadlinePlaceholder());
    }

    private String previewPlaceholder() {
        return valueOrEmpty(properties.getNotifications().getDefaults().getPreviewPlaceholder());
    }

    private String defaultTemplate() {
        return headlinePlaceholder() + "<br/>" + previewPlaceholder();
    }

    private String appUrl() {
        String value = properties.getNotifications().getDefaults().getAppUrl();
        return valueOrEmpty(value);
    }

    private String ctaLabel() {
        String value = properties.getNotifications().getDefaults().getCtaLabel();
        if (value == null || value.isBlank()) {
            return "Ouvrir UConnect";
        }
        return value;
    }

    public String logoCid() {
        String value = properties.getNotifications().getDefaults().getLogoCid();
        if (value == null || value.isBlank()) {
            return "uconnect-logo";
        }
        return value;
    }

    private String valueOrEmpty(String value) {
        return value == null ? "" : value;
    }
}
