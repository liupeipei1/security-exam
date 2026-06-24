FROM gradle:8.14-jdk17-alpine AS builder
WORKDIR /app

COPY . .

RUN gradle :exam-gateway:bootJar --no-daemon

FROM openjdk:17-jdk-slim
WORKDIR /app

RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/exam-gateway/build/libs/app.jar .

EXPOSE 8080

CMD ["java", "-jar", "app.jar"]
