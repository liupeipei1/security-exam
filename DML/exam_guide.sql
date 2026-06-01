-- 创建考试指南表
CREATE TABLE IF NOT EXISTS exam_guide (
    id INT AUTO_INCREMENT PRIMARY KEY,
    exam_code VARCHAR(50) NOT NULL COMMENT '考试编码',
    title VARCHAR(200) NOT NULL COMMENT '指南标题',
    exam_overview TEXT COMMENT '考试概述',
    exam_content TEXT COMMENT '考试内容（JSON数组格式）',
    question_type_distribution TEXT COMMENT '题型分布（JSON数组格式）',
    preparation_tips TEXT COMMENT '备考建议（JSON数组格式）',
    content LONGTEXT COMMENT '备考备注内容（支持HTML格式，可包含图片标签）',
    exam_duration INT DEFAULT 90 COMMENT '考试时长（分钟）',
    total_score INT DEFAULT 100 COMMENT '总分',
    pass_score INT DEFAULT 60 COMMENT '及格分数',
    enabled TINYINT(1) DEFAULT 1 COMMENT '是否启用',
    sort_order INT DEFAULT 0 COMMENT '排序顺序',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_exam_code (exam_code),
    KEY idx_enabled (enabled)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='考试指南表';

-- 插入网络与信息安全管理员（三级）理论知识考试指南
INSERT INTO exam_guide (exam_code, title, exam_overview, exam_content, question_type_distribution, preparation_tips, exam_duration, total_score, pass_score) VALUES (
    'security_exam_3',
    '网络与信息安全管理员（三级）理论知识',
    '网络与信息安全管理员（三级）理论知识考试采用闭卷机考方式，考核时间为90分钟，满分100分，60分及格。共计190道题目。',
    '【信息安全基础】信息安全概念、安全模型、安全框架\n【信息安全技术】信息安全协议、防火墙、入侵检测、VPN\n【网络安全技术】网络协议、防火墙、入侵检测、VPN\n【操作系统安全】Windows、Linux安全配置\n【数据安全】数据分类、数据加密、数据备份\n【安全管理】安全策略、风险评估、安全审计\n【法律法规】网络安全法、个人信息保护法等',
    '判断题：40题，每题0.5分，共20分\n单选题：140题，每题0.5分，共70分\n多选题：10题，每题1分，共10分\n合计：190题，总分100分',
    '【学习建议】系统学习信息安全基础知识\n【技能提升】熟悉常见安全工具和技术\n【练习方法】多做模拟练习题\n【知识更新】关注最新安全动态和威胁趋势\n【学习技巧】理解安全原理而非死记硬背',
    90,
    100,
    60
);


-- 插入人工智能训练师（三级）考试指南
INSERT INTO exam_guide (exam_code, title, exam_overview, exam_content, question_type_distribution, preparation_tips, exam_duration, total_score, pass_score) VALUES (
    'ai_trainer_3',
    '人工智能训练师（三级）理论知识考试',
    '人工智能训练师（三级）考试分为理论知识考试和操作技能考核两部分，主要考察考生对人工智能基础、数据标注、模型训练等知识的掌握程度。考试时长90分钟，满分100分，60分及格。',
    '["人工智能基础：人工智能概念、发展历程、应用场景", "机器学习基础：监督学习、无监督学习、强化学习", "数据标注：标注工具、标注规范、质量控制", "模型训练：训练流程、参数调优、模型评估", "数据安全与隐私：数据保护、隐私计算、合规要求", "职业道德：职业操守、数据伦理、社会责任"]',
    '[{"type": "单选题", "count": 140, "score": 70}, {"type": "判断题", "count": 40, "score": 20}, {"type": "多选题", "count": 10, "score": 10}]',
    '["系统学习人工智能基础知识", "熟悉数据标注工具和流程", "掌握机器学习基本原理", "多做模拟练习题", "关注人工智能行业最新发展"]',
    90,
    100,
    60
);

-- 插入银行从业资格中级-法律法规考试指南
INSERT INTO exam_guide (exam_code, title, exam_overview, exam_content, question_type_distribution, preparation_tips, exam_duration, total_score, pass_score) VALUES (
    'banking_law',
    '法律法规与综合能力（必考）',
    '银行业法律法规与综合能力是银行从业资格考试的必考科目，主要考察考生对银行业相关法律法规、金融监管、银行业务等知识的掌握程度。机考形式，总分100分，考试时长120分钟，60分及格。',
    '["银行业监管体系：中国人民银行、银保监会、外汇管理局的职责", "银行业法律法规：商业银行法、银行业监督管理法、票据法、证券法", "金融监管框架：审慎监管、合规监管、风险监管", "银行业务规则：存款业务、贷款业务、支付结算业务、外汇业务", "消费者权益保护：金融消费者权益保护法、产品宣传规范", "反洗钱与反恐怖融资：反洗钱法、客户身份识别、可疑交易报告", "银行业从业人员职业操守：职业道德、行为规范、从业准则"]',
    '[{"type": "单选题", "count": 80, "score": 40}, {"type": "多选题", "count": 25, "score": 50}, {"type": "判断题", "count": 10, "score": 10}]',
    '["系统学习银行业法律法规体系", "理解金融监管的基本原则", "掌握主要银行业务的操作规范", "关注最新监管政策变化", "结合实际案例理解法律条文", "通过模拟考试检验学习效果"]',
    120,
    100,
    60
);

-- 插入银行从业资格中级-个人理财考试指南
INSERT INTO exam_guide (exam_code, title, exam_overview, exam_content, question_type_distribution, preparation_tips, exam_duration, total_score, pass_score) VALUES (
    'personal_finance',
    '个人理财',
    '个人理财为银行从业资格中级考试的选考科目，机考形式，总分100分，考试时长120分钟，60分及格。多选题错选不得分，少选按比例给分。',
    '["个人理财业务概述：个人理财业务的定义、分类、发展现状", "个人理财业务管理：业务流程、风险管理、合规管理", "个人理财业务规范：职业道德规范、从业准则、反洗钱", "个人理财业务相关法律法规：民法通则、物权法、合同法、证券法、商业银行法等", "个人理财业务风险管理：市场风险、信用风险、操作风险、流动性风险", "个人理财业务营销：客户开发、客户关系维护、产品推广", "个人理财业务操作：理财产品销售、客户信息管理、业务档案管理", "个人理财业务创新：互联网金融、移动金融、智能理财"]',
    '[{"type":"单选题","count":40,"score":20,"detail":"每题0.5分，侧重基础概念、理财产品、理财法规、基础理论，难度低，保底分数"},{"type":"多选题","count":20,"score":20,"detail":"每题1分，多选、少选、错选均不得分，细碎知识点多，是常规失分点"},{"type":"单项规划题","count":25,"score":30,"detail":"中级特色题型，单一场景理财计算题，包含：年金、现值终值、房贷、个税、保险、投资收益率等，是拿分核心"},{"type":"综合案例题","count":20,"score":30,"detail":"家庭综合理财大案例，一题多问，嵌套计算、收支分析、资产负债、养老教育规划，难度最高、分值最重"}]',
    '["系统学习个人理财业务基础知识", "熟悉相关法律法规和监管要求", "掌握理财产品的特点和风险特征", "多做练习题，熟悉考试题型", "关注行业最新动态和政策变化", "制定合理的学习计划，循序渐进"]',
    120,
    100,
    60
);

-- 插入风险管理考试指南
INSERT INTO exam_guide (exam_code, title, exam_overview, exam_content, question_type_distribution, preparation_tips, exam_duration, total_score, pass_score) VALUES (
    'risk_management',
    '风险管理',
    '风险管理为银行从业资格中级考试的选考科目，机考形式，总分100分，考试时长120分钟，60分及格。',
    '["风险管理基础", "信用风险管理", "市场风险管理", "操作风险管理", "流动性风险管理", "风险计量与监测"]',
    '[{"type": "单选题", "count": 80, "score": 40, "detail": "每题0.5分"}, {"type": "多选题", "count": 30, "score": 45, "detail": "每题1.5分"}, {"type": "综合案例题", "count": 14, "score": 15, "detail": "共15分"}]',
    '["系统学习风险管理理论", "掌握各类风险识别方法", "理解风险计量模型", "学习风险控制策略", "分析典型风险案例", "关注行业风险管理动态"]',
    120,
    100,
    60
);

-- 插入个人贷款考试指南
INSERT INTO exam_guide (exam_code, title, exam_overview, exam_content, question_type_distribution, preparation_tips, exam_duration, total_score, pass_score) VALUES (
    'personal_loan',
    '个人贷款',
    '个人贷款为银行从业资格中级考试的选考科目，机考形式，总分100分，考试时长120分钟，60分及格。',
    '["个人贷款业务概述", "个人贷款业务流程", "个人贷款风险管理", "个人贷款产品分类", "个人贷款合规管理", "个人贷款发展趋势"]',
    '[{"type": "单选题", "count": 60, "score": 30, "detail": "每题0.5分"}, {"type": "多选题", "count": 20, "score": 20, "detail": "每题2分"}, {"type": "判断题", "count": 10, "score": 10, "detail": "每题1分"}, {"type": "综合案例题", "count": 5, "score": 20, "detail": "共20分"}]',
    '["掌握个人贷款基本概念和分类", "熟悉贷款业务流程", "理解风险管理要点", "学习贷款审批要点", "分析典型案例", "关注监管政策变化"]',
    120,
    100,
    60
);

-- 插入公司信贷考试指南
INSERT INTO exam_guide (exam_code, title, exam_overview, exam_content, question_type_distribution, preparation_tips, exam_duration, total_score, pass_score) VALUES (
    'corporate_credit',
    '公司信贷',
    '公司信贷为银行从业资格中级考试的选考科目，机考形式，总分100分，考试时长120分钟，60分及格。',
    '["公司信贷业务概述", "公司信贷业务流程", "公司信贷风险管理", "贷款担保管理", "信贷审批与发放", "贷后管理"]',
    '[{"type": "单选题", "count": 70, "score": 35, "detail": "每题0.5分"}, {"type": "多选题", "count": 30, "score": 30, "detail": "每题1分"}, {"type": "判断题", "count": 10, "score": 5, "detail": "每题0.5分"}, {"type": "综合案例题", "count": 5, "score": 30, "detail": "共30分"}]',
    '["掌握公司信贷基本理论", "熟悉信贷业务全流程", "理解授信审批要点", "学习风险评估方法", "分析典型信贷案例", "关注宏观经济形势"]',
    120,
    100,
    60
);

-- 插入银行管理考试指南
INSERT INTO exam_guide (exam_code, title, exam_overview, exam_content, question_type_distribution, preparation_tips, exam_duration, total_score, pass_score) VALUES (
    'bank_management',
    '银行管理',
    '银行管理为银行从业资格中级考试的选考科目，机考形式，总分100分，考试时长120分钟，60分及格。',
    '["商业银行经营管理", "银行内部控制", "银行合规管理", "银行风险管理", "银行业务创新", "银行业监管"]',
    '[{"type": "单选题", "count": 80, "score": 40, "detail": "每题0.5分"}, {"type": "多选题", "count": 20, "score": 20, "detail": "每题1分"}, {"type": "单项规划题", "count": 25, "score": 30, "detail": ""}, {"type": "综合案例题", "count": 20, "score": 30, "detail": ""}]',
    '["掌握商业银行经营管理理论", "熟悉银行内部控制体系", "理解合规管理要求", "学习风险管理框架", "关注银行业监管政策", "分析银行经营案例"]',
    120,
    100,
    60
);
