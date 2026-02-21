package cc.uconnect.config;

import cc.uconnect.repository.UserRepository;
import cc.uconnect.service.UserDirectoryCacheService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class UserDirectoryCacheWarmup implements ApplicationRunner {

    private final UserRepository userRepository;
    private final UserDirectoryCacheService userDirectoryCacheService;

    @Override
    public void run(ApplicationArguments args) {
        try {
            userRepository.findAll().forEach(userDirectoryCacheService::syncUser);
            log.info("Directory user cache warmup completed");
        } catch (Exception ex) {
            log.warn("Directory user cache warmup failed", ex);
        }
    }
}
