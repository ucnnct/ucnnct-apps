package cc.uconnect.repository;

import cc.uconnect.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, String> {
    Optional<User> findByEmail(String email);
    Optional<User> findByUsername(String username);

    @Query("SELECT u FROM User u WHERE LOWER(u.firstName) LIKE LOWER(CONCAT('%',:q,'%')) " +
           "OR LOWER(u.lastName) LIKE LOWER(CONCAT('%',:q,'%')) " +
           "OR LOWER(u.username) LIKE LOWER(CONCAT('%',:q,'%'))")
    List<User> search(String q);
}
