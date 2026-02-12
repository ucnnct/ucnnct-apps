package cc.uconnect.keycloak;

import org.apache.kafka.clients.producer.KafkaProducer;
import org.apache.kafka.clients.producer.ProducerConfig;
import org.apache.kafka.common.serialization.StringSerializer;
import org.keycloak.Config;
import org.keycloak.events.EventListenerProvider;
import org.keycloak.events.EventListenerProviderFactory;
import org.keycloak.models.KeycloakSession;
import org.keycloak.models.KeycloakSessionFactory;

import java.util.Properties;
import java.util.logging.Level;
import java.util.logging.Logger;

public class KafkaEventListenerProviderFactory implements EventListenerProviderFactory {

    private static final Logger LOG = Logger.getLogger(KafkaEventListenerProviderFactory.class.getName());
    private static final String PROVIDER_ID = "uconnect-kafka";

    private KafkaProducer<String, String> producer;
    private String topic;

    @Override
    public EventListenerProvider create(KeycloakSession session) {
        return new KafkaEventListenerProvider(producer, topic, session);
    }

    @Override
    public void init(Config.Scope config) {
        String bootstrapServers = config.get("bootstrapServers");
        if (bootstrapServers == null || bootstrapServers.isBlank()) {
            bootstrapServers = System.getenv("KAFKA_BOOTSTRAP_SERVERS");
            if (bootstrapServers == null || bootstrapServers.isBlank()) {
                bootstrapServers = "kafka:9092";
            }
        }

        LOG.info("Initializing Kafka Event Listener with bootstrapServers: " + bootstrapServers);

        topic = config.get("topic");
        if (topic == null || topic.isBlank()) {
            topic = System.getenv("KAFKA_TOPIC_USER_EVENTS");
            if (topic == null || topic.isBlank()) {
                topic = "keycloak-user-events";
            }
        }

        LOG.info("Initializing Kafka Event Listener with topic: " + topic);

        Properties props = new Properties();
        props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class.getName());
        props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, StringSerializer.class.getName());
        props.put(ProducerConfig.ACKS_CONFIG, "1");
        props.put(ProducerConfig.RETRIES_CONFIG, 3);
        props.put(ProducerConfig.MAX_BLOCK_MS_CONFIG, 5000);

        try {
            producer = new KafkaProducer<>(props);
            LOG.info("Kafka producer initialized successfully");
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "Failed to initialize Kafka producer with bootstrapServers: " + bootstrapServers, e);
            throw new RuntimeException("Cannot start Kafka producer", e);
        }
    }

    @Override
    public void postInit(KeycloakSessionFactory factory) {
    }

    @Override
    public void close() {
        if (producer != null) {
            producer.close();
            LOG.info("Kafka producer closed");
        }
    }

    @Override
    public String getId() {
        return PROVIDER_ID;
    }
}
