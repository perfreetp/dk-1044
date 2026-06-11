import { useEffect, useState } from 'react';
import type { Device, Tag, TagInput } from '../types';

export default function TagManagerPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<number | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  const [activeTab, setActiveTab] = useState<'purpose' | 'owner' | 'location' | 'warranty'>('purpose');
  const [newTag, setNewTag] = useState({ name: '', value: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchDevices();
  }, []);

  useEffect(() => {
    if (selectedDevice) {
      fetchTags(selectedDevice);
    }
  }, [selectedDevice]);

  const fetchDevices = async () => {
    try {
      const data = await window.electronAPI.devices.getAll();
      setDevices(data);
      if (data.length > 0) {
        setSelectedDevice(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching devices:', error);
    }
  };

  const fetchTags = async (deviceId: number) => {
    try {
      const data = await window.electronAPI.tags.getByDevice(deviceId);
      setTags(data);
    } catch (error) {
      console.error('Error fetching tags:', error);
    }
  };

  const handleAddTag = async () => {
    if (!selectedDevice || !newTag.name) return;

    setLoading(true);
    try {
      await window.electronAPI.tags.create({
        device_id: selectedDevice,
        tag_type: activeTab,
        tag_name: newTag.name,
        tag_value: newTag.value || undefined
      });
      await fetchTags(selectedDevice);
      setNewTag({ name: '', value: '' });
    } catch (error) {
      console.error('Error creating tag:', error);
      alert('添加标签失败！');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTag = async (tagId: number) => {
    if (!confirm('确定要删除这个标签吗？')) return;

    setLoading(true);
    try {
      await window.electronAPI.tags.delete(tagId);
      if (selectedDevice) {
        await fetchTags(selectedDevice);
      }
    } catch (error) {
      console.error('Error deleting tag:', error);
      alert('删除标签失败！');
    } finally {
      setLoading(false);
    }
  };

  const getFilteredTags = () => {
    return tags.filter(tag => tag.tag_type === activeTab);
  };

  const getTabName = (tab: string) => {
    const names: Record<string, string> = {
      purpose: '用途',
      owner: '责任人',
      location: '位置',
      warranty: '保修'
    };
    return names[tab] || tab;
  };

  const selectedDeviceInfo = devices.find(d => d.id === selectedDevice);

  return (
    <div className="space-y-6">
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-6">标签管理</h3>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              选择设备
            </label>
            <select
              value={selectedDevice || ''}
              onChange={(e) => setSelectedDevice(parseInt(e.target.value))}
              className="input-field"
            >
              <option value="">请选择设备</option>
              {devices.map(device => (
                <option key={device.id} value={device.id}>
                  {device.hostname} {device.department ? `(${device.department})` : ''}
                </option>
              ))}
            </select>

            {selectedDeviceInfo && (
              <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-sm text-gray-500 dark:text-gray-400">当前设备</p>
                <p className="font-medium text-gray-800 dark:text-white">{selectedDeviceInfo.hostname}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  IP: {selectedDeviceInfo.ip_address || '-'}
                </p>
              </div>
            )}
          </div>

          <div className="lg:col-span-2">
            <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
              {(['purpose', 'owner', 'location', 'warranty'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                    activeTab === tab
                      ? 'border-primary-600 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  {getTabName(tab)}
                </button>
              ))}
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  添加{getTabName(activeTab)}标签
                </h4>
                <div className="flex gap-3">
                  <input
                    type="text"
                    placeholder={`${getTabName(activeTab)}名称`}
                    value={newTag.name}
                    onChange={(e) => setNewTag({ ...newTag, name: e.target.value })}
                    className="input-field flex-1"
                  />
                  <input
                    type="text"
                    placeholder="标签值（可选）"
                    value={newTag.value}
                    onChange={(e) => setNewTag({ ...newTag, value: e.target.value })}
                    className="input-field flex-1"
                  />
                  <button
                    onClick={handleAddTag}
                    disabled={!newTag.name || loading}
                    className="btn-primary disabled:opacity-50"
                  >
                    添加
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {getFilteredTags().length === 0 ? (
                  <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                    暂无{getTabName(activeTab)}标签
                  </p>
                ) : (
                  getFilteredTags().map((tag) => (
                    <div
                      key={tag.id}
                      className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-gray-800 dark:text-white">{tag.tag_name}</p>
                        {tag.tag_value && (
                          <p className="text-sm text-gray-500 dark:text-gray-400">{tag.tag_value}</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteTag(tag.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <h4 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">标签类型说明</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h5 className="font-medium text-blue-800 dark:text-blue-300 mb-2">用途标签</h5>
            <p className="text-sm text-blue-600 dark:text-blue-400">
              用于标记设备的用途，如：开发机、测试机、办公机、服务器等
            </p>
          </div>
          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <h5 className="font-medium text-green-800 dark:text-green-300 mb-2">责任人</h5>
            <p className="text-sm text-green-600 dark:text-green-400">
              记录设备负责人信息，包括姓名、工号、联系方式等
            </p>
          </div>
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <h5 className="font-medium text-yellow-800 dark:text-yellow-300 mb-2">位置信息</h5>
            <p className="text-sm text-yellow-600 dark:text-yellow-400">
              记录设备物理位置，如：楼层、机柜、办公区域等
            </p>
          </div>
          <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <h5 className="font-medium text-purple-800 dark:text-purple-300 mb-2">保修信息</h5>
            <p className="text-sm text-purple-600 dark:text-purple-400">
              记录保修期限，包括保修开始日期、结束日期、状态等
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
