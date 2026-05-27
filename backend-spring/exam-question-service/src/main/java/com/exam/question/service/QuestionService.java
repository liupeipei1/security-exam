package com.exam.question.service;

import com.exam.common.util.QuestionAnswerUtil;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

@Service
public class QuestionService {

    private static final Pattern SAFE_TABLE = Pattern.compile("^[a-zA-Z0-9_]+$");
    private static final Set<String> SAFE_TYPES = Set.of("judgment", "single", "multiple");

    private final JdbcTemplate jdbcTemplate;
    private final BankService bankService;

    public QuestionService(JdbcTemplate jdbcTemplate, BankService bankService) {
        this.jdbcTemplate = jdbcTemplate;
        this.bankService = bankService;
    }

    public List<Map<String, Object>> listAll(String bankCode, boolean processAnswers) {
        String table = validateTable(bankService.resolveTableName(bankCode));
        List<Map<String, Object>> rows = jdbcTemplate.queryForList("SELECT * FROM " + table);
        if (processAnswers) {
            return rows.stream().map(QuestionAnswerUtil::processQuestionRow).toList();
        }
        return rows;
    }

    public List<Map<String, Object>> byType(String bankCode, String type) {
        if (!SAFE_TYPES.contains(type)) {
            throw new IllegalArgumentException("无效题型");
        }
        String table = validateTable(bankService.resolveTableName(bankCode));
        return jdbcTemplate.queryForList("SELECT * FROM " + table + " WHERE type = ?", type);
    }

    public List<Map<String, Object>> random(String bankCode, int count) {
        String table = validateTable(bankService.resolveTableName(bankCode));
        return jdbcTemplate.queryForList("SELECT * FROM " + table + " ORDER BY RAND() LIMIT ?", count);
    }

    public Map<String, Object> randomOne(String bankCode) {
        List<Map<String, Object>> list = random(bankCode, 1);
        return list.isEmpty() ? null : list.get(0);
    }

    public List<String> types(String bankCode) {
        String table = validateTable(bankService.resolveTableName(bankCode));
        return jdbcTemplate.queryForList(
                "SELECT DISTINCT type FROM " + table + " WHERE type IS NOT NULL",
                String.class
        );
    }

    public Map<String, Object> countStats(String bankCode) {
        String table = validateTable(bankService.resolveTableName(bankCode));
        Integer total = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM " + table, Integer.class);
        List<Map<String, Object>> types = jdbcTemplate.queryForList(
                "SELECT type as question_type, COUNT(*) as count FROM " + table
                        + " WHERE type IS NOT NULL GROUP BY type"
        );
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("total", total == null ? 0 : total);
        result.put("types", types);
        result.put("bank_code", bankCode != null ? bankCode : "default");
        return result;
    }

    private static String validateTable(String tableName) {
        if (tableName == null || !SAFE_TABLE.matcher(tableName).matches()) {
            throw new IllegalArgumentException("非法表名");
        }
        return tableName;
    }

    /**
     * 保存题目解析
     * @param bankCode 题库代码
     * @param questionId 题目ID
     * @param explanation 解析内容
     * @return 是否更新成功
     */
    public boolean saveExplanation(String bankCode, Long questionId, String explanation) {
        String table = validateTable(bankService.resolveTableName(bankCode));
        int updated = jdbcTemplate.update(
                "UPDATE " + table + " SET analysis = ? WHERE id = ?",
                explanation != null ? explanation : "",
                questionId
        );
        return updated > 0;
    }
}
