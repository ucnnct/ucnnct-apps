package cc.uconnect.config;

import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoDatabase;
import com.mongodb.client.model.IndexOptions;
import com.mongodb.client.model.Indexes;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.bson.Document;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.mongodb.core.MongoTemplate;

@Configuration
@RequiredArgsConstructor
@Slf4j
public class MongoIndexConfig {

    private final MongoTemplate mongoTemplate;

    @Bean
    public CommandLineRunner createMongoIndexes() {
        return args -> {
            log.info("Creating MongoDB indexes...");
            MongoDatabase db = mongoTemplate.getDb();

            MongoCollection<Document> messages = db.getCollection("messages");
            messages.createIndex(Indexes.compoundIndex(
                    Indexes.ascending("conversationId"),
                    Indexes.descending("createdAt")
            ));
            messages.createIndex(Indexes.ascending("senderId"));
            messages.createIndex(Indexes.ascending("targetId"));
            messages.createIndex(Indexes.descending("createdAt"));

            MongoCollection<Document> conversations = db.getCollection("conversations");
            conversations.createIndex(Indexes.ascending("participants"));
            conversations.createIndex(
                    new Document("lastMessage.createdAt", -1),
                    new IndexOptions()
            );

            log.info("MongoDB indexes created successfully (6 indexes on messages + conversations)");
        };
    }
}
