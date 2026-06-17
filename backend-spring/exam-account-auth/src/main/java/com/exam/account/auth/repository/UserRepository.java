package com.exam.account.auth.repository;

import com.exam.account.auth.entity.UserEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface UserRepository extends JpaRepository<UserEntity, Long> {

    Optional<UserEntity> findByOpenid(String openid);

    @Modifying
    @Query("UPDATE UserEntity u SET u.lastLogin = CURRENT_TIMESTAMP WHERE u.openid = :openid")
    void touchLastLogin(@Param("openid") String openid);
}
