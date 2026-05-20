package com.exam.question.util;

import com.exam.common.security.JwtService;
import jakarta.servlet.http.HttpServletRequest;

public final class OpenidContext {

    private OpenidContext() {
    }

    public static String resolve(HttpServletRequest request, String queryOpenid) {
        String header = request.getHeader(JwtService.HEADER_OPENID);
        if (header != null && !header.isBlank()) {
            return header;
        }
        return queryOpenid;
    }
}
