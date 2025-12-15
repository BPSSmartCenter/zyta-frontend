
import { useEffect, useState, useMemo } from "react";

import { getIoTDevices, type IoTDevice } from "../../../api/iot";
import { LineChart } from "../../Chart";
import Dropdown from "../../Dropdown";
import Thermostat from "../../Themorstats";
import {
    cyanBolt as bolt,
    fireImage as fire,
    deviceImage as deviceIcon,
    motionImage as motionIcon,
    intercomeImage as sitemapIcon,
    alertCyan as alertIcon,
    waterTapImage as waterTapIcon,
    wifiImage as wifiIcon,
    deviceNoti as bellIcon
} from "../../../assets";
import waterDrop from "../../../assets/waterDrop.png";
import plugIcon from "../../../assets/plug.png";
import voltageIcon from "../../../assets/Voltage.png";

type Props = {
    deviceId: string;
    onBack: () => void;
};

// UI Component: Blue Hero Card (Modified for click interaction)
type CardValueProps = {
    img: string;
    value: number | string;
    valueLabel: string;
    valueLabel2?: string;
    onClick?: () => void;
};

function CardValue({ img: _img, value, valueLabel, valueLabel2, onClick }: CardValueProps) {
    return (
        <div
            className="bg-[#22A9E0] rounded-lg w-full h-[180px] p-5 flex flex-col text-white gap-2 cursor-pointer hover:brightness-95 transition shadow-sm"
            onClick={onClick}
        >
            <div className="bg-white w-[50px] h-[50px] rounded-full flex items-center justify-center">
                <span className="text-[#22A9E0] text-2xl font-bold">
                    {valueLabel?.charAt(0).toUpperCase()}
                </span>
            </div>
            <h1 className="text-[28px] font-bold mt-2 truncate">{value}</h1>
            <div className="flex flex-col text-sm/tight">
                <span className="font-medium opacity-90">{valueLabel}</span>
                {valueLabel2 && <span className="opacity-75 text-xs">{valueLabel2}</span>}
            </div>
        </div>
    );
}

// UI Component: Side White Card
type SideCardValueProps = {
    img: string;
    valueLabel: string;
    value: number | string;
    unit?: string;
};

function SideCardValue({ img: _img, value, valueLabel, unit }: SideCardValueProps) {
    return (
        <div className="flex items-center p-4 bg-white w-full h-[90px] rounded-lg gap-4 shadow-sm border border-gray-100">
            <div className="w-[48px] h-[48px] rounded-full bg-[#A9DB4E] flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xl font-bold">
                    {valueLabel?.charAt(0).toUpperCase()}
                </span>
            </div>
            <div className="flex-1 min-w-0">
                <h1 className="text-gray-500 text-xs font-medium truncate">{valueLabel}</h1>
                <p className="font-bold text-xl text-gray-800 truncate">
                    {value} <span className="text-sm font-normal text-gray-400">{unit}</span>
                </p>
            </div>
        </div>
    );
}

// Helpers
const formatTime = (h: number, m: number) => {
    const ampm = h >= 12 ? "PM" : "AM";
    const hh = (h % 12 || 12).toString().padStart(2, "0");
    const mm = m.toString().padStart(2, "0");
    return `${hh}:${mm} ${ampm}`;
};

type FieldMeta = {
    label: string;
    unit?: string;
    icon?: string;
    forceSide?: boolean;
    transform?: (val: number) => number;
    format?: (val: any) => string;
    max?: number;
};

const FIELD_CONFIG: Record<string, FieldMeta> = {
    // Status (Side)
    doorcontact_state: { label: "Door Status", forceSide: true, format: (v) => v ? "Open" : "Closed", icon: deviceIcon },
    switch_1: { label: "Switch 1", forceSide: true, format: (v) => v ? "ON" : "OFF", icon: plugIcon },
    switch_2: { label: "Switch 2", forceSide: true, format: (v) => v ? "ON" : "OFF", icon: plugIcon },
    switch_alarm_sound: { label: "Alarm Sound", forceSide: true, format: (v) => v ? "ON" : "OFF", icon: alertIcon },
    alarm_active: { label: "Alarm Active", forceSide: true, format: (v) => v ? "Active" : "Normal", icon: alertIcon },
    factory_reset: { label: "Factory Reset", forceSide: true, format: (v) => v ? "Resetting" : "Normal", icon: sitemapIcon },
    relay_power: { label: "Relay Power", forceSide: true, format: (v) => v ? "ON" : "OFF", icon: bolt },
    network_connected: { label: "Network Conn", forceSide: true, format: (v) => v ? "Connected" : "Disconnected", icon: wifiIcon },
    tamper_state: { label: "Tamper", forceSide: true, format: (v) => v ? "Tampered" : "Normal", icon: alertIcon },
    motion_detected: { label: "Motion", forceSide: true, format: (v) => v ? "Detected" : "None", icon: motionIcon },

    // Metrics (Hero/Gauge)
    temp: { label: "Temperature", unit: "°C", icon: fire, max: 50 },
    va_temperature: { label: "Temperature", unit: "°C", icon: fire, transform: (v) => v / 10, max: 50 },
    humi: { label: "Humidity", unit: "%", icon: waterDrop, max: 100 },
    va_humidity: { label: "Humidity", unit: "%", icon: waterDrop, max: 100 },
    flow_rate: { label: "Flow Rate", unit: "m³/s", icon: waterTapIcon, max: 100 },
    water_level: { label: "Water Level", unit: "m", icon: waterDrop, max: 10 },
    voltage: { label: "Voltage", unit: "V", icon: voltageIcon, max: 250 },
    cur_voltage: { label: "Voltage", unit: "V", icon: voltageIcon, transform: (v) => v / 10, max: 250 },
    current: { label: "Current", unit: "A", icon: plugIcon, max: 20 },
    cur_current: { label: "Current", unit: "mA", icon: plugIcon, max: 5000 },
    power: { label: "Power", unit: "W", icon: bolt, max: 5000 },
    cur_power: { label: "Power", unit: "W", icon: bolt, max: 5000 },
    signal_strength: { label: "Signal", unit: "dBm", icon: wifiIcon, max: -30 },
    battery_percentage: { label: "Battery", unit: "%", icon: bolt, max: 100 },
    add_ele: { label: "Energy", unit: "kWh", icon: bolt, transform: (v) => v / 1000, max: 10000 },

    // Misc
    light_mode: { label: "Relay Mode", icon: sitemapIcon, forceSide: true },
    relay_status: { label: "Relay Status", forceSide: true, icon: plugIcon },
    countdown_1: { label: "Countdown 1", unit: "s", forceSide: true, icon: sitemapIcon },
    countdown_2: { label: "Countdown 2", unit: "s", forceSide: true, icon: sitemapIcon },
    master_state: { label: "System State", forceSide: true, icon: sitemapIcon },
    network_mode: { label: "Network", icon: wifiIcon, forceSide: true },
    system_volume: { label: "System Vol", unit: "%", icon: alertIcon, forceSide: true },
    alarm_msg: { label: "Alarm Msg", icon: bellIcon, forceSide: true },
    alarm_volume: { label: "Alarm Vol", icon: bellIcon, forceSide: true },
};

export default function IoTDetail({ deviceId, onBack }: Props) {
    // const { t } = useTranslation("devices");
    const [device, setDevice] = useState<IoTDevice | null>(null);
    const [loading, setLoading] = useState(false);

    // Time Selection
    const [fromTime, setFromTime] = useState<string>("12:00 AM");
    const [toTime, setToTime] = useState<string>("11:30 PM");

    const timeOptions = useMemo(() =>
        Array.from({ length: 24 * 2 }, (_, i) => {
            const h = Math.floor(i / 2);
            const m = (i % 2) * 30;
            const label = formatTime(h, m);
            return { label, value: label };
        }), []
    );



    // Featured Metric State (Key only)
    const [selectedMetricKey, setSelectedMetricKey] = useState<string | null>(null);

    // Real-time Chart Data (Store all metrics)
    const [chartData, setChartData] = useState<any[]>([]);

    useEffect(() => {
        const fetchDevice = async () => {
            // Only show global loading on first load
            if (!device) setLoading(true);
            try {
                const all = await getIoTDevices();
                const found = all.find(d => String(d.id) === deviceId || d.deviceId === deviceId);
                if (found) {
                    setDevice(found);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchDevice();
        const interval = setInterval(fetchDevice, 3000); // Poll every 3 seconds
        return () => clearInterval(interval);
    }, [deviceId]);

    const snapshot = device?.snapshot || (device?.value ? { value: device.value } : {});

    // Process Fields
    const processedFields = useMemo(() => {
        return Object.entries(snapshot).map(([key, rawVal]) => {
            const config = FIELD_CONFIG[key] || { label: key, icon: deviceIcon };
            let val = rawVal;
            if (typeof val === 'number' && config.transform) val = config.transform(val);

            let displayVal = val;

            if (val === null || val === undefined) {
                displayVal = "-";
            } else if (config.format) {
                displayVal = config.format(val);
            } else if (typeof val === 'number') {
                displayVal = Number(val).toFixed(2);
            } else if (typeof val === 'boolean') {
                displayVal = val ? "ON" : "OFF";
            } else if (typeof val === 'object') {
                try {
                    displayVal = JSON.stringify(val);
                } catch {
                    displayVal = String(val);
                }
            } else if (String(val).trim() === '') {
                displayVal = "-";
            }

            return {
                key,
                ...config,
                value: displayVal,
                rawValue: val,
                isNumeric: typeof val === 'number' // Relaxed check: Include formatted numbers (like status enums)
            };
        });
    }, [snapshot]);

    // Move ALL numeric fields to Hero (Main Panel) to ensure we show "at least a number"
    const heroFields = processedFields.filter(f => f.isNumeric);
    const sideFields = processedFields.filter(f => !f.isNumeric);

    // Initial Metric Selection
    useEffect(() => {
        if (!selectedMetricKey && heroFields.length > 0) {
            setSelectedMetricKey(heroFields[0].key);
        }
    }, [heroFields, selectedMetricKey]);

    // Update Chart Data & Gauge Value
    const currentMetricObj = useMemo(() =>
        heroFields.find(f => f.key === selectedMetricKey),
        [heroFields, selectedMetricKey]);

    useEffect(() => {
        if (heroFields.length === 0) return;

        const nowInfo = new Date();
        const timeLabel = `${nowInfo.getHours()}:${String(nowInfo.getMinutes()).padStart(2, '0')}:${String(nowInfo.getSeconds()).padStart(2, '0')}`;

        // Collect all numeric values
        const dataPoint: any = { time: timeLabel };
        heroFields.forEach(f => {
            dataPoint[f.key] = Number(f.rawValue);
        });

        setChartData(prev => {
            const next = [...prev, dataPoint];
            if (next.length > 20) return next.slice(next.length - 20);
            return next;
        });
    }, [snapshot]); // Update whenever snapshot changes (via device update)

    if (loading && !device) return <div className="p-8 text-center text-gray-500">Loading details...</div>;
    if (!device) return <div className="p-8 text-center"><button onClick={onBack}>Device not found (Click to Back)</button></div>;

    // Define Chart Series
    let chartSeries: { name: string; data: number[] }[] = [];
    const isTempHumi = ['temp', 'humi', 'va_temperature', 'va_humidity'].some(k => k === selectedMetricKey);

    if (isTempHumi) {
        // Try to find temp and humi data keys
        const hasTemp = heroFields.some(f => f.key === 'temp' || f.key === 'va_temperature');
        const hasHumi = heroFields.some(f => f.key === 'humi' || f.key === 'va_humidity');

        if (hasTemp) {
            const key = heroFields.find(f => f.key === 'temp' || f.key === 'va_temperature')?.key || 'temp';
            chartSeries.push({ name: "Temperature", data: chartData.map(d => d[key] || 0) });
        }
        if (hasHumi) {
            const key = heroFields.find(f => f.key === 'humi' || f.key === 'va_humidity')?.key || 'humi';
            chartSeries.push({ name: "Humidity", data: chartData.map(d => d[key] || 0) });
        }
    } else {
        // Standard Single Line
        chartSeries = [{
            name: currentMetricObj?.label || "Value",
            data: chartData.map(d => selectedMetricKey ? (d[selectedMetricKey] || 0) : 0)
        }];
    }

    const chartCats = chartData.map(d => d.time);

    return (
        <div className="flex flex-col gap-4 p-6 bg-[#F3F4F6] min-h-screen font-sans">
            {/* Header / Nav */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 bg-white hover:bg-gray-50 rounded-lg text-gray-500 shadow-sm transition">
                        ← Back
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">{device.name || device.deviceId}</h1>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${String(device.status).toLowerCase() === 'online' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {device.status}
                        </span>
                    </div>
                </div>
            </div>

            {/* Main Grid Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

                {/* Main Panel (White Box) - spans 4 cols */}
                <div className="lg:col-span-4 bg-white rounded-xl p-6 shadow-sm flex flex-col gap-8">

                    {/* Time Filters */}
                    <div className="flex items-center gap-3">
                        <Dropdown options={timeOptions} value={fromTime} onChange={setFromTime}>
                            {({ selected, open, getButtonProps, getMenuProps, getItemProps, options }) => (
                                <div className="relative">
                                    <button {...getButtonProps({ className: "px-4 py-2 rounded-lg bg-[#F6FBFF] text-[#22A9E0] font-semibold text-sm shadow-sm hover:bg-cyan-50" })}>
                                        {selected?.label ?? "Select Time"}
                                    </button>
                                    {open && (
                                        <div {...getMenuProps({ className: "absolute z-20 mt-2 max-h-60 w-32 overflow-auto rounded-md bg-white ring-1 ring-black/5 shadow-lg p-1" })}>
                                            {options.map(opt => (
                                                <button key={opt.value} {...getItemProps(opt, { className: "w-full text-left px-3 py-2 rounded hover:bg-gray-100 text-sm" })}>
                                                    {opt.label}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </Dropdown>
                        <span className="text-[#22A9E0] font-medium text-sm">to</span>
                        <Dropdown options={timeOptions} value={toTime} onChange={setToTime}>
                            {({ selected, open, getButtonProps, getMenuProps, getItemProps, options }) => (
                                <div className="relative">
                                    <button {...getButtonProps({ className: "px-4 py-2 rounded-lg bg-[#F6FBFF] text-[#22A9E0] font-semibold text-sm shadow-sm hover:bg-cyan-50" })}>
                                        {selected?.label ?? "Select Time"}
                                    </button>
                                    {open && (
                                        <div {...getMenuProps({ className: "absolute z-20 mt-2 max-h-60 w-32 overflow-auto rounded-md bg-white ring-1 ring-black/5 shadow-lg p-1" })}>
                                            {options.map(opt => (
                                                <button key={opt.value} {...getItemProps(opt, { className: "w-full text-left px-3 py-2 rounded hover:bg-gray-100 text-sm" })}>
                                                    {opt.label}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </Dropdown>
                    </div>

                    {/* Gauge Section (Thermostat) */}
                    <div className="flex justify-center py-6 min-h-[300px]">
                        {currentMetricObj ? (
                            <Thermostat
                                key={currentMetricObj.key}
                                initialValue={Number(currentMetricObj.rawValue)}
                                max={currentMetricObj.max || (Number(currentMetricObj.rawValue) > 1 ? 100 : 1)} // Adaptive max for boolean-like vs large numbers
                                valueLabel={<span className="font-bold text-gray-700">{currentMetricObj.label}</span>}
                                maxLabel={<span className="font-bold text-gray-700">{currentMetricObj.unit}</span>}
                                unit=""
                            />
                        ) : null}
                    </div>

                    {/* Value Cards Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                        {heroFields.map(field => (
                            <CardValue
                                key={field.key}
                                img={field.icon || deviceIcon}
                                value={field.value as string | number}
                                valueLabel={field.label}
                                valueLabel2={field.unit}
                                onClick={() => setSelectedMetricKey(field.key)}
                            />
                        ))}
                    </div>

                </div>

                {/* Sidebar - spans 1 col */}
                {/* Sidebar - spans 1 col */}
                <div className="flex flex-col gap-4">


                    {/* Status Cards */}
                    {sideFields.length > 0 && (
                        <div className="flex flex-col gap-3">
                            <h3 className="font-bold text-gray-500 text-xs uppercase tracking-wide px-1">Status</h3>
                            {sideFields.map(field => (
                                <SideCardValue
                                    key={field.key}
                                    img={field.icon || deviceIcon}
                                    valueLabel={field.label}
                                    value={field.value}
                                    unit={field.unit}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom Chart Section */}
            <div className="grid grid-cols-1 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="font-semibold text-lg text-gray-800 mb-4 ml-2">Trends</h3>
                    <LineChart
                        title=""
                        series={chartSeries}
                        categories={chartCats}
                        height={350}
                    />
                </div>
            </div>
        </div>
    );
}
