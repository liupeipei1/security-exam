package com.exam.question.controller;

import com.exam.common.api.ApiResult;
import com.exam.question.service.QuestionService;
import com.exam.question.service.VipGuardService;
import com.exam.question.util.OpenidContext;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping({"/api/questions", "/api/question"})
public class QuestionController {

    private final QuestionService questionService;
    private final VipGuardService vipGuardService;

    public QuestionController(QuestionService questionService, VipGuardService vipGuardService) {
        this.questionService = questionService;
        this.vipGuardService = vipGuardService;
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
     * 获取所有标签列表
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
        Object optionsObj = body.get("options");
        String options = optionsObj != null ? optionsObj.toString() : null;
        
        Object answerObj = body.get("answer");
        String[] answer = null;
        if (answerObj instanceof List) {
            List<?> answerList = (List<?>) answerObj;
            answer = answerList.stream()
                    .map(Object::toString)
                    .toArray(String[]::new);
        } else if (answerObj instanceof String) {
            answer = new String[]{(String) answerObj};
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
     * 导入题目
     */
    @PostMapping("/import")
    public ApiResult importQuestions(@RequestBody Map<String, Object> body) {
        String content = (String) body.get("content");
        String examCode = (String) body.get("exam_code");
        String questionType = (String) body.get("question_type");
        Long guideId = body.get("guide_id") != null ? ((Number) body.get("guide_id")).longValue() : null;
        Long knowledgePointId = body.get("knowledge_point_id") != null ? ((Number) body.get("knowledge_point_id")).longValue() : null;
        
        if (content == null || content.trim().isEmpty()) {
            return ApiResult.fail("题目内容不能为空");
        }
        
        if (examCode == null || examCode.trim().isEmpty()) {
            return ApiResult.fail("题库代码不能为空");
        }
        
        Map<String, Object> result = questionService.importQuestions(content, examCode, questionType, guideId, knowledgePointId);
        
        if ((Boolean) result.get("success")) {
            return ApiResult.ok(result);
        } else {
            return ApiResult.fail((String) result.get("message"));
        }
    }
}
