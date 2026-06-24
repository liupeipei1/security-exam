FROM gradle:8.14-jdk17-alpine AS builder
WORKDIR /app

COPY . .

RUN gradle :exam-user-center:bootJar --no-daemon

FROM openjdk:17-jdk-slim
WORKDIR /app

RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/exam-user-center/build/libs/app.jar .

EXPOSE 8085

CMD ["java", "-jar", "app.jar"]
