# Build du provider event-listener (JAR)
FROM maven:3.9.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY event-listener/pom.xml .
RUN mvn -q dependency:go-offline
COPY event-listener/src ./src
RUN mvn -q -DskipTests package

# Image Keycloak avec theme + provider
FROM quay.io/keycloak/keycloak:23.0.0
COPY --from=build /app/target/keycloak-event-listener-*.jar /opt/keycloak/providers/
COPY themes/ucnnct /opt/keycloak/themes/ucnnct
