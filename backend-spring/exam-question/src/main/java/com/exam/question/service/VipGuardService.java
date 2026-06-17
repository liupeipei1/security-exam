package com.exam.question.service;

import com.exam.common.dto.VipStatusDto;
import com.exam.question.client.UserVipClient;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class VipGuardService {

    private final UserVipClient userVipClient;

    public VipGuardService(UserVipClient userVipClient) {
        this.userVipClient = userVipClient;
    }

    public void requireVip(String openid) {
        if (openid == null || openid.isBlank()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "请先登录");
        }
        VipStatusDto status = userVipClient.checkVip(openid);
        if (!status.isIs_vip()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, status.getMessage());
        }
    }
}
