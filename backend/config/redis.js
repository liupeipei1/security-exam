/**
 * Redis配置和工具函数
 * 用于缓存做题记录、题目数据等
 */

const redis = require('redis');

// Redis连接配置
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: process.env.REDIS_DB || 0,
  retryDelayOnFailover: 100,
  enableReadyCheck: false,
  maxRetriesPerRequest: 3
};

// 创建Redis客户端
let redisClient = null;

async function getRedisClient() {
  if (redisClient && redisClient.isReady) {
    return redisClient;
  }
  
  try {
    redisClient = redis.createClient(redisConfig);
    
    redisClient.on('error', (err) => {
      console.error('Redis连接错误:', err);
    });
    
    redisClient.on('connect', () => {
      console.log('Redis连接成功');
    });
    
    await redisClient.connect();
    return redisClient;
  } catch (error) {
    console.error('创建Redis客户端失败:', error);
    throw error;
  }
}

/**
 * 做题记录相关操作
 */

// 保存做题记录
async function saveExamRecord(openid, record) {
  const client = await getRedisClient();
  const key = `exam:record:${openid}`;
  
  try {
    // 获取当前记录列表
    let records = await client.get(key);
    records = records ? JSON.parse(records) : [];
    
    // 添加新记录（在开头）
    records.unshift({
      ...record,
      createdAt: new Date().toISOString()
    });
    
    // 只保留最近100条记录
    if (records.length > 100) {
      records = records.slice(0, 100);
    }
    
    // 保存到Redis，有效期7天
    await client.set(key, JSON.stringify(records), {
      EX: 7 * 24 * 60 * 60 // 7天过期
    });
    
    return true;
  } catch (error) {
    console.error('保存做题记录失败:', error);
    return false;
  }
}

// 获取做题记录
async function getExamRecords(openid) {
  const client = await getRedisClient();
  const key = `exam:record:${openid}`;
  
  try {
    const records = await client.get(key);
    return records ? JSON.parse(records) : [];
  } catch (error) {
    console.error('获取做题记录失败:', error);
    return [];
  }
}

// 删除做题记录
async function deleteExamRecords(openid) {
  const client = await getRedisClient();
  const key = `exam:record:${openid}`;
  
  try {
    await client.del(key);
    return true;
  } catch (error) {
    console.error('删除做题记录失败:', error);
    return false;
  }
}

/**
 * 题目缓存相关操作
 */

// 缓存题目列表
async function cacheQuestions(examCode, questions) {
  const client = await getRedisClient();
  const key = `exam:questions:${examCode}`;
  
  try {
    await client.set(key, JSON.stringify(questions), {
      EX: 24 * 60 * 60 // 24小时过期
    });
    return true;
  } catch (error) {
    console.error('缓存题目失败:', error);
    return false;
  }
}

// 获取缓存的题目列表
async function getCachedQuestions(examCode) {
  const client = await getRedisClient();
  const key = `exam:questions:${examCode}`;
  
  try {
    const questions = await client.get(key);
    return questions ? JSON.parse(questions) : null;
  } catch (error) {
    console.error('获取缓存题目失败:', error);
    return null;
  }
}

// 清除题目缓存
async function clearQuestionCache(examCode) {
  const client = await getRedisClient();
  const key = `exam:questions:${examCode}`;
  
  try {
    await client.del(key);
    return true;
  } catch (error) {
    console.error('清除题目缓存失败:', error);
    return false;
  }
}

/**
 * 用户答题进度缓存
 */

// 保存用户答题进度
async function saveUserProgress(openid, examCode, progress) {
  const client = await getRedisClient();
  const key = `exam:progress:${openid}:${examCode}`;
  
  try {
    await client.set(key, JSON.stringify({
      ...progress,
      updatedAt: new Date().toISOString()
    }), {
      EX: 30 * 24 * 60 * 60 // 30天过期
    });
    return true;
  } catch (error) {
    console.error('保存答题进度失败:', error);
    return false;
  }
}

// 获取用户答题进度
async function getUserProgress(openid, examCode) {
  const client = await getRedisClient();
  const key = `exam:progress:${openid}:${examCode}`;
  
  try {
    const progress = await client.get(key);
    return progress ? JSON.parse(progress) : null;
  } catch (error) {
    console.error('获取答题进度失败:', error);
    return null;
  }
}

/**
 * 考试会话缓存（用于继续上次考试）
 */

// 保存考试会话
async function saveExamSession(openid, session) {
  const client = await getRedisClient();
  const key = `exam:session:${openid}`;
  
  try {
    await client.set(key, JSON.stringify({
      ...session,
      createdAt: new Date().toISOString()
    }), {
      EX: 24 * 60 * 60 // 24小时过期
    });
    return true;
  } catch (error) {
    console.error('保存考试会话失败:', error);
    return false;
  }
}

// 获取考试会话
async function getExamSession(openid) {
  const client = await getRedisClient();
  const key = `exam:session:${openid}`;
  
  try {
    const session = await client.get(key);
    return session ? JSON.parse(session) : null;
  } catch (error) {
    console.error('获取考试会话失败:', error);
    return null;
  }
}

// 删除考试会话
async function deleteExamSession(openid) {
  const client = await getRedisClient();
  const key = `exam:session:${openid}`;
  
  try {
    await client.del(key);
    return true;
  } catch (error) {
    console.error('删除考试会话失败:', error);
    return false;
  }
}

module.exports = {
  getRedisClient,
  // 做题记录
  saveExamRecord,
  getExamRecords,
  deleteExamRecords,
  // 题目缓存
  cacheQuestions,
  getCachedQuestions,
  clearQuestionCache,
  // 用户进度
  saveUserProgress,
  getUserProgress,
  // 考试会话
  saveExamSession,
  getExamSession,
  deleteExamSession
};