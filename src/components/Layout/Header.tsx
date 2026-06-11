import { useUIStore } from '../../stores/uiStore';
import { useDeviceStore } from '../../stores/deviceStore';

export default function Header() {
  const { theme, toggleTheme, openModal } = useUIStore();
  const { selectedDevices } = useDeviceStore();

  return (
    <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
          设备管理
        </h2>
        {selectedDevices.length > 0 && (
          <span className="px-3 py-1 bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 rounded-full text-sm">
            已选择 {selectedDevices.length} 台设备
          </span>
        )}
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={() => openModal('batch-operations')}
          disabled={selectedDevices.length === 0}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            selectedDevices.length > 0
              ? 'bg-orange-600 text-white hover:bg-orange-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          批量操作
        </button>

        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          {theme === 'light' ? (
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          )}
        </button>

        <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white font-medium">
          A
        </div>
      </div>
    </header>
  );
}
