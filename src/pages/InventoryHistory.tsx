import { useEffect, useState } from 'react';
import { useUIStore } from '../stores/uiStore';
import * as XLSX from 'xlsx';

interface InventorySnapshot {
  id: number;
  name: string;
  description: string;
  devices: any[];
  created_at: string;
}

interface ComparisonResult {
  hostname: string;
  changes: {
    field: string;
    oldValue: string;
    newValue: string;
  }[];
}

export default function InventoryHistoryPage() {
  const { setCurrentPage } = useUIStore();
  const [inventories, setInventories] = useState<InventorySnapshot[]>([]);
  const [selectedInventories, setSelectedInventories] = useState<number[]>([]);
  const [comparisonResults, setComparisonResults] = useState<ComparisonResult[]>([]);
  const [showComparison, setShowComparison] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInventories();
  }, []);

  const fetchInventories = async () => {
    setLoading(true);
    try {
      const data = await window.electronAPI.inventory.getAll();
      setInventories(data);
    } catch (error) {
      console.error('Error fetching inventories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportInventory = async () => {
    try {
      const result = await window.electronAPI.dialog.saveFile({
        defaultPath: `设备盘点_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.xlsx`,
        filters: [{ name: 'Excel 文件', extensions: ['xlsx'] }]
      });

      if (!result.canceled && result.filePath) {
        const allDevices = await window.electronAPI.devices.getAll();
        
        let devicesWithDetails: any[] = [];

        if (allDevices.length > 0) {
          devicesWithDetails = await Promise.all(
            allDevices.map(async (device: any) => {
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
        } else {
          devicesWithDetails = [{
            '主机名': '',
            'IP地址': '',
            'MAC地址': '',
            '序列号': '',
            '部门': '',
            '状态': '',
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
          }];
        }

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

        const devicesWithValidHostnames = devicesWithDetails.filter((d: any) => d['主机名'] && d['主机名'].trim() !== '');
        const snapshotName = `设备盘点_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}_${new Date().toLocaleTimeString('zh-CN')}`;
        await window.electronAPI.inventory.create({
          name: snapshotName,
          description: `手动导出盘点表，共 ${devicesWithValidHostnames.length} 台设备`,
          devices: devicesWithDetails
        });

        await fetchInventories();
        
        if (allDevices.length === 0) {
          alert('导出成功！已生成空白模板表，可直接填写设备信息');
        } else {
          alert(`盘点表导出成功！共 ${devicesWithDetails.length} 台设备`);
        }
      }
    } catch (error: any) {
      alert(`导出失败：${error.message}`);
    }
  };

  const handleToggleSelect = (id: number) => {
    if (selectedInventories.includes(id)) {
      setSelectedInventories(selectedInventories.filter(i => i !== id));
    } else if (selectedInventories.length < 2) {
      setSelectedInventories([...selectedInventories, id]);
    } else {
      setSelectedInventories([selectedInventories[1], id]);
    }
  };

  const handleCompare = async () => {
    if (selectedInventories.length !== 2) {
      alert('请选择两条盘点记录进行对比');
      return;
    }

    const inv1 = inventories.find(i => i.id === selectedInventories[0]);
    const inv2 = inventories.find(i => i.id === selectedInventories[1]);

    if (!inv1 || !inv2) return;

    const older = new Date(inv1.created_at) < new Date(inv2.created_at) ? inv1 : inv2;
    const newer = new Date(inv1.created_at) < new Date(inv2.created_at) ? inv2 : inv1;

    const olderDevices = older.devices.filter((d: any) => d['主机名'] && d['主机名'].trim() !== '');
    const newerDevices = newer.devices.filter((d: any) => d['主机名'] && d['主机名'].trim() !== '');

    const olderMap = new Map(olderDevices.map((d: any) => [d['主机名'], d]));
    const results: ComparisonResult[] = [];

    newerDevices.forEach((newerDevice: any) => {
      const olderDevice = olderMap.get(newerDevice['主机名']);
      if (!olderDevice) {
        results.push({
          hostname: newerDevice['主机名'],
          changes: [{ field: '状态', oldValue: '新增', newValue: '新增设备' }]
        });
        return;
      }

      const changes: ComparisonResult['changes'] = [];
      const compareFields = ['处理器', '内存', '磁盘', '操作系统', '主要软件', '部门', '状态'];

      compareFields.forEach(field => {
        const oldVal = olderDevice[field] || '';
        const newVal = newerDevice[field] || '';
        if (oldVal !== newVal) {
          changes.push({ field, oldValue: oldVal || '(无)', newValue: newVal || '(无)' });
        }
      });

      if (changes.length > 0) {
        results.push({ hostname: newerDevice['主机名'], changes });
      }
    });

    olderDevices.forEach((olderDevice: any) => {
      const existsInNewer = newerDevices.some((d: any) => d['主机名'] === olderDevice['主机名']);
      if (!existsInNewer) {
        results.push({
          hostname: olderDevice['主机名'],
          changes: [{ field: '状态', oldValue: '存在', newValue: '(已移除)' }]
        });
      }
    });

    setComparisonResults(results);
    setShowComparison(true);
  };

  const handleDeleteInventory = async (id: number) => {
    if (!confirm('确定要删除这条盘点记录吗？')) return;
    
    try {
      await window.electronAPI.inventory.delete(id);
      await fetchInventories();
      setSelectedInventories(selectedInventories.filter(i => i !== id));
    } catch (error) {
      console.error('Error deleting inventory:', error);
      alert('删除失败');
    }
  };

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
            <h3 className="text-xl font-bold text-gray-800 dark:text-white">盘点历史记录</h3>
          </div>
          <button onClick={handleExportInventory} className="btn-primary">
            导出当前盘点表
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : inventories.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            暂无盘点记录，点击「导出当前盘点表」创建第一条记录
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-300">
                💡 选择两条盘点记录后可进行对比，查看硬件配置变化
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {inventories.map((inv) => (
                <div
                  key={inv.id}
                  onClick={() => handleToggleSelect(inv.id)}
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${
                    selectedInventories.includes(inv.id)
                      ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-primary-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 border-2 rounded flex items-center justify-center ${
                        selectedInventories.includes(inv.id)
                          ? 'border-primary-600 bg-primary-600'
                          : 'border-gray-300'
                      }`}>
                        {selectedInventories.includes(inv.id) && (
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-800 dark:text-white">{inv.name}</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {new Date(inv.created_at).toLocaleString('zh-CN')}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteInventory(inv.id);
                      }}
                      className="text-red-600 hover:text-red-800"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    {inv.description || `包含 ${inv.devices?.length || 0} 台设备`}
                  </p>
                </div>
              ))}
            </div>

            {selectedInventories.length === 2 && (
              <div className="flex justify-center pt-4">
                <button onClick={handleCompare} className="btn-primary">
                  对比选中的两条记录
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {showComparison && comparisonResults.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">配置变化对比</h3>
            <button
              onClick={() => setShowComparison(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              关闭
            </button>
          </div>

          <div className="space-y-4">
            {comparisonResults.map((result, index) => (
              <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <h4 className="font-medium text-gray-800 dark:text-white mb-3">{result.hostname}</h4>
                <div className="space-y-2">
                  {result.changes.map((change, changeIndex) => (
                    <div key={changeIndex} className="flex items-center gap-4 text-sm">
                      <span className="w-24 font-medium text-gray-600 dark:text-gray-400">{change.field}</span>
                      <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded">
                        {change.oldValue}
                      </span>
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                      <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded">
                        {change.newValue}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showComparison && comparisonResults.length === 0 && (
        <div className="card text-center py-12 text-gray-500 dark:text-gray-400">
          两次盘点记录无变化
        </div>
      )}
    </div>
  );
}
