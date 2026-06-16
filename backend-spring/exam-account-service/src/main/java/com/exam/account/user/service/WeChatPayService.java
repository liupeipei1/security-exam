package com.exam.account.user.service;
import com.exam.account.user.config.WeChatPayProperties;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class WeChatPayService {

    private static final Map<String, PackageInfo> PACKAGES = Map.of(
            "monthly", new PackageInfo(30, 990, "月度会员"),
            "quarterly", new PackageInfo(90, 2500, "季度会员"),
            "yearly", new PackageInfo(365, 8800, "年度会员")
    );

    @Autowired
    private  WeChatPayProperties properties;
    @Autowired
    private  VipService vipService;

    private  RestTemplate restTemplate =new RestTemplate();

    public Map<String, Object> createPayment(String openid, String packageType) throws Exception {
        PackageInfo pkg = PACKAGES.get(packageType);
        if (pkg == null) {
            throw new IllegalArgumentException("无效的套餐类型");
        }

        if (!properties.isEnabled()) {
            Map<String, Object> granted = vipService.buyVip(openid, packageType);
            Map<String, Object> result = new LinkedHashMap<>(granted);
            result.put("mock", true);
            result.put("message", "开发模式：未启用微信支付，已直接开通会员");
            return result;
        }

        String outTradeNo = "VIP" + System.currentTimeMillis();
        String prepayId = unifiedOrder(openid, outTradeNo, packageType, pkg);

        String timeStamp = String.valueOf(System.currentTimeMillis() / 1000);
        String nonceStr = UUID.randomUUID().toString().replace("-", "");
        String pkgStr = "prepay_id=" + prepayId;
        Map<String, String> paySignParams = new TreeMap<>();
        paySignParams.put("appId", properties.getAppId());
        paySignParams.put("timeStamp", timeStamp);
        paySignParams.put("nonceStr", nonceStr);
        paySignParams.put("package", pkgStr);
        paySignParams.put("signType", "MD5");

        Map<String, Object> jsapi = new LinkedHashMap<>();
        jsapi.put("appId", properties.getAppId());
        jsapi.put("timeStamp", timeStamp);
        jsapi.put("nonceStr", nonceStr);
        jsapi.put("package", pkgStr);
        jsapi.put("signType", "MD5");
        jsapi.put("paySign", sign(paySignParams));
        jsapi.put("out_trade_no", outTradeNo);
        jsapi.put("package_type", packageType);
        jsapi.put("mock", false);
        return jsapi;
    }

    public String handleNotify(String xmlBody) throws Exception {
        Map<String, String> data = parseXmlToMap(xmlBody);
        if (!"SUCCESS".equals(data.get("return_code")) || !"SUCCESS".equals(data.get("result_code"))) {
            return failXml("业务失败");
        }
        if (!verifySign(data)) {
            return failXml("签名失败");
        }
        String openid = data.get("openid");
        String attach = data.get("attach");
        if (openid != null && attach != null && PACKAGES.containsKey(attach)) {
            vipService.buyVip(openid, attach);
        }
        return successXml();
    }

    private String unifiedOrder(String openid, String outTradeNo, String packageType, PackageInfo pkg) {
        Map<String, String> params = new TreeMap<>();
        params.put("appid", properties.getAppId());
        params.put("mch_id", properties.getMchId());
        params.put("nonce_str", UUID.randomUUID().toString().replace("-", ""));
        params.put("body", pkg.description);
        params.put("out_trade_no", outTradeNo);
        params.put("total_fee", String.valueOf(pkg.feeFen));
        params.put("spbill_create_ip", "127.0.0.1");
        params.put("notify_url", properties.getNotifyUrl());
        params.put("trade_type", "JSAPI");
        params.put("openid", openid);
        params.put("attach", packageType);
        params.put("sign", sign(params));

        String xml = mapToXml(params);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_XML);
        ResponseEntity<String> resp = restTemplate.postForEntity(
                "https://api.mch.weixin.qq.com/pay/unifiedorder",
                new HttpEntity<>(xml, headers),
                String.class
        );
        Map<String, String> result = parseXmlToMap(resp.getBody());
        if (!"SUCCESS".equals(result.get("return_code")) || !"SUCCESS".equals(result.get("result_code"))) {
            throw new IllegalStateException("统一下单失败: " + result.getOrDefault("err_code_des", result.get("return_msg")));
        }
        return result.get("prepay_id");
    }

    private boolean verifySign(Map<String, String> data) {
        String sign = data.get("sign");
        if (sign == null) {
            return false;
        }
        Map<String, String> copy = new TreeMap<>(data);
        copy.remove("sign");
        return sign.equals(sign(copy));
    }

    private String sign(Map<String, String> params) {
        String raw = params.entrySet().stream()
                .filter(e -> e.getValue() != null && !e.getValue().isBlank() && !"sign".equals(e.getKey()))
                .sorted(Map.Entry.comparingByKey())
                .map(e -> e.getKey() + "=" + e.getValue())
                .collect(Collectors.joining("&"));
        raw += "&key=" + properties.getApiKey();
        return md5(raw).toUpperCase();
    }

    private static String md5(String input) {
        try {
            MessageDigest md = MessageDigest.getInstance("MD5");
            byte[] digest = md.digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : digest) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    private static String mapToXml(Map<String, String> map) {
        StringBuilder sb = new StringBuilder("<xml>");
        for (Map.Entry<String, String> e : map.entrySet()) {
            sb.append("<").append(e.getKey()).append("><![CDATA[")
                    .append(e.getValue()).append("]]></").append(e.getKey()).append(">");
        }
        sb.append("</xml>");
        return sb.toString();
    }

    private static Map<String, String> parseXmlToMap(String xml) {
        Map<String, String> map = new HashMap<>();
        if (xml == null) {
            return map;
        }
        String[] tags = {"return_code", "return_msg", "result_code", "err_code_des", "prepay_id",
                "openid", "attach", "sign", "out_trade_no"};
        for (String tag : tags) {
            String open = "<" + tag + ">";
            String close = "</" + tag + ">";
            int start = xml.indexOf(open);
            if (start >= 0) {
                start += open.length();
                int cdata = xml.indexOf("<![CDATA[", start);
                if (cdata >= 0 && cdata < xml.indexOf(close, start)) {
                    start = cdata + 9;
                    int end = xml.indexOf("]]>", start);
                    map.put(tag, xml.substring(start, end));
                } else {
                    int end = xml.indexOf(close, start);
                    map.put(tag, xml.substring(start, end));
                }
            }
        }
        return map;
    }

    private static String successXml() {
        return "<xml><return_code><![CDATA[SUCCESS]]></return_code><return_msg><![CDATA[OK]]></return_msg></xml>";
    }

    private static String failXml(String msg) {
        return "<xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[" + msg + "]]></return_msg></xml>";
    }

    private record PackageInfo(int days, int feeFen, String description) {
    }
}
