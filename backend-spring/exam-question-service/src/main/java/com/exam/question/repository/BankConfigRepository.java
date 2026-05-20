package com.exam.question.repository;

import com.exam.question.entity.BankConfigEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface BankConfigRepository extends JpaRepository<BankConfigEntity, Long> {

    List<BankConfigEntity> findByEnabledTrueOrderBySortOrderAsc();

    Optional<BankConfigEntity> findByBankCodeAndEnabledTrue(String bankCode);
}
