# 企业主机资产画像客户端 - 技术架构文档

## 1. 系统架构概述

### 1.1 架构模式
采用 Electron + React 的桌面应用架构，分为：
- **主进程 (Main Process)：** Node.js 环境，负责系统级操作、数据库访问、文件处理
- **渲染进程 (Renderer Process)：** Chromium 环境，负责UI展示和用户交互

### 1.2 技术栈
```
{
  "electron": "^28.0.0",
  "react": "^18.2.0",
  "typescript": "^5.3.0",
  "zustand": "^4.4.0",
  "better-sqlite3": "^9.2.0",
  "xlsx": "^0.18.5",
  "pdfmake": "^0.2.8",
  "vite": "^5.0.0",
  "electron-builder": "^24.9.0"
}
```

## 2. 项目结构

```
asset-profiler/
├── package.json
├── vite.config.ts
├── electron-builder.json
├── tsconfig.json
├── src/
│   ├── main/                    # Electron主进程
│   │   ├── index.ts             # 入口文件
│   │   ├── database.ts          # 数据库操作
│   │   ├── ipc-handlers.ts      # IPC通信处理
│   │   └── services/            # 主进程服务
│   │       ├── file-service.ts
│   │       ├── export-service.ts
│   │       └── print-service.ts
│   │
│   ├── renderer/                # React渲染进程
│   │   ├── index.html
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── components/          # 通用组件
│   │   │   ├── Layout/
│   │   │   ├── DataTable/
│   │   │   ├── Modal/
│   │   │   └── common/
│   │   ├── pages/               # 页面组件
│   │   │   ├── DeviceList/       # 设备列表页
│   │   │   ├── DeviceDetail/     # 画像详情页
│   │   │   ├── TagManager/       # 标签管理页
│   │   │   ├── AnomalyDashboard/ # 异常汇总页
│   │   │   └── BatchOperations/  # 批量操作窗口
│   │   ├── stores/               # Zustand状态管理
│   │   │   ├── deviceStore.ts
│   │   │   ├── tagStore.ts
│   │   │   └── uiStore.ts
│   │   ├── hooks/                # 自定义hooks
│   │   ├── utils/                # 工具函数
│   │   └── styles/               # 全局样式
│   │
│   └── preload/                  # 预加载脚本
│       └── index.ts
│
└── resources/                    # 应用资源
    └── icon.ico
```

## 3. 核心模块设计

### 3.1 数据库模块

**使用 better-sqlite3 进行本地存储**

```typescript
// 主进程数据库初始化
const db = new Database('asset-profiler.db');

// 创表语句
CREATE TABLE IF NOT EXISTS devices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hostname TEXT NOT NULL UNIQUE,
  ip_address TEXT,
  mac_address TEXT,
  serial_number TEXT,
  department TEXT,
  status TEXT DEFAULT 'offline',
  last_inspection_time DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS hardware_specs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id INTEGER NOT NULL,
  processor TEXT,
  memory TEXT,
  disk TEXT,
  graphics TEXT,
  os_info TEXT,
  network_info TEXT,
  software_list TEXT,
  snapshot_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (device_id) REFERENCES devices(id)
);

CREATE TABLE IF NOT EXISTS tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id INTEGER NOT NULL,
  tag_type TEXT NOT NULL,
  tag_name TEXT NOT NULL,
  tag_value TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (device_id) REFERENCES devices(id)
);

CREATE TABLE IF NOT EXISTS anomalies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id INTEGER NOT NULL,
  anomaly_type TEXT NOT NULL,
  anomaly_description TEXT,
  status TEXT DEFAULT 'pending',
  detected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  resolved_at DATETIME,
  FOREIGN KEY (device_id) REFERENCES devices(id)
);

CREATE TABLE IF NOT EXISTS snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id INTEGER NOT NULL,
  snapshot_data TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (device_id) REFERENCES devices(id)
);
```

### 3.2 IPC通信设计

**主进程暴露的API：**

```typescript
// 设备管理
ipcMain.handle('devices:getAll', async (event, filters) => {})
ipcMain.handle('devices:create', async (event, deviceData) => {})
ipcMain.handle('devices:update', async (event, id, deviceData) => {})
ipcMain.handle('devices:delete', async (event, id) => {})
ipcMain.handle('devices:import', async (event, filePath) => {})

// 硬件配置
ipcMain.handle('hardware:getByDevice', async (event, deviceId) => {})
ipcMain.handle('hardware:saveSnapshot', async (event, deviceId, specs) => {})

// 标签管理
ipcMain.handle('tags:getByDevice', async (event, deviceId) => {})
ipcMain.handle('tags:create', async (event, tagData) => {})
ipcMain.handle('tags:update', async (event, id, tagData) => {})
ipcMain.handle('tags:delete', async (event, id) => {})

// 异常检测
ipcMain.handle('anomalies:getAll', async () => {})
ipcMain.handle('anomalies:resolve', async (event, id) => {})
ipcMain.handle('anomalies:ignore', async (event, id) => {})

// 批量操作
ipcMain.handle('batch:exportReport', async (event, deviceIds, options) => {})
ipcMain.handle('batch:generateStickers', async (event, deviceIds) => {})
ipcMain.handle('batch:transfer', async (event, deviceIds, transferData) => {})
ipcMain.handle('batch:archive', async (event, deviceIds) => {})
ipcMain.handle('batch:saveSnapshots', async (event, deviceIds) => {})
```

### 3.3 状态管理设计

**使用Zustand进行状态管理：**

```typescript
// deviceStore.ts
interface DeviceStore {
  devices: Device[];
  selectedDevices: number[];
  filters: DeviceFilters;
  loading: boolean;
  
  fetchDevices: () => Promise<void>;
  addDevice: (device: DeviceInput) => Promise<void>;
  updateDevice: (id: number, data: Partial<Device>) => Promise<void>;
  deleteDevice: (id: number) => Promise<void>;
  selectDevice: (id: number) => void;
  selectAll: () => void;
  clearSelection: () => void;
  setFilters: (filters: DeviceFilters) => void;
}

// tagStore.ts
interface TagStore {
  tags: Tag[];
  
  fetchTags: (deviceId: number) => Promise<void>;
  addTag: (tag: TagInput) => Promise<void>;
  updateTag: (id: number, data: Partial<Tag>) => Promise<void>;
  deleteTag: (id: number) => Promise<void>;
}

// uiStore.ts
interface UIStore {
  theme: 'light' | 'dark';
  sidebarCollapsed: boolean;
  currentPage: string;
  modalOpen: { [key: string]: boolean };
  
  toggleTheme: () => void;
  toggleSidebar: () => void;
  setCurrentPage: (page: string) => void;
  openModal: (modalId: string) => void;
  closeModal: (modalId: string) => void;
}
```

## 4. 页面组件设计

### 4.1 设备列表页 (DeviceList)

**组件结构：**
```
DeviceListPage
├── Header
│   ├── Title
│   ├── SearchBar
│   ├── FilterBar (部门、状态)
│   └── ActionButtons (新增、导入、批量操作)
├── DataTable
│   ├── TableHeader (可排序列)
│   ├── TableBody (设备列表)
│   │   ├── Checkbox
│   │   ├── Hostname (可点击跳转详情)
│   │   ├── IP Address
│   │   ├── Department
│   │   ├── Status (Badge)
│   │   ├── Last Inspection
│   │   └── Actions (编辑、删除)
│   └── TableFooter (分页)
└── ImportModal
```

### 4.2 画像详情页 (DeviceDetail)

**组件结构：**
```
DeviceDetailPage
├── Header
│   ├── BackButton
│   ├── DeviceName
│   └── QuickActions (编辑、快照、删除)
├── OverviewCards
│   ├── StatusCard (在线/离线)
│   ├── LastInspectionCard
│   └── WarrantyStatusCard
├── HardwareInfo
│   ├── ProcessorCard
│   ├── MemoryCard
│   ├── DiskCard
│   ├── GraphicsCard
│   ├── OSCard
│   └── NetworkCard
├── SoftwareList
│   └── SoftwareItem[]
├── TagsSection
│   └── TagBadge[]
└── HistoryTimeline
    └── SnapshotItem[]
```

### 4.3 标签管理页 (TagManager)

**组件结构：**
```
TagManagerPage
├── TagTypeSelector (Tab)
├── TagList
│   ├── TagCard[]
│   │   ├── TagName
│   │   ├── TagValue
│   │   ├── EditButton
│   │   └── DeleteButton
│   └── EmptyState
├── AddTagForm
│   ├── TagTypeSelect
│   ├── TagNameInput
│   ├── TagValueInput
│   └── SubmitButton
└── BulkTagModal
```

### 4.4 异常汇总页 (AnomalyDashboard)

**组件结构：**
```
AnomalyDashboardPage
├── StatsCards
│   ├── LowConfigCard
│   ├── DiskWarningCard
│   ├── UnassignedOwnerCard
│   ├── DuplicateHostnameCard
│   └── WarrantyExpiringCard
├── AnomalyList
│   ├── FilterByType
│   ├── FilterByStatus
│   └── AnomalyItem[]
│       ├── AnomalyType (Icon + Label)
│       ├── DeviceInfo
│       ├── Description
│       ├── DetectedAt
│       └── Actions (Resolve, Ignore)
└── ExportReportButton
```

### 4.5 批量操作窗口 (BatchOperations)

**组件结构：**
```
BatchOperationsModal
├── Header
│   ├── Title
│   ├── SelectedCount
│   └── CloseButton
├── OperationSelector
│   └── RadioGroup
│       ├── GenerateReport
│       ├── PrintStickers
│       ├── RecordTransfer
│       ├── ArchiveDevices
│       └── SaveSnapshots
├── OperationConfig (根据选择显示不同配置)
├── ActionButtons
│   ├── Cancel
│   └── Execute
└── ProgressOverlay (操作进行时显示)
```

## 5. 异常检测规则

### 5.1 配置过低检测
```javascript
const LOW_CONFIG_RULES = {
  memory: { min: '8GB', message: '内存低于8GB' },
  disk: { min: '256GB', message: '磁盘容量低于256GB' },
  processor: { min: '2 cores', message: '处理器核心数少于2' }
};
```

### 5.2 磁盘告警检测
```javascript
const DISK_WARNING_RULES = {
  freePercent: { threshold: 10, message: '可用空间低于10%' },
  freeGB: { threshold: 20, message: '可用空间低于20GB' }
};
```

### 5.3 保修临期检测
```javascript
const WARRANTY_RULES = {
  expiringDays: 30, // 提前30天提醒
  expired: 0
};
```

## 6. 导出功能设计

### 6.1 Excel盘点表导出
使用 xlsx 库生成，包含以下Sheet：
- **设备汇总：** 所有设备基本信息
- **硬件详情：** 每台设备的硬件配置
- **标签信息：** 设备标签汇总
- **异常报告：** 当前异常列表

### 6.2 资产贴纸生成
使用 pdfmake 生成PDF格式贴纸：
- 尺寸：50mm x 25mm
- 内容：主机名、IP、序列号、条形码
- 布局：每页8个贴纸

### 6.3 移交记录
记录格式：
```json
{
  "transfer_id": "TRF-20240101-001",
  "from_owner": "张三",
  "to_owner": "李四",
  "transfer_date": "2024-01-01",
  "devices": [1, 2, 3],
  "notes": "部门调整"
}
```

## 7. 数据快照机制

### 7.1 快照保存
- 手动保存：用户可随时保存当前配置快照
- 自动保存：每月自动保存一次
- 批量保存：支持批量保存多台设备快照

### 7.2 快照对比
```typescript
interface SnapshotDiff {
  device_id: number;
  hostname: string;
  changes: {
    field: string;
    old_value: any;
    new_value: any;
  }[];
  timestamp: Date;
}
```

## 8. 安全性考虑

### 8.1 数据安全
- 本地数据加密存储
- 定期自动备份
- 操作日志记录

### 8.2 权限控制
- 管理员：全部权限
- 操作员：查看和批量操作
- 查看者：仅查看权限

## 9. 性能优化

### 9.1 数据库优化
- 创建必要索引
- 分页查询
- 增量加载

### 9.2 UI优化
- 虚拟列表（大量数据）
- 防抖处理（搜索）
- 骨架屏（加载状态）

### 9.3 构建优化
- 代码分割
- 懒加载
- 资源压缩

## 10. 部署方案

### 10.1 Electron打包
使用 electron-builder：
- Windows: NSIS installer + portable
- macOS: DMG
- Linux: AppImage

### 10.2 应用更新
- 自动检测更新
- 后台下载
- 用户确认后安装

## 11. 开发规范

### 11.1 代码规范
- TypeScript 严格模式
- ESLint + Prettier
- 组件文件命名：PascalCase
- 工具函数命名：camelCase

### 11.2 Git规范
- 分支：feature/xxx, bugfix/xxx
- 提交：feat:、fix:、docs:、refactor:

### 11.3 测试规范
- 单元测试：Jest
- E2E测试：Playwright
- 覆盖率要求：>80%

---

**文档版本：** 1.0  
**创建日期：** 2026-06-12  
**作者：** AI Assistant
