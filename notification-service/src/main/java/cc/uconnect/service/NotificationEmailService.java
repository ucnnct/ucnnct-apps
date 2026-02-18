package cc.uconnect.service;

import cc.uconnect.configs.NotificationServiceProperties;
import cc.uconnect.model.Message;
import cc.uconnect.model.UserContact;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

@Service
@Log4j2
@RequiredArgsConstructor
public class NotificationEmailService {

    private final JavaMailSender mailSender;
    private final NotificationServiceProperties properties;
    private final NotificationContentService contentService;

    public Mono<Void> sendOfflineMessageNotification(UserContact userContact, Message message, String conversationReference) {
        if (userContact == null || userContact.getEmail() == null || userContact.getEmail().isBlank()) {
            return Mono.fromRunnable(() -> log.warn("Cannot send notification email: email is missing"));
        }

        return Mono.fromRunnable(() -> {
                    String subject = contentService.buildEmailSubject(properties.getEmail().getSubjectPrefix(), message);
                    String body = contentService.buildEmailBody(message, conversationReference);

                    SimpleMailMessage mail = new SimpleMailMessage();
                    mail.setFrom(properties.getEmail().getFrom());
                    mail.setTo(userContact.getEmail());
                    mail.setSubject(subject);
                    mail.setText(body);
                    mailSender.send(mail);
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
