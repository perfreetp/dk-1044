import { useEffect, useState } from 'react';
import { useDeviceStore } from '../stores/deviceStore';
import { useUIStore } from '../stores/uiStore';
import * as XLSX from 'xlsx';

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

  const handleImport = async () => {
    try {
      const result = await window.electronAPI.dialog.openFile({
        filters: [
          { name: 'Excel Files', extensions: ['xlsx', 'xls'] },
          { name: 'CSV Files', extensions: ['csv'] }
        ]
      });

      if (!result.canceled && result.filePaths.length > 0) {
        const filePath = result.filePaths[0];
        const content = await window.electronAPI.file.read(filePath);
        
        const workbook = XLSX.read(content, { type: 'string' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        for (const row of jsonData) {
          const deviceData = {
            hostname: row.hostname || row.Hostname || row['主机名'] || '',
            ip_address: row.ip_address || row.ip || row['IP地址'] || '',
            mac_address: row.mac_address || row.mac || row['MAC地址'] || '',
            serial_number: row.serial_number || row.serial || row['序列号'] || '',
            department: row.department || row.Department || row['部门'] || '',
            status: row.status || row.Status || 'offline'
          };

          if (deviceData.hostname) {
            try {
              await window.electronAPI.devices.create(deviceData);
            } catch (error) {
              console.warn('Error importing device:', error);
            }
          }
        }

        fetchDevices();
        fetchDepartments();
        alert('导入成功！');
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
        const exportData = devices.map(device => ({
          '主机名': device.hostname,
          'IP地址': device.ip_address || '',
          'MAC地址': device.mac_address || '',
          '序列号': device.serial_number || '',
          '部门': device.department || '',
          '状态': device.status,
          '最后巡检时间': device.last_inspection_time || ''
        }));

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, '设备列表');

        const excelContent = XLSX.write(workbook, { bookType: 'xlsx', type: 'binary' });
        const buffer = new ArrayBuffer(excelContent.length);
        const view = new Uint8Array(buffer);
        for (let i = 0; i < excelContent.length; i++) {
          view[i] = excelContent.charCodeAt(i) & 0xFF;
        }

        await window.electronAPI.file.write(result.filePath, new TextDecoder().decode(buffer));
        alert('导出成功！');
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
