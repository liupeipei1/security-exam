package com.exam.question.service;

import com.exam.common.entity.ExamConfigEntity;
import com.exam.common.repository.ExamConfigRepository;
import com.exam.common.util.QuestionAnswerUtil;
import com.exam.question.entity.QuestionType;
import com.exam.question.repository.QuestionTypeRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.regex.Pattern;

@Service
public class QuestionService {

    private static final Pattern SAFE_TABLE = Pattern.compile("^[a-zA-Z0-9_]+$");
    private static final Set<String> SAFE_TYPES = Set.of("judgment", "single", "multiple");


    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private ExamConfigRepository examConfigRepository;

    @Autowired
    private QuestionTypeRepository questionTypeRepository;


    private static final String DEFAULT_TABLE = "security_exam_3";

    public String getTable(String examCode) {
        if (examCode == null || examCode.isEmpty()) {
            return DEFAULT_TABLE;
        }
        Optional<ExamConfigEntity> optionalExamConfigEntity = examConfigRepository.findByExamCode(examCode);
        if (optionalExamConfigEntity.isPresent()) {
            String table = optionalExamConfigEntity.get().getTableName();
            if (table != null && !table.isEmpty()) {
                return table;
            }
        }
        return DEFAULT_TABLE;
    }

    public QuestionService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<Map<String, Object>> listAll(String examCode, boolean processAnswers) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList("SELECT * FROM " +  getTable(examCode));
        if (processAnswers) {
            return rows.stream().map(QuestionAnswerUtil::processQuestionRow).toList();
        }
        return rows;
    }

    public List<Map<String, Object>> byType(String examCode, String type) {
        if (!SAFE_TYPES.contains(type)) {
            throw new IllegalArgumentException("无效题型");
        }
        String table = getTable(examCode);
        return jdbcTemplate.queryForList("SELECT * FROM " + table + " WHERE type = ?", type);
    }

    public List<Map<String, Object>> random(String examCode, int count) {
        String table = getTable(examCode);
        return jdbcTemplate.queryForList("SELECT * FROM " + table + " ORDER BY RAND() LIMIT ?", count);
    }

    public Map<String, Object> randomOne(String examCode) {
        List<Map<String, Object>> list = random(examCode, 1);
        return list.isEmpty() ? null : list.get(0);
    }

    public List<String> types(String examCode) {
        String table =  getTable(examCode);
        return jdbcTemplate.queryForList(
                "SELECT DISTINCT type FROM " + table + " WHERE type IS NOT NULL",
                String.class
        );
    }

    /**
     * 获取所有题目类型（从 question_types 配置表获取，兼容Node.js接口）
     */
    public List<Map<String, Object>> getAllQuestionTypes() {
        List<QuestionType> types = questionTypeRepository.findByEnabledTrueOrderBySortOrder();
        return types.stream().map(type -> convertToMap(type)).toList();
    }

    /**
     * 根据题库代码获取该题库中实际存在的题型
     */
    public List<Map<String, Object>> getQuestionTypesByExam(String examCode) {
        String table = getTable(examCode);
        // 查询该题库中实际存在的题型
        List<String> existingTypes = jdbcTemplate.queryForList(
                "SELECT DISTINCT type FROM " + table + " WHERE type IS NOT NULL",
                String.class
        );
        
        // 获取所有配置的题型
        List<QuestionType> allTypes = questionTypeRepository.findByEnabledTrueOrderBySortOrder();
        
        // 过滤出该题库中存在的题型，并添加数量统计
        return allTypes.stream()
                .filter(type -> existingTypes.contains(type.getTypeCode()))
                .map(type -> {
                    Map<String, Object> map = convertToMap(type);
                    // 添加该题型在题库中的数量
                    Integer count = jdbcTemplate.queryForObject(
                            "SELECT COUNT(*) FROM " + table + " WHERE type = ?",
                            Integer.class,
                            type.getTypeCode()
                    );
                    map.put("count", count != null ? count : 0);
                    return map;
                })
                .toList();
    }

    private Map<String, Object> convertToMap(QuestionType type) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("type_code", type.getTypeCode());
        map.put("type_name", type.getTypeName());
        map.put("type_description", type.getTypeDescription());
        map.put("type_icon", type.getTypeIcon());
        return map;
    }

    public Map<String, Object> countStats(String examCode) {
        String table =  getTable(examCode);
        Integer total = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM " + table, Integer.class);
        List<Map<String, Object>> types = jdbcTemplate.queryForList(
                "SELECT type as question_type, COUNT(*) as count FROM " + table
                        + " WHERE type IS NOT NULL GROUP BY type"
        );
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("total", total == null ? 0 : total);
        result.put("types", types);
        result.put("exam_code", examCode != null ? examCode : "default");
        return result;
    }


    /**
     * 保存题目解析
     *
     * @param examCode    题库代码
     * @param questionId  题目ID
     * @param explanation 解析内容
     * @return 是否更新成功
     */
    public boolean saveExplanation(String examCode, Long questionId, String explanation) {
        String table =  getTable(examCode);
        int updated = jdbcTemplate.update(
                "UPDATE " + table + " SET analysis = ? WHERE id = ?",
                explanation != null ? explanation : "",
                questionId
        );
        return updated > 0;
    }

    /**
     * 更新题目
     *
     * @param examCode         题库代码
     * @param questionId       题目ID
     * @param question         题目内容
     * @param options          选项（JSON字符串）
     * @param answer           答案（数组）
     * @param analysis         解析
     * @param type             题型
     * @param knowledgePointId 知识要点ID
     * @return 是否更新成功
     */
    public boolean updateQuestion(String examCode, Long questionId, String question, String options,
                                  String[] answer, String analysis, String type, Long knowledgePointId) {
        String table =  getTable(examCode);

        // 将答案数组转换为JSON数组格式
        String answerJson;
        if (answer != null && answer.length > 0) {
            StringBuilder sb = new StringBuilder("[");
            for (int i = 0; i < answer.length; i++) {
                if (i > 0) sb.append(",");
                sb.append("\"").append(answer[i]).append("\"");
            }
            sb.append("]");
            answerJson = sb.toString();
        } else {
            answerJson = "[]";
        }

        // 动态构建更新语句
        StringBuilder sql = new StringBuilder("UPDATE " + table + " SET question = ?, options = ?, answer = ?, analysis = ?, type = ?");
        java.util.List<Object> params = new java.util.ArrayList<>();
        params.add(question);
        params.add(options);
        params.add(answerJson);
        params.add(analysis);
        params.add(type);

        // 检查表是否有 knowledge_point_id 字段
        try {
            List<Map<String, Object>> columns = jdbcTemplate.queryForList(
                    "DESCRIBE " + table
            );
            boolean hasKnowledgePointId = columns.stream()
                    .anyMatch(col -> "knowledge_point_id".equals(col.get("Field")));

            if (hasKnowledgePointId && knowledgePointId != null) {
                sql.append(", knowledge_point_id = ?");
                params.add(knowledgePointId);
            }
        } catch (Exception e) {
            // 如果查询表结构失败，不添加 knowledge_point_id 字段
        }

        sql.append(" WHERE id = ?");
        params.add(questionId);

        int updated = jdbcTemplate.update(sql.toString(), params.toArray());
        return updated > 0;
    }

    /**
     * 删除题目
     *
     * @param examCode   题库代码
     * @param questionId 题目ID
     * @return 是否删除成功
     */
    public boolean deleteQuestion(String examCode, Long questionId) {
        String table =  getTable(examCode);
        int deleted = jdbcTemplate.update("DELETE FROM " + table + " WHERE id = ?", questionId);
        return deleted > 0;
    }

    /**
     * 导入题目
     *
     * @param content          题目内容
     * @param examCode         题库代码
     * @param questionType     指定题型（可选）
     * @param guideId          指南ID（可选）
     * @param knowledgePointId 知识要点ID（可选）
     * @return 导入结果
     */
    public Map<String, Object> importQuestions(String content, String examCode, String questionType,
                                               Long guideId, Long knowledgePointId) {
        String table =  getTable(examCode);

        // 解析题目内容
        List<Map<String, Object>> questions = parseQuestionContent(content);
        System.out.println("解析出 " + questions.size() + " 道题目");

        if (questions.isEmpty()) {
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("success", false);
            result.put("message", "未能解析出题目，请检查格式");
            return result;
        }

        int successCount = 0;
        List<Map<String, Object>> errors = new java.util.ArrayList<>();

        for (int i = 0; i < questions.size(); i++) {
            Map<String, Object> q = questions.get(i);
            try {
                // 判断题目类型：优先使用用户指定的题型，否则自动识别
                String type = questionType;
                if (type == null || type.isEmpty()) {
                    @SuppressWarnings("unchecked")
                    List<String> options = (List<String>) q.get("options");
                    String answer = (String) q.get("answer");

                    if (options != null && options.size() == 2) {
                        type = "judgment";
                    } else if (options != null && options.size() >= 5) {
                        type = "multiple";
                    } else if (answer != null && answer.length() > 1) {
                        type = "multiple";
                    } else {
                        type = "single";
                    }
                }

                String questionText = (String) q.get("question_text");
                @SuppressWarnings("unchecked")
                List<String> options = (List<String>) q.get("options");
                String answer = (String) q.get("answer");
                String analysis = (String) q.get("analysis");

                // 将答案转换为JSON数组格式
                String answerArray;
                if (answer != null && answer.length() > 1) {
                    // 多选题，每个字符作为一个选项
                    StringBuilder sb = new StringBuilder("[");
                    for (int j = 0; j < answer.length(); j++) {
                        if (j > 0) sb.append(",");
                        sb.append("\"").append(answer.charAt(j)).append("\"");
                    }
                    sb.append("]");
                    answerArray = sb.toString();
                } else {
                    answerArray = "[\"" + (answer != null ? answer : "") + "\"]";
                }

                String optionsJson = new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(options);

                jdbcTemplate.update(
                        "INSERT INTO " + table + " (question, options, answer, analysis, type, exam_code, guide_id, knowledge_point_id) " +
                                "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                        questionText,
                        optionsJson,
                        answerArray,
                        analysis != null ? analysis : "",
                        type,
                        examCode != null ? examCode : "default",
                        guideId,
                        knowledgePointId
                );

                successCount++;
            } catch (Exception e) {
                Map<String, Object> error = new LinkedHashMap<>();
                error.put("index", i + 1);
                error.put("question", q.get("question_text"));
                error.put("error", e.getMessage());
                errors.add(error);
                System.err.println("第 " + (i + 1) + " 题导入失败: " + e.getMessage());
            }
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("success", true);
        if (errors.isEmpty()) {
            result.put("message", "成功导入 " + successCount + " 道题目");
        } else {
            result.put("message", "成功导入 " + successCount + " 道题目，" + errors.size() + " 道失败");
            result.put("errors", errors.size() > 10 ? errors.subList(0, 10) : errors);
        }
        result.put("count", successCount);

        return result;
    }

    /**
     * 获取所有标签列表
     *
     * @param examCode 题库代码
     * @return 标签列表
     */
    public List<String> getTags(String examCode) {
        String table =  getTable(examCode);
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT tags FROM " + table + " WHERE tags IS NOT NULL AND tags != ''"
        );

        Set<String> tagSet = new java.util.HashSet<>();
        for (Map<String, Object> row : rows) {
            Object tagsObj = row.get("tags");
            if (tagsObj != null) {
                String tags = tagsObj.toString();
                String[] tagArray = tags.split(",");
                for (String tag : tagArray) {
                    String trimmedTag = tag.trim();
                    if (!trimmedTag.isEmpty()) {
                        tagSet.add(trimmedTag);
                    }
                }
            }
        }

        List<String> result = new java.util.ArrayList<>(tagSet);
        java.util.Collections.sort(result);
        return result;
    }

    /**
     * 批量更新题目标签
     *
     * @param examCode    题库代码
     * @param questionIds 题目ID列表
     * @param tags        标签（逗号分隔）
     * @return 是否成功
     */
    public boolean batchUpdateTags(String examCode, List<Long> questionIds, String tags) {
        if (questionIds == null || questionIds.isEmpty()) {
            return false;
        }

        String table =  getTable(examCode);

        // 检查表是否有tags字段
        try {
            List<Map<String, Object>> columns = jdbcTemplate.queryForList("DESCRIBE " + table);
            boolean hasTags = columns.stream()
                    .anyMatch(col -> "tags".equals(col.get("Field")));

            if (!hasTags) {
                throw new IllegalArgumentException("该题库不支持标签功能");
            }
        } catch (Exception e) {
            throw new IllegalArgumentException("该题库不支持标签功能");
        }

        StringBuilder sql = new StringBuilder("UPDATE " + table + " SET tags = ? WHERE id IN (");
        List<Object> params = new java.util.ArrayList<>();
        params.add(tags != null ? tags : "");

        for (int i = 0; i < questionIds.size(); i++) {
            if (i > 0) {
                sql.append(",");
            }
            sql.append("?");
            params.add(questionIds.get(i));
        }
        sql.append(")");

        int updated = jdbcTemplate.update(sql.toString(), params.toArray());
        return updated > 0;
    }

    /**
     * 批量更新题目类型
     *
     * @param examCode     题库代码
     * @param questionIds  题目ID列表
     * @param questionType 题目类型
     * @return 是否成功
     */
    public boolean batchUpdateType(String examCode, List<Long> questionIds, String questionType) {
        if (questionIds == null || questionIds.isEmpty()) {
            return false;
        }

        String table =  getTable(examCode);

        // 检查表是否有type字段
        try {
            List<Map<String, Object>> columns = jdbcTemplate.queryForList("DESCRIBE " + table);
            boolean hasType = columns.stream()
                    .anyMatch(col -> "type".equals(col.get("Field")));

            if (!hasType) {
                throw new IllegalArgumentException("该题库不支持题目类型功能");
            }
        } catch (Exception e) {
            throw new IllegalArgumentException("该题库不支持题目类型功能");
        }

        StringBuilder sql = new StringBuilder("UPDATE " + table + " SET type = ? WHERE id IN (");
        List<Object> params = new java.util.ArrayList<>();
        params.add(questionType != null ? questionType : "");

        for (int i = 0; i < questionIds.size(); i++) {
            if (i > 0) {
                sql.append(",");
            }
            sql.append("?");
            params.add(questionIds.get(i));
        }
        sql.append(")");

        int updated = jdbcTemplate.update(sql.toString(), params.toArray());
        return updated > 0;
    }

    /**
     * 解析题目内容
     */
    private List<Map<String, Object>> parseQuestionContent(String content) {
        List<Map<String, Object>> questions = new java.util.ArrayList<>();
        String[] lines = content.split("\n");

        Map<String, Object> currentQuestion = null;
        boolean inAnalysis = false;

        for (int i = 0; i < lines.length; i++) {
            String line = lines[i].trim();
            if (line.isEmpty()) continue;

            // 检测是否是新题目开始
            boolean isQuestionStart = line.matches("^第\\s*\\d+\\s*题");
            boolean isAnswerLine = line.matches("^(正确答案|答案)\\s*[：:]");
            boolean isOptionA = line.matches("^A\\.\\s*");

            if (isQuestionStart || (isOptionA && currentQuestion == null) ||
                    (isAnswerLine && currentQuestion != null && currentQuestion.get("question_text") != null)) {

                // 保存当前题目
                if (currentQuestion != null && currentQuestion.get("question_text") != null) {
                    questions.add(currentQuestion);
                }

                currentQuestion = new LinkedHashMap<>();
                currentQuestion.put("question_text", "");
                currentQuestion.put("options", new java.util.ArrayList<String>());
                currentQuestion.put("answer", "");
                currentQuestion.put("analysis", "");
                inAnalysis = false;

                if (isQuestionStart) continue;
            }

            if (currentQuestion == null) {
                currentQuestion = new LinkedHashMap<>();
                currentQuestion.put("question_text", "");
                currentQuestion.put("options", new java.util.ArrayList<String>());
                currentQuestion.put("answer", "");
                currentQuestion.put("analysis", "");
            }

            // 匹配选项格式：A. B. C. D. E.
            java.util.regex.Matcher optionMatch = java.util.regex.Pattern.compile("^([A-Ea-e])\\.\\s*(.+)").matcher(line);
            if (optionMatch.matches()) {
                inAnalysis = false;
                @SuppressWarnings("unchecked")
                List<String> options = (List<String>) currentQuestion.get("options");
                options.add(optionMatch.group(2));
                continue;
            }

            // 匹配答案
            java.util.regex.Matcher answerMatch = java.util.regex.Pattern.compile("^(正确答案|答案)\\s*[：:]\\s*([A-Ea-e]+)").matcher(line);
            if (answerMatch.matches()) {
                currentQuestion.put("answer", answerMatch.group(2).toUpperCase());
                continue;
            }

            // 匹配解析
            if (line.startsWith("名师解析") || line.startsWith("解析")) {
                inAnalysis = true;
                String analysisContent = line.replaceAll("^名师解析\\s*[：:]\\s*", "").replaceAll("^解析\\s*[：:]\\s*", "");
                if (!analysisContent.isEmpty()) {
                    currentQuestion.put("analysis", analysisContent);
                }
                continue;
            }

            // 如果在解析部分，继续添加解析内容
            if (inAnalysis) {
                String existingAnalysis = (String) currentQuestion.get("analysis");
                currentQuestion.put("analysis", existingAnalysis + (existingAnalysis.isEmpty() ? "" : "\n") + line);
                continue;
            }

            // 如果有答案了，后面的内容可能是解析
            if (currentQuestion.get("answer") != null && !((String) currentQuestion.get("answer")).isEmpty()) {
                inAnalysis = true;
                String existingAnalysis = (String) currentQuestion.get("analysis");
                currentQuestion.put("analysis", existingAnalysis + (existingAnalysis.isEmpty() ? "" : "\n") + line);
                continue;
            }

            // 否则是题目内容的一部分
            String existingText = (String) currentQuestion.get("question_text");
            currentQuestion.put("question_text", existingText + (existingText.isEmpty() ? "" : "\n") + line);
        }

        // 添加最后一道题目
        if (currentQuestion != null && currentQuestion.get("question_text") != null &&
                !((String) currentQuestion.get("question_text")).isEmpty()) {
            questions.add(currentQuestion);
        }

        return questions;
    }
}
