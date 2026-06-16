package com.exam.common.util;

import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.TimeUnit;

/**
 * Redis缓存工具类
 */
@Component
public class RedisCacheUtil {

    private final RedisTemplate<String, Object> redisTemplate;

    public RedisCacheUtil(RedisTemplate<String, Object> redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    // ==================== String类型操作 ====================

    /**
     * 设置缓存（无过期时间）
     * @param key 缓存键
     * @param value 缓存值
     */
    public void set(String key, Object value) {
        redisTemplate.opsForValue().set(key, value);
    }

    /**
     * 设置缓存（带过期时间）
     * @param key 缓存键
     * @param value 缓存值
     * @param timeout 过期时间
     * @param unit 时间单位
     */
    public void set(String key, Object value, long timeout, TimeUnit unit) {
        redisTemplate.opsForValue().set(key, value, timeout, unit);
    }

    /**
     * 获取缓存
     * @param key 缓存键
     * @return 缓存值
     */
    public Object get(String key) {
        return redisTemplate.opsForValue().get(key);
    }

    /**
     * 获取缓存（带类型转换）
     * @param key 缓存键
     * @param clazz 目标类型
     * @return 缓存值
     */
    @SuppressWarnings("unchecked")
    public <T> T get(String key, Class<T> clazz) {
        Object value = redisTemplate.opsForValue().get(key);
        if (value != null && clazz.isInstance(value)) {
            return (T) value;
        }
        return null;
    }

    /**
     * 删除缓存
     * @param key 缓存键
     * @return 是否删除成功
     */
    public boolean delete(String key) {
        return Boolean.TRUE.equals(redisTemplate.delete(key));
    }

    /**
     * 判断缓存是否存在
     * @param key 缓存键
     * @return 是否存在
     */
    public boolean exists(String key) {
        return Boolean.TRUE.equals(redisTemplate.hasKey(key));
    }

    /**
     * 设置缓存过期时间
     * @param key 缓存键
     * @param timeout 过期时间
     * @param unit 时间单位
     * @return 是否设置成功
     */
    public boolean expire(String key, long timeout, TimeUnit unit) {
        return Boolean.TRUE.equals(redisTemplate.expire(key, timeout, unit));
    }

    /**
     * 获取缓存剩余过期时间
     * @param key 缓存键
     * @param unit 时间单位
     * @return 剩余时间（秒），返回-2表示key不存在，返回-1表示永久有效
     */
    public long getExpire(String key, TimeUnit unit) {
        return redisTemplate.getExpire(key, unit);
    }

    /**
     * 缓存自增
     * @param key 缓存键
     * @param delta 增量
     * @return 自增后的值
     */
    public long increment(String key, long delta) {
        return redisTemplate.opsForValue().increment(key, delta);
    }

    /**
     * 缓存自减
     * @param key 缓存键
     * @param delta 减量
     * @return 自减后的值
     */
    public long decrement(String key, long delta) {
        return redisTemplate.opsForValue().decrement(key, delta);
    }

    // ==================== Hash类型操作 ====================

    /**
     * 设置Hash缓存
     * @param key 缓存键
     * @param hashKey 哈希键
     * @param value 缓存值
     */
    public void hSet(String key, String hashKey, Object value) {
        redisTemplate.opsForHash().put(key, hashKey, value);
    }

    /**
     * 获取Hash缓存
     * @param key 缓存键
     * @param hashKey 哈希键
     * @return 缓存值
     */
    public Object hGet(String key, String hashKey) {
        return redisTemplate.opsForHash().get(key, hashKey);
    }

    /**
     * 获取Hash缓存（带类型转换）
     * @param key 缓存键
     * @param hashKey 哈希键
     * @param clazz 目标类型
     * @return 缓存值
     */
    @SuppressWarnings("unchecked")
    public <T> T hGet(String key, String hashKey, Class<T> clazz) {
        Object value = redisTemplate.opsForHash().get(key, hashKey);
        if (value != null && clazz.isInstance(value)) {
            return (T) value;
        }
        return null;
    }

    /**
     * 获取Hash所有字段和值
     * @param key 缓存键
     * @return 所有字段和值
     */
    public Map<Object, Object> hGetAll(String key) {
        return redisTemplate.opsForHash().entries(key);
    }

    /**
     * 删除Hash中的字段
     * @param key 缓存键
     * @param hashKeys 哈希键数组
     * @return 删除的数量
     */
    public long hDelete(String key, Object... hashKeys) {
        return redisTemplate.opsForHash().delete(key, hashKeys);
    }

    /**
     * 判断Hash中是否存在字段
     * @param key 缓存键
     * @param hashKey 哈希键
     * @return 是否存在
     */
    public boolean hExists(String key, String hashKey) {
        return redisTemplate.opsForHash().hasKey(key, hashKey);
    }

    // ==================== List类型操作 ====================

    /**
     * 列表左推
     * @param key 缓存键
     * @param value 缓存值
     * @return 列表长度
     */
    public long lPush(String key, Object value) {
        return redisTemplate.opsForList().leftPush(key, value);
    }

    /**
     * 列表右推
     * @param key 缓存键
     * @param value 缓存值
     * @return 列表长度
     */
    public long rPush(String key, Object value) {
        return redisTemplate.opsForList().rightPush(key, value);
    }

    /**
     * 列表左弹
     * @param key 缓存键
     * @return 弹出的值
     */
    public Object lPop(String key) {
        return redisTemplate.opsForList().leftPop(key);
    }

    /**
     * 列表右弹
     * @param key 缓存键
     * @return 弹出的值
     */
    public Object rPop(String key) {
        return redisTemplate.opsForList().rightPop(key);
    }

    /**
     * 获取列表长度
     * @param key 缓存键
     * @return 列表长度
     */
    public long lSize(String key) {
        return redisTemplate.opsForList().size(key);
    }

    /**
     * 获取列表指定范围的元素
     * @param key 缓存键
     * @param start 起始索引
     * @param end 结束索引
     * @return 元素列表
     */
    public List<Object> lRange(String key, long start, long end) {
        return redisTemplate.opsForList().range(key, start, end);
    }

    // ==================== Set类型操作 ====================

    /**
     * 添加Set元素
     * @param key 缓存键
     * @param values 元素值
     * @return 添加的数量
     */
    public long sAdd(String key, Object... values) {
        return redisTemplate.opsForSet().add(key, values);
    }

    /**
     * 获取Set所有元素
     * @param key 缓存键
     * @return 元素集合
     */
    public Set<Object> sMembers(String key) {
        return redisTemplate.opsForSet().members(key);
    }

    /**
     * 判断Set中是否存在元素
     * @param key 缓存键
     * @param value 元素值
     * @return 是否存在
     */
    public boolean sContains(String key, Object value) {
        return Boolean.TRUE.equals(redisTemplate.opsForSet().isMember(key, value));
    }

    /**
     * 删除Set元素
     * @param key 缓存键
     * @param values 元素值
     * @return 删除的数量
     */
    public long sRemove(String key, Object... values) {
        return redisTemplate.opsForSet().remove(key, values);
    }

    /**
     * 获取Set大小
     * @param key 缓存键
     * @return Set大小
     */
    public long sSize(String key) {
        return redisTemplate.opsForSet().size(key);
    }

    // ==================== ZSet类型操作 ====================

    /**
     * 添加ZSet元素
     * @param key 缓存键
     * @param value 元素值
     * @param score 分数
     * @return 是否添加成功
     */
    public boolean zAdd(String key, Object value, double score) {
        return Boolean.TRUE.equals(redisTemplate.opsForZSet().add(key, value, score));
    }

    /**
     * 获取ZSet指定范围的元素（按分数升序）
     * @param key 缓存键
     * @param start 起始索引
     * @param end 结束索引
     * @return 元素集合
     */
    public Set<Object> zRange(String key, long start, long end) {
        return redisTemplate.opsForZSet().range(key, start, end);
    }

    /**
     * 获取ZSet指定分数范围的元素
     * @param key 缓存键
     * @param min 最小分数
     * @param max 最大分数
     * @return 元素集合
     */
    public Set<Object> zRangeByScore(String key, double min, double max) {
        return redisTemplate.opsForZSet().rangeByScore(key, min, max);
    }

    /**
     * 获取ZSet元素的分数
     * @param key 缓存键
     * @param value 元素值
     * @return 分数
     */
    public Double zScore(String key, Object value) {
        return redisTemplate.opsForZSet().score(key, value);
    }

    /**
     * 删除ZSet元素
     * @param key 缓存键
     * @param values 元素值
     * @return 删除的数量
     */
    public long zRemove(String key, Object... values) {
        return redisTemplate.opsForZSet().remove(key, values);
    }

    /**
     * 获取ZSet大小
     * @param key 缓存键
     * @return ZSet大小
     */
    public long zSize(String key) {
        return redisTemplate.opsForZSet().size(key);
    }

    // ==================== 通用操作 ====================

    /**
     * 按前缀删除缓存
     * @param prefix 键前缀
     * @return 删除的数量
     */
    public long deleteByPrefix(String prefix) {
        Set<String> keys = redisTemplate.keys(prefix + "*");
        if (keys == null || keys.isEmpty()) {
            return 0;
        }
        redisTemplate.delete(keys);
        return keys.size();
    }

    /**
     * 获取所有匹配模式的键
     * @param pattern 模式
     * @return 键集合
     */
    public Set<String> keys(String pattern) {
        return redisTemplate.keys(pattern);
    }

    /**
     * 清空所有缓存（慎用）
     */
    public void flushAll() {
        redisTemplate.getConnectionFactory().getConnection().flushAll();
    }
}