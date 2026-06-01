<template>
  <div class="guide-notes-container">
    <!-- 对话框样式的备注展示和编辑区域 -->
    <div class="notes-dialog">
      <!-- 头部 -->
      <div class="dialog-header">
        <div class="avatar">📝</div>
        <div class="header-info">
          <h3 class="notes-title">备考备注</h3>
          <span class="update-time">{{ lastUpdateTime }}</span>
        </div>
        <!-- 编辑模式显示取消按钮，显示模式显示编辑按钮 -->
        <button v-if="isEditing" class="close-btn" @click="cancelEdit">✕</button>
        <button v-else-if="hasNotes" class="edit-btn" @click="toggleEditMode">✏️ 编辑</button>
      </div>
      
      <!-- 内容区域 -->
      <div class="dialog-content" v-if="hasNotes || isEditing">
        <!-- 编辑模式 -->
        <div v-if="isEditing" class="edit-content">
          <!-- 文字输入 -->
          <textarea
            ref="textareaRef"
            v-model="editDisplayContent"
            class="edit-textarea"
            placeholder="在这里输入备考备注，支持粘贴图片..."
            rows="6"
            @paste="handlePaste"
          ></textarea>
          
          <!-- 操作按钮 -->
          <div class="edit-actions">
            <button class="cancel-btn" @click="cancelEdit">取消</button>
            <button class="save-btn" :disabled="!hasContent" @click="saveNotes">
              保存备注
            </button>
          </div>
        </div>
        
        <!-- 显示模式 -->
        <div v-else>
          <!-- 文字内容 -->
          <div class="text-content" v-if="noteContent" v-html="renderedContent">
          </div>
          
          <!-- 空状态 -->
          <div class="empty-content" v-else>
            <span class="empty-icon">📭</span>
            <p>暂无备注内容，点击右上角编辑按钮添加</p>
          </div>
        </div>
      </div>
      
      <!-- 空状态（没有任何备注） -->
      <div class="dialog-empty" v-else>
        <div class="empty-icon">📭</div>
        <p>暂无备考备注</p>
        <button class="create-btn" @click="toggleEditMode">+ 添加备注</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue';
import { useExamApp } from '../composables/useExamApp';
import { apiPost } from '../api/client';

const { currentExam, currentUser, guideNotes, saveGuideNotes } = useExamApp();

const noteContent = ref('');
const isEditing = ref(false);
const textareaRef = ref(null);

const hasNotes = computed(() => {
  return guideNotes.value && guideNotes.value.content;
});

const hasContent = computed(() => {
  return noteContent.value.trim();
});

// 编辑模式显示用的内容（将base64图片转换为简洁标记）
const editDisplayContent = computed({
  get: () => {
    let content = noteContent.value;
    // 将base64图片转换为简洁标记
    content = content.replace(/!\[图片\]\((data:image[^)]+)\)/g, '![图片]');
    return content;
  },
  set: (newValue) => {
    // 需要处理用户编辑，保持图片数据完整
    let original = noteContent.value;
    let display = newValue;
    
    // 找出新增的图片标记并恢复原始数据
    const originalImages = [];
    const originalMatches = original.match(/!\[图片\]\((data:image[^)]+)\)/g) || [];
    originalMatches.forEach((match, index) => {
      const url = match.match(/\((data:image[^)]+)\)/)[1];
      originalImages.push(url);
    });
    
    // 统计显示内容中的图片标记数量
    const displayCount = (display.match(/!\[图片\]/g) || []).length;
    
    // 重建原始内容
    let result = display;
    let imageIndex = 0;
    
    // 替换每个图片标记为原始URL
    result = result.replace(/!\[图片\]/g, () => {
      const url = originalImages[imageIndex] || '';
      imageIndex++;
      return `![图片](${url})`;
    });
    
    noteContent.value = result;
  }
});

const lastUpdateTime = computed(() => {
  if (guideNotes.value?.updateTime) {
    return new Date(guideNotes.value.updateTime).toLocaleString('zh-CN');
  }
  return '';
});

// 将Markdown图片语法转换为HTML图片标签
const renderedContent = computed(() => {
  let content = noteContent.value;
  // 匹配 ![图片](data:xxx) 格式的Markdown图片
  content = content.replace(/!\[图片\]\((data:image[^)]+)\)/g, '<img src="$1" class="note-image" />');
  // 将换行转换为<br>标签
  content = content.replace(/\n/g, '<br>');
  return content;
});

// 加载已有备注
const loadNotes = async () => {
  if (!currentExam.value) return;
  
  if (guideNotes.value) {
    noteContent.value = guideNotes.value.content || '';
  }
};

// 切换编辑模式
const toggleEditMode = () => {
  isEditing.value = !isEditing.value;
  if (!isEditing.value) {
    loadNotes();
  }
};

// 取消编辑
const cancelEdit = () => {
  isEditing.value = false;
  noteContent.value = guideNotes.value?.content || '';
};

// 处理粘贴事件（支持图片）
const handlePaste = async (e) => {
  const items = e.clipboardData?.items;
  if (!items) return;
  
  for (const item of items) {
    if (item.type.startsWith('image/')) {
      e.preventDefault();
      const file = item.getAsFile();
      if (!file) continue;
      
      try {
        // 显示上传提示
        const textarea = textareaRef.value;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const before = noteContent.value.substring(0, start);
        const after = noteContent.value.substring(end);
        
        noteContent.value = before + '[图片上传中...]' + after;
        
        // 上传图片（使用原生fetch，不使用apiPost因为需要FormData）
        const formData = new FormData();
        formData.append('image', file);
        // 添加openid和exam_code，让后端将图片保存到exam_guide表
        if (currentUser.value?.openid) {
          formData.append('openid', currentUser.value.openid);
        }
        if (currentExam.value) {
          formData.append('exam_code', currentExam.value);
        }
        
        const API_BASE = import.meta.env.VITE_API_BASE || '';
        const res = await fetch(`${API_BASE}/api/upload/image`, {
          method: 'POST',
          body: formData
          // 注意：不要设置Content-Type，浏览器会自动处理multipart/form-data边界
        });
        
        const result = await res.json();
        
        if (result && result.success && result.data?.url) {
          // 替换为图片标记
          noteContent.value = before + `![图片](${result.data.url})` + after;
        } else {
          noteContent.value = before + '[图片上传失败]' + after;
        }
      } catch (error) {
        console.error('图片上传失败:', error);
        noteContent.value = noteContent.value.replace('[图片上传中...]', '[图片上传失败]');
      }
      
      // 聚焦到插入位置
      await nextTick(() => {
        const textarea = textareaRef.value;
        if (textarea) {
          const insertPos = noteContent.value.lastIndexOf(')') + 1;
          textarea.setSelectionRange(insertPos, insertPos);
          textarea.focus();
        }
      });
    }
  }
};

// 保存备注
const saveNotes = async () => {
  if (!currentExam.value) return;
  
  const content = noteContent.value;
  
  await saveGuideNotes(content);
  isEditing.value = false;
  alert('备注保存成功！');
};

// 监听考试代码变化，重新加载备注
watch(currentExam, () => {
  loadNotes();
});

// 监听guideNotes变化，同步更新显示内容
watch(guideNotes, () => {
  loadNotes();
}, { deep: true });



onMounted(() => {
  loadNotes();
});
</script>

<style scoped>
.guide-notes-container {
  margin-top: 20px;
}

/* 对话框样式 */
.notes-dialog {
  background: linear-gradient(135deg, rgba(74, 144, 217, 0.15) 0%, rgba(53, 123, 189, 0.1) 100%);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  overflow: hidden;
}

.dialog-header {
  display: flex;
  align-items: center;
  padding: 16px;
  background: rgba(255, 255, 255, 0.05);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #4a90d9, #357abd);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  margin-right: 12px;
  flex-shrink: 0;
}

.header-info {
  flex: 1;
  min-width: 0;
}

.notes-title {
  font-size: 16px;
  font-weight: 600;
  color: #fff;
  margin: 0 0 4px 0;
}

.update-time {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
}

.edit-btn {
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: rgba(255, 255, 255, 0.9);
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 4px;
}

.edit-btn:hover {
  background: rgba(255, 255, 255, 0.25);
  transform: translateY(-1px);
}

.dialog-content {
  padding: 16px;
  color: #333;
}

.text-content {
  font-size: 14px;
  line-height: 1.7;
  word-break: break-word;
  padding: 12px;
  background: rgba(0, 0, 0, 0.03);
  border-radius: 8px;
  min-height: 60px;
  color: #333;
}

.text-content img.note-image {
  max-width: 100%;
  height: auto;
  border-radius: 4px;
  margin: 4px 0;
  display: block;
}

.empty-content {
  text-align: center;
  padding: 20px;
  color: #999;
}

.empty-icon {
  font-size: 32px;
  margin-bottom: 8px;
  display: block;
}

.dialog-empty {
  padding: 40px;
  text-align: center;
  color: rgba(255, 255, 255, 0.5);
}

.dialog-empty .empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.dialog-empty p {
  margin: 0 0 16px 0;
}

.create-btn {
  background: linear-gradient(135deg, #4a90d9, #357abd);
  border: none;
  color: #fff;
  padding: 10px 24px;
  border-radius: 20px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.create-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(74, 144, 217, 0.4);
}

.close-btn {
  background: none;
  border: none;
  color: #0b0a0a;
  font-size: 18px;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: background 0.2s;
}

.close-btn:hover {
  background: #eee;
}

.edit-content {
  padding: 16px;
}

.edit-textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  resize: vertical;
  font-size: 14px;
  line-height: 1.6;
  color: #333;
  background: #fff;
  box-sizing: border-box;
  margin-bottom: 12px;
}

.edit-textarea:focus {
  outline: none;
  border-color: #4a90d9;
  box-shadow: 0 0 0 2px rgba(74, 144, 217, 0.1);
}

.edit-textarea::placeholder {
  color: #bbb;
}

.edit-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.cancel-btn {
  background: #f5f5f5;
  border: 1px solid #ddd;
  color: #666;
  padding: 8px 20px;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.cancel-btn:hover {
  background: #eee;
}

.save-btn {
  background: linear-gradient(135deg, #4a90d9, #357abd);
  border: none;
  color: #fff;
  padding: 8px 24px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.save-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(74, 144, 217, 0.4);
}

.save-btn:disabled {
  background: rgba(255, 255, 255, 0.15);
  cursor: not-allowed;
}
</style>