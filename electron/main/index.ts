import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import log from 'electron-log';
import fs from 'fs';

log.initialize();
log.info('Application starting...');

interface Database {
  devices: any[];
  hardware_specs: any[];
  tags: any[];
  anomalies: any[];
  snapshots: any[];
  transfer_records: any[];
  nextIds: {
    devices: number;
    hardware_specs: number;
    tags: number;
    anomalies: number;
    snapshots: number;
    transfer_records: number;
  };
}

let mainWindow: BrowserWindow | null = null;
let db: Database | null = null;

const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'];

function getDbPath() {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'asset-profiler-db.json');
}

function loadDatabase() {
  const dbPath = getDbPath();
  log.info('Database path:', dbPath);

  try {
    if (fs.existsSync(dbPath)) {
      const data = fs.readFileSync(dbPath, 'utf-8');
      db = JSON.parse(data);
      log.info('Database loaded successfully');
    } else {
      db = {
        devices: [],
        hardware_specs: [],
        tags: [],
        anomalies: [],
        snapshots: [],
        transfer_records: [],
        nextIds: {
          devices: 1,
          hardware_specs: 1,
          tags: 1,
          anomalies: 1,
          snapshots: 1,
          transfer_records: 1
        }
      };
      saveDatabase();
      log.info('New database created');
    }
  } catch (error) {
    log.error('Error loading database:', error);
    db = {
      devices: [],
      hardware_specs: [],
      tags: [],
      anomalies: [],
      snapshots: [],
      transfer_records: [],
      nextIds: {
        devices: 1,
        hardware_specs: 1,
        tags: 1,
        anomalies: 1,
        snapshots: 1,
        transfer_records: 1
      }
    };
  }
}

function saveDatabase() {
  if (!db) return;
  try {
    const dbPath = getDbPath();
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf-8');
  } catch (error) {
    log.error('Error saving database:', error);
  }
}

function parseMemorySize(memStr: string): number {
  if (!memStr) return 0;
  const match = memStr.toUpperCase().match(/(\d+(?:\.\d+)?)\s*(GB|MB|TB)/i);
  if (match) {
    const value = parseFloat(match[1]);
    const unit = match[2].toUpperCase();
    if (unit === 'GB') return value;
    if (unit === 'MB') return value / 1024;
    if (unit === 'TB') return value * 1024;
  }
  const numMatch = memStr.match(/\d+/);
  return numMatch ? parseInt(numMatch[0]) : 0;
}

function parseDiskSize(diskStr: string): number {
  if (!diskStr) return 0;
  const match = diskStr.toUpperCase().match(/(\d+(?:\.\d+)?)\s*(GB|MB|TB)/i);
  if (match) {
    const value = parseFloat(match[1]);
    const unit = match[2].toUpperCase();
    if (unit === 'GB') return value;
    if (unit === 'MB') return value / 1024;
    if (unit === 'TB') return value * 1024;
  }
  const numMatch = diskStr.match(/\d+/);
  return numMatch ? parseInt(numMatch[0]) : 0;
}

function parseDiskFreePercent(diskStr: string): number {
  if (!diskStr) return 100;
  const percentMatch = diskStr.match(/(\d+)%/);
  if (percentMatch) {
    return parseInt(percentMatch[1]);
  }
  return 100;
}

function generateAnomalyKey(deviceId: number, anomalyType: string, description: string): string {
  return `${deviceId}_${anomalyType}_${description}`;
}

function detectAnomalies() {
  if (!db) return;

  const existingPendingAnomalies = new Map<string, any>();
  db.anomalies
    .filter(a => a.status === 'pending')
    .forEach(a => {
      const key = generateAnomalyKey(a.device_id, a.anomaly_type, a.anomaly_description);
      existingPendingAnomalies.set(key, a);
    });

  const currentAnomalyKeys = new Set<string>();
  const anomaliesToKeep = db.anomalies.filter(a => a.status !== 'pending');

  db.devices.forEach(device => {
    const specs = db!.hardware_specs
      .filter(h => h.device_id === device.id)
      .sort((a, b) => new Date(b.snapshot_time).getTime() - new Date(a.snapshot_time).getTime())[0];
    const tags = db!.tags.filter(t => t.device_id === device.id);

    if (specs) {
      const memSize = parseMemorySize(specs.memory);
      if (memSize > 0 && memSize < 8) {
        const desc = `${device.hostname} 内存容量 ${specs.memory}，低于8GB`;
        const key = generateAnomalyKey(device.id, 'low_config', desc);
        currentAnomalyKeys.add(key);
        if (!existingPendingAnomalies.has(key)) {
          anomaliesToKeep.push({
            id: db!.nextIds.anomalies++,
            device_id: device.id,
            anomaly_type: 'low_config',
            anomaly_description: desc,
            status: 'pending',
            detected_at: new Date().toISOString(),
            resolved_at: null
          });
        }
      }

      const diskSize = parseDiskSize(specs.disk);
      if (diskSize > 0 && diskSize < 256) {
        const desc = `${device.hostname} 磁盘容量 ${specs.disk}，低于256GB`;
        const key = generateAnomalyKey(device.id, 'low_config', desc);
        currentAnomalyKeys.add(key);
        if (!existingPendingAnomalies.has(key)) {
          anomaliesToKeep.push({
            id: db!.nextIds.anomalies++,
            device_id: device.id,
            anomaly_type: 'low_config',
            anomaly_description: desc,
            status: 'pending',
            detected_at: new Date().toISOString(),
            resolved_at: null
          });
        }
      }

      const freePercent = parseDiskFreePercent(specs.disk);
      if (freePercent < 10) {
        const desc = `${device.hostname} 磁盘可用空间 ${freePercent}%，低于10%`;
        const key = generateAnomalyKey(device.id, 'disk_warning', desc);
        currentAnomalyKeys.add(key);
        if (!existingPendingAnomalies.has(key)) {
          anomaliesToKeep.push({
            id: db!.nextIds.anomalies++,
            device_id: device.id,
            anomaly_type: 'disk_warning',
            anomaly_description: desc,
            status: 'pending',
            detected_at: new Date().toISOString(),
            resolved_at: null
          });
        }
      }
    }

    const hasOwner = tags.some(t => t.tag_type === 'owner' && t.tag_value);
    if (!hasOwner) {
      const desc = `${device.hostname} 未登记责任人`;
      const key = generateAnomalyKey(device.id, 'unassigned_owner', desc);
      currentAnomalyKeys.add(key);
      if (!existingPendingAnomalies.has(key)) {
        anomaliesToKeep.push({
          id: db!.nextIds.anomalies++,
          device_id: device.id,
          anomaly_type: 'unassigned_owner',
          anomaly_description: desc,
          status: 'pending',
          detected_at: new Date().toISOString(),
          resolved_at: null
        });
      }
    }

    const hostnameCount = db!.devices.filter(d => d.hostname === device.hostname).length;
    if (hostnameCount > 1) {
      const desc = `${device.hostname} 存在重复主机名（共${hostnameCount}台设备）`;
      const key = generateAnomalyKey(device.id, 'duplicate_hostname', desc);
      currentAnomalyKeys.add(key);
      if (!existingPendingAnomalies.has(key)) {
        anomaliesToKeep.push({
          id: db!.nextIds.anomalies++,
          device_id: device.id,
          anomaly_type: 'duplicate_hostname',
          anomaly_description: desc,
          status: 'pending',
          detected_at: new Date().toISOString(),
          resolved_at: null
        });
      }
    }

    const warrantyTag = tags.find(t => t.tag_type === 'warranty' && t.tag_name === '保修到期日期');
    if (warrantyTag && warrantyTag.tag_value) {
      try {
        const warrantyDate = new Date(warrantyTag.tag_value);
        const now = new Date();
        const daysUntilExpiry = Math.ceil((warrantyDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysUntilExpiry > 0 && daysUntilExpiry <= 30) {
          const desc = `${device.hostname} 保修将在${daysUntilExpiry}天后到期（${warrantyTag.tag_value}）`;
          const key = generateAnomalyKey(device.id, 'warranty_expiring', desc);
          currentAnomalyKeys.add(key);
          if (!existingPendingAnomalies.has(key)) {
            anomaliesToKeep.push({
              id: db!.nextIds.anomalies++,
              device_id: device.id,
              anomaly_type: 'warranty_expiring',
              anomaly_description: desc,
              status: 'pending',
              detected_at: new Date().toISOString(),
              resolved_at: null
            });
          }
        }
      } catch (e) {
        log.warn('Error parsing warranty date:', warrantyTag.tag_value);
      }
    }
  });

  db.anomalies = anomaliesToKeep;
  saveDatabase();
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    title: '企业主机资产画像客户端',
    show: false,
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    log.info('Window shown');
  });

  if (VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'));
  }
}

app.whenReady().then(() => {
  log.info('App ready');
  loadDatabase();
  createWindow();
  setupIpcHandlers();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

function setupIpcHandlers() {
  if (!db) return;

  ipcMain.handle('devices:getAll', async (event, filters?: any) => {
    try {
      let result = [...db!.devices];

      if (filters?.department) {
        result = result.filter(d => d.department === filters.department);
      }
      if (filters?.status) {
        result = result.filter(d => d.status === filters.status);
      }
      if (filters?.search) {
        const searchLower = filters.search.toLowerCase();
        result = result.filter(d =>
          (d.hostname && d.hostname.toLowerCase().includes(searchLower)) ||
          (d.ip_address && d.ip_address.toLowerCase().includes(searchLower)) ||
          (d.serial_number && d.serial_number.toLowerCase().includes(searchLower))
        );
      }

      result.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      return result;
    } catch (error) {
      log.error('Error fetching devices:', error);
      throw error;
    }
  });

  ipcMain.handle('devices:create', async (event, deviceData: any) => {
    try {
      const newDevice = {
        id: db!.nextIds.devices++,
        hostname: deviceData.hostname,
        ip_address: deviceData.ip_address || null,
        mac_address: deviceData.mac_address || null,
        serial_number: deviceData.serial_number || null,
        department: deviceData.department || null,
        status: deviceData.status || 'offline',
        last_inspection_time: deviceData.last_inspection_time || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      db!.devices.push(newDevice);
      saveDatabase();
      detectAnomalies();
      return newDevice;
    } catch (error) {
      log.error('Error creating device:', error);
      throw error;
    }
  });

  ipcMain.handle('devices:update', async (event, id: number, deviceData: any) => {
    try {
      const index = db!.devices.findIndex(d => d.id === id);
      if (index !== -1) {
        db!.devices[index] = {
          ...db!.devices[index],
          ...deviceData,
          updated_at: new Date().toISOString()
        };
        saveDatabase();
        detectAnomalies();
        return db!.devices[index];
      }
      throw new Error('Device not found');
    } catch (error) {
      log.error('Error updating device:', error);
      throw error;
    }
  });

  ipcMain.handle('devices:delete', async (event, id: number) => {
    try {
      db!.devices = db!.devices.filter(d => d.id !== id);
      db!.hardware_specs = db!.hardware_specs.filter(h => h.device_id !== id);
      db!.tags = db!.tags.filter(t => t.device_id !== id);
      db!.anomalies = db!.anomalies.filter(a => a.device_id !== id);
      db!.snapshots = db!.snapshots.filter(s => s.device_id !== id);
      saveDatabase();
      return { success: true };
    } catch (error) {
      log.error('Error deleting device:', error);
      throw error;
    }
  });

  ipcMain.handle('hardware:getByDevice', async (event, deviceId: number) => {
    try {
      const specs = db!.hardware_specs
        .filter(h => h.device_id === deviceId)
        .sort((a, b) => new Date(b.snapshot_time).getTime() - new Date(a.snapshot_time).getTime());
      return specs[0] || null;
    } catch (error) {
      log.error('Error fetching hardware specs:', error);
      throw error;
    }
  });

  ipcMain.handle('hardware:saveSnapshot', async (event, deviceId: number, specs: any) => {
    try {
      const newSpec = {
        id: db!.nextIds.hardware_specs++,
        device_id: deviceId,
        processor: specs.processor || null,
        memory: specs.memory || null,
        disk: specs.disk || null,
        graphics: specs.graphics || null,
        os_info: specs.os_info || null,
        network_info: specs.network_info || null,
        software_list: specs.software_list || null,
        snapshot_time: new Date().toISOString()
      };
      db!.hardware_specs.push(newSpec);
      saveDatabase();
      detectAnomalies();
      return { id: newSpec.id };
    } catch (error) {
      log.error('Error saving hardware snapshot:', error);
      throw error;
    }
  });

  ipcMain.handle('tags:getByDevice', async (event, deviceId: number) => {
    try {
      return db!.tags
        .filter(t => t.device_id === deviceId)
        .sort((a, b) => a.tag_type.localeCompare(b.tag_type));
    } catch (error) {
      log.error('Error fetching tags:', error);
      throw error;
    }
  });

  ipcMain.handle('tags:create', async (event, tagData: any) => {
    try {
      const newTag = {
        id: db!.nextIds.tags++,
        device_id: tagData.device_id,
        tag_type: tagData.tag_type,
        tag_name: tagData.tag_name,
        tag_value: tagData.tag_value || null,
        created_at: new Date().toISOString()
      };
      db!.tags.push(newTag);
      saveDatabase();
      detectAnomalies();
      return newTag;
    } catch (error) {
      log.error('Error creating tag:', error);
      throw error;
    }
  });

  ipcMain.handle('tags:update', async (event, id: number, tagData: any) => {
    try {
      const index = db!.tags.findIndex(t => t.id === id);
      if (index !== -1) {
        db!.tags[index] = {
          ...db!.tags[index],
          ...tagData
        };
        saveDatabase();
        detectAnomalies();
        return db!.tags[index];
      }
      throw new Error('Tag not found');
    } catch (error) {
      log.error('Error updating tag:', error);
      throw error;
    }
  });

  ipcMain.handle('tags:delete', async (event, id: number) => {
    try {
      db!.tags = db!.tags.filter(t => t.id !== id);
      saveDatabase();
      detectAnomalies();
      return { success: true };
    } catch (error) {
      log.error('Error deleting tag:', error);
      throw error;
    }
  });

  ipcMain.handle('anomalies:getAll', async () => {
    try {
      return db!.anomalies.map(a => {
        const device = db!.devices.find(d => d.id === a.device_id);
        return {
          ...a,
          hostname: device?.hostname,
          ip_address: device?.ip_address,
          department: device?.department
        };
      }).sort((a, b) => new Date(b.detected_at).getTime() - new Date(a.detected_at).getTime());
    } catch (error) {
      log.error('Error fetching anomalies:', error);
      throw error;
    }
  });

  ipcMain.handle('anomalies:detectAll', async () => {
    try {
      detectAnomalies();
      return { success: true };
    } catch (error) {
      log.error('Error detecting anomalies:', error);
      throw error;
    }
  });

  ipcMain.handle('anomalies:resolve', async (event, id: number) => {
    try {
      const index = db!.anomalies.findIndex(a => a.id === id);
      if (index !== -1) {
        db!.anomalies[index].status = 'resolved';
        db!.anomalies[index].resolved_at = new Date().toISOString();
        saveDatabase();
        return { success: true };
      }
      throw new Error('Anomaly not found');
    } catch (error) {
      log.error('Error resolving anomaly:', error);
      throw error;
    }
  });

  ipcMain.handle('anomalies:ignore', async (event, id: number) => {
    try {
      const index = db!.anomalies.findIndex(a => a.id === id);
      if (index !== -1) {
        db!.anomalies[index].status = 'ignored';
        db!.anomalies[index].resolved_at = new Date().toISOString();
        saveDatabase();
        return { success: true };
      }
      throw new Error('Anomaly not found');
    } catch (error) {
      log.error('Error ignoring anomaly:', error);
      throw error;
    }
  });

  ipcMain.handle('anomalies:create', async (event, anomalyData: any) => {
    try {
      const newAnomaly = {
        id: db!.nextIds.anomalies++,
        device_id: anomalyData.device_id,
        anomaly_type: anomalyData.anomaly_type,
        anomaly_description: anomalyData.anomaly_description,
        status: anomalyData.status || 'pending',
        detected_at: new Date().toISOString(),
        resolved_at: null
      };
      db!.anomalies.push(newAnomaly);
      saveDatabase();
      return newAnomaly;
    } catch (error) {
      log.error('Error creating anomaly:', error);
      throw error;
    }
  });

  ipcMain.handle('dialog:openFile', async (event, options: any) => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openFile'],
      filters: options.filters || [{ name: 'All Files', extensions: ['*'] }]
    });
    return result;
  });

  ipcMain.handle('dialog:saveFile', async (event, options: any) => {
    const result = await dialog.showSaveDialog(mainWindow!, {
      filters: options.filters || [{ name: 'All Files', extensions: ['*'] }],
      defaultPath: options.defaultPath
    });
    return result;
  });

  ipcMain.handle('file:read', async (event, filePath: string) => {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return content;
    } catch (error: any) {
      log.error('Error reading file:', error);
      throw new Error(`文件读取失败：${error.message}`);
    }
  });

  ipcMain.handle('file:readBinary', async (event, filePath: string) => {
    try {
      const buffer = fs.readFileSync(filePath);
      return Array.from(buffer);
    } catch (error: any) {
      log.error('Error reading binary file:', error);
      throw new Error(`二进制文件读取失败：${error.message}`);
    }
  });

  ipcMain.handle('file:write', async (event, filePath: string, content: string) => {
    try {
      fs.writeFileSync(filePath, content, 'utf-8');
      return { success: true };
    } catch (error: any) {
      log.error('Error writing file:', error);
      throw new Error(`文件写入失败：${error.message}`);
    }
  });

  ipcMain.handle('file:writeBinary', async (event, filePath: string, data: number[]) => {
    try {
      const buffer = Buffer.from(data);
      fs.writeFileSync(filePath, buffer);
      return { success: true };
    } catch (error: any) {
      log.error('Error writing binary file:', error);
      throw new Error(`二进制文件写入失败：${error.message}`);
    }
  });

  ipcMain.handle('departments:getAll', async () => {
    try {
      const departments = [...new Set(db!.devices
        .filter(d => d.department)
        .map(d => d.department))];
      return departments.map(d => ({ department: d })).sort();
    } catch (error) {
      log.error('Error fetching departments:', error);
      throw error;
    }
  });

  ipcMain.handle('snapshots:getByDevice', async (event, deviceId: number) => {
    try {
      return db!.snapshots
        .filter(s => s.device_id === deviceId)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 10);
    } catch (error) {
      log.error('Error fetching snapshots:', error);
      throw error;
    }
  });

  ipcMain.handle('snapshots:save', async (event, deviceId: number, snapshotData: any) => {
    try {
      const newSnapshot = {
        id: db!.nextIds.snapshots++,
        device_id: deviceId,
        snapshot_data: JSON.stringify(snapshotData),
        created_at: new Date().toISOString()
      };
      db!.snapshots.push(newSnapshot);
      saveDatabase();
      return { id: newSnapshot.id };
    } catch (error) {
      log.error('Error saving snapshot:', error);
      throw error;
    }
  });

  ipcMain.handle('snapshots:saveBatch', async (event, deviceIds: number[]) => {
    try {
      const results: { deviceId: number; success: boolean; message: string }[] = [];

      for (const deviceId of deviceIds) {
        const device = db!.devices.find(d => d.id === deviceId);
        const specs = db!.hardware_specs
          .filter(h => h.device_id === deviceId)
          .sort((a, b) => new Date(b.snapshot_time).getTime() - new Date(a.snapshot_time).getTime())[0];

        if (specs) {
          const newSnapshot = {
            id: db!.nextIds.snapshots++,
            device_id: deviceId,
            snapshot_data: JSON.stringify(specs),
            created_at: new Date().toISOString()
          };
          db!.snapshots.push(newSnapshot);
          results.push({
            deviceId,
            success: true,
            message: `${device?.hostname || `设备#${deviceId}`} 快照保存成功`
          });
        } else {
          results.push({
            deviceId,
            success: false,
            message: `${device?.hostname || `设备#${deviceId}`} 无硬件信息，跳过保存`
          });
        }
      }

      saveDatabase();
      return results;
    } catch (error) {
      log.error('Error saving batch snapshots:', error);
      throw error;
    }
  });

  ipcMain.handle('transfer:create', async (event, transferData: any) => {
    try {
      const newTransfer = {
        id: db!.nextIds.transfer_records++,
        device_id: transferData.device_id,
        from_owner: transferData.from_owner || null,
        to_owner: transferData.to_owner,
        transfer_date: new Date().toISOString(),
        notes: transferData.notes || null
      };
      db!.transfer_records.push(newTransfer);
      saveDatabase();
      return { id: newTransfer.id };
    } catch (error) {
      log.error('Error creating transfer record:', error);
      throw error;
    }
  });

  log.info('IPC handlers setup complete');
}
