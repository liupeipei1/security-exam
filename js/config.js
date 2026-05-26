// 各题库的考试指南配置
const EXAM_GUIDES = {
    // 网络与信息安全管理员（三级）- 数据库中使用的bank_code
    security_level3: {
        title: '网络与信息安全管理员（三级）',
        overview: '网络与信息安全管理员（三级）考试分为理论知识考试和操作技能考核两部分。',
        examContent: [
            { title: '理论知识考试', desc: '采用闭卷笔试或机考方式，满分100分，60分合格' },
            { title: '操作技能考核', desc: '现场实际操作或模拟操作，满分100分，60分合格' }
        ],
        content: [
            { title: '信息安全基础', desc: '信息安全概念、安全模型、安全框架' },
            { title: '网络安全技术', desc: '网络协议、防火墙、入侵检测、VPN' },
            { title: '操作系统安全', desc: 'Windows、Linux安全配置' },
            { title: '数据安全', desc: '数据分类、数据加密、数据备份' },
            { title: '安全管理', desc: '安全策略、风险评估、安全审计' },
            { title: '法律法规', desc: '网络安全法、个人信息保护法等' }
        ],
        tips: [
            '系统学习信息安全基础知识',
            '熟悉常见安全工具和技术',
            '多做模拟练习题',
            '关注最新安全动态和威胁趋势',
            '理解安全原理而非死记硬背'
        ]
    },
    // 网络与信息安全管理员（三级）- 备用键名
    security_admin_3: {
        title: '网络与信息安全管理员（三级）',
        overview: '网络与信息安全管理员（三级）考试分为理论知识考试和操作技能考核两部分。',
        examContent: [
            { title: '理论知识考试', desc: '采用闭卷笔试或机考方式，满分100分，60分合格' },
            { title: '操作技能考核', desc: '现场实际操作或模拟操作，满分100分，60分合格' }
        ],
        content: [
            { title: '信息安全基础', desc: '信息安全概念、安全模型、安全框架' },
            { title: '网络安全技术', desc: '网络协议、防火墙、入侵检测、VPN' },
            { title: '操作系统安全', desc: 'Windows、Linux安全配置' },
            { title: '数据安全', desc: '数据分类、数据加密、数据备份' },
            { title: '安全管理', desc: '安全策略、风险评估、安全审计' },
            { title: '法律法规', desc: '网络安全法、个人信息保护法等' }
        ],
        tips: [
            '系统学习信息安全基础知识',
            '熟悉常见安全工具和技术',
            '多做模拟练习题',
            '关注最新安全动态和威胁趋势',
            '理解安全原理而非死记硬背'
        ]
    },
    // 网络与信息安全管理员（四级）
    security_admin_4: {
        title: '网络与信息安全管理员（四级）',
        overview: '网络与信息安全管理员（四级）考试分为理论知识考试和操作技能考核两部分。',
        examContent: [
            { title: '理论知识考试', desc: '采用闭卷笔试或机考方式，满分100分，60分合格' },
            { title: '操作技能考核', desc: '现场实际操作或模拟操作，满分100分，60分合格' }
        ],
        content: [
            { title: '信息安全基础', desc: '信息安全基本概念、安全模型基础' },
            { title: '网络安全基础', desc: '网络基础知识、常见网络设备' },
            { title: '操作系统安全', desc: 'Windows基础安全配置' },
            { title: '数据安全', desc: '数据分类与基础加密' },
            { title: '安全管理', desc: '基本安全策略与规范' }
        ],
        tips: [
            '掌握基础概念和术语',
            '熟悉基础安全操作',
            '多做练习题巩固知识',
            '理解基本安全原理'
        ]
    },
    // 人工智能训练师（三级）
    ai_trainer_3: {
        title: '人工智能训练师（三级）',
        overview: '人工智能训练师（三级）考试分为理论知识考试和操作技能考核两部分，主要考核人工智能基础、数据标注、模型训练等核心技能。',
        examContent: [
            { title: '理论知识考试', desc: '机考方式，满分100分，60分合格，题型包括判断、单选、多选' },
            { title: '操作技能考核', desc: '现场实操，满分100分，60分合格，考核数据标注等实操技能' }
        ],
        content: [
            { title: '人工智能基础', desc: 'AI概念、发展历程、主流技术方向' },
            { title: '数据标注', desc: '标注类型、工具使用、质量控制' },
            { title: '模型训练', desc: '训练流程、参数调优、评估指标' },
            { title: '职业道德', desc: '数据隐私、伦理规范、行业准则' },
            { title: '工具使用', desc: '标注平台、训练框架、数据分析工具' }
        ],
        tips: [
            '系统学习AI基础知识',
            '熟悉主流数据标注工具',
            '多实践数据标注任务',
            '理解模型训练基本原理',
            '关注AI伦理与合规要求'
        ]
    },
    // 银行从业资格中级-个人理财
    personal_finance: {
        title: '银行从业资格中级-个人理财',
        overview: '银行从业资格中级考试采用机考形式，个人理财科目主要考核考生在个人理财规划方面的专业知识和应用能力。',
        examContent: [
            { title: '考试形式', desc: '机考，考试时长120分钟，满分100分，60分合格' },
            { title: '题型分布', desc: '单选题40题×0.5分、多选题20题×1分、单项规划题25题30分、综合案例题20题30分，共105题' }
        ],
        content: [
            { title: '个人理财基础', desc: '理财规划概述、客户分析、财务报表分析' },
            { title: '投资规划', desc: '投资工具、资产配置、风险管理' },
            { title: '税务规划', desc: '税收基础知识、税务筹划方法' },
            { title: '保险规划', desc: '保险产品、风险保障规划' },
            { title: '退休规划', desc: '退休需求分析、养老金规划' },
            { title: '综合理财规划', desc: '全生命周期理财规划方案设计' }
        ],
        tips: [
            '熟练掌握各类计算题解法',
            '理解理财规划的整体流程',
            '关注最新金融政策和产品',
            '多做案例分析练习',
            '注意答题时间管理'
        ]
    },
    // 银行从业资格中级-法律法规
    banking_law: {
        title: '银行从业资格中级-法律法规',
        overview: '银行从业资格中级考试采用机考形式，法律法规科目主要考核考生对银行业法律法规的理解和应用能力。',
        examContent: [
            { title: '考试形式', desc: '机考，考试时长120分钟，满分100分，60分合格' },
            { title: '题型分布', desc: '单选题80题×0.5分、多选题25题×2分、判断题10题×1分，共115题' }
        ],
        content: [
            { title: '银行业监管', desc: '监管框架、监管机构职责、合规要求' },
            { title: '银行基础业务', desc: '存款、贷款、支付结算等业务规则' },
            { title: '金融法规', desc: '商业银行法、银行业监督管理法、反洗钱法等' },
            { title: '消费者权益保护', desc: '客户权利、信息保护、投诉处理' },
            { title: '内部控制', desc: '风险管理、内部控制制度' }
        ],
        tips: [
            '重点记忆关键数字和时间节点',
            '理解法律条文的实际应用',
            '关注最新法规变化',
            '多做真题练习',
            '注意区分相似概念'
        ]
    }
};

// 银行从业资格证中级考试配置
const EXAM_CONFIG = {
    // 考试基本信息
    basic: {
        examType: '机考',
        duration: 120,           // 考试时长（分钟）
        fullScore: 100,          // 满分
        passScore: 60            // 及格分数
    },
    
    // 银行从业中级包含两个科目
    subjects: [
        // 法律法规（必考）
        {
            id: 'laws_regulations',
            name: '法律法规',
            label: '银行从业-法律法规（中级押题）',
            required: true,
            totalQuestions: 115,
            hasCase: false,
            sections: [
                { type: 'single', name: '单选题', count: 80, scorePerQuestion: 0.5, totalScore: 40 },
                { type: 'multiple', name: '多选题', count: 25, scorePerQuestion: 2, totalScore: 50 },
                { type: 'judgment', name: '判断题', count: 10, scorePerQuestion: 1, totalScore: 10 }
            ]
        },
        // 个人理财（中级）
        {
            id: 'personal_finance',
            name: '个人理财（中级）',
            label: '银行从业-个人理财（中级押题）',
            required: false,
            description: '最难也最常见',
            totalQuestions: 105,
            hasCase: true,
            sections: [
                { type: 'single', name: '单选题', count: 40, scorePerQuestion: 0.5, totalScore: 20 },
                { type: 'multiple', name: '多选题', count: 20, scorePerQuestion: 1, totalScore: 20 },
                { type: 'planning', name: '单项规划题', count: 25, scorePerQuestion: 1.2, totalScore: 30, description: '大计算题' },
                { type: 'comprehensive', name: '综合案例题', count: 20, scorePerQuestion: 1.5, totalScore: 30, description: '大案例 + 小问' }
            ]
        }
    ],
    
    // 题型详细说明
    questionTypeExplain: {
        single: {
            name: '单选题',
            description: '四选一',
            content: '基础概念、数字、流程、法规'
        },
        multiple: {
            name: '多选题',
            description: '5选2-5',
            content: '多选、少选、错选都不得分，易混点集中'
        },
        judgment: {
            name: '判断题',
            description: '对/错',
            content: '考细节、例外、数字陷阱'
        },
        comprehensive: {
            name: '综合案例题（中级特有）',
            description: '一大段背景材料（银行实务场景）+ 3-5个小问题（单选/多选）',
            content: '考：计算、风险判断、合规、产品、流程'
        },
        planning: {
            name: '单项规划题（理财特有）',
            description: '给客户信息、财务数据、目标',
            content: '算：现金流、净值、收益率、风险等级、产品配置'
        }
    },
    
    // 考试指南
    guides: EXAM_GUIDES
};

// 章节信息
const chapters = [
    { name: "全部题目", count: 0 }
];

// 微信配置
const WECHAT_CONFIG = {
    appId: 'wxbbfc83572c7db218',
    appSecret: '58fa649790458708aa941492f5c15b66'
};

// 暴露到全局window对象
window.EXAM_CONFIG = EXAM_CONFIG;
window.chapters = chapters;
window.WECHAT_CONFIG = WECHAT_CONFIG;

// 调试信息
console.log('EXAM_CONFIG loaded successfully!');
console.log('EXAM_CONFIG.guides keys:', Object.keys(EXAM_CONFIG.guides));

// ES6模块导出
export { EXAM_CONFIG, chapters, WECHAT_CONFIG };