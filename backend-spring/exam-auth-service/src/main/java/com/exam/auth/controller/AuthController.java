package com.exam.auth.controller;

import com.exam.auth.service.QrLoginService;
import com.exam.auth.service.WeChatAuthService;
import com.exam.common.api.ApiResult;
import com.exam.common.dto.LoginRequest;
import com.exam.common.dto.UserInfoDto;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final WeChatAuthService weChatAuthService;
    private final QrLoginService qrLoginService;

    public AuthController(WeChatAuthService weChatAuthService, QrLoginService qrLoginService) {
        this.weChatAuthService = weChatAuthService;
        this.qrLoginService = qrLoginService;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        try {
            UserInfoDto user = weChatAuthService.login(request.getCode(), request.getLoginType());
            return ResponseEntity.ok(ApiResult.ok(user));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "登录失败", "error", e.getMessage()));
        }
    }

    @GetMapping("/qrcode")
    public ApiResult<Map<String, String>> qrcode() {
        return ApiResult.ok(qrLoginService.createQrTicket());
    }

    @GetMapping("/qrcode/callback")
    public String qrcodeCallback(@RequestParam(required = false) String code,
                                 @RequestParam(required = false) String state) {
        if (code == null || state == null) {
            return "<script>alert('登录失败'); window.close();</script>";
        }
        return qrLoginService.handleCallback(code, state);
    }

    @GetMapping("/qrcode/check")
    public ApiResult<Map<String, String>> qrcodeCheck(@RequestParam String ticket) {
        return ApiResult.ok(qrLoginService.checkTicket(ticket));
    }
}
