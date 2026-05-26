// 测试配置文件是否正确加载
console.log('Testing EXAM_CONFIG...');
if (typeof EXAM_CONFIG !== 'undefined') {
    console.log('EXAM_CONFIG is defined:', EXAM_CONFIG);
    if (EXAM_CONFIG.guides) {
        console.log('EXAM_CONFIG.guides keys:', Object.keys(EXAM_CONFIG.guides));
        console.log('security_level3 guide:', EXAM_CONFIG.guides['security_level3']);
    } else {
        console.log('EXAM_CONFIG.guides is undefined');
    }
} else {
    console.log('EXAM_CONFIG is undefined');
}