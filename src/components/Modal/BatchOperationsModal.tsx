import { useState } from 'react';
import { useUIStore } from '../../stores/uiStore';
import { useDeviceStore } from '../../stores/deviceStore';
import * as XLSX from 'xlsx';

type OperationType = 'export_report' | 'print_stickers' | 'record_transfer' | 'archive_devices' | 'save_snapshots';

interface SnapshotResult {
  deviceId: number;
  success: boolean;
  message: string;
}

export default function BatchOperationsModal() {
  const { closeModal } = useUIStore();
  const { selectedDevices, devices, updateDevice, clearSelection, fetchDevices } = useDeviceStore();
  const [operationType, setOperationType] = useState<OperationType>('export_report');
  const [loading, setLoading] = useState(false);
  const [transferData, setTransferData] = useState({
    from_owner: '',
    to_owner: '',
    notes: ''
  });
  const [snapshotResults, setSnapshotResults] = useState<SnapshotResult[] | null>(null);

  const selectedDevicesList = devices.filter(d => selectedDevices.includes(d.id));

  const handleExecute = async () => {
    setLoading(true);
    setSnapshotResults(null);

    try {
      switch (operationType) {
        case 'export_report':
          await handleExportReport();
          break;
        case 'print_stickers':
          await handlePrintStickers();
          break;
        case 'record_transfer':
          await handleRecordTransfer();
          break;
        case 'archive_devices':
          await handleArchiveDevices();
          break;
        case 'save_snapshots':
          await handleSaveSnapshots();
          break;
      }
    } catch (error) {
      console.error('Error executing operation:', error);
      alert('操作失败：' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleExportReport = async () => {
    const result = await window.electronAPI.dialog.saveFile({
      defaultPath: '设备盘点表.xlsx',
      filters: [{ name: 'Excel 文件', extensions: ['xlsx'] }]
    });

    if (!result.canceled && result.filePath) {
      try {
        const devicesWithDetails = await Promise.all(
          selectedDevicesList.map(async (device) => {
            try {
              const specs = await window.electronAPI.hardware.getByDevice(device.id);
              const tags = await window.electronAPI.tags.getByDevice(device.id);
              
              const tagMap: Record<string, string> = {};
              tags.forEach((tag: any) => {
                tagMap[tag.tag_type] = tag.tag_value || tag.tag_name;
              });

              return {
                '主机名': device.hostname || '',
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
            } catch (error) {
              return {
                '主机名': device.hostname || '',
                'IP地址': device.ip_address || '',
                'MAC地址': device.mac_address || '',
                '序列号': device.serial_number || '',
                '部门': device.department || '',
                '状态': device.status === 'online' ? '在线' : device.status === 'retired' ? '退役' : '离线',
                '最后巡检时间': '',
                '处理器': '',
                '内存': '',
                '磁盘': '',
                '显卡': '',
                '操作系统': '',
                '网络信息': '',
                '主要软件': '',
                '用途': '',
                '责任人': '',
                '位置': '',
                '保修信息': ''
              };
            }
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

        await window.electronAPI.file.writeBinary(result.filePath, Array.from(excelBuffer));
        alert(`盘点表导出成功！共导出 ${devicesWithDetails.length} 台设备的信息`);
      } catch (writeError: any) {
        alert(`文件保存失败：${writeError.message}\n请检查保存路径是否可写，或尝试更换保存位置。`);
      }
    }
  };

  const handlePrintStickers = async () => {
    const result = await window.electronAPI.dialog.saveFile({
      defaultPath: '资产贴纸.html',
      filters: [{ name: 'HTML 文件', extensions: ['html'] }]
    });

    if (!result.canceled && result.filePath) {
      try {
        const stickersHTML = generateStickersHTML();
        await window.electronAPI.file.write(result.filePath, stickersHTML);
        alert(`资产贴纸生成成功！共生成 ${selectedDevicesList.length} 张贴纸`);
      } catch (writeError: any) {
        alert(`文件保存失败：${writeError.message}\n请检查保存路径是否可写，或尝试更换保存位置。`);
      }
    }
  };

  const generateStickersHTML = () => {
    const stickers = selectedDevicesList.map(device => `
      <div class="sticker">
        <div class="sticker-header">资产标签</div>
        <div class="sticker-content">
          <div class="sticker-row">
            <span class="label">主机名:</span>
            <span class="value">${device.hostname}</span>
          </div>
          <div class="sticker-row">
            <span class="label">IP地址:</span>
            <span class="value">${device.ip_address || '-'}</span>
          </div>
          <div class="sticker-row">
            <span class="label">序列号:</span>
            <span class="value">${device.serial_number || '-'}</span>
          </div>
          <div class="sticker-row">
            <span class="label">部门:</span>
            <span class="value">${device.department || '-'}</span>
          </div>
        </div>
        <div class="sticker-barcode">
          <div class="barcode-placeholder">||||| ||||| ||||| |||||</div>
        </div>
      </div>
    `).join('');

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>资产贴纸</title>
  <style>
    @page { size: A4; margin: 10mm; }
    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
    .stickers-container { display: flex; flex-wrap: wrap; gap: 10mm; }
    .sticker {
      width: 50mm;
      height: 25mm;
      border: 1px solid #000;
      padding: 2mm;
      box-sizing: border-box;
      page-break-inside: avoid;
      font-size: 9pt;
    }
    .sticker-header {
      font-weight: bold;
      font-size: 11pt;
      text-align: center;
      border-bottom: 1px solid #000;
      padding-bottom: 1mm;
      margin-bottom: 1mm;
    }
    .sticker-content { font-size: 8pt; }
    .sticker-row {
      display: flex;
      justify-content: space-between;
      margin: 0.5mm 0;
    }
    .label { font-weight: bold; }
    .barcode-placeholder {
      text-align: center;
      font-family: monospace;
      font-size: 6pt;
      margin-top: 1mm;
      color: #666;
    }
    @media print {
      body { padding: 0; }
      .sticker { border: 1px solid #000; }
    }
  </style>
</head>
<body>
  <div class="stickers-container">
    ${stickers}
  </div>
</body>
</html>
    `;
  };

  const handleRecordTransfer = async () => {
    if (!transferData.to_owner) {
      alert('请输入接收人信息');
      setLoading(false);
      return;
    }

    try {
      for (const deviceId of selectedDevices) {
        await window.electronAPI.transfer.create({
          device_id: deviceId,
          from_owner: transferData.from_owner || null,
          to_owner: transferData.to_owner,
          notes: transferData.notes || null
        });
      }
      alert(`移交记录创建成功！已为 ${selectedDevices.length} 台设备创建移交记录`);
      setTransferData({ from_owner: '', to_owner: '', notes: '' });
    } catch (error: any) {
      alert(`移交记录创建失败：${error.message}`);
    }
  };

  const handleArchiveDevices = async () => {
    if (!confirm(`确定要将 ${selectedDevices.length} 台设备归档为退役状态吗？`)) {
      setLoading(false);
      return;
    }

    try {
      for (const deviceId of selectedDevices) {
        await updateDevice(deviceId, { status: 'retired' });
      }
      clearSelection();
      await fetchDevices();
      alert('设备归档成功！');
    } catch (error: any) {
      alert(`设备归档失败：${error.message}`);
    }
  };

  const handleSaveSnapshots = async () => {
    try {
      const results = await window.electronAPI.snapshots.saveBatch(selectedDevices);
      setSnapshotResults(results);
    } catch (error: any) {
      alert(`保存快照失败：${error.message}`);
    }
  };

  const getOperationName = (type: OperationType) => {
    const names: Record<OperationType, string> = {
      export_report: '生成盘点表',
      print_stickers: '打印资产贴纸',
      record_transfer: '记录移交',
      archive_devices: '归档退役设备',
      save_snapshots: '保存历次快照'
    };
    return names[type];
  };

  const getSuccessCount = () => snapshotResults?.filter(r => r.success).length || 0;
  const getFailedCount = () => snapshotResults?.filter(r => !r.success).length || 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
            批量操作
            <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
              已选择 {selectedDevices.length} 台设备
            </span>
          </h3>
          <button
            onClick={() => closeModal('batch-operations')}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              选择操作类型
            </label>
            <div className="grid grid-cols-1 gap-3">
              {([
                { type: 'export_report', icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', desc: '导出Excel格式的资产盘点报表' },
                { type: 'print_stickers', icon: 'M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z', desc: '生成可打印的资产标签' },
                { type: 'record_transfer', icon: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4', desc: '记录设备移交历史' },
                { type: 'archive_devices', icon: 'M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4', desc: '将设备标记为退役状态' },
                { type: 'save_snapshots', icon: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12', desc: '批量保存设备配置快照' }
              ] as const).map((op) => (
                <label
                  key={op.type}
                  className={`flex items-center p-4 border rounded-lg cursor-pointer transition-all ${
                    operationType === op.type
                      ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-primary-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="operation"
                    value={op.type}
                    checked={operationType === op.type}
                    onChange={() => {
                      setOperationType(op.type);
                      setSnapshotResults(null);
                    }}
                    className="sr-only"
                  />
                  <div className={`p-2 rounded-lg mr-4 ${
                    operationType === op.type ? 'bg-primary-100 dark:bg-primary-900' : 'bg-gray-100 dark:bg-gray-700'
                  }`}>
                    <svg className={`w-5 h-5 ${
                      operationType === op.type ? 'text-primary-600' : 'text-gray-600 dark:text-gray-400'
                    }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={op.icon} />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-gray-800 dark:text-white">{getOperationName(op.type as OperationType)}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{op.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {operationType === 'record_transfer' && (
            <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <h4 className="font-medium text-gray-800 dark:text-white">移交信息</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    原负责人
                  </label>
                  <input
                    type="text"
                    value={transferData.from_owner}
                    onChange={(e) => setTransferData({ ...transferData, from_owner: e.target.value })}
                    placeholder="可留空"
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    接收人 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={transferData.to_owner}
                    onChange={(e) => setTransferData({ ...transferData, to_owner: e.target.value })}
                    placeholder="必填"
                    className="input-field"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  备注
                </label>
                <textarea
                  value={transferData.notes}
                  onChange={(e) => setTransferData({ ...transferData, notes: e.target.value })}
                  placeholder="可选"
                  rows={3}
                  className="input-field"
                />
              </div>
            </div>
          )}

          {operationType === 'save_snapshots' && snapshotResults && (
            <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <h4 className="font-medium text-gray-800 dark:text-white">
                快照保存结果
                <span className="ml-2 text-sm font-normal text-green-600">
                  成功: {getSuccessCount()} 台
                </span>
                {getFailedCount() > 0 && (
                  <span className="ml-2 text-sm font-normal text-yellow-600">
                    跳过: {getFailedCount()} 台
                  </span>
                )}
              </h4>
              <div className="max-h-60 overflow-y-auto space-y-2">
                {snapshotResults.map((result, index) => (
                  <div
                    key={index}
                    className={`flex items-center gap-2 p-2 rounded ${
                      result.success
                        ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300'
                        : 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300'
                    }`}
                  >
                    {result.success ? (
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    )}
                    <span className="text-sm">{result.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="border-t border-gray-200 dark:border-gray-700 pt-6 flex justify-end gap-3">
            <button
              onClick={() => closeModal('batch-operations')}
              className="btn-secondary"
              disabled={loading}
            >
              取消
            </button>
            <button
              onClick={handleExecute}
              className="btn-primary"
              disabled={loading}
            >
              {loading ? '处理中...' : '执行操作'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
