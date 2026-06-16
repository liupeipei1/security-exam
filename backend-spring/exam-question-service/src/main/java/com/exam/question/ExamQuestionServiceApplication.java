package com.exam.question;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.data.redis.RedisRepositoriesAutoConfiguration;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;
import org.springframework.cloud.openfeign.EnableFeignClients;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@SpringBootApplication(exclude = {RedisRepositoriesAutoConfiguration.class})
@EnableDiscoveryClient
@EnableFeignClients
@EntityScan(basePackages = {"com.exam.common.entity", "com.exam.question.entity"})
@EnableJpaRepositories(basePackages = {"com.exam.question.repository"})
public class ExamQuestionServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(ExamQuestionServiceApplication.class, args);
    }
}
