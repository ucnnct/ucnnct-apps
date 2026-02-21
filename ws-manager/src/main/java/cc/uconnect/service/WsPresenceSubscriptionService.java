package cc.uconnect.service;

import cc.uconnect.enums.WsOutboundActionType;
import cc.uconnect.model.PresenceUpdate;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.ReactiveStringRedisTemplate;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.Instant;
import java.util.Collection;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Service
@Log4j2
@RequiredArgsConstructor
public class WsPresenceSubscriptionService {

    private final ReactiveStringRedisTemplate redisTemplate;
    private final WsUserPacketRoutingService userPacketRoutingService;

    @Value("${app.presence.key-prefix:ws:presence:user:}")
    private String presenceKeyPrefix;

    @Value("${app.presence.subscriptions.target-key-prefix:ws:presence:subs:target:}")
    private String targetSubscriptionKeyPrefix;

    @Value("${app.presence.subscriptions.owner-key-prefix:ws:presence:subs:owner:}")
    private String ownerSubscriptionKeyPrefix;

    public Mono<List<PresenceUpdate>> replaceSubscriptions(String ownerUserId, Collection<String> targetUserIds) {
        Set<String> nextTargets = normalizeTargets(ownerUserId, targetUserIds);
        String ownerKey = ownerSubscriptionKey(ownerUserId);

        return redisTemplate.opsForSet()
                .members(ownerKey)
                .collectList()
                .map(this::normalizeRawMembers)
                .flatMap(existingTargets -> {
                    Set<String> toRemove = new HashSet<>(existingTargets);
                    toRemove.removeAll(nextTargets);

                    Set<String> toAdd = new HashSet<>(nextTargets);
                    toAdd.removeAll(existingTargets);

                    Mono<Void> removeLinks = Flux.fromIterable(toRemove)
                            .concatMap(targetUserId -> redisTemplate.opsForSet()
                                    .remove(targetSubscriptionKey(targetUserId), ownerUserId)
                                    .then())
                            .then();

                    Mono<Void> addLinks = Flux.fromIterable(toAdd)
                            .concatMap(targetUserId -> redisTemplate.opsForSet()
                                    .add(targetSubscriptionKey(targetUserId), ownerUserId)
                                    .then())
                            .then();

                    Mono<Void> resetOwnerSet = redisTemplate.delete(ownerKey)
                            .then(Mono.defer(() -> {
                                if (nextTargets.isEmpty()) {
                                    return Mono.empty();
                                }
                                return redisTemplate.opsForSet()
                                        .add(ownerKey, nextTargets.toArray(String[]::new))
                                        .then();
                            }));

                    return Mono.when(removeLinks, addLinks, resetOwnerSet)
                            .thenReturn(List.copyOf(nextTargets));
                })
                .flatMapMany(Flux::fromIterable)
                .concatMap(this::resolvePresenceSnapshot)
                .collectList();
    }

    public Mono<Void> clearSubscriptions(String ownerUserId) {
        if (ownerUserId == null || ownerUserId.isBlank()) {
            return Mono.empty();
        }

        String ownerKey = ownerSubscriptionKey(ownerUserId);
        return redisTemplate.opsForSet()
                .members(ownerKey)
                .collectList()
                .map(this::normalizeRawMembers)
                .flatMap(existingTargets -> {
                    Mono<Void> removeLinks = Flux.fromIterable(existingTargets)
                            .concatMap(targetUserId -> redisTemplate.opsForSet()
                                    .remove(targetSubscriptionKey(targetUserId), ownerUserId)
                                    .then())
                            .then();
                    return Mono.when(removeLinks, redisTemplate.delete(ownerKey).then());
                });
    }

    public Mono<Void> notifySubscribers(String targetUserId, boolean online) {
        if (targetUserId == null || targetUserId.isBlank()) {
            return Mono.empty();
        }

        PresenceUpdate update = PresenceUpdate.builder()
                .userId(targetUserId)
                .online(online)
                .updatedAt(Instant.now().toEpochMilli())
                .build();

        return redisTemplate.opsForSet()
                .members(targetSubscriptionKey(targetUserId))
                .map(String::trim)
                .filter(subscriberUserId -> !subscriberUserId.isBlank())
                .filter(subscriberUserId -> !subscriberUserId.equals(targetUserId))
                .distinct()
                .concatMap(subscriberUserId -> userPacketRoutingService.routeToUser(
                        subscriberUserId,
                        WsOutboundActionType.PRESENCE_UPDATE,
                        update))
                .then();
    }

    private Mono<PresenceUpdate> resolvePresenceSnapshot(String targetUserId) {
        if (targetUserId == null || targetUserId.isBlank()) {
            return Mono.empty();
        }

        return redisTemplate.opsForValue()
                .get(presenceKeyPrefix + targetUserId)
                .defaultIfEmpty("")
                .map(instanceId -> PresenceUpdate.builder()
                        .userId(targetUserId)
                        .online(instanceId != null && !instanceId.isBlank())
                        .updatedAt(Instant.now().toEpochMilli())
                        .build());
    }

    private Set<String> normalizeTargets(String ownerUserId, Collection<String> targetUserIds) {
        if (targetUserIds == null || targetUserIds.isEmpty()) {
            return Set.of();
        }

        Set<String> normalized = new LinkedHashSet<>();
        for (String rawUserId : targetUserIds) {
            if (rawUserId == null) {
                continue;
            }
            String targetUserId = rawUserId.trim();
            if (targetUserId.isBlank()) {
                continue;
            }
            if (ownerUserId != null && ownerUserId.equals(targetUserId)) {
                continue;
            }
            normalized.add(targetUserId);
        }
        return normalized;
    }

    private Set<String> normalizeRawMembers(List<String> rawMembers) {
        Set<String> normalized = new LinkedHashSet<>();
        if (rawMembers == null || rawMembers.isEmpty()) {
            return normalized;
        }
        for (String rawMember : rawMembers) {
            if (rawMember == null) {
                continue;
            }
            String value = rawMember.trim();
            if (!value.isBlank()) {
                normalized.add(value);
            }
        }
        return normalized;
    }

    private String targetSubscriptionKey(String targetUserId) {
        return targetSubscriptionKeyPrefix + targetUserId;
    }

    private String ownerSubscriptionKey(String ownerUserId) {
        return ownerSubscriptionKeyPrefix + ownerUserId;
    }
}
