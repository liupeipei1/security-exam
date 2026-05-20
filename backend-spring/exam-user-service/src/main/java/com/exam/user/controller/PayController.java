package com.exam.user.controller;

import com.exam.common.api.ApiResult;
import com.exam.user.service.WeChatPayService;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/user/pay")
public class PayController {

    private final WeChatPayService weChatPayService;

    public PayController(WeChatPayService weChatPayService) {
        this.weChatPayService = weChatPayService;
    }

    @PostMapping("/create")
    public ResponseEntity<?> create(@RequestBody Map<String, String> body) {
        String openid = body.get("openid");
        String packageType = body.get("package_type");
        if (openid == null || packageType == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "缺少参数"));
        }
        try {
            return ResponseEntity.ok(ApiResult.ok(weChatPayService.createPayment(openid, packageType)));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping(value = "/notify", consumes = MediaType.APPLICATION_XML_VALUE, produces = MediaType.APPLICATION_XML_VALUE)
    public String notify(@RequestBody String xml) {
        try {
            return weChatPayService.handleNotify(xml);
        } catch (Exception e) {
            return "<xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[" + e.getMessage() + "]]></return_msg></xml>";
        }
    }
}
