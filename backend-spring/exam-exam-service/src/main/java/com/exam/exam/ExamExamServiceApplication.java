package com.exam.exam;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.openfeign.EnableFeignClients;

@SpringBootApplication
@EnableFeignClients
public class ExamExamServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(ExamExamServiceApplication.class, args);
    }
}