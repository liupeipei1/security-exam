package com.exam.account;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;

/**
 * 账户服务（合并认证和用户管理）
 */
@SpringBootApplication
@EnableDiscoveryClient
public class AccountAuthApplication {

    public static void main(String[] args) {
        SpringApplication.run(AccountAuthApplication.class, args);
    }
}