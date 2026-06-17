package com.exam.question.controller;

import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/speech")
public class SpeechController {

    @PostMapping
    public Map<String, Object> speech(@RequestBody Map<String, String> body) {
        String text = body.get("text");
        if (text == null || text.isBlank()) {
            return Map.of("success", false, "message", "缺少text参数");
        }
        return Map.of(
                "success", false,
                "message", "当前环境不支持语音合成服务，请使用客户端内置语音功能",
                "useClientTTS", true,
                "text", text
        );
    }
}
