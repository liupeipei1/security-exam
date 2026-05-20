package com.exam.question.client;

import com.exam.common.dto.VipStatusDto;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

@FeignClient(name = "exam-user-service")
public interface UserVipClient {

    @GetMapping("/api/user/internal/vip")
    VipStatusDto checkVip(@RequestParam("openid") String openid);
}
