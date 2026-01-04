package cc.uconnect;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HelloController {
    private final String serviceName;
    private final String helloMessage;
    private final String activeProfile;

    public HelloController(
            @Value("${spring.application.name}") String serviceName,
            @Value("${hello.message:hello}") String helloMessage,
            @Value("${spring.profiles.active:default}") String activeProfile) {
        this.serviceName = serviceName;
        this.helloMessage = helloMessage;
        this.activeProfile = activeProfile;
    }

    @GetMapping("/hello")
    public String hello() {
        return "Messageevfse " + helloMessage + " " + serviceName + " from " + activeProfile;
    }
}
