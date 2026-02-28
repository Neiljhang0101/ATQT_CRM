<script setup>
// 痛點雷達 - 後段需完整實作 LINE 分析
// 骨架佔位用

</script>


<template>
  <div>
    <h2 class="text-xl font-semibold mb-4" style="color:#1a1d23;">痛點雷達</h2>

    <el-upload
      class="mb-6"
      accept=".txt"
      :auto-upload="false"
      drag
    >
      <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
      <div class="el-upload__text">拖曳 LINE 聊天紀錄 <em>.txt</em> 至此，或點擊上傳</div>
    </el-upload>

    <el-empty description="上傳 LINE 聊天紀錄後，系統將自動分析痛點關鍵字" />
  </div>
</template>
