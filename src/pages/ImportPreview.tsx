import { useEffect, useState } from 'react';
import { useDeviceStore } from '../stores/deviceStore';
import { useUIStore } from '../stores/uiStore';
import * as XLSX from 'xlsx';

interface FieldMapping {
  sourceField: string;
  targetField: string;
}

interface PreviewData {
  headers: string[];
  rows: any[][];
}

const SYSTEM_FIELDS = [
  { key: 'hostname', label: '主机名', required: true },
  { key: 'ip_address', label: 'IP地址', required: false },
  { key: 'mac_address', label: 'MAC地址', required: false },
  { key: 'serial_number', label: '序列号', required: false },
  { key: 'department', label: '部门', required: false },
  { key: 'status', label: '状态', required: false },
  { key: 'processor', label: '处理器', required: false },
  { key: 'memory', label: '内存', required: false },
  { key: 'disk', label: '磁盘', required: false },
  { key: 'graphics', label: '显卡', required: false },
  { key: 'os_info', label: '操作系统', required: false },
  { key: 'network_info', label: '网络信息', required: false },
  { key: 'software_list', label: '主要软件', required: false },
  { key: 'owner', label: '责任人', required: false },
  { key: 'location', label: '位置', required: false },
  { key: 'purpose', label: '用途', required: false },
  { key: 'warranty_end', label: '保修到期日期', required: false }
];

const FIELD_ALIASES: Record<string, string[]> = {
  hostname: ['hostname', 'host', 'name', 'computer_name', '电脑名称', '主机名'],
  ip_address: ['ip_address', 'ip', 'ipaddr', 'ip地址', 'IP地址'],
  mac_address: ['mac_address', 'mac', 'mac地址', 'MAC地址'],
  serial_number: ['serial_number', 'serial', 'sn', '序列号', '序列'],
  department: ['department', 'dept', '部门'],
  status: ['status', '状态'],
  processor: ['processor', 'cpu', '处理器', 'cpu型号'],
  memory: ['memory', 'mem', 'ram', '内存', '内存大小'],
  disk: ['disk', 'storage', '硬盘', '磁盘', '存储'],
  graphics: ['graphics', 'gpu', 'display', '显卡', '显示器', '显示适配器'],
  os_info: ['os', 'os_info', 'system', '操作系统', '系统', '系统版本'],
  network_info: ['network', 'network_info', '网卡', '网络信息'],
  software_list: ['software', 'software_list', 'installed_software', '软件', '已安装软件', '主要软件'],
  owner: ['owner', 'responsible', '责任人', '负责人', '使用人'],
  location: ['location', '地点', '位置', '物理位置'],
  purpose: ['purpose', 'usage', '用途', '使用用途', '设备用途'],
  warranty_end: ['warranty', 'warranty_end', 'warranty_date', '保修到期', '保修截止', '保修结束']
};

export default function ImportPreviewPage() {
  const { fetchDevices } = useDeviceStore();
  const { setCurrentPage } = useUIStore();

  const [filePath, setFilePath] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([]);
  const [step, setStep] = useState<'select' | 'preview' | 'importing' | 'complete'>('select');
  const [importResult, setImportResult] = useState<{ success: number; failed: number } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSelectFile = async () => {
    try {
      const result = await window.electronAPI.dialog.openFile({
        filters: [
          { name: 'Excel 和 CSV 文件', extensions: ['xlsx', 'xls', 'csv'] }
        ]
      });

      if (!result.canceled && result.filePaths.length > 0) {
        const path = result.filePaths[0];
        setFilePath(path);
        await parseFile(path);
        setStep('preview');
      }
    } catch (error) {
      console.error('Error selecting file:', error);
      alert('选择文件失败');
    }
  };

  const parseFile = async (path: string) => {
    try {
      let jsonData: any[] = [];

      if (path.toLowerCase().endsWith('.csv')) {
        const content = await window.electronAPI.file.read(path);
        const lines = content.split('\n').filter(line => line.trim());
        
        if (lines.length === 0) {
          throw new Error('CSV文件内容为空');
        }

        const headers = parseCSVLine(lines[0]);
        const rows = lines.slice(1, 6).map(line => parseCSVLine(line));
        
        setPreviewData({ headers, rows });
        autoMapFields(headers);
      } else {
        const content = await window.electronAPI.file.readBinary(path);
        const workbook = XLSX.read(content, { type: 'array', cellDates: true, cellNF: true });
        
        if (workbook.SheetNames.length === 0) {
          throw new Error('Excel文件中没有工作表');
        }

        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const allData = XLSX.utils.sheet_to_json(worksheet, { defval: '' }) as any[];
        
        if (allData.length === 0) {
          throw new Error('Excel文件中没有数据');
        }

        const headers = Object.keys(allData[0]);
        const rows = allData.slice(0, 5).map(row => headers.map(h => row[h] || ''));
        
        setPreviewData({ headers, rows });
        autoMapFields(headers);
      }
    } catch (error: any) {
      alert(`文件解析失败：${error.message}`);
      setStep('select');
    }
  };

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const autoMapFields = (headers: string[]) => {
    const mappings: FieldMapping[] = [];

    headers.forEach(header => {
      const normalizedHeader = header.trim().toLowerCase();
      
      for (const [targetKey, aliases] of Object.entries(FIELD_ALIASES)) {
        if (aliases.some(alias => normalizedHeader.includes(alias.toLowerCase()))) {
          mappings.push({ sourceField: header, targetField: targetKey });
          break;
        }
      }
    });

    setFieldMappings(mappings);
  };

  const handleMappingChange = (sourceField: string, targetField: string) => {
    setFieldMappings(prev => {
      const filtered = prev.filter(m => m.sourceField !== sourceField);
      if (targetField) {
        filtered.push({ sourceField, targetField });
      }
      return filtered;
    });
  };

  const getFieldValue = (row: any, sourceField: string): string => {
    return row[sourceField] || '';
  };

  const handleImport = async () => {
    if (!filePath || !previewData) return;

    const hostnameMapping = fieldMappings.find(m => m.targetField === 'hostname');
    if (!hostnameMapping) {
      alert('请至少映射主机名字段');
      return;
    }

    setStep('importing');
    setLoading(true);

    try {
      let allData: any[] = [];

      if (filePath.toLowerCase().endsWith('.csv')) {
        const content = await window.electronAPI.file.read(filePath);
        const lines = content.split('\n').filter(line => line.trim());
        const headers = parseCSVLine(lines[0]);
        
        for (let i = 1; i < lines.length; i++) {
          const values = parseCSVLine(lines[i]);
          const row: any = {};
          headers.forEach((header, index) => {
            row[header] = values[index] || '';
          });
          allData.push(row);
        }
      } else {
        const content = await window.electronAPI.file.readBinary(filePath);
        const workbook = XLSX.read(content, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        allData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
      }

      const mappingMap = new Map(fieldMappings.map(m => [m.sourceField, m.targetField]));
      let successCount = 0;
      let failedCount = 0;

      for (const row of allData) {
        const hostname = getFieldValue(row, hostnameMapping.sourceField);
        if (!hostname) continue;

        const deviceData: any = {
          hostname,
          status: 'offline',
          last_inspection_time: new Date().toISOString()
        };

        const hardwareSpecs: any = {};
        const tags: any[] = [];

        fieldMappings.forEach(mapping => {
          const value = getFieldValue(row, mapping.sourceField);
          if (!value) return;

          if (['processor', 'memory', 'disk', 'graphics', 'os_info', 'network_info', 'software_list', 'serial_number'].includes(mapping.targetField)) {
            if (mapping.targetField === 'serial_number') {
              deviceData.serial_number = value;
            } else {
              hardwareSpecs[mapping.targetField] = value;
            }
          } else if (['hostname', 'ip_address', 'mac_address', 'department', 'status'].includes(mapping.targetField)) {
            deviceData[mapping.targetField] = value;
          } else if (['owner', 'location', 'purpose', 'warranty_end'].includes(mapping.targetField)) {
            const tagTypeMap: Record<string, string> = {
              owner: 'owner',
              location: 'location',
              purpose: 'purpose',
              warranty_end: 'warranty'
            };
            tags.push({
              tag_type: tagTypeMap[mapping.targetField],
              tag_name: mapping.targetField === 'warranty_end' ? '保修到期日期' : mapping.targetField,
              tag_value: value
            });
          }
        });

        try {
          const newDevice = await window.electronAPI.devices.create(deviceData);

          if (Object.keys(hardwareSpecs).length > 0) {
            await window.electronAPI.hardware.saveSnapshot(newDevice.id, hardwareSpecs);
          }

          for (const tag of tags) {
            try {
              await window.electronAPI.tags.create({
                device_id: newDevice.id,
                ...tag
              });
            } catch (tagError) {
              console.warn('Tag creation failed:', tagError);
            }
          }

          successCount++;
        } catch (deviceError) {
          console.warn('Device creation failed:', hostname, deviceError);
          failedCount++;
        }
      }

      await window.electronAPI.anomalies.detectAll();
      await fetchDevices();

      setImportResult({ success: successCount, failed: failedCount });
      setStep('complete');
    } catch (error: any) {
      alert(`导入失败：${error.message}`);
      setStep('preview');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setStep('select');
    setFilePath(null);
    setPreviewData(null);
    setFieldMappings([]);
    setImportResult(null);
  };

  const mappedFields = new Set(fieldMappings.map(m => m.targetField));

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setCurrentPage('device-list')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <h3 className="text-xl font-bold text-gray-800 dark:text-white">导入巡检文件</h3>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 ${step !== 'select' ? 'text-primary-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step === 'select' ? 'bg-primary-600 text-white' : 'bg-primary-100 dark:bg-primary-900 text-primary-600'
              }`}>1</div>
              <span className="font-medium">选择文件</span>
            </div>
            <div className="flex-1 h-1 bg-gray-200 dark:bg-gray-700">
              <div className={`h-full bg-primary-600 transition-all ${
                step === 'preview' || step === 'importing' || step === 'complete' ? 'w-full' : 'w-0'
              }`} />
            </div>
            <div className={`flex items-center gap-2 ${
              step === 'preview' ? 'text-primary-600' : step === 'importing' || step === 'complete' ? 'text-gray-400' : 'text-gray-300'
            }`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step === 'preview' ? 'bg-primary-600 text-white' :
                step === 'importing' || step === 'complete' ? 'bg-primary-100 dark:bg-primary-900 text-primary-600' :
                'bg-gray-200 dark:bg-gray-700'
              }`}>2</div>
              <span className="font-medium">字段匹配</span>
            </div>
            <div className="flex-1 h-1 bg-gray-200 dark:bg-gray-700">
              <div className={`h-full bg-primary-600 transition-all ${
                step === 'complete' ? 'w-full' : 'w-0'
              }`} />
            </div>
            <div className={`flex items-center gap-2 ${
              step === 'complete' ? 'text-primary-600' : 'text-gray-300'
            }`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step === 'complete' ? 'bg-primary-600 text-white' : 'bg-gray-200 dark:bg-gray-700'
              }`}>3</div>
              <span className="font-medium">完成</span>
            </div>
          </div>
        </div>

        {step === 'select' && (
          <div className="text-center py-12">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h4 className="text-lg font-medium text-gray-800 dark:text-white mb-2">选择导入文件</h4>
              <p className="text-gray-500 dark:text-gray-400 mb-6">
                支持 Excel (.xlsx, .xls) 和 CSV (.csv) 格式
              </p>
              <button onClick={handleSelectFile} className="btn-primary">
                选择文件
              </button>
            </div>
          </div>
        )}

        {step === 'preview' && previewData && (
          <div className="space-y-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-300">
                💡 系统已自动识别字段映射，请确认或手动调整后点击「开始导入」
              </p>
            </div>

            <div>
              <h4 className="font-medium text-gray-800 dark:text-white mb-3">字段映射配置</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {previewData.headers.map((header, index) => {
                  const currentMapping = fieldMappings.find(m => m.sourceField === header);
                  return (
                    <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded">
                      <span className="text-sm text-gray-600 dark:text-gray-300 truncate flex-1" title={header}>
                        {header}
                      </span>
                      <span className="text-gray-400">→</span>
                      <select
                        value={currentMapping?.targetField || ''}
                        onChange={(e) => handleMappingChange(header, e.target.value)}
                        className="input-field text-sm py-1 w-32"
                      >
                        <option value="">不导入</option>
                        {SYSTEM_FIELDS.map(field => (
                          <option key={field.key} value={field.key}>
                            {field.label}{field.required && ' *'}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-800 dark:text-white mb-3">数据预览（前5行）</h4>
              <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      {previewData.headers.map((header, index) => {
                        const mapping = fieldMappings.find(m => m.sourceField === header);
                        const fieldInfo = SYSTEM_FIELDS.find(f => f.key === mapping?.targetField);
                        return (
                          <th key={index} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            <div className="flex items-center gap-1">
                              <span>{header}</span>
                              {fieldInfo && (
                                <span className="text-primary-600 text-xs">→ {fieldInfo.label}</span>
                              )}
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {previewData.rows.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {previewData.headers.map((header, cellIndex) => (
                          <td key={cellIndex} className="px-3 py-2 text-gray-700 dark:text-gray-300 truncate max-w-xs">
                            {row[cellIndex] || '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-between">
              <button onClick={handleBack} className="btn-secondary">
                重新选择文件
              </button>
              <button onClick={handleImport} className="btn-primary">
                开始导入
              </button>
            </div>
          </div>
        )}

        {step === 'importing' && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">正在导入数据...</p>
          </div>
        )}

        {step === 'complete' && importResult && (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h4 className="text-lg font-medium text-gray-800 dark:text-white mb-2">导入完成</h4>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              成功导入 {importResult.success} 台设备
              {importResult.failed > 0 && `，失败 ${importResult.failed} 台`}
            </p>
            <div className="flex justify-center gap-4">
              <button onClick={handleBack} className="btn-secondary">
                继续导入
              </button>
              <button onClick={() => setCurrentPage('device-list')} className="btn-primary">
                返回设备列表
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
