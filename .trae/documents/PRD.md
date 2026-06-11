# 企业主机资产画像客户端 - 产品需求文档 (PRD)

## 1. 产品概述

**产品名称：** 企业主机资产画像客户端  
**产品类型：** 桌面应用程序 (Electron)  
**目标用户：** 企业IT资产管理员  
**核心价值：** 集中管理企业电脑资产配置信息，支持批量操作和异常检测，提升资产盘点效率

## 2. 核心功能需求

### 2.1 设备列表页 (首页)

**功能列表：**
- 新增主机：手动录入新主机信息
- 导入巡检文件：支持导入CSV/Excel格式的巡检报告
- 按部门筛选：下拉选择部门过滤设备列表
- 按状态筛选：在线/离线/退役等状态过滤
- 设备表格：展示主机名、IP地址、部门、状态、最后巡检时间
- 快速搜索：支持按主机名/IP/序列号搜索
- 批量选择：支持多选设备进行批量操作

**数据字段：**
- 主机名 (hostname)
- IP地址 (ip_address)
- MAC地址 (mac_address)
- 序列号 (serial_number)
- 部门 (department)
- 状态 (status: online/offline/retired)
- 最后巡检时间 (last_inspection_time)
- 创建时间 (created_at)

### 2.2 画像详情页

**硬件信息展示：**
- **处理器信息：** 型号、核心数、频率
- **内存信息：** 总容量、类型、插槽使用情况
- **磁盘信息：** 磁盘列表（类型、容量、剩余空间）
- **显卡信息：** 型号、显存
- **操作系统：** 系统版本、架构、激活状态
- **网络信息：** IP地址、MAC地址、网关、DNS
- **序列号/资产编号：** 硬件序列号、自定义资产编号
- **主要软件：** 已安装的关键软件列表及版本

**展示形式：**
- 卡片式布局，每个硬件类别一张卡片
- 支持一键复制关键信息
- 历史对比：显示配置变更记录

### 2.3 标签管理页

**标签类型：**
- **用途标签：** 开发机、测试机、办公机、服务器等
- **责任人：** 员工姓名、工号、联系方式
- **位置信息：** 办公地点、机柜位置、楼层区域
- **保修信息：** 保修开始日期、保修结束日期、保修状态
- **自定义标签：** 支持用户自定义标签

**功能：**
- 快速添加/编辑标签
- 标签颜色分类
- 批量添加标签
- 标签搜索和过滤

### 2.4 异常汇总页

**异常类型：**
1. **配置过低告警：** 内存<8GB、磁盘<256GB、CPU低于双核等
2. **磁盘空间告警：** 可用空间<10%或<20GB
3. **未登记责任人：** 责任人字段为空
4. **重复主机名：** 网络中存在相同主机名的设备
5. **保修临期提醒：** 保修期在30天内即将到期
6. **长期离线设备：** 超过30天未上报巡检数据

**功能：**
- 异常分类统计卡片
- 异常设备列表（可跳转至详情）
- 异常处理状态标记（待处理/已处理/忽略）
- 异常导出报告

### 2.5 批量操作窗口

**操作类型：**
1. **生成盘点表：** 导出Excel格式的资产盘点报表
2. **打印资产贴纸：** 生成可打印的资产标签（含条形码）
3. **记录移交：** 记录设备移交历史
4. **归档退役设备：** 将退役设备移至归档库
5. **保存历次快照：** 批量保存设备配置快照

**窗口形式：**
- 模态窗口，支持选择设备和操作类型
- 操作进度显示
- 操作结果统计

## 3. 非功能性需求

### 3.1 性能需求
- 设备列表加载时间 < 2秒（1000台设备以内）
- 搜索响应时间 < 500ms
- 批量操作支持100台以上设备同时处理

### 3.2 数据存储
- 本地SQLite数据库存储
- 支持数据备份和恢复
- 支持数据导入导出

### 3.3 用户界面
- 现代化UI设计，支持深色/浅色主题
- 响应式布局，适配不同屏幕尺寸
- 友好的错误提示和操作反馈

## 4. 技术栈

- **框架：** Electron
- **前端：** React + TypeScript
- **状态管理：** Zustand
- **UI组件：** Tailwind CSS + 自定义组件
- **数据存储：** SQLite (better-sqlite3)
- **文件处理：** xlsx (Excel)、pdfmake (PDF)
- **构建工具：** Vite + electron-builder

## 5. 数据模型

### 5.1 主机设备表 (devices)
```
id: INTEGER PRIMARY KEY
hostname: TEXT NOT NULL
ip_address: TEXT
mac_address: TEXT
serial_number: TEXT
department: TEXT
status: TEXT (online/offline/retired)
last_inspection_time: DATETIME
created_at: DATETIME
updated_at: DATETIME
```

### 5.2 硬件配置表 (hardware_specs)
```
id: INTEGER PRIMARY KEY
device_id: INTEGER FOREIGN KEY
processor: TEXT
memory: TEXT
disk: TEXT
graphics: TEXT
os_info: TEXT
network_info: TEXT
software_list: TEXT
snapshot_time: DATETIME
```

### 5.3 标签表 (tags)
```
id: INTEGER PRIMARY KEY
device_id: INTEGER FOREIGN KEY
tag_type: TEXT (purpose/owner/location/warranty/custom)
tag_name: TEXT
tag_value: TEXT
created_at: DATETIME
```

### 5.4 异常记录表 (anomalies)
```
id: INTEGER PRIMARY KEY
device_id: INTEGER FOREIGN KEY
anomaly_type: TEXT
anomaly_description: TEXT
status: TEXT (pending/resolved/ignored)
detected_at: DATETIME
resolved_at: DATETIME
```

## 6. 用户流程

### 6.1 新增主机流程
1. 点击「新增主机」按钮
2. 填写主机基本信息（主机名、IP、部门等）
3. 可选：导入或手动录入硬件配置
4. 添加标签信息
5. 保存主机记录

### 6.2 批量操作流程
1. 在设备列表选择多台设备
2. 点击「批量操作」按钮
3. 选择操作类型
4. 配置操作参数
5. 执行操作并查看结果

### 6.3 异常处理流程
1. 查看异常汇总页面
2. 选择异常类型查看详情
3. 处理异常（修复/标记忽略）
4. 更新异常状态

## 7. 里程碑计划

**MVP版本：**
- 设备列表基础功能
- 画像详情展示
- 基本的批量操作

**V1.0版本：**
- 完整的标签管理
- 异常检测和汇总
- 数据导入导出

**V1.1版本：**
- 高级批量操作
- 报表生成
- 数据可视化
