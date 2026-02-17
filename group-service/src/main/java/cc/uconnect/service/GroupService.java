package cc.uconnect.service;

import cc.uconnect.dto.*;
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

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class GroupService {

    private final GroupRepository groupRepository;
    private final GroupMemberRepository groupMemberRepository;

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

        log.info("Group created groupId={} name='{}' type={} ownerId={}", group.getId(), group.getName(), group.getType(), ownerId);
        return toResponse(group);
    }

    public GroupResponse getGroup(UUID id) {
        log.debug("Get group groupId={}", id);
        return toResponse(findGroupOrThrow(id));
    }

    @Transactional
    public GroupResponse updateGroup(UUID id, UpdateGroupRequest req, String currentUserId) {
        Group group = findGroupOrThrow(id);
        assertOwnerOrAdmin(group, currentUserId);

        if (req.getName() != null) group.setName(req.getName());
        if (req.getDescription() != null) group.setDescription(req.getDescription());
        if (req.getType() != null) group.setType(req.getType());

        GroupResponse response = toResponse(groupRepository.save(group));
        log.info("Group updated groupId={} by userId={}", id, currentUserId);
        return response;
    }

    @Transactional
    public void deleteGroup(UUID id, String currentUserId) {
        Group group = findGroupOrThrow(id);
        assertOwner(group, currentUserId);
        groupMemberRepository.deleteAll(groupMemberRepository.findByIdGroupId(id));
        groupRepository.delete(group);
        log.info("Group deleted groupId={} by ownerId={}", id, currentUserId);
    }

    public List<GroupResponse> getMyGroups(String userId) {
        log.debug("Get groups for userId={}", userId);
        return groupMemberRepository.findByIdUserId(userId).stream()
                .map(m -> groupRepository.findById(m.getId().getGroupId()).orElse(null))
                .filter(g -> g != null)
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
            log.warn("Add member rejected — already a member groupId={} userId={}", id, req.getUserId());
            throw new ResponseStatusException(HttpStatus.CONFLICT, "User already a member");
        }

        GroupMember member = new GroupMember();
        member.setId(new GroupMemberId(id, req.getUserId()));
        member.setRole(req.getRole() != null ? req.getRole() : MemberRole.MEMBER);
        groupMemberRepository.save(member);

        group.setMemberCount(group.getMemberCount() + 1);
        groupRepository.save(group);

        log.info("Member added groupId={} userId={} role={} by={}", id, req.getUserId(), member.getRole(), currentUserId);
        return toMemberResponse(member);
    }

    @Transactional
    public void removeMember(UUID id, String userId, String currentUserId) {
        Group group = findGroupOrThrow(id);
        assertOwnerOrAdmin(group, currentUserId);

        if (!groupMemberRepository.existsByIdGroupIdAndIdUserId(id, userId)) {
            log.warn("Remove member rejected — not a member groupId={} userId={}", id, userId);
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Member not found");
        }

        groupMemberRepository.deleteByIdGroupIdAndIdUserId(id, userId);
        group.setMemberCount(Math.max(0, group.getMemberCount() - 1));
        groupRepository.save(group);
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
            log.warn("Join rejected — group is not public groupId={} userId={}", id, currentUserId);
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Group is not public");
        }

        if (groupMemberRepository.existsByIdGroupIdAndIdUserId(id, currentUserId)) {
            log.warn("Join rejected — already a member groupId={} userId={}", id, currentUserId);
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Already a member");
        }

        GroupMember member = new GroupMember();
        member.setId(new GroupMemberId(id, currentUserId));
        member.setRole(MemberRole.MEMBER);
        groupMemberRepository.save(member);

        group.setMemberCount(group.getMemberCount() + 1);
        GroupResponse response = toResponse(groupRepository.save(group));
        log.info("User joined groupId={} userId={}", id, currentUserId);
        return response;
    }

    @Transactional
    public void leaveGroup(UUID id, String currentUserId) {
        Group group = findGroupOrThrow(id);

        if (group.getOwnerId().equals(currentUserId)) {
            log.warn("Leave rejected — owner cannot leave groupId={} userId={}", id, currentUserId);
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Owner cannot leave; delete the group instead");
        }

        if (!groupMemberRepository.existsByIdGroupIdAndIdUserId(id, currentUserId)) {
            log.warn("Leave rejected — not a member groupId={} userId={}", id, currentUserId);
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Not a member of this group");
        }

        groupMemberRepository.deleteByIdGroupIdAndIdUserId(id, currentUserId);
        group.setMemberCount(Math.max(0, group.getMemberCount() - 1));
        groupRepository.save(group);
        log.info("User left groupId={} userId={}", id, currentUserId);
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
            log.warn("Permission denied — owner required groupId={} userId={}", group.getId(), userId);
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only the owner can perform this action");
        }
    }

    private void assertOwnerOrAdmin(Group group, String userId) {
        boolean isOwner = group.getOwnerId().equals(userId);
        boolean isAdmin = groupMemberRepository.findById(new GroupMemberId(group.getId(), userId))
                .map(m -> m.getRole() == MemberRole.ADMIN || m.getRole() == MemberRole.OWNER)
                .orElse(false);
        if (!isOwner && !isAdmin) {
            log.warn("Permission denied — owner/admin required groupId={} userId={}", group.getId(), userId);
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Insufficient permissions");
        }
    }

    private void assertMember(UUID groupId, String userId) {
        if (!groupMemberRepository.existsByIdGroupIdAndIdUserId(groupId, userId)) {
            log.warn("Permission denied — membership required groupId={} userId={}", groupId, userId);
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
