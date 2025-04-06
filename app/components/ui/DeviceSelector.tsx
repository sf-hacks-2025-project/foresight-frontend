"use client"

interface DeviceSelectorProps {
  devices: MediaDeviceInfo[]
  selectedDeviceId: string
  onChange: (deviceId: string) => void
}

export function DeviceSelector({ devices, selectedDeviceId, onChange }: DeviceSelectorProps) {
  return (
    <div className="mb-4">
      <label htmlFor="camera-select" className="block text-sm font-medium mb-1">
        Select Camera:
      </label>
      <select
        id="camera-select"
        value={selectedDeviceId}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
      >
        {devices.length === 0 && <option value="">No cameras found</option>}
        {devices.map((device) => (
          <option key={device.deviceId} value={device.deviceId}>
            {device.label || `Camera ${device.deviceId.substring(0, 7)}...`}
          </option>
        ))}
      </select>
    </div>
  )
}

