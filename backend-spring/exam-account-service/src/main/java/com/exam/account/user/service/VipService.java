package com.exam.account.user.service;

import com.exam.account.auth.entity.UserEntity;
import com.exam.account.auth.repository.UserRepository;
import com.exam.common.dto.VipStatusDto;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.Set;

@Service
public class VipService {

    private static final Set<String> TEST_OPENIDS = Set.of("test_openid", "dev_openid", "o0lS55o_tDbDXQ2rg-Y_XvLikI_U");
    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private static final Map<String, Integer> PACKAGES = Map.of(
            "monthly", 30,
            "quarterly", 90,
            "yearly", 365
    );

    private final UserRepository userRepository;

    public VipService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public VipStatusDto checkVip(String openid) {
        if (openid == null || openid.isBlank()) {
            return new VipStatusDto(false, null, "请先登录");
        }
        if (TEST_OPENIDS.contains(openid)) {
            return new VipStatusDto(true, "2099-12-31 23:59:59", "测试账号");
        }
        return userRepository.findByOpenid(openid)
                .map(user -> {
                    boolean valid = Boolean.TRUE.equals(user.getIsVip())
                            && user.getVipExpire() != null
                            && user.getVipExpire().isAfter(LocalDateTime.now());
                    String expire = user.getVipExpire() != null ? user.getVipExpire().format(FMT) : null;
                    return new VipStatusDto(valid, expire, valid ? "会员有效" : "会员已过期或未开通");
                })
                .orElse(new VipStatusDto(false, null, "用户不存在"));
    }

    @Transactional
    public Map<String, Object> buyVip(String openid, String packageType) {
        Integer days = PACKAGES.get(packageType);
        if (days == null) {
            throw new IllegalArgumentException("无效的套餐类型");
        }
        UserEntity user = userRepository.findByOpenid(openid)
                .orElseThrow(() -> new IllegalArgumentException("用户不存在"));

        LocalDateTime base = (user.getVipExpire() != null && user.getVipExpire().isAfter(LocalDateTime.now()))
                ? user.getVipExpire()
                : LocalDateTime.now();
        LocalDateTime newExpire = base.plusDays(days);
        user.setIsVip(true);
        user.setVipExpire(newExpire);
        userRepository.save(user);

        return Map.of(
                "is_vip", true,
                "vip_expire", newExpire.format(FMT),
                "package_type", packageType,
                "days", days
        );
    }

    @Transactional
    public void updateProfile(String openid, String nickname, String avatar) {
        UserEntity user = userRepository.findByOpenid(openid)
                .orElseThrow(() -> new IllegalArgumentException("用户不存在"));
        user.setNickname(nickname);
        user.setAvatar(avatar);
        userRepository.save(user);
    }
}
