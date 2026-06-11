import { create } from 'zustand';
import type { Device, DeviceFilters, DeviceInput } from '../types';

interface DeviceStore {
  devices: Device[];
  selectedDevices: number[];
  filters: DeviceFilters;
  loading: boolean;
  error: string | null;
  
  fetchDevices: () => Promise<void>;
  addDevice: (device: DeviceInput) => Promise<Device>;
  updateDevice: (id: number, data: Partial<Device>) => Promise<void>;
  deleteDevice: (id: number) => Promise<void>;
  selectDevice: (id: number) => void;
  deselectDevice: (id: number) => void;
  selectAll: () => void;
  clearSelection: () => void;
  setFilters: (filters: DeviceFilters) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useDeviceStore = create<DeviceStore>((set, get) => ({
  devices: [],
  selectedDevices: [],
  filters: {},
  loading: false,
  error: null,

  fetchDevices: async () => {
    set({ loading: true, error: null });
    try {
      const devices = await window.electronAPI.devices.getAll(get().filters);
      set({ devices, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  addDevice: async (deviceInput: DeviceInput) => {
    set({ loading: true, error: null });
    try {
      const newDevice = await window.electronAPI.devices.create(deviceInput);
      await get().fetchDevices();
      return newDevice;
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  updateDevice: async (id: number, data: Partial<Device>) => {
    set({ loading: true, error: null });
    try {
      await window.electronAPI.devices.update(id, data);
      await get().fetchDevices();
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  deleteDevice: async (id: number) => {
    set({ loading: true, error: null });
    try {
      await window.electronAPI.devices.delete(id);
      set(state => ({
        selectedDevices: state.selectedDevices.filter(deviceId => deviceId !== id)
      }));
      await get().fetchDevices();
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  selectDevice: (id: number) => {
    set(state => ({
      selectedDevices: state.selectedDevices.includes(id)
        ? state.selectedDevices
        : [...state.selectedDevices, id]
    }));
  },

  deselectDevice: (id: number) => {
    set(state => ({
      selectedDevices: state.selectedDevices.filter(deviceId => deviceId !== id)
    }));
  },

  selectAll: () => {
    set(state => ({
      selectedDevices: state.devices.map(d => d.id)
    }));
  },

  clearSelection: () => {
    set({ selectedDevices: [] });
  },

  setFilters: (filters: DeviceFilters) => {
    set({ filters });
    get().fetchDevices();
  },

  setLoading: (loading: boolean) => {
    set({ loading });
  },

  setError: (error: string | null) => {
    set({ error });
  },
}));
