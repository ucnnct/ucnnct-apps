package cc.uconnect.publisher;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.SendResult;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

@Service
@RequiredArgsConstructor
public class KafkaJsonPublisher {

    private final KafkaTemplate<String, String> kafkaTemplate;
    private final ObjectMapper objectMapper;

    public Mono<SendResult<String, String>> publish(String topic, String key, Object payload) {
        return Mono.fromCallable(() -> objectMapper.writeValueAsString(payload))
                .subscribeOn(Schedulers.boundedElastic())
                .flatMap(serialized -> Mono.fromFuture(kafkaTemplate.send(topic, key, serialized)));
    }
}
