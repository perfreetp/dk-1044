import { useEffect, useState } from 'react';
import { useDeviceStore } from '../stores/deviceStore';
import { useUIStore } from '../stores/uiStore';
import * as XLSX from 'xlsx';

interface ImportResult {
  success: number;
  failed: number;
  failedDevices: string[];
}

export default function DeviceListPage() {
  const {
    devices,
    selectedDevices,
    filters,
    loading,
    fetchDevices,
    selectDevice,
    deselectDevice,
    selectAll,
    clearSelection,
    setFilters,
    deleteDevice
  } = useDeviceStore();
  const { openModal, setCurrentPage } = useUIStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [departments, setDepartments] = useState<string[]>([]);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  useEffect(() => {
    fetchDevices();
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      const depts = await window.electronAPI.departments.getAll();
      setDepartments(depts.map((d: any) => d.department));
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const handleSearch = () => {
    setFilters({ ...filters, search: searchTerm });
  };

  const getFieldValue = (row: any, ...candidates: string[]): string => {
    for (const key of candidates) {
      const value = row[key] || row[key.toLowerCase()] || row[key.toUpperCase()];
      if (value) return String(value).trim();
    }
    return '';
  };

  const parseHardwareSpecs = (row: any) => {
    return {
      processor: getFieldValue(row, 'processor', 'Processor', '处理器', 'cpu', 'CPU'),
      memory: getFieldValue(row, 'memory', 'Memory', '内存', 'mem', 'RAM'),
      disk: getFieldValue(row, 'disk', 'Disk', '磁盘', 'storage', '硬盘', '存储'),
      graphics: getFieldValue(row, 'graphics', 'Graphics', '显卡', 'gpu', 'GPU', 'display', '显示器'),
      os_info: getFieldValue(row, 'os_info', 'os', 'OS', '操作系统', 'system', 'System'),
      network_info: getFieldValue(row, 'network_info', 'network', 'Network', '网络', '网卡'),
      software_list: getFieldValue(row, 'software', 'Software', 'software_list', '软件', '主要软件', 'installed_software'),
      serial_number: getFieldValue(row, 'serial_number', 'serial', 'Serial', '序列号', 'sn', 'SN')
    };
  };

  const hasHardwareInfo = (specs: ReturnType<typeof parseHardwareSpecs>): boolean => {
    return !!(specs.processor || specs.memory || specs.disk || specs.graphics || specs.os_info);
  };

  const handleImport = async () => {
    try {
      const result = await window.electronAPI.dialog.openFile({
        filters: [
          { name: 'Excel Files', extensions: ['xlsx', 'xls', 'csv'] },
          { name: 'CSV Files', extensions: ['csv'] }
        ]
      });

      if (!result.canceled && result.filePaths.length > 0) {
        const filePath = result.filePaths[0];
        const content = await window.electronAPI.file.read(filePath);
        
        let jsonData: any[] = [];
        
        if (filePath.toLowerCase().endsWith('.csv')) {
          const lines = content.split('\n');
          if (lines.length > 0) {
            const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
            for (let i = 1; i < lines.length; i++) {
              if (lines[i].trim()) {
                const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
                const row: any = {};
                headers.forEach((header, index) => {
                  row[header] = values[index] || '';
                });
                jsonData.push(row);
              }
            }
          }
        } else {
          const workbook = XLSX.read(content, { type: 'string' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          jsonData = XLSX.utils.sheet_to_json(worksheet);
        }

        let successCount = 0;
        let failedCount = 0;
        const failedDevices: string[] = [];

        for (const row of jsonData) {
          const hostname = getFieldValue(row, 'hostname', 'Hostname', '主机名', 'name', 'Name', 'computer_name');
          
          if (!hostname) {
            continue;
          }

          const deviceData = {
            hostname: hostname,
            ip_address: getFieldValue(row, 'ip_address', 'ip', 'IP', 'IP地址', 'ipaddr'),
            mac_address: getFieldValue(row, 'mac_address', 'mac', 'MAC', 'MAC地址'),
            serial_number: getFieldValue(row, 'serial_number', 'serial', 'Serial', '序列号', 'sn'),
            department: getFieldValue(row, 'department', 'Department', '部门', 'dept'),
            status: getFieldValue(row, 'status', 'Status', '状态') || 'offline',
            last_inspection_time: new Date().toISOString()
          };

          try {
            const newDevice = await window.electronAPI.devices.create(deviceData);
            
            const hardwareSpecs = parseHardwareSpecs(row);
            if (hasHardwareInfo(hardwareSpecs)) {
              await window.electronAPI.hardware.saveSnapshot(newDevice.id, {
                processor: hardwareSpecs.processor || null,
                memory: hardwareSpecs.memory || null,
                disk: hardwareSpecs.disk || null,
                graphics: hardwareSpecs.graphics || null,
                os_info: hardwareSpecs.os_info || null,
                network_info: hardwareSpecs.network_info || null,
                software_list: hardwareSpecs.software_list || null
              });
            }

            const warrantyEnd = getFieldValue(row, 'warranty_end', 'warrantyEnd', 'warranty_date', '保修到期', '保修结束日期');
            if (warrantyEnd) {
              await window.electronAPI.tags.create({
                device_id: newDevice.id,
                tag_type: 'warranty',
                tag_name: '保修到期日期',
                tag_value: warrantyEnd
              });
            }

            const owner = getFieldValue(row, 'owner', 'Owner', '责任人', 'responsible', '负责人');
            if (owner) {
              await window.electronAPI.tags.create({
                device_id: newDevice.id,
                tag_type: 'owner',
                tag_name: '责任人',
                tag_value: owner
              });
            }

            const location = getFieldValue(row, 'location', 'Location', '位置', '地点', '物理位置');
            if (location) {
              await window.electronAPI.tags.create({
                device_id: newDevice.id,
                tag_type: 'location',
                tag_name: '位置',
                tag_value: location
              });
            }

            const purpose = getFieldValue(row, 'purpose', 'Purpose', '用途', 'usage', '使用用途');
            if (purpose) {
              await window.electronAPI.tags.create({
                device_id: newDevice.id,
                tag_type: 'purpose',
                tag_name: '用途',
                tag_value: purpose
              });
            }

            successCount++;
          } catch (error) {
            console.warn('Error importing device:', hostname, error);
            failedCount++;
            failedDevices.push(hostname);
          }
        }

        await fetchDevices();
        await fetchDepartments();

        await window.electronAPI.anomalies.detectAll();

        const resultMessage = `导入完成！成功: ${successCount} 台设备${failedCount > 0 ? `，失败: ${failedCount} 台 (${failedDevices.join(', ')})` : ''}`;
        setImportResult({
          success: successCount,
          failed: failedCount,
          failedDevices
        });
        alert(resultMessage);
      }
    } catch (error) {
      console.error('Error importing file:', error);
      alert('导入失败：' + (error as Error).message);
    }
  };

  const handleExport = async () => {
    try {
      const result = await window.electronAPI.dialog.saveFile({
        defaultPath: '设备盘点表.xlsx',
        filters: [{ name: 'Excel Files', extensions: ['xlsx'] }]
      });

      if (!result.canceled && result.filePath) {
        const devicesWithDetails = await Promise.all(
          devices.map(async (device) => {
            const specs = await window.electronAPI.hardware.getByDevice(device.id);
            const tags = await window.electronAPI.tags.getByDevice(device.id);
            
            const tagMap: Record<string, string> = {};
            tags.forEach((tag: any) => {
              tagMap[tag.tag_type] = tag.tag_value || tag.tag_name;
            });

            return {
              '主机名': device.hostname,
              'IP地址': device.ip_address || '',
              'MAC地址': device.mac_address || '',
              '序列号': device.serial_number || '',
              '部门': device.department || '',
              '状态': device.status === 'online' ? '在线' : device.status === 'retired' ? '退役' : '离线',
              '最后巡检时间': device.last_inspection_time ? new Date(device.last_inspection_time).toLocaleDateString('zh-CN') : '',
              '处理器': specs?.processor || '',
              '内存': specs?.memory || '',
              '磁盘': specs?.disk || '',
              '显卡': specs?.graphics || '',
              '操作系统': specs?.os_info || '',
              '网络信息': specs?.network_info || '',
              '主要软件': specs?.software_list || '',
              '用途': tagMap['purpose'] || '',
              '责任人': tagMap['owner'] || '',
              '位置': tagMap['location'] || '',
              '保修信息': tagMap['warranty'] || ''
            };
          })
        );

        const worksheet = XLSX.utils.json_to_sheet(devicesWithDetails);

        const colWidths = [
          { wch: 20 }, { wch: 15 }, { wch: 18 }, { wch: 20 }, { wch: 12 },
          { wch: 8 }, { wch: 15 }, { wch: 25 }, { wch: 12 }, { wch: 30 },
          { wch: 20 }, { wch: 30 }, { wch: 30 }, { wch: 30 }, { wch: 12 },
          { wch: 12 }, { wch: 15 }, { wch: 20 }
        ];
        worksheet['!cols'] = colWidths;

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, '设备列表');

        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const base64 = XLSX.utils.encode_as_base64(excelBuffer);

        await window.electronAPI.file.write(result.filePath, base64);
        alert(`导出成功！共导出 ${devicesWithDetails.length} 台设备的信息`);
      }
    } catch (error) {
      console.error('Error exporting file:', error);
      alert('导出失败：' + (error as Error).message);
    }
  };

  const handleViewDetail = (deviceId: number) => {
    sessionStorage.setItem('currentDeviceId', deviceId.toString());
    setCurrentPage('device-detail');
  };

  const handleDelete = async (id: number) => {
    if (confirm('确定要删除这台设备吗？')) {
      await deleteDevice(id);
    }
  };

  const isAllSelected = devices.length > 0 && selectedDevices.length === devices.length;

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">设备列表</h3>
          <div className="flex gap-3">
            <button onClick={handleImport} className="btn-secondary">
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                导入巡检文件
              </span>
            </button>
            <button onClick={handleExport} className="btn-secondary">
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                导出盘点表
              </span>
            </button>
            <button onClick={() => openModal('add-device')} className="btn-primary">
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                新增主机
              </span>
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="搜索主机名、IP或序列号..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="input-field"
            />
          </div>

          <select
            value={filters.department || ''}
            onChange={(e) => setFilters({ ...filters, department: e.target.value || undefined })}
            className="input-field w-48"
          >
            <option value="">全部部门</option>
            {departments.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>

          <select
            value={filters.status || ''}
            onChange={(e) => setFilters({ ...filters, status: e.target.value || undefined })}
            className="input-field w-40"
          >
            <option value="">全部状态</option>
            <option value="online">在线</option>
            <option value="offline">离线</option>
            <option value="retired">退役</option>
          </select>

          <button onClick={handleSearch} className="btn-primary">
            搜索
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="table-header">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={() => isAllSelected ? clearSelection() : selectAll()}
                      className="rounded border-gray-300"
                    />
                  </th>
                  <th className="table-header">主机名</th>
                  <th className="table-header">IP地址</th>
                  <th className="table-header">MAC地址</th>
                  <th className="table-header">部门</th>
                  <th className="table-header">状态</th>
                  <th className="table-header">最后巡检</th>
                  <th className="table-header">操作</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {devices.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                      暂无设备，点击"新增主机"添加第一台设备
                    </td>
                  </tr>
                ) : (
                  devices.map((device) => (
                    <tr key={device.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="table-cell">
                        <input
                          type="checkbox"
                          checked={selectedDevices.includes(device.id)}
                          onChange={() => 
                            selectedDevices.includes(device.id)
                              ? deselectDevice(device.id)
                              : selectDevice(device.id)
                          }
                          className="rounded border-gray-300"
                        />
                      </td>
                      <td className="table-cell">
                        <button
                          onClick={() => handleViewDetail(device.id)}
                          className="text-primary-600 hover:text-primary-800 font-medium"
                        >
                          {device.hostname}
                        </button>
                      </td>
                      <td className="table-cell">{device.ip_address || '-'}</td>
                      <td className="table-cell font-mono text-xs">{device.mac_address || '-'}</td>
                      <td className="table-cell">{device.department || '-'}</td>
                      <td className="table-cell">
                        <span className={`badge ${
                          device.status === 'online' ? 'badge-success' :
                          device.status === 'retired' ? 'badge-error' : 'badge-warning'
                        }`}>
                          {device.status === 'online' ? '在线' :
                           device.status === 'retired' ? '退役' : '离线'}
                        </span>
                      </td>
                      <td className="table-cell">
                        {device.last_inspection_time
                          ? new Date(device.last_inspection_time).toLocaleDateString('zh-CN')
                          : '-'}
                      </td>
                      <td className="table-cell">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleViewDetail(device.id)}
                            className="text-primary-600 hover:text-primary-800"
                          >
                            详情
                          </button>
                          <button
                            onClick={() => handleDelete(device.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            删除
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
          共 {devices.length} 台设备，已选择 {selectedDevices.length} 台
        </div>
      </div>
    </div>
  );
}
