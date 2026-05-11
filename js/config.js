// 考试模式题目数量配置
const EXAM_CONFIG = {
    judgment: 40,   // 判断题数
    single: 140,    // 单选题数量
    multiple: 10    // 多选题数量
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

// ES6模块导出
export { EXAM_CONFIG, chapters, WECHAT_CONFIG };