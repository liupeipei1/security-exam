# 多阶段构建：Gradle bootJar -> 运行单个 Spring Boot 服务
# 构建: docker build -f backend/docker/Dockerfile --build-arg MODULE=exam-gateway -t exam-gateway backend-spring
ARG MODULE=exam-gateway

FROM gradle:8.14-jdk17 AS build
WORKDIR /build
ARG MODULE=exam-gateway

# 先复制构建脚本，利用 Docker 层缓存依赖
COPY settings.gradle build.gradle gradle.properties ./
COPY exam-common/build.gradle exam-common/
COPY exam-registry/build.gradle exam-registry/
COPY exam-gateway/build.gradle exam-gateway/
COPY exam-account-auth/build.gradle exam-account-auth/
COPY exam-user-center/build.gradle exam-user-center/
COPY exam-question/build.gradle exam-question/
COPY exam-core-service/build.gradle exam-core-service/
RUN gradle :exam-common:build :${MODULE}:bootJar -x test --no-daemon || true

COPY . .
ARG MODULE=exam-gateway
RUN gradle :${MODULE}:bootJar -x test --no-daemon

FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
ARG MODULE=exam-gateway
COPY --from=build /build/${MODULE}/build/libs/app.jar app.jar
ENV JAVA_OPTS="-Xms256m -Xmx512m"
EXPOSE 8080
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
