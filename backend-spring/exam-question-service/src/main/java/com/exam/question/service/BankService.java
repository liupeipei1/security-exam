package com.exam.question.service;

import com.exam.question.entity.BankConfigEntity;
import com.exam.question.repository.BankConfigRepository;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class BankService {

    private final BankConfigRepository bankConfigRepository;

    public BankService(BankConfigRepository bankConfigRepository) {
        this.bankConfigRepository = bankConfigRepository;
    }

    public List<Map<String, Object>> listBanks() {
        List<BankConfigEntity> rows = bankConfigRepository.findByEnabledTrueOrderBySortOrderAsc();
        if (!rows.isEmpty()) {
            return rows.stream().map(this::toMap).toList();
        }
        return defaultBanks();
    }

    public Optional<Map<String, Object>> getBank(String bankCode) {
        Optional<BankConfigEntity> row = bankConfigRepository.findByBankCodeAndEnabledTrue(bankCode);
        if (row.isPresent()) {
            return Optional.of(toMap(row.get()));
        }
        return defaultBanks().stream()
                .filter(b -> bankCode.equals(b.get("bank_code")))
                .findFirst();
    }

    public String resolveTableName(String bankCode) {
        return getBank(bankCode)
                .map(b -> String.valueOf(b.get("table_name")))
                .orElse("security_exam_3");
    }

    private Map<String, Object> toMap(BankConfigEntity e) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("bank_code", e.getBankCode());
        m.put("bank_name", e.getBankName());
        m.put("bank_description", e.getBankDescription());
        m.put("bank_desc_detail", e.getBankDescDetail());
        m.put("description", e.getDescription() != null ? e.getDescription() : e.getBankDescDetail());
        m.put("icon", e.getIcon());
        m.put("table_name", e.getTableName());
        m.put("total_questions", nvl(e.getTotalQuestions()));
        m.put("judgment_count", nvl(e.getJudgmentCount()));
        m.put("single_count", nvl(e.getSingleCount()));
        m.put("multiple_count", nvl(e.getMultipleCount()));
        m.put("enabled", e.getEnabled());
        m.put("sort_order", e.getSortOrder());
        return m;
    }

    private static int nvl(Integer v) {
        return v == null ? 0 : v;
    }

    private static List<Map<String, Object>> defaultBanks() {
        List<Map<String, Object>> list = new ArrayList<>();
        list.add(bank("security_level3", "网络与信息安全管理员三级", "security_exam_3", "🔒", 1, 190, 40, 140, 10));
        list.add(bank("ai_trainer_3", "人工智能训练师三级", "bank_ai_trainer_3", "🤖", 2, 900, 300, 300, 300));
        list.add(bank("banking_medium", "银行从业资格中级", "bank_banking_medium", "🏦", 3, 0, 0, 0, 0));
        return list;
    }

    private static Map<String, Object> bank(String code, String name, String table, String icon, int order,
                                            int total, int j, int s, int m) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("bank_code", code);
        map.put("bank_name", name);
        map.put("table_name", table);
        map.put("icon", icon);
        map.put("sort_order", order);
        map.put("total_questions", total);
        map.put("judgment_count", j);
        map.put("single_count", s);
        map.put("multiple_count", m);
        map.put("enabled", true);
        map.put("description", name);
        return map;
    }
}
