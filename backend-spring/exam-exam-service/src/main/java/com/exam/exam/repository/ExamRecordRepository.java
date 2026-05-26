package com.exam.exam.repository;

import com.exam.exam.entity.ExamRecordEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ExamRecordRepository extends JpaRepository<ExamRecordEntity, Long> {

    List<ExamRecordEntity> findByOpenidOrderByCreatedAtDesc(String openid);

    Page<ExamRecordEntity> findByOpenidOrderByCreatedAtDesc(String openid, Pageable pageable);

    List<ExamRecordEntity> findByOpenidAndBankCodeOrderByCreatedAtDesc(String openid, String bankCode);

    long countByOpenid(String openid);

    long countByOpenidAndBankCode(String openid, String bankCode);
}