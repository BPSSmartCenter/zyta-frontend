
import ReactApexChart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";

interface IoTChartProps {
    title: string;
    series: { name: string; data: { x: number; y: number }[] }[];
    unit?: string;
    color?: string;
    height?: number;
}

export default function IoTChart({
    title,
    series,
    unit = "",
    color = "#00bcd4",
    height = 300,
}: IoTChartProps) {
    const options: ApexOptions = {
        chart: {
            type: "area",
            height: height,
            toolbar: { show: false },
            zoom: { enabled: false },
            animations: {
                enabled: true,
                speed: 800,
                animateGradually: {
                    enabled: true,
                    delay: 150
                },
                dynamicAnimation: {
                    enabled: true,
                    speed: 350
                },
            },
        },
        colors: [color],
        dataLabels: { enabled: false },
        stroke: { curve: "smooth", width: 2 },
        fill: {
            type: "gradient",
            gradient: {
                shadeIntensity: 1,
                opacityFrom: 0.4,
                opacityTo: 0.1,
                stops: [0, 90, 100],
            },
        },
        title: {
            text: title,
            align: "left",
            style: { fontSize: "16px", fontWeight: "bold", color: "#374151" },
        },
        xaxis: {
            type: "datetime",
            labels: {
                datetimeFormatter: {
                    year: 'yyyy',
                    month: "MMM 'yy",
                    day: 'dd MMM',
                    hour: 'HH:mm:ss'
                },
                style: { colors: "#9ca3af" },
            },
            tooltip: { enabled: false },
        },
        yaxis: {
            labels: {
                formatter: (val) => val.toFixed(1),
                style: { colors: "#9ca3af" },
            },
            title: {
                text: unit,
                style: { color: "#9ca3af" },
            },
        },
        grid: {
            borderColor: "#f3f4f6",
            strokeDashArray: 4,
        },
        tooltip: {
            x: { format: "HH:mm:ss" },
        },
    };

    return (
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm relative">
            {series[0]?.data.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/50 z-10 rounded-xl">
                    <span className="text-gray-500 text-sm">Waiting for real-time data...</span>
                </div>
            )}
            <ReactApexChart options={options} series={series} type="area" height={height} />
        </div>
    );
}
