package com.exam.usercenter;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

/**
 * 用户中心服务（合并收藏和笔记）
 */
@SpringBootApplication
@EnableDiscoveryClient
@EntityScan(basePackages = {"com.exam.common.entity", "com.exam.usercenter.entity"})
@ComponentScan(basePackages = {"com.exam.common.security", "com.exam.usercenter"})
@EnableJpaRepositories(basePackages = {"com.exam.common.repository", "com.exam.usercenter.repository"})
public class ExamUserCenterApplication {

    public static void main(String[] args) {
        SpringApplication.run(ExamUserCenterApplication.class, args);
    }
}