package com.exam.question.service;

import com.exam.common.entity.ExamConfigEntity;
import com.exam.common.repository.ExamConfigRepository;
import com.exam.question.entity.QuestionType;
import com.exam.question.repository.QuestionTypeRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 题目导入服务
 */
@Service
public class QuestionImportService {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private ExamConfigRepository examConfigRepository;

    @Autowired
    private QuestionTypeRepository questionTypeRepository;

    // 匹配Blob URL格式的图片
    private static final Pattern BLOB_IMG_PATTERN = Pattern.compile("<img[^>]+src=[\"']blob:[^\"']+[\"'][^>]*>", Pattern.CASE_INSENSITIVE);
    
    // 匹配Base64格式的图片（支持data:image/xxx;base64,格式）
    private static final Pattern BASE64_IMG_PATTERN = Pattern.compile("<img[^>]+src=[\"']data:image/[^;\"]+;base64,[^\"]*[\"'][^>]*>", Pattern.CASE_INSENSITIVE);

    /**
     * 导入题目
     */
    @Transactional
    public Map<String, Object> importQuestions(String content, String examCode, String tableName,
                                                String examName, String questionType, Integer sourceSet,
                                                String tags, MultipartFile[] images) throws IOException {
        Map<String, Object> result = new HashMap<>();
        List<Map<String, Object>> errors = new ArrayList<>();

        if (content == null || content.isEmpty()) {
            result.put("success", false);
            result.put("message", "请提供题库内容");
            return result;
        }

        // 确定目标表名
        String targetTable = tableName;
        boolean createdNewExam = false;

        if (examCode != null && !examCode.isEmpty()) {
            Optional<ExamConfigEntity> examOpt = examConfigRepository.findByExamCode(examCode);

            if (examOpt.isPresent()) {
                // 题库已存在，使用已有的表名
                targetTable = examOpt.get().getTableName();
                // 检查表是否存在
                if (!tableExists(targetTable)) {
                    createQuestionTable(targetTable);
                }
            } else if (examName != null && !examName.isEmpty()) {
                // 创建新题库
                targetTable = createExam(examCode, examName);
                createdNewExam = true;
            } else {
                result.put("success", false);
                result.put("message", "题库 " + examCode + " 不存在，请提供题库名称(exam_name)以创建新题库");
                return result;
            }
        }

        if (targetTable == null || targetTable.isEmpty()) {
            result.put("success", false);
            result.put("message", "请指定目标表名或提供有效的exam_code");
            return result;
        }

        // 处理图片：转换为Base64并嵌入内容
        String finalContent = content;
        
        // 如果有上传的图片文件，转换为Base64并替换占位符
        if (images != null && images.length > 0) {
            for (int i = 0; i < images.length; i++) {
                MultipartFile file = images[i];
                if (!file.isEmpty()) {
                    String base64Image = convertToBase64(file);
                    String imgTag = "<img src=\"" + base64Image + "\" />";

                    // 优先替换blob格式的图片
                    if (BLOB_IMG_PATTERN.matcher(finalContent).find()) {
                        finalContent = BLOB_IMG_PATTERN.matcher(finalContent).replaceFirst(imgTag);
                    } else {
                        // 尝试替换占位符
                        Pattern placeholderPattern = Pattern.compile("[\\[（](图片|image)\\s*" + (i + 1) + "[\\]）]", Pattern.CASE_INSENSITIVE);
                        if (placeholderPattern.matcher(finalContent).find()) {
                            finalContent = placeholderPattern.matcher(finalContent).replaceFirst(imgTag);
                        } else {
                            // 如果没有占位符，直接追加到内容末尾
                            finalContent += "\n" + imgTag;
                        }
                    }
                }
            }
        }
        
        // 清理无效的图片标签（如未替换的Blob URL）
        finalContent = cleanAndValidateImages(finalContent);

        // 解析题目
        List<Map<String, Object>> questions = parseQuestionContent(finalContent);

        if (questions.isEmpty()) {
            result.put("success", false);
            result.put("message", "未能解析出题目，请检查格式");
            return result;
        }

        // 获取有效题型列表
        List<String> validTypes = getValidTypes();

        // 插入数据库
        int successCount = 0;
        for (int i = 0; i < questions.size(); i++) {
            Map<String, Object> q = questions.get(i);
            try {
                String type = determineQuestionType(q, questionType, validTypes);
                List<String> answerArray = convertAnswer(q.get("answer"));

                String questionText = (String) q.getOrDefault("question", q.getOrDefault("question_text", ""));
                String analysisText = (String) q.getOrDefault("explanation", q.getOrDefault("analysis", ""));
                String optionsJson = com.alibaba.fastjson2.JSON.toJSONString(q.get("options"));
                String answerJson = com.alibaba.fastjson2.JSON.toJSONString(answerArray);
                String finalTags = tags != null ? tags : (String) q.get("tags");

                jdbcTemplate.update(
                        "INSERT INTO " + targetTable + " (question, options, answer, analysis, type, exam_code, source_set, tags) " +
                                "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                        questionText, optionsJson, answerJson, analysisText, type,
                        examCode != null ? examCode : "default",
                        sourceSet != null ? sourceSet : 0,
                        finalTags != null ? finalTags : ""
                );
                successCount++;
            } catch (Exception e) {
                String questionText = (String) q.getOrDefault("question", q.getOrDefault("question_text", "未知题目"));
                Map<String, Object> error = new HashMap<>();
                error.put("index", i + 1);
                error.put("question", questionText);
                error.put("error", e.getMessage());
                errors.add(error);
            }
        }

        // 更新题库统计
        if (examCode != null) {
            updateExamStats(examCode, targetTable);
        }

        result.put("success", true);
        result.put("count", successCount);
        if (errors.isEmpty()) {
            result.put("message", "成功导入 " + successCount + " 道题目");
        } else {
            result.put("message", "成功导入 " + successCount + " 道题目，" + errors.size() + " 道失败");
            result.put("errors", errors.size() > 10 ? errors.subList(0, 10) : errors);
        }

        return result;
    }

    private boolean tableExists(String tableName) {
        try {
            Integer count = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = ?",
                    Integer.class, tableName
            );
            return count != null && count > 0;
        } catch (Exception e) {
            return false;
        }
    }

    private void createQuestionTable(String tableName) {
        String createTableSql = "CREATE TABLE IF NOT EXISTS " + tableName + " (" +
                "id BIGINT AUTO_INCREMENT PRIMARY KEY," +
                "question LONGTEXT," +
                "options LONGTEXT," +
                "answer LONGTEXT," +
                "analysis LONGTEXT," +
                "type VARCHAR(20) DEFAULT 'single'," +
                "exam_code VARCHAR(50)," +
                "source_set INT DEFAULT 0," +
                "tags VARCHAR(255)," +
                "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP," +
                "updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP" +
                ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";
        jdbcTemplate.execute(createTableSql);
    }

    /**
     * 清理和验证图片标签
     * - 移除无效的图片标签
     * - 确保Base64图片格式正确
     */
    private String cleanAndValidateImages(String content) {
        if (content == null || content.isEmpty()) {
            return content;
        }
        
        // 移除无效的Blob图片标签（没有正确替换的）
        content = BLOB_IMG_PATTERN.matcher(content).replaceAll("");
        
        // 可以添加更多的清理逻辑，比如验证Base64格式等
        
        return content;
    }

    private String createExam(String examCode, String examName) {
        String tableName = "exam_" + examCode.toLowerCase();
        createQuestionTable(tableName);

        ExamConfigEntity exam = new ExamConfigEntity();
        exam.setExamCode(examCode);
        exam.setExamName(examName);
        exam.setTableName(tableName);
        exam.setDescription("通过导入功能创建的题库");
        exam.setIcon("📚");
        exam.setEnabled(true);
        examConfigRepository.save(exam);

        return tableName;
    }

    private String convertToBase64(MultipartFile file) throws IOException {
        byte[] bytes = file.getBytes();
        String base64 = Base64.getEncoder().encodeToString(bytes);
        return "data:" + file.getContentType() + ";base64," + base64;
    }

    private List<Map<String, Object>> parseQuestionContent(String content) {
        List<Map<String, Object>> questions = new ArrayList<>();

        // 尝试JSON解析
        try {
            Object parsed = com.alibaba.fastjson2.JSON.parse(content);
            if (parsed instanceof List) {
                for (Object item : (List<?>) parsed) {
                    if (item instanceof Map) {
                        questions.add((Map<String, Object>) item);
                    }
                }
            } else if (parsed instanceof Map) {
                questions.add((Map<String, Object>) parsed);
            }
            return questions;
        } catch (Exception e) {
            // JSON解析失败，使用文本解析
        }

        // 文本格式解析
        content = content.replaceAll("([A-Ea-e])([．.、])", "\n$1$2");
        content = content.replaceAll("([^\\n])(正确答案|答案|Answer|ANSWER)\\s*[：:]", "$1\n$2：");
        content = content.replaceAll("([^\\n])(名师\\s*解析|解析|Analysis|ANALYSIS|Explanation|EXPLANATION)\\s*[：:]", "$1\n$2：");
        content = content.replaceAll("([^\\n])(回答错误|我的答案)", "$1\n$2");
        content = content.replaceAll("^\\s*", "");

        String[] lines = content.split("\n");
        List<String> trimmedLines = new ArrayList<>();
        for (String line : lines) {
            String trimmed = line.trim();
            if (!trimmed.isEmpty()) {
                trimmedLines.add(trimmed);
            }
        }

        Map<String, Object> currentQuestion = null;
        boolean inAnalysis = false;

        Pattern questionNumberPattern = Pattern.compile("^(第)?\\s*(\\d+)\\s*题\\s*|^Q\\s*(\\d+)\\s*");
        Pattern bracketPattern = Pattern.compile("^\\((\\d+)\\)");
        Pattern optionPattern = Pattern.compile("^([A-Ea-e])[．.、]\\s*");
        Pattern answerPattern = Pattern.compile("^(正确答案|答案|Answer|ANSWER)\\s*[：:]");
        Pattern analysisPattern = Pattern.compile("^(名师)?解析\\s*[：:]|^(Analysis|ANALYSIS|Explanation|EXPLANATION)\\s*[：:]");

        for (String line : trimmedLines) {
            Matcher questionMatcher = questionNumberPattern.matcher(line);
            Matcher bracketMatcher = bracketPattern.matcher(line);
            Matcher optionMatcher = optionPattern.matcher(line);
            Matcher answerMatcher = answerPattern.matcher(line);
            Matcher analysisMatcher = analysisPattern.matcher(line);
            
            if (questionMatcher.find() || bracketMatcher.find()) {
                // 遇到题号，开始新题目
                if (currentQuestion != null && !currentQuestion.isEmpty()) {
                    questions.add(currentQuestion);
                }
                currentQuestion = new HashMap<>();
                currentQuestion.put("options", new ArrayList<String>());
                inAnalysis = false;

                String questionText = questionMatcher.replaceAll("").trim();
                questionText = bracketPattern.matcher(questionText).replaceAll("").trim();
                if (!questionText.isEmpty()) {
                    currentQuestion.put("question", questionText);
                }
            } else if (answerMatcher.find()) {
                // 遇到答案行
                if (currentQuestion != null) {
                    String answer = answerMatcher.replaceAll("").trim().toUpperCase();
                    currentQuestion.put("answer", answer);
                    inAnalysis = false;
                } else {
                    // 如果没有当前题目，创建一个新的空题目
                    currentQuestion = new HashMap<>();
                    currentQuestion.put("options", new ArrayList<String>());
                    String answer = answerMatcher.replaceAll("").trim().toUpperCase();
                    currentQuestion.put("answer", answer);
                    inAnalysis = false;
                }
            } else if (analysisMatcher.find()) {
                // 遇到解析行
                if (currentQuestion != null) {
                    String analysis = analysisMatcher.replaceAll("").trim();
                    currentQuestion.put("analysis", analysis);
                    inAnalysis = true;
                } else {
                    // 如果没有当前题目，创建一个新的空题目
                    currentQuestion = new HashMap<>();
                    currentQuestion.put("options", new ArrayList<String>());
                    String analysis = analysisMatcher.replaceAll("").trim();
                    currentQuestion.put("analysis", analysis);
                    inAnalysis = true;
                }
            } else if (optionMatcher.find()) {
                // 遇到选项行
                if (currentQuestion == null) {
                    // 如果没有当前题目，创建一个新题目
                    currentQuestion = new HashMap<>();
                    currentQuestion.put("options", new ArrayList<String>());
                    inAnalysis = false;
                }
                String optionText = optionMatcher.replaceAll("").trim();
                @SuppressWarnings("unchecked")
                List<String> options = (List<String>) currentQuestion.get("options");
                options.add(optionText);
                inAnalysis = false;
            } else if (inAnalysis && currentQuestion != null) {
                // 解析内容继续
                String existingAnalysis = (String) currentQuestion.get("analysis");
                if (existingAnalysis == null) {
                    existingAnalysis = "";
                }
                currentQuestion.put("analysis", existingAnalysis + "\n" + line);
            } else if (currentQuestion != null && !line.matches("^[A-Ea-e][．.、].*")) {
                // 添加到题目内容
                String existingQuestion = (String) currentQuestion.get("question");
                if (existingQuestion == null) {
                    existingQuestion = "";
                }
                currentQuestion.put("question", existingQuestion + "\n" + line);
            } else if (currentQuestion == null) {
                // 没有题号，第一行是题目内容
                currentQuestion = new HashMap<>();
                currentQuestion.put("options", new ArrayList<String>());
                currentQuestion.put("question", line);
                inAnalysis = false;
            }
        }

        if (currentQuestion != null && !currentQuestion.isEmpty()) {
            // 检查是否至少有题目内容或选项
            String questionText = (String) currentQuestion.get("question");
            @SuppressWarnings("unchecked")
            List<String> options = (List<String>) currentQuestion.get("options");
            if ((questionText != null && !questionText.isEmpty()) || (options != null && !options.isEmpty())) {
                questions.add(currentQuestion);
            }
        }

        return questions;
    }

    private List<String> getValidTypes() {
        List<QuestionType> types = questionTypeRepository.findByEnabledTrueOrderBySortOrder();
        List<String> validTypes = new ArrayList<>();
        for (QuestionType type : types) {
            validTypes.add(type.getTypeCode());
        }
        if (validTypes.isEmpty()) {
            validTypes.addAll(Arrays.asList("single", "multiple", "judgment"));
        }
        return validTypes;
    }

    private String determineQuestionType(Map<String, Object> question, String specifiedType, List<String> validTypes) {
        if (specifiedType != null && validTypes.contains(specifiedType)) {
            return specifiedType;
        }

        Object optionsObj = question.get("options");
        int optionsCount = 0;
        if (optionsObj instanceof List) {
            optionsCount = ((List<?>) optionsObj).size();
        }

        Object answerObj = question.get("answer");
        String answer = "";
        if (answerObj instanceof String) {
            answer = (String) answerObj;
        }

        if (optionsCount == 2) {
            return "judgment";
        } else if (optionsCount >= 5 || answer.length() > 1) {
            return "multiple";
        }
        return "single";
    }

    private List<String> convertAnswer(Object answerObj) {
        List<String> answerArray = new ArrayList<>();
        if (answerObj instanceof List) {
            for (Object item : (List<?>) answerObj) {
                answerArray.add(String.valueOf(item));
            }
        } else if (answerObj instanceof String) {
            String answer = (String) answerObj;
            for (char c : answer.toCharArray()) {
                answerArray.add(String.valueOf(c));
            }
        }
        return answerArray;
    }

    private void updateExamStats(String examCode, String tableName) {
        try {
            Integer total = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM " + tableName, Integer.class);
            if (total == null) total = 0;

            Integer singleCount = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM " + tableName + " WHERE type = 'single'", Integer.class);
            if (singleCount == null) singleCount = 0;

            Integer multipleCount = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM " + tableName + " WHERE type = 'multiple'", Integer.class);
            if (multipleCount == null) multipleCount = 0;

            Integer judgmentCount = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM " + tableName + " WHERE type = 'judgment'", Integer.class);
            if (judgmentCount == null) judgmentCount = 0;

            examConfigRepository.updateStats(examCode, total, singleCount, multipleCount, judgmentCount);
        } catch (Exception e) {
            // 忽略统计更新错误
        }
    }
}