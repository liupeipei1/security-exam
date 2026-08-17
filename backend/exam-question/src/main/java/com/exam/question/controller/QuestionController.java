package com.exam.question.controller;

import com.exam.common.api.ApiResult;
import com.exam.question.service.QuestionImportService;
import com.exam.question.service.QuestionService;
import com.exam.question.service.VipGuardService;
import com.exam.question.util.OpenidContext;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping({"/api/questions", "/api/question"})
public class QuestionController {

    private final QuestionService questionService;
    private final VipGuardService vipGuardService;

    private final QuestionImportService questionImportService;

    public QuestionController(QuestionService questionService, VipGuardService vipGuardService,
                             QuestionImportService questionImportService) {
        this.questionService = questionService;
        this.vipGuardService = vipGuardService;
        this.questionImportService = questionImportService;
    }

    /*
     GET /api/questions?exam_code=**&openid=**
     */
    @GetMapping
    public ApiResult<List<Map<String, Object>>> list(
            HttpServletRequest request,
            @RequestParam(required = false) String openid,
            @RequestParam(name = "exam_code", required = false) String examCode) {
        vipGuardService.requireVip(OpenidContext.resolve(request, openid));
        return ApiResult.ok(questionService.listAll(examCode, true));
    }

    @GetMapping("/random")
    public ApiResult<Map<String, Object>> randomOne(
            HttpServletRequest request,
            @RequestParam(required = false) String openid,
            @RequestParam(name = "exam_code", required = false) String examCode) {
        vipGuardService.requireVip(OpenidContext.resolve(request, openid));
        Map<String, Object> q = questionService.randomOne(examCode);
        if (q == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "没有找到题目");
        }
        return ApiResult.ok(q);
    }

    @GetMapping("/random/{count}")
    public ApiResult<List<Map<String, Object>>> randomMany(
            HttpServletRequest request,
            @RequestParam(required = false) String openid,
            @RequestParam(name = "exam_code", required = false) String examCode,
            @PathVariable int count) {
        vipGuardService.requireVip(OpenidContext.resolve(request, openid));
        return ApiResult.ok(questionService.random(examCode, count <= 0 ? 10 : count));
    }

    @GetMapping("/type/{type}")
    public ApiResult<List<Map<String, Object>>> byType(
            HttpServletRequest request,
            @RequestParam(required = false) String openid,
            @RequestParam(name = "exam_code", required = false) String examCode,
            @PathVariable String type) {
        vipGuardService.requireVip(OpenidContext.resolve(request, openid));
        return ApiResult.ok(questionService.byType(examCode, type));
    }

    /**
     * 获取题目类型列表
     * 如果传入 examCode，则返回该题库中实际存在的题型；否则返回所有配置的题型
     */
    @GetMapping("/types")
    public ApiResult<List<Map<String, Object>>> getQuestionTypes(
            @RequestParam(value = "examCode", required = false) String examCode) {
        if (examCode != null && !examCode.isEmpty()) {
            return ApiResult.ok(questionService.getQuestionTypesByExam(examCode));
        }
        return ApiResult.ok(questionService.getAllQuestionTypes());
    }

    /**
     * 获取所有标签列表 不需要VIP校验
     */
    @GetMapping("/tags")
    public ApiResult<List<String>> getTags(@RequestParam("exam_code") String examCode) {
        return ApiResult.ok(questionService.getTags(examCode));
    }

    @GetMapping("/count")
    public ApiResult<Map<String, Object>> count(@RequestParam(name = "exam_code", required = false) String examCode) {
        return ApiResult.ok(questionService.countStats(examCode));
    }

    /**
     * 保存题目解析
     * POST /api/question/explanation
     */
    @PostMapping("/explanation")
    public ApiResult<Void> saveExplanation(
            @RequestBody Map<String, Object> body) {
        System.out.println("========== /api/questions/explanation 接口被调用 ==========");
        
        String examCode = (String) body.get("exam_code");
        Object questionIdObj = body.get("question_id");
        String explanation = (String) body.get("explanation");
        
        if (examCode == null || examCode.isEmpty() || questionIdObj == null) {
            return ApiResult.fail("缺少必要参数");
        }
        
        Long questionId;
        if (questionIdObj instanceof Number) {
            questionId = ((Number) questionIdObj).longValue();
        } else {
            questionId = Long.parseLong(questionIdObj.toString());
        }
        
        boolean success = questionService.saveExplanation(examCode, questionId, explanation);
        
        if (success) {
            return ApiResult.okMessage("保存成功");
        } else {
            return ApiResult.fail("题目不存在");
        }
    }

    /**
     * 更新题目
     * PUT /api/questions/{exam_code}/{id}
     */
    @PutMapping("/{exam_code}/{id}")
    public ApiResult<Void> updateQuestion(
            @PathVariable("exam_code") String examCode,
            @PathVariable("id") Long id,
            @RequestBody Map<String, Object> body) {
        System.out.println("========== PUT /api/questions/" + examCode + "/" + id + " 接口被调用 ==========");
        System.out.println("请求体内容: " + body.toString());
        
        String question = (String) body.get("question");
        
        // 正确处理 options 参数（前端传入的是数组）
        Object optionsObj = body.get("options");
        String options = null;
        if (optionsObj instanceof List) {
            options = com.alibaba.fastjson2.JSON.toJSONString(optionsObj);
        } else if (optionsObj != null) {
            options = optionsObj.toString();
        }
        
        Object answerObj = body.get("answer");
        String[] answer = null;
        if (answerObj instanceof List) {
            List<?> answerList = (List<?>) answerObj;
            answer = answerList.stream()
                    .map(Object::toString)
                    .toArray(String[]::new);
        } else if (answerObj instanceof String) {
            answer = new String[]{(String) answerObj};
        } else if (answerObj instanceof Number) {
            answer = new String[]{answerObj.toString()};
        }
        
        String analysis = (String) body.get("analysis");
        String explanation = (String) body.get("explanation");
        // 如果analysis为空，使用explanation字段（前端可能使用explanation作为字段名）
        if (analysis == null || analysis.isEmpty()) {
            analysis = explanation;
        }
        
        String type = (String) body.get("type");
        Object knowledgePointObj = body.get("knowledgePoint");
        
        Long knowledgePointId = null;
        if (knowledgePointObj instanceof Number) {
            knowledgePointId = ((Number) knowledgePointObj).longValue();
        } else if (knowledgePointObj != null) {
            try {
                knowledgePointId = Long.parseLong(knowledgePointObj.toString());
            } catch (NumberFormatException e) {
                // 忽略无效的知识要点ID
            }
        }
        
        boolean success = questionService.updateQuestion(examCode, id, question, options, answer, analysis, type, knowledgePointId);
        
        if (success) {
            return ApiResult.okMessage("更新成功");
        } else {
            return ApiResult.fail("题目不存在");
        }
    }

    /**
     * 删除题目
     * DELETE /api/questions/{exam_code}/{id}
     */
    @DeleteMapping("/{exam_code}/{id}")
    public ApiResult<Void> deleteQuestion(
            @PathVariable("exam_code") String examCode,
            @PathVariable("id") Long id) {
        System.out.println("========== DELETE /api/questions/" + examCode + "/" + id + " 接口被调用 ==========");
        
        boolean success = questionService.deleteQuestion(examCode, id);
        
        if (success) {
            return ApiResult.okMessage("删除成功");
        } else {
            return ApiResult.fail("题目不存在");
        }
    }

    /**
     * 批量更新题目标签
     * PUT /api/questions/{exam_code}/tags/batch
     */
    @PutMapping("/{exam_code}/tags/batch")
    public ApiResult<Void> batchUpdateTags(
            @PathVariable("exam_code") String examCode,
            @RequestBody Map<String, Object> body) {
        List<?> questionIdsObj = (List<?>) body.get("question_ids");
        String tags = (String) body.get("tags");
        
        if (questionIdsObj == null || questionIdsObj.isEmpty()) {
            return ApiResult.fail("题目ID列表不能为空");
        }
        
        List<Long> questionIds = questionIdsObj.stream()
                .map(obj -> {
                    if (obj instanceof Number) {
                        return ((Number) obj).longValue();
                    }
                    return Long.parseLong(obj.toString());
                })
                .toList();
        
        boolean success = questionService.batchUpdateTags(examCode, questionIds, tags);
        
        if (success) {
            return ApiResult.okMessage("更新成功");
        } else {
            return ApiResult.fail("更新失败");
        }
    }

    /**
     * 批量更新题目类型
     * PUT /api/questions/{exam_code}/type/batch
     */
    @PutMapping("/{exam_code}/type/batch")
    public ApiResult<Void> batchUpdateType(
            @PathVariable("exam_code") String examCode,
            @RequestBody Map<String, Object> body) {
        List<?> questionIdsObj = (List<?>) body.get("question_ids");
        String questionType = (String) body.get("question_type");
        
        if (questionIdsObj == null || questionIdsObj.isEmpty()) {
            return ApiResult.fail("题目ID列表不能为空");
        }
        
        List<Long> questionIds = questionIdsObj.stream()
                .map(obj -> {
                    if (obj instanceof Number) {
                        return ((Number) obj).longValue();
                    }
                    return Long.parseLong(obj.toString());
                })
                .toList();
        
        boolean success = questionService.batchUpdateType(examCode, questionIds, questionType);
        
        if (success) {
            return ApiResult.okMessage("更新成功");
        } else {
            return ApiResult.fail("更新失败");
        }
    }

    /**
     * 导入题目（表单格式）
     * POST /api/questions/import
     * 支持 multipart/form-data 和 application/x-www-form-urlencoded
     */
    @PostMapping(value = "/import", consumes = {"multipart/form-data", "application/x-www-form-urlencoded"})
    public ApiResult importQuestionsForm(
            @RequestParam(value = "content", required = false) String content,
            @RequestParam(value = "exam_code", required = false) String examCode,
            @RequestParam(value = "table_name", required = false) String tableName,
            @RequestParam(value = "exam_name", required = false) String examName,
            @RequestParam(value = "question_type", required = false) String questionType,
            @RequestParam(value = "source_set", required = false) Integer sourceSet,
            @RequestParam(value = "tags", required = false) String tags,
            @RequestParam(value = "images", required = false) MultipartFile[] images) {
        
        System.out.println("========== /api/questions/import 接口被调用 ==========");
        
        // 打印接收到的参数用于调试
        System.out.println("content: " + content);
        System.out.println("examCode: " + examCode);
        System.out.println("tableName: " + tableName);
        
        try {
            Map<String, Object> result = questionImportService.importQuestions(
                    content, examCode, tableName, examName, questionType, sourceSet, tags, images);
            
            if ((Boolean) result.get("success")) {
                return ApiResult.ok(result);
            } else {
                return ApiResult.fail((String) result.get("message"));
            }
        } catch (IOException e) {
            System.err.println("文件处理失败: " + e.getMessage());
            e.printStackTrace();
            return ApiResult.fail("文件处理失败: " + e.getMessage());
        } catch (Exception e) {
            System.err.println("导入失败: " + e.getMessage());
            e.printStackTrace();
            return ApiResult.fail("服务器内部错误");
        }
    }
}
