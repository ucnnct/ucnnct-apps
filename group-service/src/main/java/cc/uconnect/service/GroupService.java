package cc.uconnect.service;

import cc.uconnect.dto.*;
import cc.uconnect.kafka.event.GroupEvent;
import cc.uconnect.kafka.event.GroupEventType;
import cc.uconnect.kafka.producer.GroupKafkaProducer;
import cc.uconnect.model.Group;
import cc.uconnect.model.GroupMember;
import cc.uconnect.model.GroupMemberId;
import cc.uconnect.model.GroupType;
import cc.uconnect.model.MemberRole;
import cc.uconnect.repository.GroupMemberRepository;
import cc.uconnect.repository.GroupRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class GroupService {

    private final GroupRepository groupRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final GroupDirectoryCacheService groupDirectoryCacheService;
    private final GroupKafkaProducer groupKafkaProducer;

    @Transactional
    public GroupResponse createGroup(CreateGroupRequest req, String ownerId) {
        Group group = new Group();
        group.setName(req.getName());
        group.setDescription(req.getDescription());
        group.setOwnerId(ownerId);
        group.setType(req.getType() != null ? req.getType() : GroupType.PRIVATE);
        group.setMemberCount(1);
        group = groupRepository.save(group);

        GroupMember owner = new GroupMember();
        owner.setId(new GroupMemberId(group.getId(), ownerId));
        owner.setRole(MemberRole.OWNER);
        groupMemberRepository.save(owner);
        groupDirectoryCacheService.cacheGroup(group.getId(), group.getName());

        log.info("Group created groupId={} name='{}' type={} ownerId={}", group.getId(), group.getName(), group.getType(), ownerId);
        return toResponse(group);
    }

    public GroupResponse getGroup(UUID id) {
        log.debug("Get group groupId={}", id);
        Group group = findGroupOrThrow(id);
        return toResponse(ensureMemberCountConsistency(group));
    }

    @Transactional
    public GroupResponse updateGroup(UUID id, UpdateGroupRequest req, String currentUserId) {
        Group group = findGroupOrThrow(id);
        assertOwnerOrAdmin(group, currentUserId);

        if (req.getName() != null) group.setName(req.getName());
        if (req.getDescription() != null) group.setDescription(req.getDescription());
        if (req.getType() != null) group.setType(req.getType());

        Group saved = groupRepository.save(group);
        groupDirectoryCacheService.cacheGroup(saved.getId(), saved.getName());
        GroupResponse response = toResponse(saved);
        log.info("Group updated groupId={} by userId={}", id, currentUserId);
        return response;
    }

    @Transactional
    public void deleteGroup(UUID id, String currentUserId) {
        Group group = findGroupOrThrow(id);
        assertOwner(group, currentUserId);
        List<GroupMember> members = groupMemberRepository.findByIdGroupId(id);
        List<String> memberUserIds = members.stream()
                .map(member -> member.getId().getUserId())
                .filter(userId -> userId != null && !userId.isBlank())
                .distinct()
                .toList();
        groupMemberRepository.deleteAll(members);
        groupRepository.delete(group);
        groupDirectoryCacheService.evictGroup(id);
        publishGroupDeletedEvents(group, currentUserId, memberUserIds);
        log.info("Group deleted groupId={} by ownerId={}", id, currentUserId);
    }

    public List<GroupResponse> getMyGroups(String userId) {
        log.debug("Get groups for userId={}", userId);
        return groupMemberRepository.findByIdUserId(userId).stream()
                .map(m -> groupRepository.findById(m.getId().getGroupId()).orElse(null))
                .filter(g -> g != null)
                .map(this::ensureMemberCountConsistency)
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public List<MemberResponse> getMembers(UUID id, String currentUserId) {
        assertMember(id, currentUserId);
        log.debug("Get members groupId={} requestedBy={}", id, currentUserId);
        return groupMemberRepository.findByIdGroupId(id).stream()
                .map(this::toMemberResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public MemberResponse addMember(UUID id, AddMemberRequest req, String currentUserId) {
        Group group = findGroupOrThrow(id);
        assertOwnerOrAdmin(group, currentUserId);

        if (groupMemberRepository.existsByIdGroupIdAndIdUserId(id, req.getUserId())) {
            log.warn("Add member rejected â€” already a member groupId={} userId={}", id, req.getUserId());
            throw new ResponseStatusException(HttpStatus.CONFLICT, "User already a member");
        }

        GroupMember member = new GroupMember();
        member.setId(new GroupMemberId(id, req.getUserId()));
        member.setRole(req.getRole() != null ? req.getRole() : MemberRole.MEMBER);
        groupMemberRepository.save(member);

        Group updatedGroup = ensureMemberCountConsistency(group);
        publishGroupMemberAddedEvent(updatedGroup, currentUserId, req.getUserId());

        log.info("Member added groupId={} userId={} role={} by={}", id, req.getUserId(), member.getRole(), currentUserId);
        return toMemberResponse(member);
    }

    @Transactional
    public void removeMember(UUID id, String userId, String currentUserId) {
        Group group = findGroupOrThrow(id);
        assertOwner(group, currentUserId);

        if (!groupMemberRepository.existsByIdGroupIdAndIdUserId(id, userId)) {
            log.warn("Remove member rejected â€” not a member groupId={} userId={}", id, userId);
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Member not found");
        }

        groupMemberRepository.deleteByIdGroupIdAndIdUserId(id, userId);
        ensureMemberCountConsistency(group);
        log.info("Member removed groupId={} userId={} by={}", id, userId, currentUserId);
    }

    @Transactional
    public MemberResponse changeRole(UUID id, String userId, MemberRole newRole, String currentUserId) {
        Group group = findGroupOrThrow(id);
        assertOwner(group, currentUserId);

        GroupMemberId memberId = new GroupMemberId(id, userId);
        GroupMember member = groupMemberRepository.findById(memberId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Member not found"));

        MemberRole previousRole = member.getRole();
        member.setRole(newRole);
        MemberResponse response = toMemberResponse(groupMemberRepository.save(member));
        log.info("Role changed groupId={} userId={} {} -> {} by={}", id, userId, previousRole, newRole, currentUserId);
        return response;
    }

    @Transactional
    public GroupResponse joinGroup(UUID id, String currentUserId) {
        Group group = findGroupOrThrow(id);

        if (group.getType() != GroupType.PUBLIC) {
            log.warn("Join rejected â€” group is not public groupId={} userId={}", id, currentUserId);
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Group is not public");
        }

        if (groupMemberRepository.existsByIdGroupIdAndIdUserId(id, currentUserId)) {
            log.warn("Join rejected â€” already a member groupId={} userId={}", id, currentUserId);
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Already a member");
        }

        GroupMember member = new GroupMember();
        member.setId(new GroupMemberId(id, currentUserId));
        member.setRole(MemberRole.MEMBER);
        groupMemberRepository.save(member);

        GroupResponse response = toResponse(ensureMemberCountConsistency(group));
        log.info("User joined groupId={} userId={}", id, currentUserId);
        return response;
    }

    @Transactional
    public void leaveGroup(UUID id, String currentUserId) {
        Group group = findGroupOrThrow(id);

        if (group.getOwnerId().equals(currentUserId)) {
            log.warn("Leave rejected â€” owner cannot leave groupId={} userId={}", id, currentUserId);
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Owner cannot leave; delete the group instead");
        }

        if (!groupMemberRepository.existsByIdGroupIdAndIdUserId(id, currentUserId)) {
            log.warn("Leave rejected â€” not a member groupId={} userId={}", id, currentUserId);
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Not a member of this group");
        }

        groupMemberRepository.deleteByIdGroupIdAndIdUserId(id, currentUserId);
        ensureMemberCountConsistency(group);
        log.info("User left groupId={} userId={}", id, currentUserId);
    }

    private Group ensureMemberCountConsistency(Group group) {
        if (group == null || group.getId() == null) {
            return group;
        }

        int realCount = Math.toIntExact(groupMemberRepository.countByIdGroupId(group.getId()));
        if (group.getMemberCount() == realCount) {
            return group;
        }

        int previousCount = group.getMemberCount();
        group.setMemberCount(realCount);
        Group saved = groupRepository.save(group);
        log.debug("Group memberCount corrected groupId={} previous={} next={}",
                saved.getId(),
                previousCount,
                realCount);
        return saved;
    }

    private void publishGroupMemberAddedEvent(Group group, String actorUserId, String addedUserId) {
        if (group == null || group.getId() == null) {
            return;
        }
        if (addedUserId == null || addedUserId.isBlank()) {
            return;
        }
        if (addedUserId.equals(actorUserId)) {
            return;
        }

        GroupEvent event = buildGroupEvent(
                GroupEventType.MEMBER_ADDED,
                group,
                actorUserId,
                addedUserId,
                addedUserId);
        groupKafkaProducer.publishGroupEvent(event);
    }

    private void publishGroupDeletedEvents(Group group, String actorUserId, List<String> memberUserIds) {
        if (group == null || group.getId() == null || memberUserIds == null || memberUserIds.isEmpty()) {
            return;
        }

        for (String recipientUserId : memberUserIds) {
            if (recipientUserId == null || recipientUserId.isBlank()) {
                continue;
            }
            if (recipientUserId.equals(actorUserId)) {
                continue;
            }

            GroupEvent event = buildGroupEvent(
                    GroupEventType.GROUP_DELETED,
                    group,
                    actorUserId,
                    recipientUserId,
                    recipientUserId);
            groupKafkaProducer.publishGroupEvent(event);
        }
    }

    private GroupEvent buildGroupEvent(GroupEventType eventType,
                                       Group group,
                                       String actorUserId,
                                       String recipientUserId,
                                       String affectedUserId) {
        return GroupEvent.builder()
                .eventId(UUID.randomUUID().toString())
                .eventType(eventType)
                .groupId(group.getId().toString())
                .groupName(group.getName())
                .groupOwnerId(group.getOwnerId())
                .actorUserId(actorUserId)
                .recipientUserId(recipientUserId)
                .affectedUserId(affectedUserId)
                .memberCount(group.getMemberCount())
                .createdAt(Instant.now().toEpochMilli())
                .build();
    }

    private Group findGroupOrThrow(UUID id) {
        return groupRepository.findById(id)
                .orElseThrow(() -> {
                    log.warn("Group not found groupId={}", id);
                    return new ResponseStatusException(HttpStatus.NOT_FOUND, "Group not found");
                });
    }

    private void assertOwner(Group group, String userId) {
        if (!group.getOwnerId().equals(userId)) {
            log.warn("Permission denied â€” owner required groupId={} userId={}", group.getId(), userId);
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only the owner can perform this action");
        }
    }

    private void assertOwnerOrAdmin(Group group, String userId) {
        boolean isOwner = group.getOwnerId().equals(userId);
        boolean isAdmin = groupMemberRepository.findById(new GroupMemberId(group.getId(), userId))
                .map(m -> m.getRole() == MemberRole.ADMIN || m.getRole() == MemberRole.OWNER)
                .orElse(false);
        if (!isOwner && !isAdmin) {
            log.warn("Permission denied â€” owner/admin required groupId={} userId={}", group.getId(), userId);
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Insufficient permissions");
        }
    }

    private void assertMember(UUID groupId, String userId) {
        if (!groupMemberRepository.existsByIdGroupIdAndIdUserId(groupId, userId)) {
            log.warn("Permission denied â€” membership required groupId={} userId={}", groupId, userId);
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not a member of this group");
        }
    }

    private GroupResponse toResponse(Group g) {
        GroupResponse r = new GroupResponse();
        r.setId(g.getId());
        r.setName(g.getName());
        r.setDescription(g.getDescription());
        r.setOwnerId(g.getOwnerId());
        r.setType(g.getType());
        r.setMemberCount(g.getMemberCount());
        r.setCreatedAt(g.getCreatedAt());
        r.setUpdatedAt(g.getUpdatedAt());
        return r;
    }

    private MemberResponse toMemberResponse(GroupMember m) {
        MemberResponse r = new MemberResponse();
        r.setGroupId(m.getId().getGroupId());
        r.setUserId(m.getId().getUserId());
        r.setRole(m.getRole());
        r.setJoinedAt(m.getJoinedAt());
        return r;
    }
}
