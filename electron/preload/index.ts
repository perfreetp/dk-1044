import { contextBridge, ipcRenderer } from 'electron';

const electronAPI = {
  devices: {
    getAll: (filters?: any) => ipcRenderer.invoke('devices:getAll', filters),
    create: (deviceData: any) => ipcRenderer.invoke('devices:create', deviceData),
    update: (id: number, deviceData: any) => ipcRenderer.invoke('devices:update', id, deviceData),
    delete: (id: number) => ipcRenderer.invoke('devices:delete', id),
  },
  hardware: {
    getByDevice: (deviceId: number) => ipcRenderer.invoke('hardware:getByDevice', deviceId),
    saveSnapshot: (deviceId: number, specs: any) => ipcRenderer.invoke('hardware:saveSnapshot', deviceId, specs),
  },
  tags: {
    getByDevice: (deviceId: number) => ipcRenderer.invoke('tags:getByDevice', deviceId),
    create: (tagData: any) => ipcRenderer.invoke('tags:create', tagData),
    update: (id: number, tagData: any) => ipcRenderer.invoke('tags:update', id, tagData),
    delete: (id: number) => ipcRenderer.invoke('tags:delete', id),
  },
  anomalies: {
    getAll: () => ipcRenderer.invoke('anomalies:getAll'),
    resolve: (id: number) => ipcRenderer.invoke('anomalies:resolve', id),
    ignore: (id: number) => ipcRenderer.invoke('anomalies:ignore', id),
    create: (anomalyData: any) => ipcRenderer.invoke('anomalies:create', anomalyData),
    detectAll: () => ipcRenderer.invoke('anomalies:detectAll'),
  },
  snapshots: {
    getByDevice: (deviceId: number) => ipcRenderer.invoke('snapshots:getByDevice', deviceId),
    save: (deviceId: number, snapshotData: any) => ipcRenderer.invoke('snapshots:save', deviceId, snapshotData),
    saveBatch: (deviceIds: number[]) => ipcRenderer.invoke('snapshots:saveBatch', deviceIds),
  },
  transfer: {
    create: (transferData: any) => ipcRenderer.invoke('transfer:create', transferData),
  },
  departments: {
    getAll: () => ipcRenderer.invoke('departments:getAll'),
  },
  dialog: {
    openFile: (options?: any) => ipcRenderer.invoke('dialog:openFile', options || {}),
    saveFile: (options?: any) => ipcRenderer.invoke('dialog:saveFile', options || {}),
  },
  file: {
    read: (filePath: string) => ipcRenderer.invoke('file:read', filePath),
    readBinary: (filePath: string) => ipcRenderer.invoke('file:readBinary', filePath),
    write: (filePath: string, content: string) => ipcRenderer.invoke('file:write', filePath, content),
    writeBinary: (filePath: string, data: number[]) => ipcRenderer.invoke('file:writeBinary', filePath, data),
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

declare global {
  interface Window {
    electronAPI: typeof electronAPI;
  }
}
