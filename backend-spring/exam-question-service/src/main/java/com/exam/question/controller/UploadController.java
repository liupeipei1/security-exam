package com.exam.question.controller;

import com.exam.common.api.ApiResult;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;

/**
 * 图片上传控制器
 */
@RestController
@RequestMapping("/api/upload")
public class UploadController {

    @Autowired
    private EntityManager entityManager;

    /**
     * 图片上传接口
     * POST /api/upload/image
     * 
     * @param file 上传的图片文件
     * @param exam_code 可选参数，用于将图片保存到考试指南
     */
    @PostMapping("/image")
    public ResponseEntity<?> uploadImage(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "exam_code", required = false) String examCode) {
        
        try {
            // 验证文件
            if (file.isEmpty()) {
                return ResponseEntity.badRequest().body(ApiResult.fail("请选择要上传的文件"));
            }

            // 验证文件类型
            String contentType = file.getContentType();
            if (contentType == null || !contentType.startsWith("image/")) {
                return ResponseEntity.badRequest().body(ApiResult.fail("请上传图片格式的文件"));
            }

            // 验证文件大小（10MB）
            long maxSize = 10 * 1024 * 1024; // 10MB
            if (file.getSize() > maxSize) {
                return ResponseEntity.badRequest().body(ApiResult.fail("图片大小不能超过10MB"));
            }

            // 读取文件内容并转换为base64
            byte[] fileBytes = file.getBytes();
            String base64Data = Base64.getEncoder().encodeToString(fileBytes);
            String imageData = "data:" + contentType + ";base64," + base64Data;

            // 如果提供了exam_code，将图片保存到exam_guide表
            if (examCode != null && !examCode.isBlank()) {
                // 查询现有记录的content
                Query query = entityManager.createNativeQuery(
                        "SELECT content FROM exam_guide WHERE exam_code = ?");
                query.setParameter(1, examCode);
                Object existingContent = query.getSingleResult();
                
                String content = existingContent != null ? existingContent.toString() : "";
                
                // 将图片添加到content中（作为img标签）
                String imgTag = "<img src=\"" + imageData + "\" />";
                content += imgTag;
                
                // 更新记录
                Query updateQuery = entityManager.createNativeQuery(
                        "UPDATE exam_guide SET content = ?, updated_at = NOW() WHERE exam_code = ?");
                updateQuery.setParameter(1, content);
                updateQuery.setParameter(2, examCode);
                updateQuery.executeUpdate();
            }

            Map<String, Object> data = new HashMap<>();
            data.put("url", imageData);
            
            return ResponseEntity.ok(ApiResult.ok(data, "图片上传成功"));
            
        } catch (Exception e) {
            return ResponseEntity.status(500).body(ApiResult.fail("图片上传失败: " + e.getMessage()));
        }
    }
}