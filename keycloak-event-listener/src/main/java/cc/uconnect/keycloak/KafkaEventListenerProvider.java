package cc.uconnect.keycloak;

import org.apache.kafka.clients.producer.KafkaProducer;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.keycloak.events.Event;
import org.keycloak.events.EventListenerProvider;
import org.keycloak.events.EventType;
import org.keycloak.events.admin.AdminEvent;
import org.keycloak.events.admin.OperationType;
import org.keycloak.events.admin.ResourceType;
import org.keycloak.models.KeycloakSession;
import org.keycloak.models.RealmModel;
import org.keycloak.models.UserModel;

import java.util.Set;
import java.util.logging.Level;
import java.util.logging.Logger;

public class KafkaEventListenerProvider implements EventListenerProvider {

    private static final Logger LOG = Logger.getLogger(KafkaEventListenerProvider.class.getName());

    private static final Set<EventType> USER_EVENTS = Set.of(
            EventType.REGISTER,
            EventType.UPDATE_PROFILE,
            EventType.UPDATE_EMAIL,
            EventType.DELETE_ACCOUNT
    );

    private final KafkaProducer<String, String> producer;
    private final String topic;
    private final KeycloakSession session;

    public KafkaEventListenerProvider(KafkaProducer<String, String> producer, String topic, KeycloakSession session) {
        this.producer = producer;
        this.topic = topic;
        this.session = session;
    }

    @Override
    public void onEvent(Event event) {
        if (!USER_EVENTS.contains(event.getType())) {
            return;
        }

        try {
            String userId = event.getUserId();
            RealmModel realm = session.realms().getRealm(event.getRealmId());
            UserModel user = session.users().getUserById(realm, userId);

            if (user == null) {
                if (event.getType() == EventType.DELETE_ACCOUNT) {
                    String json = buildDeleteJson(userId);
                    producer.send(new ProducerRecord<>(topic, userId, json));
                    LOG.info("Published DELETE_ACCOUNT event for userId=" + userId);
                }
                return;
            }

            String json = buildUserEventJson(event.getType().name(), user);
            producer.send(new ProducerRecord<>(topic, userId, json));
            LOG.info("Published " + event.getType() + " event for user=" + user.getUsername());
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "Failed to publish event to Kafka", e);
        }
    }

    @Override
    public void onEvent(AdminEvent adminEvent, boolean includeRepresentation) {
        if (adminEvent.getResourceType() != ResourceType.USER) {
            return;
        }

        OperationType op = adminEvent.getOperationType();
        if (op != OperationType.CREATE && op != OperationType.UPDATE && op != OperationType.DELETE) {
            return;
        }

        try {
            String resourcePath = adminEvent.getResourcePath();
            if (resourcePath == null || !resourcePath.startsWith("users/")) {
                return;
            }
            String userId = resourcePath.substring("users/".length());

            if (op == OperationType.DELETE) {
                String json = buildDeleteJson(userId);
                producer.send(new ProducerRecord<>(topic, userId, json));
                LOG.info("Published admin DELETE event for userId=" + userId);
                return;
            }

            RealmModel realm = session.realms().getRealm(adminEvent.getRealmId());
            UserModel user = session.users().getUserById(realm, userId);
            if (user == null) {
                return;
            }

            String eventType = op == OperationType.CREATE ? "REGISTER" : "UPDATE_PROFILE";
            String json = buildUserEventJson(eventType, user);
            producer.send(new ProducerRecord<>(topic, userId, json));
            LOG.info("Published admin " + eventType + " event for user=" + user.getUsername());
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "Failed to publish admin event to Kafka", e);
        }
    }

    private String buildUserEventJson(String eventType, UserModel user) {
        return "{" +
                "\"type\":\"" + esc(eventType) + "\"," +
                "\"userId\":\"" + esc(user.getId()) + "\"," +
                "\"username\":\"" + esc(safe(user.getUsername())) + "\"," +
                "\"email\":\"" + esc(safe(user.getEmail())) + "\"," +
                "\"firstName\":\"" + esc(safe(user.getFirstName())) + "\"," +
                "\"lastName\":\"" + esc(safe(user.getLastName())) + "\"," +
                "\"timestamp\":" + System.currentTimeMillis() +
                "}";
    }

    private String buildDeleteJson(String userId) {
        return "{\"type\":\"DELETE_ACCOUNT\",\"userId\":\"" + esc(userId) + "\",\"timestamp\":" + System.currentTimeMillis() + "}";
    }

    private String safe(String v) {
        return v != null ? v : "";
    }

    private String esc(String v) {
        if (v == null) return "";
        return v.replace("\\", "\\\\").replace("\"", "\\\"");
    }

    @Override
    public void close() {
    }
}
