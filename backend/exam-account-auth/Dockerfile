FROM gradle:8.14-jdk17-alpine AS builder
WORKDIR /app

COPY . .

RUN gradle :exam-account-auth:bootJar --no-daemon

FROM openjdk:17-jdk-slim
WORKDIR /app

RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/exam-account-auth/build/libs/app.jar .

EXPOSE 8081

CMD ["java", "-jar", "app.jar"]
