# 企业主机资产画像客户端

企业级桌面应用，用于IT资产管理员集中管理企业电脑资产配置信息，支持批量操作和异常检测，提升资产盘点效率。

## 功能特性

### 1. 设备列表页
- 新增主机：手动录入新主机信息
- 导入巡检文件：支持导入CSV/Excel格式的巡检报告
- 按部门筛选：下拉选择部门过滤设备列表
- 按状态筛选：在线/离线/退役等状态过滤
- 设备表格：展示主机名、IP地址、部门、状态、最后巡检时间
- 快速搜索：支持按主机名/IP/序列号搜索
- 批量选择：支持多选设备进行批量操作

### 2. 画像详情页
- 处理器信息：型号、核心数、频率
- 内存信息：总容量、类型、插槽使用情况
- 磁盘信息：磁盘列表（类型、容量、剩余空间）
- 显卡信息：型号、显存
- 操作系统：系统版本、架构、激活状态
- 网络信息：IP地址、MAC地址、网关、DNS
- 序列号/资产编号：硬件序列号、自定义资产编号
- 主要软件：已安装的关键软件列表及版本

### 3. 标签管理页
- 用途标签：开发机、测试机、办公机、服务器等
- 责任人：员工姓名、工号、联系方式
- 位置信息：办公地点、机柜位置、楼层区域
- 保修信息：保修开始日期、保修结束日期、保修状态

### 4. 异常汇总页
- 配置过低告警：内存<8GB、磁盘<256GB、CPU低于双核等
- 磁盘空间告警：可用空间<10%或<20GB
- 未登记责任人：责任人字段为空
- 重复主机名：网络中存在相同主机名的设备
- 保修临期提醒：保修期在30天内即将到期

### 5. 批量操作窗口
- 生成盘点表：导出Excel格式的资产盘点报表
- 打印资产贴纸：生成可打印的资产标签（含条形码）
- 记录移交：记录设备移交历史
- 归档退役设备：将退役设备移至归档库
- 保存历次快照：批量保存设备配置快照

## 技术栈

- **框架：** Electron
- **前端：** React + TypeScript
- **状态管理：** Zustand
- **UI组件：** Tailwind CSS
- **数据存储：** JSON文件存储
- **文件处理：** xlsx (Excel)
- **构建工具：** Vite + electron-builder

## 项目结构

```
asset-profiler/
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.js
├── index.html
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── index.css
│   ├── types.ts
│   ├── stores/
│   │   ├── deviceStore.ts
│   │   └── uiStore.ts
│   ├── components/
│   │   ├── Layout/
│   │   │   ├── Sidebar.tsx
│   │   │   └── Header.tsx
│   │   └── Modal/
│   │       ├── AddDeviceModal.tsx
│   │       └── BatchOperationsModal.tsx
│   └── pages/
│       ├── DeviceList.tsx
│       ├── DeviceDetail.tsx
│       ├── TagManager.tsx
│       └── AnomalyDashboard.tsx
└── electron/
    ├── main/
    │   └── index.ts
    └── preload/
        └── index.ts
```

## 安装与运行

### 前置要求
- Node.js >= 16.0.0
- npm >= 8.0.0

### 安装步骤

1. 克隆或下载项目代码

2. 安装依赖：
```bash
npm install
```

3. 运行开发服务器：
```bash
npm run dev
```

### 构建应用

```bash
npm run build
```

构建完成后，可执行文件将位于 `release` 目录。

## 使用说明

### 添加新设备
1. 在设备列表页面，点击「新增主机」按钮
2. 填写主机基本信息（主机名、IP、部门等）
3. 点击「添加」完成录入

### 导入巡检文件
1. 点击「导入巡检文件」按钮
2. 选择Excel或CSV格式的巡检报告
3. 系统将自动解析并导入设备信息

### 查看设备详情
1. 在设备列表中点击设备名称
2. 进入详情页面查看硬件配置、标签等信息
3. 可保存当前配置快照

### 批量操作
1. 在设备列表中选择多台设备
2. 点击「批量操作」按钮
3. 选择操作类型并配置参数
4. 点击「执行操作」完成批量处理

### 异常处理
1. 进入「异常汇总」页面
2. 查看各类异常统计和详细列表
3. 对异常进行处理（解决/忽略）

## 数据存储

应用使用本地JSON文件存储数据，文件位置：
- Windows: `%APPDATA%\asset-profiler\asset-profiler-db.json`
- macOS: `~/Library/Application Support/asset-profiler/asset-profiler-db.json`
- Linux: `~/.config/asset-profiler/asset-profiler-db.json`

## 界面预览

应用采用现代化的UI设计，支持深色/浅色主题切换，具有以下特点：
- 清晰的信息层级
- 直观的操作流程
- 友好的错误提示
- 流畅的交互动效

## 版本信息

- 当前版本：1.0.0
- 更新日期：2026-06-12

## 许可证

MIT License
