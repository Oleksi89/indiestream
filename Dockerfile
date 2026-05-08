FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# ffmpeg for native audio chunking
RUN apk add --no-cache ffmpeg

COPY build/libs/indiestream-0.0.1-SNAPSHOT.jar app.jar

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]