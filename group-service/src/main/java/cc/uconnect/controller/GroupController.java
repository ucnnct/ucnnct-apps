package cc.uconnect.controller;

import cc.uconnect.dto.*;
import cc.uconnect.service.GroupService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import cc.uconnect.model.MemberRole;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/groups")
@RequiredArgsConstructor
public class GroupController {

    private final GroupService groupService;

    @PostMapping
    public ResponseEntity<GroupResponse> createGroup(
            @RequestBody CreateGroupRequest req,
            @AuthenticationPrincipal Jwt jwt) {
        String userId = jwt.getSubject();
        return ResponseEntity.status(HttpStatus.CREATED).body(groupService.createGroup(req, userId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<GroupResponse> getGroup(@PathVariable UUID id) {
        return ResponseEntity.ok(groupService.getGroup(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<GroupResponse> updateGroup(
            @PathVariable UUID id,
            @RequestBody UpdateGroupRequest req,
            @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(groupService.updateGroup(id, req, jwt.getSubject()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteGroup(
            @PathVariable UUID id,
            @AuthenticationPrincipal Jwt jwt) {
        groupService.deleteGroup(id, jwt.getSubject());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/me")
    public ResponseEntity<List<GroupResponse>> getMyGroups(@AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(groupService.getMyGroups(jwt.getSubject()));
    }

    @GetMapping("/{id}/members")
    public ResponseEntity<List<MemberResponse>> getMembers(
            @PathVariable UUID id,
            @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(groupService.getMembers(id, jwt.getSubject()));
    }

    @PostMapping("/{id}/members")
    public ResponseEntity<MemberResponse> addMember(
            @PathVariable UUID id,
            @RequestBody AddMemberRequest req,
            @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.status(HttpStatus.CREATED).body(groupService.addMember(id, req, jwt.getSubject()));
    }

    @DeleteMapping("/{id}/members/{userId}")
    public ResponseEntity<Void> removeMember(
            @PathVariable UUID id,
            @PathVariable String userId,
            @AuthenticationPrincipal Jwt jwt) {
        groupService.removeMember(id, userId, jwt.getSubject());
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/members/{userId}/role")
    public ResponseEntity<MemberResponse> changeRole(
            @PathVariable UUID id,
            @PathVariable String userId,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal Jwt jwt) {
        MemberRole newRole = MemberRole.valueOf(body.get("role"));
        return ResponseEntity.ok(groupService.changeRole(id, userId, newRole, jwt.getSubject()));
    }

    @PostMapping("/{id}/join")
    public ResponseEntity<GroupResponse> joinGroup(
            @PathVariable UUID id,
            @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(groupService.joinGroup(id, jwt.getSubject()));
    }

    @DeleteMapping("/{id}/leave")
    public ResponseEntity<Void> leaveGroup(
            @PathVariable UUID id,
            @AuthenticationPrincipal Jwt jwt) {
        groupService.leaveGroup(id, jwt.getSubject());
        return ResponseEntity.noContent().build();
    }
}
