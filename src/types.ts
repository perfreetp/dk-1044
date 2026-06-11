export interface Device {
  id: number;
  hostname: string;
  ip_address?: string;
  mac_address?: string;
  serial_number?: string;
  department?: string;
  status: 'online' | 'offline' | 'retired';
  last_inspection_time?: string;
  created_at: string;
  updated_at: string;
}

export interface HardwareSpecs {
  id?: number;
  device_id: number;
  processor?: string;
  memory?: string;
  disk?: string;
  graphics?: string;
  os_info?: string;
  network_info?: string;
  software_list?: string;
  snapshot_time?: string;
}

export interface Tag {
  id: number;
  device_id: number;
  tag_type: 'purpose' | 'owner' | 'location' | 'warranty' | 'custom';
  tag_name: string;
  tag_value?: string;
  created_at: string;
}

export interface Anomaly {
  id: number;
  device_id: number;
  anomaly_type: 'low_config' | 'disk_warning' | 'unassigned_owner' | 'duplicate_hostname' | 'warranty_expiring';
  anomaly_description: string;
  status: 'pending' | 'resolved' | 'ignored';
  detected_at: string;
  resolved_at?: string;
  hostname?: string;
  ip_address?: string;
  department?: string;
}

export interface Snapshot {
  id: number;
  device_id: number;
  snapshot_data: string;
  created_at: string;
}

export interface TransferRecord {
  id: number;
  device_id: number;
  from_owner?: string;
  to_owner?: string;
  transfer_date: string;
  notes?: string;
}

export interface DeviceFilters {
  department?: string;
  status?: string;
  search?: string;
}

export interface DeviceInput {
  hostname: string;
  ip_address?: string;
  mac_address?: string;
  serial_number?: string;
  department?: string;
  status?: string;
  last_inspection_time?: string;
}

export interface TagInput {
  device_id: number;
  tag_type: Tag['tag_type'];
  tag_name: string;
  tag_value?: string;
}

export interface BatchOperation {
  type: 'export_report' | 'print_stickers' | 'record_transfer' | 'archive_devices' | 'save_snapshots';
  deviceIds: number[];
  options?: any;
}
