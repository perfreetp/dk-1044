const XLSX = require('xlsx');

const sampleData = [
  {
    'hostname': 'DESKTOP-PC001',
    'ip_address': '192.168.1.101',
    'mac_address': '00:1A:2B:3C:4D:01',
    'serial_number': 'SN12345678',
    'department': '技术部',
    'processor': 'Intel Core i7-12700K 3.6GHz',
    'memory': '32GB DDR4',
    'disk': '1TB SSD + 2TB HDD',
    'graphics': 'NVIDIA RTX 3060 12GB',
    'os_info': 'Windows 11 专业版',
    'software_list': 'Office 2021;Visual Studio 2022;Chrome',
    'owner': '张三',
    'location': '3楼301室',
    'warranty_end': '2027-01-01'
  },
  {
    'hostname': 'DESKTOP-PC002',
    'ip_address': '192.168.1.102',
    'mac_address': '00:1A:2B:3C:4D:02',
    'serial_number': 'SN12345679',
    'department': '市场部',
    'processor': 'Intel Core i5-11400 2.6GHz',
    'memory': '16GB DDR4',
    'disk': '512GB SSD',
    'graphics': 'NVIDIA GTX 1650 4GB',
    'os_info': 'Windows 10 专业版',
    'software_list': 'Office 2021;Photoshop 2023',
    'owner': '李四',
    'location': '2楼205室',
    'warranty_end': '2026-06-15'
  },
  {
    'hostname': 'DESKTOP-PC003',
    'ip_address': '192.168.1.103',
    'mac_address': '00:1A:2B:3C:4D:03',
    'serial_number': 'SN12345680',
    'department': '财务部',
    'processor': 'Intel Core i3-10100 3.6GHz',
    'memory': '8GB DDR4',
    'disk': '256GB SSD',
    'graphics': 'Intel UHD Graphics 630',
    'os_info': 'Windows 10 专业版',
    'software_list': 'Office 2021;用友U8',
    'owner': '王五',
    'location': '4楼401室',
    'warranty_end': '2025-12-31'
  }
];

const worksheet = XLSX.utils.json_to_sheet(sampleData);

const colWidths = [
  { wch: 20 }, { wch: 15 }, { wch: 18 }, { wch: 20 }, { wch: 12 },
  { wch: 25 }, { wch: 12 }, { wch: 30 }, { wch: 20 }, { wch: 30 },
  { wch: 30 }, { wch: 10 }, { wch: 12 }, { wch: 12 }
];
worksheet['!cols'] = colWidths;

const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, worksheet, '设备列表');

XLSX.writeFile(workbook, 'sample-import-data.xlsx');

console.log('示例Excel文件已生成: sample-import-data.xlsx');
