-- 创建知识要点表
CREATE TABLE IF NOT EXISTS knowledge_points (
  id INT PRIMARY KEY AUTO_INCREMENT,
  exam_code VARCHAR(50) NOT NULL COMMENT '所属题库代码',
  title VARCHAR(200) NOT NULL COMMENT '知识要点标题',
  content TEXT COMMENT '知识要点内容（支持HTML）',
  sort_order INT DEFAULT 0 COMMENT '排序顺序',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_exam_code (exam_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='知识要点表';

-- 网络与信息安全管理员三级知识要点
INSERT INTO knowledge_points (exam_code, title, content, sort_order) VALUES
('security_level3', '1. 信息安全基础概念', '信息安全是指保护信息系统的硬件、软件及相关数据，使其不受到偶然的或者恶意的原因而遭到破坏、更改、泄露，保证信息系统能够连续、可靠、正常地运行。<ul><li><strong>保密性</strong>：确保信息不被未授权的个人、实体或过程访问或披露</li><li><strong>完整性</strong>：保护信息的准确性和完整性，防止未经授权的修改</li><li><strong>可用性</strong>：确保授权用户在需要时能够访问所需的信息</li><li><strong>可控性</strong>：对信息的传播及内容具有控制能力</li><li><strong>不可否认性</strong>：确保信息的发送者和接收者无法否认其行为</li></ul>', 1),
('security_level3', '2. 网络安全威胁类型', '网络安全威胁是指对网络系统造成危害的各种潜在因素，主要包括以下类型：<ul><li><strong>恶意软件</strong>：病毒、蠕虫、木马、勒索软件等</li><li><strong>网络攻击</strong>：DDoS攻击、SQL注入、跨站脚本攻击(XSS)等</li><li><strong>社会工程学</strong>：钓鱼攻击、 pretexting、肩窥等</li><li><strong>内部威胁</strong>：员工误操作、恶意内部人员</li><li><strong>物理攻击</strong>：设备盗窃、未授权访问机房等</li></ul>', 2),
('security_level3', '3. 访问控制技术', '访问控制是信息安全的重要组成部分，用于限制对系统资源的访问。<ul><li><strong>自主访问控制(DAC)</strong>：资源所有者决定谁可以访问</li><li><strong>强制访问控制(MAC)</strong>：基于安全标签的强制性控制</li><li><strong>基于角色的访问控制(RBAC)</strong>：根据角色分配权限</li><li><strong>最小权限原则</strong>：只授予完成工作所需的最小权限</li></ul>', 3),
('security_level3', '4. 加密技术基础', '加密技术是保护数据安全的核心手段，分为对称加密和非对称加密。<ul><li><strong>对称加密</strong>：加密和解密使用相同密钥，如AES、DES</li><li><strong>非对称加密</strong>：使用公钥和私钥配对，如RSA、ECC</li><li><strong>哈希函数</strong>：生成固定长度的消息摘要，如MD5、SHA-256</li><li><strong>数字签名</strong>：用于验证数据完整性和身份认证</li></ul>', 4),
('security_level3', '5. 安全管理体系', '信息安全管理体系(ISMS)是组织整体管理体系的一部分，基于业务风险方法建立、实施、运行、监视、评审、维护和改进信息安全。<ul><li><strong>ISO 27001</strong>：信息安全管理体系国际标准</li><li><strong>风险评估</strong>：识别、分析和评价信息安全风险</li><li><strong>安全策略</strong>：组织信息安全的方针和原则</li><li><strong>安全审计</strong>：定期检查安全措施的有效性</li></ul>', 5);

-- 人工智能训练师三级知识要点
INSERT INTO knowledge_points (exam_code, title, content, sort_order) VALUES
('ai_trainer_3', '1. 人工智能基础概念', '人工智能(AI)是计算机科学的一个分支，旨在研究、开发用于模拟、延伸和扩展人的智能的理论、方法、技术及应用系统。<ul><li><strong>机器学习</strong>：让计算机从数据中学习规律</li><li><strong>深度学习</strong>：基于多层神经网络的学习方法</li><li><strong>自然语言处理</strong>：让计算机理解和处理人类语言</li><li><strong>计算机视觉</strong>：让计算机"看见"和理解图像</li></ul>', 1),
('ai_trainer_3', '2. 数据标注技术', '数据标注是人工智能训练的基础工作，为机器学习模型提供训练数据。<ul><li><strong>分类标注</strong>：为数据打上类别标签</li><li><strong>实体标注</strong>：识别并标注文本中的实体</li><li><strong>语义分割</strong>：对图像进行像素级标注</li><li><strong>关键点标注</strong>：标注图像中的关键坐标点</li></ul>', 2),
('ai_trainer_3', '3. 模型训练流程', '模型训练是将标注数据输入算法，让模型学习数据规律的过程。<ul><li><strong>数据准备</strong>：数据收集、清洗、标注</li><li><strong>模型选择</strong>：根据任务选择合适的模型架构</li><li><strong>训练调优</strong>：调整参数优化模型性能</li><li><strong>评估验证</strong>：验证模型效果和泛化能力</li></ul>', 3),
('ai_trainer_3', '4. 人工智能伦理', '人工智能的发展需要遵循伦理原则，确保技术向善。<ul><li><strong>公平性</strong>：避免算法偏见和歧视</li><li><strong>透明度</strong>：算法决策过程可解释</li><li><strong>隐私保护</strong>：保护用户数据安全</li><li><strong>责任归属</strong>：明确AI决策的责任主体</li></ul>', 4),
('ai_trainer_3', '5. 工具与平台使用', '掌握主流AI开发工具和平台是训练师的必备技能。<ul><li><strong>TensorFlow/PyTorch</strong>：主流深度学习框架</li><li><strong>LabelImg/LabelMe</strong>：图像标注工具</li><li><strong>Hugging Face</strong>：预训练模型平台</li><li><strong>云服务平台</strong>：阿里云、腾讯云AI服务</li></ul>', 5);

-- 个人理财知识要点
INSERT INTO knowledge_points (exam_code, title, content, sort_order) VALUES
('personal_finance', '1. 个人理财基础', '个人理财是指根据个人或家庭的财务状况，制定合理的财务规划，实现资产增值和风险控制。<ul><li><strong>财务规划</strong>：制定长期财务目标和计划</li><li><strong>资产配置</strong>：合理分配资金到不同资产类别</li><li><strong>风险管理</strong>：识别和控制财务风险</li><li><strong>税务筹划</strong>：合法优化税务支出</li></ul>', 1),
('personal_finance', '2. 投资工具', '了解各类投资工具的特点和风险收益特征。<ul><li><strong>银行存款</strong>：低风险、低收益的储蓄方式</li><li><strong>基金投资</strong>：专业管理的集合投资工具</li><li><strong>股票投资</strong>：高风险、高收益的权益投资</li><li><strong>保险产品</strong>：风险保障和理财双重功能</li></ul>', 2),
('personal_finance', '3. 家庭财务报表', '掌握家庭财务报表的编制和分析方法。<ul><li><strong>资产负债表</strong>：反映家庭资产和负债状况</li><li><strong>现金流量表</strong>：记录收入和支出情况</li><li><strong>预算管理</strong>：制定和执行家庭预算</li><li><strong>财务比率分析</strong>：评估财务健康状况</li></ul>', 3),
('personal_finance', '4. 退休规划', '提前规划退休生活，确保晚年财务安全。<ul><li><strong>退休目标设定</strong>：确定退休后的生活标准</li><li><strong>养老金计算</strong>：估算养老金需求和缺口</li><li><strong>投资积累</strong>：选择合适的退休投资工具</li><li><strong>风险保障</strong>：配置适当的保险产品</li></ul>', 4),
('personal_finance', '5. 税务与遗产规划', '了解个人税务和遗产规划的基本知识。<ul><li><strong>个人所得税</strong>：计算和申报个人所得税</li><li><strong>税收优惠</strong>：利用税收优惠政策</li><li><strong>遗产规划</strong>：合理安排财产传承</li><li><strong>信托工具</strong>：利用信托进行财富管理</li></ul>', 5);

-- 银行业法律法规知识要点
INSERT INTO knowledge_points (exam_code, title, content, sort_order) VALUES
('banking_law', '1. 银行业监管体系', '我国银行业实行分业监管体制，主要监管机构包括中国人民银行和银保监会。<ul><li><strong>中国人民银行</strong>：制定和执行货币政策</li><li><strong>银保监会</strong>：监管银行和保险机构</li><li><strong>外汇管理局</strong>：管理外汇收支和国际结算</li><li><strong>行业自律组织</strong>：中国银行业协会</li></ul>', 1),
('banking_law', '2. 商业银行法', '《商业银行法》是规范商业银行经营活动的基本法律。<ul><li><strong>业务范围</strong>：存款、贷款、结算等业务</li><li><strong>资本充足率</strong>：确保银行资本充足</li><li><strong>风险管理</strong>：信用风险、市场风险、操作风险</li><li><strong>内部控制</strong>：建立健全内部管理制度</li></ul>', 2),
('banking_law', '3. 反洗钱法规', '商业银行必须履行反洗钱义务，防范洗钱风险。<ul><li><strong>客户身份识别</strong>：了解你的客户(KYC)</li><li><strong>大额交易报告</strong>：报告大额资金流动</li><li><strong>可疑交易报告</strong>：报告可疑交易行为</li><li><strong>客户身份资料保存</strong>：保存客户身份信息</li></ul>', 3),
('banking_law', '4. 消费者权益保护', '银行应当保护金融消费者的合法权益。<ul><li><strong>信息披露</strong>：充分披露产品信息</li><li><strong>公平交易</strong>：不得误导和欺诈消费者</li><li><strong>隐私保护</strong>：保护客户个人信息</li><li><strong>投诉处理</strong>：建立投诉处理机制</li></ul>', 4),
('banking_law', '5. 贷款业务规则', '商业银行贷款业务必须遵守相关法律法规。<ul><li><strong>贷款审查</strong>：审查借款人资质和用途</li><li><strong>贷款利率</strong>：遵守利率政策</li><li><strong>贷款担保</strong>：要求适当的担保措施</li><li><strong>不良贷款处置</strong>：依法处置不良贷款</li></ul>', 5);