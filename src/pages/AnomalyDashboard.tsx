import { useEffect, useState } from 'react';
import type { Anomaly } from '../types';

interface AnomalyRule {
  id: string;
  name: string;
  type: 'low_memory' | 'low_disk' | 'disk_warning' | 'warranty_days';
  threshold: number;
  enabled: boolean;
}

export default function AnomalyDashboardPage() {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [filteredAnomalies, setFilteredAnomalies] = useState<Anomaly[]>([]);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [showRules, setShowRules] = useState(false);
  const [rules, setRules] = useState<AnomalyRule[]>([]);
  const [rulesChanged, setRulesChanged] = useState(false);

  useEffect(() => {
    fetchAnomalies();
    fetchRules();
  }, []);

  useEffect(() => {
    filterAnomalies();
  }, [anomalies, filterType, filterStatus]);

  const fetchAnomalies = async () => {
    setLoading(true);
    try {
      const data = await window.electronAPI.anomalies.getAll();
      setAnomalies(data);
    } catch (error) {
      console.error('Error fetching anomalies:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRules = async () => {
    try {
      const data = await window.electronAPI.anomaly_rules.getAll();
      setRules(data);
    } catch (error) {
      console.error('Error fetching rules:', error);
    }
  };

  const filterAnomalies = () => {
    let filtered = [...anomalies];

    if (filterType !== 'all') {
      filtered = filtered.filter(a => a.anomaly_type === filterType);
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(a => a.status === filterStatus);
    }

    setFilteredAnomalies(filtered);
  };

  const handleResolve = async (id: number) => {
    try {
      await window.electronAPI.anomalies.resolve(id);
      await fetchAnomalies();
    } catch (error) {
      console.error('Error resolving anomaly:', error);
    }
  };

  const handleIgnore = async (id: number) => {
    try {
      await window.electronAPI.anomalies.ignore(id);
      await fetchAnomalies();
    } catch (error) {
      console.error('Error ignoring anomaly:', error);
    }
  };

  const handleReDetect = async () => {
    setLoading(true);
    try {
      await window.electronAPI.anomalies.detectAll();
      await fetchAnomalies();
      alert('异常检测完成');
    } catch (error) {
      console.error('Error detecting anomalies:', error);
      alert('检测失败');
    } finally {
      setLoading(false);
    }
  };

  const handleRuleChange = (ruleId: string, field: 'threshold' | 'enabled', value: number | boolean) => {
    setRules(prev => prev.map(rule => {
      if (rule.id === ruleId) {
        return { ...rule, [field]: value };
      }
      return rule;
    }));
    setRulesChanged(true);
  };

  const handleSaveRules = async () => {
    try {
      await window.electronAPI.anomaly_rules.update(rules);
      setRulesChanged(false);
      alert('规则保存成功');
    } catch (error) {
      console.error('Error saving rules:', error);
      alert('规则保存失败');
    }
  };

  const handleApplyRulesAndDetect = async () => {
    try {
      await window.electronAPI.anomaly_rules.update(rules);
      setRulesChanged(false);
      await window.electronAPI.anomalies.detectAll();
      await fetchAnomalies();
      alert('规则已更新并重新检测完成');
    } catch (error) {
      console.error('Error applying rules:', error);
      alert('操作失败');
    }
  };

  const getAnomalyStats = () => {
    const stats = {
      total: anomalies.length,
      low_config: anomalies.filter(a => a.anomaly_type === 'low_config').length,
      disk_warning: anomalies.filter(a => a.anomaly_type === 'disk_warning').length,
      unassigned_owner: anomalies.filter(a => a.anomaly_type === 'unassigned_owner').length,
      duplicate_hostname: anomalies.filter(a => a.anomaly_type === 'duplicate_hostname').length,
      warranty_expiring: anomalies.filter(a => a.anomaly_type === 'warranty_expiring').length,
      pending: anomalies.filter(a => a.status === 'pending').length
    };
    return stats;
  };

  const stats = getAnomalyStats();

  const getAnomalyTypeName = (type: string) => {
    const names: Record<string, string> = {
      low_config: '配置过低',
      disk_warning: '磁盘告警',
      unassigned_owner: '未登记责任人',
      duplicate_hostname: '重复主机名',
      warranty_expiring: '保修临期'
    };
    return names[type] || type;
  };

  const getAnomalyTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      low_config: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
      disk_warning: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      unassigned_owner: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      duplicate_hostname: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
      warranty_expiring: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const getAnomalyIcon = (type: string) => {
    const icons: Record<string, string> = {
      low_config: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
      disk_warning: 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4',
      unassigned_owner: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
      duplicate_hostname: 'M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z',
      warranty_expiring: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
    };
    return icons[type] || icons.low_config;
  };

  const getRuleDescription = (type: string) => {
    const descriptions: Record<string, string> = {
      low_memory: '内存低于此值时触发告警',
      low_disk: '磁盘容量低于此值时触发告警',
      disk_warning: '磁盘可用空间百分比低于此值时触发告警',
      warranty_days: '保修到期前此天数内触发提醒'
    };
    return descriptions[type] || '';
  };

  const getRuleUnit = (type: string) => {
    const units: Record<string, string> = {
      low_memory: 'GB',
      low_disk: 'GB',
      disk_warning: '%',
      warranty_days: '天'
    };
    return units[type] || '';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <svg className="w-6 h-6 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">总异常</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <svg className="w-6 h-6 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={getAnomalyIcon('low_config')} />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">配置过低</p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.low_config}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={getAnomalyIcon('disk_warning')} />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">磁盘告警</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.disk_warning}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
              <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={getAnomalyIcon('unassigned_owner')} />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">未登记责任人</p>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.unassigned_owner}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={getAnomalyIcon('duplicate_hostname')} />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">重复主机名</p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.duplicate_hostname}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={getAnomalyIcon('warranty_expiring')} />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">保修临期</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.warranty_expiring}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">异常列表</h3>
          <div className="flex gap-4">
            <button
              onClick={() => setShowRules(!showRules)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                showRules ? 'bg-primary-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              规则设置
            </button>
            <button onClick={handleReDetect} className="btn-primary">
              重新检测
            </button>
          </div>
        </div>

        {showRules && (
          <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium text-gray-800 dark:text-white">异常检测规则</h4>
              <div className="flex gap-2">
                {rulesChanged && (
                  <button onClick={handleSaveRules} className="btn-secondary text-sm">
                    保存规则
                  </button>
                )}
                {rulesChanged && (
                  <button onClick={handleApplyRulesAndDetect} className="btn-primary text-sm">
                    保存并重新检测
                  </button>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rules.map((rule) => (
                <div key={rule.id} className="flex items-center gap-4 p-3 bg-white dark:bg-gray-800 rounded-lg">
                  <input
                    type="checkbox"
                    checked={rule.enabled}
                    onChange={(e) => handleRuleChange(rule.id, 'enabled', e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-gray-800 dark:text-white">{rule.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{getRuleDescription(rule.type)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={rule.threshold}
                      onChange={(e) => handleRuleChange(rule.id, 'threshold', parseInt(e.target.value) || 0)}
                      disabled={!rule.enabled}
                      className="input-field w-20 text-center"
                    />
                    <span className="text-gray-500">{getRuleUnit(rule.type)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-4 mb-6">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="input-field w-40"
          >
            <option value="all">全部类型</option>
            <option value="low_config">配置过低</option>
            <option value="disk_warning">磁盘告警</option>
            <option value="unassigned_owner">未登记责任人</option>
            <option value="duplicate_hostname">重复主机名</option>
            <option value="warranty_expiring">保修临期</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="input-field w-32"
          >
            <option value="all">全部状态</option>
            <option value="pending">待处理</option>
            <option value="resolved">已解决</option>
            <option value="ignored">已忽略</option>
          </select>
        </div>

        {filteredAnomalies.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="mt-4 text-gray-500 dark:text-gray-400">暂无异常记录</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAnomalies.map((anomaly) => (
              <div
                key={anomaly.id}
                className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-sm transition-shadow"
              >
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg ${getAnomalyTypeColor(anomaly.anomaly_type)}`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={getAnomalyIcon(anomaly.anomaly_type)} />
                    </svg>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`badge ${getAnomalyTypeColor(anomaly.anomaly_type)}`}>
                        {getAnomalyTypeName(anomaly.anomaly_type)}
                      </span>
                      <span className={`badge ${
                        anomaly.status === 'pending' ? 'badge-warning' :
                        anomaly.status === 'resolved' ? 'badge-success' : 'badge-info'
                      }`}>
                        {anomaly.status === 'pending' ? '待处理' :
                         anomaly.status === 'resolved' ? '已解决' : '已忽略'}
                      </span>
                    </div>
                    <p className="mt-1 font-medium text-gray-800 dark:text-white">
                      {anomaly.hostname || `设备 #${anomaly.device_id}`}
                      {anomaly.ip_address && ` (${anomaly.ip_address})`}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {anomaly.anomaly_description}
                    </p>
                    {anomaly.department && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        部门: {anomaly.department}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(anomaly.detected_at).toLocaleDateString('zh-CN')}
                  </span>
                  {anomaly.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleResolve(anomaly.id)}
                        className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                      >
                        解决
                      </button>
                      <button
                        onClick={() => handleIgnore(anomaly.id)}
                        className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                      >
                        忽略
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h4 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">异常检测规则说明</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p className="font-medium text-gray-800 dark:text-white">配置过低</p>
            <p className="text-gray-600 dark:text-gray-400">内存低于设定阈值、磁盘容量低于设定阈值时触发</p>
          </div>
          <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p className="font-medium text-gray-800 dark:text-white">磁盘告警</p>
            <p className="text-gray-600 dark:text-gray-400">磁盘可用空间百分比低于设定阈值时触发</p>
          </div>
          <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p className="font-medium text-gray-800 dark:text-white">未登记责任人</p>
            <p className="text-gray-600 dark:text-gray-400">责任人字段为空时触发</p>
          </div>
          <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p className="font-medium text-gray-800 dark:text-white">保修临期</p>
            <p className="text-gray-600 dark:text-gray-400">保修到期前设定天数内触发</p>
          </div>
        </div>
      </div>
    </div>
  );
}
