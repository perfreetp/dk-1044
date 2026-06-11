import { useEffect, useState } from 'react';
import { useUIStore } from '../stores/uiStore';
import type { Device, HardwareSpecs, Tag } from '../types';

export default function DeviceDetailPage() {
  const { setCurrentPage } = useUIStore();
  const [device, setDevice] = useState<Device | null>(null);
  const [hardwareSpecs, setHardwareSpecs] = useState<HardwareSpecs | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const deviceId = sessionStorage.getItem('currentDeviceId');
    if (deviceId) {
      fetchDeviceData(parseInt(deviceId));
    }
  }, []);

  const fetchDeviceData = async (deviceId: number) => {
    setLoading(true);
    try {
      const devices = await window.electronAPI.devices.getAll();
      const foundDevice = devices.find((d: Device) => d.id === deviceId);
      setDevice(foundDevice || null);

      const specs = await window.electronAPI.hardware.getByDevice(deviceId);
      setHardwareSpecs(specs || null);

      const deviceTags = await window.electronAPI.tags.getByDevice(deviceId);
      setTags(deviceTags || []);
    } catch (error) {
      console.error('Error fetching device data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSnapshot = async () => {
    if (!device || !hardwareSpecs) return;
    
    try {
      await window.electronAPI.hardware.saveSnapshot(device.id, hardwareSpecs);
      alert('快照保存成功！');
    } catch (error) {
      console.error('Error saving snapshot:', error);
      alert('快照保存失败！');
    }
  };

  const getTagTypeName = (type: string) => {
    const typeMap: Record<string, string> = {
      purpose: '用途',
      owner: '责任人',
      location: '位置',
      warranty: '保修',
      custom: '自定义'
    };
    return typeMap[type] || type;
  };

  const getTagColor = (type: string) => {
    const colorMap: Record<string, string> = {
      purpose: 'bg-blue-100 text-blue-800',
      owner: 'bg-green-100 text-green-800',
      location: 'bg-yellow-100 text-yellow-800',
      warranty: 'bg-purple-100 text-purple-800',
      custom: 'bg-gray-100 text-gray-800'
    };
    return colorMap[type] || colorMap.custom;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!device) {
    return (
      <div className="card text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">未找到设备信息</p>
        <button onClick={() => setCurrentPage('device-list')} className="btn-primary mt-4">
          返回设备列表
        </button>
      </div>
    );
  }

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
            <h3 className="text-xl font-bold text-gray-800 dark:text-white">{device.hostname}</h3>
            <span className={`badge ${
              device.status === 'online' ? 'badge-success' :
              device.status === 'retired' ? 'badge-error' : 'badge-warning'
            }`}>
              {device.status === 'online' ? '在线' :
               device.status === 'retired' ? '退役' : '离线'}
            </span>
          </div>
          <div className="flex gap-3">
            <button onClick={handleSaveSnapshot} className="btn-secondary">
              保存快照
            </button>
            <button className="btn-primary">编辑信息</button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">IP地址</p>
            <p className="text-lg font-semibold text-gray-800 dark:text-white">{device.ip_address || '-'}</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">MAC地址</p>
            <p className="text-lg font-semibold text-gray-800 dark:text-white font-mono">{device.mac_address || '-'}</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">序列号</p>
            <p className="text-lg font-semibold text-gray-800 dark:text-white font-mono">{device.serial_number || '-'}</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">部门</p>
            <p className="text-lg font-semibold text-gray-800 dark:text-white">{device.department || '-'}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h4 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">硬件信息</h4>
          
          {hardwareSpecs ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">处理器</p>
                  <p className="text-gray-800 dark:text-white">{hardwareSpecs.processor || '-'}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                  <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">内存</p>
                  <p className="text-gray-800 dark:text-white">{hardwareSpecs.memory || '-'}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                  <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">磁盘</p>
                  <p className="text-gray-800 dark:text-white whitespace-pre-wrap">{hardwareSpecs.disk || '-'}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                  <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">显卡</p>
                  <p className="text-gray-800 dark:text-white">{hardwareSpecs.graphics || '-'}</p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">暂无硬件信息</p>
          )}
        </div>

        <div className="card">
          <h4 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">系统与网络</h4>
          
          {hardwareSpecs ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-900 rounded-lg">
                  <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">操作系统</p>
                  <p className="text-gray-800 dark:text-white">{hardwareSpecs.os_info || '-'}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 bg-teal-100 dark:bg-teal-900 rounded-lg">
                  <svg className="w-5 h-5 text-teal-600 dark:text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">网络信息</p>
                  <p className="text-gray-800 dark:text-white whitespace-pre-wrap">{hardwareSpecs.network_info || '-'}</p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">暂无系统信息</p>
          )}
        </div>
      </div>

      {hardwareSpecs?.software_list && (
        <div className="card">
          <h4 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">主要软件</h4>
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono">
              {hardwareSpecs.software_list}
            </pre>
          </div>
        </div>
      )}

      <div className="card">
        <h4 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">设备标签</h4>
        
        {tags.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span
                key={tag.id}
                className={`badge ${getTagColor(tag.tag_type)}`}
              >
                {getTagTypeName(tag.tag_type)}: {tag.tag_value || tag.tag_name}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400">暂无标签</p>
        )}
      </div>
    </div>
  );
}
