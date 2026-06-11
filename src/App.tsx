import { useEffect } from 'react';
import { useUIStore } from './stores/uiStore';
import Sidebar from './components/Layout/Sidebar';
import Header from './components/Layout/Header';
import DeviceListPage from './pages/DeviceList';
import DeviceDetailPage from './pages/DeviceDetail';
import TagManagerPage from './pages/TagManager';
import AnomalyDashboardPage from './pages/AnomalyDashboard';
import InventoryHistoryPage from './pages/InventoryHistory';
import ImportPreviewPage from './pages/ImportPreview';
import BatchOperationsModal from './components/Modal/BatchOperationsModal';
import AddDeviceModal from './components/Modal/AddDeviceModal';

function App() {
  const { theme, currentPage, modals } = useUIStore();

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const renderPage = () => {
    switch (currentPage) {
      case 'device-list':
        return <DeviceListPage />;
      case 'device-detail':
        return <DeviceDetailPage />;
      case 'tag-manager':
        return <TagManagerPage />;
      case 'anomaly-dashboard':
        return <AnomalyDashboardPage />;
      case 'inventory-history':
        return <InventoryHistoryPage />;
      case 'import-preview':
        return <ImportPreviewPage />;
      default:
        return <DeviceListPage />;
    }
  };

  return (
    <div className={`min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors duration-300`}>
      <div className="flex">
        <Sidebar />
        <div className="flex-1 flex flex-col min-h-screen">
          <Header />
          <main className="flex-1 p-6 overflow-auto">
            {renderPage()}
          </main>
        </div>
      </div>

      {modals['add-device'] && <AddDeviceModal />}
      {modals['batch-operations'] && <BatchOperationsModal />}
    </div>
  );
}

export default App;
