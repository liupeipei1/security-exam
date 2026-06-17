package com.exam.core;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.cloud.openfeign.EnableFeignClients;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
@SpringBootApplication
@EnableFeignClients
@EntityScan(basePackages = {"com.exam.common.entity","com.exam.core.entity"})
@EnableJpaRepositories(basePackages = {"com.exam.common.repository","com.exam.core.repository"})
public class CoreServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(CoreServiceApplication.class, args);
    }
}