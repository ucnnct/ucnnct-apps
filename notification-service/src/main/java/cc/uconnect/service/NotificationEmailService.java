package cc.uconnect.service;

import cc.uconnect.configs.NotificationServiceProperties;
import cc.uconnect.model.UserContact;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.core.io.ClassPathResource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import jakarta.mail.internet.MimeMessage;
import jakarta.mail.MessagingException;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

@Service
@Log4j2
@RequiredArgsConstructor
public class NotificationEmailService {

    private static final String LOGO_RESOURCE_PATH = "uconnect-logo.png";

    private final JavaMailSender mailSender;
    private final NotificationServiceProperties properties;
    private final NotificationEmailTemplateService notificationEmailTemplateService;

    public Mono<Void> sendOfflineMessageNotification(UserContact userContact, String subject, String htmlBody) {
        if (userContact == null || userContact.getEmail() == null || userContact.getEmail().isBlank()) {
            return Mono.fromRunnable(() -> log.warn("Cannot send notification email: email is missing"));
        }

        return Mono.fromRunnable(() -> {
                    try {
                        MimeMessage mail = mailSender.createMimeMessage();
                        MimeMessageHelper helper = new MimeMessageHelper(mail, true, "UTF-8");
                        helper.setFrom(properties.getEmail().getFrom());
                        helper.setTo(userContact.getEmail());
                        helper.setSubject(subject);
                        helper.setText(htmlBody, true);

                        ClassPathResource logo = new ClassPathResource(LOGO_RESOURCE_PATH);
                        if (logo.exists()) {
                            helper.addInline(notificationEmailTemplateService.logoCid(), logo, "image/png");
                        }

                        mailSender.send(mail);
                    } catch (MessagingException ex) {
                        throw new IllegalStateException("Failed to build email mime message", ex);
                    }
                })
                .subscribeOn(Schedulers.boundedElastic())
                .doOnSuccess(ignored -> log.debug("Notification email sent userId={} email={}",
                        userContact.getUserId(),
                        userContact.getEmail()))
                .doOnError(ex -> log.error("Failed to send notification email userId={} email={}",
                        userContact.getUserId(),
                        userContact.getEmail(),
                        ex))
                .then();
    }
}
