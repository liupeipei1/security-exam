package com.exam.question.service;

import com.exam.question.config.UploadConfig;
import com.exam.question.entity.FileEntity;
import com.exam.question.repository.FileRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * 文件上传服务 - 文件存储到数据库
 */
@Service
public class UploadService {

    @Autowired
    private UploadConfig uploadConfig;

    @Autowired
    private FileRepository fileRepository;


    /**
     * 上传文件到数据库
     * @param file 上传的文件
    * @return 包含文件信息的Map
     */
    public Map<String, Object> upload(MultipartFile file) {
        Map<String, Object> result = new HashMap<>();
        
        if (file == null || file.isEmpty()) {
            result.put("success", false);
            result.put("message", "文件不能为空");
            return result;
        }

        // 检查文件类型是否允许上传
        String contentType = file.getContentType();
        if (!uploadConfig.isAllowed(contentType)) {
            result.put("success", false);
            result.put("message", "不允许上传该类型的文件");
            return result;
        }

        // 获取原始文件名
        String originalFilename = file.getOriginalFilename();
        String extension = "";
        if (originalFilename != null && originalFilename.contains(".")) {
            extension = originalFilename.substring(originalFilename.lastIndexOf("."));
        }

        // 生成存储文件名（UUID）
        String storageFilename = UUID.randomUUID() + extension;
        
        try {
            // 读取文件内容到字节数组
            byte[] fileData = file.getBytes();
            
            // 创建文件实体并保存到数据库
            FileEntity fileEntity = new FileEntity(
                    originalFilename,
                    storageFilename,
                    fileData,
                    file.getSize(),
                    contentType
            );
            
            fileRepository.save(fileEntity);
            
            // 返回结果
            result.put("success", true);
            result.put("url", "/api/upload/files/" + storageFilename);
            result.put("filename", originalFilename);
            result.put("storage_filename", storageFilename);
            result.put("size", file.getSize());
            result.put("type", contentType);
            
        } catch (IOException e) {
            result.put("success", false);
            result.put("message", "文件上传失败: " + e.getMessage());
        }
        
        return result;
    }

    /**
     * 上传图片（校验图片类型）
     * @param file 上传的图片文�?     * @return 包含文件信息的Map
     */
    public Map<String, Object> uploadImage(MultipartFile file) {
        Map<String, Object> result = new HashMap<>();
        
        if (file == null || file.isEmpty()) {
            result.put("success", false);
            result.put("message", "图片不能为空");
            return result;
        }

        // 检查是否为图片类型
        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            result.put("success", false);
            result.put("message", "请上传图片文件");
            return result;
        }

        return upload(file);
    }

    /**
     * 根据存储文件名获取文件
     * @param storageFilename 文件存储名
     * @return 文件实体，如果不存在返回null
     */
    public FileEntity getFileByStorageFilename(String storageFilename) {
        return fileRepository.findByStorageFilenameAndStatus(storageFilename, 1).orElse(null);
    }

    /**
     * 根据ID获取文件
     * @param id 文件ID
     * @return 文件实体，如果不存在返回null
     */
    public FileEntity getFileById(Long id) {
        return fileRepository.findByIdAndStatus(id, 1).orElse(null);
    }

    /**
     * 删除文件（软删除）
     * @param storageFilename 文件存储名
     * @return 是否删除成功
     */
    public boolean deleteFile(String storageFilename) {
        Optional<FileEntity> optionalFile = fileRepository.findByStorageFilenameAndStatus(storageFilename, 1);
        
        if (optionalFile.isPresent()) {
            FileEntity fileEntity = optionalFile.get();
            fileEntity.setStatus(0);
            fileRepository.save(fileEntity);
            return true;
        }
        
        return false;
    }

    /**
     * 获取文件信息
     * @param storageFilename 文件存储�?     * @return 包含文件信息的Map，如果文件不存在返回null
     */
    public Map<String, Object> getFileInfo(String storageFilename) {
        FileEntity fileEntity = getFileByStorageFilename(storageFilename);
        if (fileEntity == null) {
            return null;
        }
        
        Map<String, Object> info = new HashMap<>();
        info.put("id", fileEntity.getId());
        info.put("name", fileEntity.getOriginalFilename());
        info.put("storage_filename", fileEntity.getStorageFilename());
        info.put("size", fileEntity.getSize());
        info.put("type", fileEntity.getContentType());
        info.put("created_at", fileEntity.getCreatedAt());
        
        return info;
    }
}
