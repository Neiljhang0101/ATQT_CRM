content = """<script setup>
// 活動追蹤 - 骨架頁面，待後續完整功能
</script>

<template>
  <div>
    <h2 class="text-xl font-semibold mb-4" style="color:#1a1d23;">活動追蹤</h2>

    <el-card shadow="never" class="border border-gray-200 mb-6">
      <template #header>
        <span class="font-medium" style="color:#3d4148;">建立新活動</span>
      </template>
      <el-form label-position="top">
        <el-form-item label="活動名稱">
          <el-input placeholder="例：社群推廣交流課程" />
        </el-form-item>
        <el-form-item label="活動日期">
          <el-date-picker type="date" placeholder="選擇日期" class="w-full" />
        </el-form-item>
        <el-form-item label="參與者 UID（每行一個）">
          <el-input type="textarea" :rows="4" placeholder="12345678" />
        </el-form-item>
        <el-button type="primary">建立活動</el-button>
      </el-form>
    </el-card>

    <el-empty description="建立活動後，系統將自動比對前後 14 天交易量變化" />
  </div>
</template>
"""

with open(r'C:\Users\Neil\Desktop\ATQT_CRM\atqt-crm\src\views\Campaigns.vue', 'w', encoding='utf-8') as f:
    f.write(content)
print('Done')
