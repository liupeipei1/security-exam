package com.exam.account.user.controller;

import com.exam.account.user.service.VipService;
import com.exam.common.api.ApiResult;
import com.exam.common.dto.VipStatusDto;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/user")
public class UserController {

    @Autowired
    private VipService vipService;

    public UserController(VipService vipService) {
        this.vipService = vipService;
    }

    @GetMapping("/vip-status")
    public ResponseEntity<?> vipStatus(@RequestParam(required = false) String openid) {
        if (openid == null || openid.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "缺少openid参数"));
        }
        VipStatusDto status = vipService.checkVip(openid);
        if ("用户不存在".equals(status.getMessage())) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", status.getMessage()));
        }
        return ResponseEntity.ok(ApiResult.ok(Map.of(
                "is_vip", status.isIs_vip(),
                "vip_expire", status.getVip_expire()
        )));
    }

    /** question-service 内部调用 */
    @GetMapping("/internal/vip")
    public VipStatusDto internalVip(@RequestParam String openid) {
        return vipService.checkVip(openid);
    }

    /**
     * 购买会员：生产环境请使用 POST /api/user/pay/create 调起微信支付   * 本接口保留用于开发直连开通�?     */
    @PostMapping("/buy-vip")
    public ResponseEntity<?> buyVip(@RequestBody Map<String, String> body) {
        String openid = body.get("openid");
        String packageType = body.get("package_type");
        if (openid == null || packageType == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "缺少参数"));
        }
        try {
            return ResponseEntity.ok(ApiResult.ok(vipService.buyVip(openid, packageType)));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/update")
    public ApiResult<String> update(@RequestBody Map<String, String> body) {
        String openid = body.get("openid");
        if (openid == null) {
            throw new IllegalArgumentException("缺少openid参数");
        }
        vipService.updateProfile(openid, body.get("nickname"), body.get("avatar"));
        return ApiResult.okMessage("更新成功");
    }
}
