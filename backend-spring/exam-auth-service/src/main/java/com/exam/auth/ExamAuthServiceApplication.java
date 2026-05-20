package com.exam.auth;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;

@SpringBootApplication
@EnableDiscoveryClient
public class ExamAuthServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(ExamAuthServiceApplication.class, args);
    }
}
