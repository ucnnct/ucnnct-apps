package cc.uconnect.repository;

import cc.uconnect.model.GroupMember;
import cc.uconnect.model.GroupMemberId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface GroupMemberRepository extends JpaRepository<GroupMember, GroupMemberId> {
    List<GroupMember> findByIdGroupId(UUID groupId);
    List<GroupMember> findByIdUserId(String userId);
    boolean existsByIdGroupIdAndIdUserId(UUID groupId, String userId);
    void deleteByIdGroupIdAndIdUserId(UUID groupId, String userId);
}
