# Stage 1: Build
FROM eclipse-temurin:21-jdk-alpine AS builder
WORKDIR /app
COPY gradle gradle
COPY gradlew build.gradle.kts settings.gradle.kts ./
# Dependency caching (build time optimization)
RUN ./gradlew dependencies --no-daemon

COPY src src
RUN ./gradlew bootJar -x test --no-daemon

# Stage 2: Production image
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# ffmpeg for native audio chunking
RUN apk add --no-cache ffmpeg

# Copy the compiled artifact from the previous stage
COPY --from=builder /app/build/libs/*-SNAPSHOT.jar app.jar

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]