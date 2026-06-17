package com.exam.question.controller;

import com.exam.question.service.GuideService;
import com.exam.common.api.ApiResult;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * 考试指南控制器
 */
@RestController
@RequestMapping("/api")
public class GuideController {

    private final GuideService guideService;

    /**
     * 默认考试指南数据（当数据库中找不到时使用）
     */
    private static final Map<String, Map<String, Object>> EXAM_GUIDES = new LinkedHashMap<>();

    static {
        // 网络与信息安全管理员三级
        Map<String, Object> securityAdmin3 = new LinkedHashMap<>();
        securityAdmin3.put("title", "网络与信息安全管理员（三级）");
        securityAdmin3.put("examOverview", "网络与信息安全管理员三级考试为机考形式，总分100分，考试时长120分钟。合格线为60分。");
        securityAdmin3.put("examContent", Arrays.asList(
                "计算机网络基础知识",
                "网络安全概述与防护",
                "防火墙与入侵检测技术",
                "加密与认证技术",
                "安全管理制度与规范",
                "操作系统安全"
        ));
        securityAdmin3.put("questionTypeDistribution", Arrays.asList(
                Map.of("type", "单选题", "count", 60, "score", 60, "detail", "每题1分"),
                Map.of("type", "多选题", "count", 20, "score", 40, "detail", "每题2分")
        ));
        securityAdmin3.put("preparationTips", Arrays.asList(
                "掌握TCP/IP协议栈",
                "熟悉常见网络攻击手段",
                "理解加密算法原理",
                "多做模拟练习题"
        ));
        EXAM_GUIDES.put("security_admin_3", securityAdmin3);
        EXAM_GUIDES.put("security_exam_3", securityAdmin3);

        // 网络与信息安全管理员四级
        Map<String, Object> securityAdmin4 = new LinkedHashMap<>();
        securityAdmin4.put("title", "网络与信息安全管理员（四级）");
        securityAdmin4.put("examOverview", "网络与信息安全管理员四级考试为机考形式，总分100分，考试时长90分钟。合格线为60分。");
        securityAdmin4.put("examContent", Arrays.asList(
                "计算机基础知识",
                "网络基础与应用",
                "信息安全基础",
                "安全防护措施",
                "安全操作规范",
                "常见安全威胁"
        ));
        securityAdmin4.put("questionTypeDistribution", Arrays.asList(
                Map.of("type", "单选题", "count", 80, "score", 80, "detail", "每题1分"),
                Map.of("type", "判断题", "count", 20, "score", 20, "detail", "每题1分")
        ));
        securityAdmin4.put("preparationTips", Arrays.asList(
                "学习计算机基础知识",
                "理解网络基本原理",
                "了解常见安全威胁",
                "掌握基本防护措施"
        ));
        EXAM_GUIDES.put("security_admin_4", securityAdmin4);

        // 人工智能训练师三级
        Map<String, Object> aiTrainer3 = new LinkedHashMap<>();
        aiTrainer3.put("title", "人工智能训练师（三级）");
        aiTrainer3.put("examOverview", "人工智能训练师三级考试为机考形式，总分100分，考试时长120分钟。合格线为60分。");
        aiTrainer3.put("examContent", Arrays.asList(
                "人工智能基础知识",
                "机器学习基本原理",
                "数据标注技术",
                "模型训练与评估",
                "人工智能伦理",
                "AI工具与平台使用"
        ));
        aiTrainer3.put("questionTypeDistribution", Arrays.asList(
                Map.of("type", "单选题", "count", 50, "score", 50, "detail", "每题1分"),
                Map.of("type", "多选题", "count", 20, "score", 40, "detail", "每题2分"),
                Map.of("type", "实操题", "count", 1, "score", 10, "detail", "共10分")
        ));
        aiTrainer3.put("preparationTips", Arrays.asList(
                "掌握机器学习基本原理",
                "多做模拟练习题",
                "关注人工智能行业最新发展"
        ));
        EXAM_GUIDES.put("ai_trainer_3", aiTrainer3);

        // 银行从业资格中级考试指南
        Map<String, Object> bankingMedium = new LinkedHashMap<>();
        bankingMedium.put("title", "银行从业资格中级（2026）");
        bankingMedium.put("examOverview", "银行从业资格中级考试为机考形式，总分100分，考试时长120分钟。合格线为60分。多选题错选不得分，少选按比例给分。案例题以情境+小题组合，侧重实务应用。");
        bankingMedium.put("examContent", Arrays.asList(
                "必考科目：法律法规与综合能力",
                "选考科目：个人理财、个人贷款、公司信贷、风险管理、银行管理",
                "考试形式：计算机考试",
                "考试时长：120分钟",
                "总分：100分",
                "合格线：60分"
        ));
        bankingMedium.put("questionTypeDistribution", Arrays.asList(
                Map.of("type", "单选题", "count", 80, "score", 40, "detail", "每题0.5分"),
                Map.of("type", "多选题", "count", 25, "score", 50, "detail", "每题2分"),
                Map.of("type", "判断题", "count", 10, "score", 10, "detail", "每题1分")
        ));
        bankingMedium.put("preparationTips", Arrays.asList(
                "系统学习银行业法律法规体系",
                "理解金融监管的基本原则",
                "掌握主要银行业务的操作规范",
                "关注最新监管政策变化",
                "结合实际案例理解法律条文",
                "通过模拟考试检验学习效果"
        ));
        EXAM_GUIDES.put("banking_medium", bankingMedium);

        // 法律法规与综合能力（必考）
        Map<String, Object> bankingLaw = new LinkedHashMap<>();
        bankingLaw.put("title", "法律法规与综合能力（必考）");
        bankingLaw.put("examOverview", "法律法规与综合能力为银行从业资格中级考试的必考科目，机考形式，总分100分，考试时长120分钟。");
        bankingLaw.put("examContent", Arrays.asList(
                "银行业法律法规体系",
                "金融监管框架",
                "商业银行经营规则",
                "银行业消费者权益保护",
                "反洗钱与合规管理",
                "银行业从业人员职业操守"
        ));
        bankingLaw.put("questionTypeDistribution", Arrays.asList(
                Map.of("type", "单选题", "count", 80, "score", 40, "detail", "每题0.5分"),
                Map.of("type", "多选题", "count", 25, "score", 50, "detail", "每题2分"),
                Map.of("type", "判断题", "count", 10, "score", 10, "detail", "每题1分")
        ));
        bankingLaw.put("preparationTips", Arrays.asList(
                "系统学习银行业法律法规体系",
                "理解金融监管的基本原则",
                "掌握主要银行业务的操作规范",
                "关注最新监管政策变化",
                "结合实际案例理解法律条文",
                "通过模拟考试检验学习效果"
        ));
        EXAM_GUIDES.put("banking_law", bankingLaw);
        EXAM_GUIDES.put("bank_banking_law", bankingLaw);

        // 个人理财
        Map<String, Object> personalFinance = new LinkedHashMap<>();
        personalFinance.put("title", "个人理财");
        personalFinance.put("examOverview", "个人理财为银行从业资格中级考试的选考科目，机考形式，总分100分，考试时长120分钟。");
        personalFinance.put("examContent", Arrays.asList(
                "个人理财业务概述",
                "个人理财业务管理",
                "个人理财业务风险管理",
                "个人理财业务合规与法律约束",
                "个人理财业务发展趋势",
                "理财规划实务"
        ));
        personalFinance.put("questionTypeDistribution", Arrays.asList(
                Map.of("type", "单选题", "count", 40, "score", 20, "detail", "每题0.5分"),
                Map.of("type", "多选题", "count", 20, "score", 20, "detail", "每题1分"),
                Map.of("type", "单项规划题", "count", 25, "score", 30, "detail", "共30分"),
                Map.of("type", "综合案例题", "count", 20, "score", 30, "detail", "共30分")
        ));
        personalFinance.put("preparationTips", Arrays.asList(
                "掌握个人理财基本理论和方法",
                "熟悉各类理财产品特点",
                "学习理财规划流程和技巧",
                "分析典型理财案例",
                "通过模拟题提高解题能力",
                "关注金融市场动态"
        ));
        EXAM_GUIDES.put("personal_finance", personalFinance);
        EXAM_GUIDES.put("bank_personal_finance", personalFinance);

        // 个人贷款
        Map<String, Object> personalLoan = new LinkedHashMap<>();
        personalLoan.put("title", "个人贷款");
        personalLoan.put("examOverview", "个人贷款为银行从业资格中级考试的选考科目，机考形式，总分100分，考试时长120分钟。");
        personalLoan.put("examContent", Arrays.asList(
                "个人贷款业务概述",
                "个人贷款业务流程",
                "个人贷款风险管理",
                "个人贷款产品分类",
                "个人贷款合规管理",
                "个人贷款发展趋势"
        ));
        personalLoan.put("questionTypeDistribution", Arrays.asList(
                Map.of("type", "单选题", "count", 60, "score", 30, "detail", "每题0.5分"),
                Map.of("type", "多选题", "count", 20, "score", 20, "detail", "每题2分"),
                Map.of("type", "判断题", "count", 10, "score", 10, "detail", "每题1分"),
                Map.of("type", "综合案例题", "count", 5, "score", 20, "detail", "共20分")
        ));
        personalLoan.put("preparationTips", Arrays.asList(
                "掌握个人贷款基本概念和分类",
                "熟悉贷款业务流程",
                "理解风险管理要点",
                "学习贷款审批要点",
                "分析典型案例",
                "关注监管政策变化"
        ));
        EXAM_GUIDES.put("personal_loan", personalLoan);
        EXAM_GUIDES.put("bank_personal_loan", personalLoan);

        // 公司信贷
        Map<String, Object> corporateCredit = new LinkedHashMap<>();
        corporateCredit.put("title", "公司信贷");
        corporateCredit.put("examOverview", "公司信贷为银行从业资格中级考试的选考科目，机考形式，总分100分，考试时长120分钟。");
        corporateCredit.put("examContent", Arrays.asList(
                "公司信贷业务概述",
                "公司信贷业务流程",
                "公司信贷风险管理",
                "贷款担保管理",
                "信贷审批与发放",
                "贷后管理"
        ));
        corporateCredit.put("questionTypeDistribution", Arrays.asList(
                Map.of("type", "单选题", "count", 70, "score", 35, "detail", "每题0.5分"),
                Map.of("type", "多选题", "count", 30, "score", 30, "detail", "每题1分"),
                Map.of("type", "判断题", "count", 10, "score", 5, "detail", "每题0.5分"),
                Map.of("type", "综合案例题", "count", 5, "score", 30, "detail", "共30分")
        ));
        corporateCredit.put("preparationTips", Arrays.asList(
                "掌握公司信贷基本理论",
                "熟悉信贷业务全流程",
                "理解授信审批要点",
                "学习风险评估方法",
                "分析典型信贷案例",
                "关注宏观经济形势"
        ));
        EXAM_GUIDES.put("corporate_credit", corporateCredit);
        EXAM_GUIDES.put("bank_corporate_credit", corporateCredit);

        // 风险管理
        Map<String, Object> riskManagement = new LinkedHashMap<>();
        riskManagement.put("title", "风险管理");
        riskManagement.put("examOverview", "风险管理为银行从业资格中级考试的选考科目，机考形式，总分100分，考试时长120分钟。");
        riskManagement.put("examContent", Arrays.asList(
                "风险管理基础",
                "信用风险管理",
                "市场风险管理",
                "操作风险管理",
                "流动性风险管理",
                "风险计量与监测"
        ));
        riskManagement.put("questionTypeDistribution", Arrays.asList(
                Map.of("type", "单选题", "count", 80, "score", 40, "detail", "每题0.5分"),
                Map.of("type", "多选题", "count", 30, "score", 45, "detail", "每题1.5分"),
                Map.of("type", "综合案例题", "count", 14, "score", 15, "detail", "共15分")
        ));
        riskManagement.put("preparationTips", Arrays.asList(
                "系统学习风险管理理论",
                "掌握各类风险识别方法",
                "理解风险计量模型",
                "学习风险控制策略",
                "分析典型风险案例",
                "关注行业风险管理动态"
        ));
        EXAM_GUIDES.put("risk_management", riskManagement);
        EXAM_GUIDES.put("bank_risk_management", riskManagement);

        // 银行管理
        Map<String, Object> bankManagement = new LinkedHashMap<>();
        bankManagement.put("title", "银行管理");
        bankManagement.put("examOverview", "银行管理为银行从业资格中级考试的选考科目，机考形式，总分100分，考试时长120分钟。");
        bankManagement.put("examContent", Arrays.asList(
                "商业银行经营管理",
                "银行内部控制",
                "银行合规管理",
                "银行风险管理",
                "银行业务创新",
                "银行业监管"
        ));
        bankManagement.put("questionTypeDistribution", Arrays.asList(
                Map.of("type", "单选题", "count", 80, "score", 40, "detail", "每题0.5分"),
                Map.of("type", "多选题", "count", 20, "score", 30, "detail", "每题1.5分"),
                Map.of("type", "判断题", "count", 30, "score", 30, "detail", "每题1分")
        ));
        bankManagement.put("preparationTips", Arrays.asList(
                "掌握商业银行经营管理理论",
                "熟悉银行内部控制体系",
                "理解合规管理要求",
                "学习风险管理框架",
                "关注银行业监管政策",
                "分析银行经营案例"
        ));
        EXAM_GUIDES.put("bank_management", bankManagement);
    }

    @Autowired
    public GuideController(GuideService guideService) {
        this.guideService = guideService;
    }

    /**
     * 获取考试指南
     * GET /api/guide
     */
    @GetMapping("/guide")
    public ApiResult<Map<String, Object>> getGuide(@RequestParam(value = "exam_code", required = false) String examCode) {
        System.out.println("========== /api/guide 接口被调用 ==========");
        
        System.out.println("请求参数 code: " + examCode);

        if (examCode == null || examCode.isEmpty()) {
            return ApiResult.fail("缺少必要参数 exam_code");
        }

        // 首先尝试从数据库获取
        Map<String, Object> result = guideService.getGuide(examCode);
        
        if ((Boolean) result.get("success")) {
            Map<String, Object> guide = (Map<String, Object>) result.get("guide");
            // 如果数据库返回的是默认指南（没有从数据库找到），尝试从静态数据获取
            String guideExamCode = (String) guide.get("exam_code");
            if ("暂无详细描述".equals(guide.get("description"))) {
                Map<String, Object> staticGuide = EXAM_GUIDES.get(examCode);
                if (staticGuide != null) {
                    System.out.println("从静态数据查询到考试指南: " + staticGuide.get("title"));
                    return ApiResult.ok(staticGuide);
                }
            }
            return ApiResult.ok(guide);
        } else {
            // 如果数据库查询失败，尝试从静态数据获取
            Map<String, Object> staticGuide = EXAM_GUIDES.get(examCode);
            if (staticGuide != null) {
                System.out.println("从静态数据查询到考试指南: " + staticGuide.get("title"));
                return ApiResult.ok(staticGuide);
            } else {
                System.out.println("未找到对应指南，返回默认指南");
                return ApiResult.ok(EXAM_GUIDES.get("security_admin_3"));
            }
        }
    }

    /**
     * 获取考试指南列表
     * GET /api/guide/list
     */
    @GetMapping("/guide/list")
    public ApiResult<Map<String, Object>> getGuideList() {
        System.out.println("========== /api/guide/list 接口被调用 ==========");
        
        Map<String, Object> result = guideService.getGuideList();
        
        if ((Boolean) result.get("success")) {
            return ApiResult.ok(result);
        } else {
            return ApiResult.fail("获取指南列表失败");
        }
    }

    /**
     * 更新考试指南
     * PUT /api/guide
     */
    @PutMapping("/guide")
    public ApiResult<Map<String, Object>> updateGuide(@RequestBody Map<String, Object> requestBody) {
        System.out.println("========== /api/guide 接口被调用(更新) ==========");
        
        String examCode = (String) requestBody.get("exam_code");
        
        if (examCode == null || examCode.isEmpty()) {
            return ApiResult.fail("缺少必要参数 exam_code");
        }

        Map<String, Object> result = guideService.updateGuide(examCode, requestBody);
        
        if ((Boolean) result.get("success")) {
            return ApiResult.ok(result);
        } else {
            return ApiResult.fail((String) result.get("message"));
        }
    }
}