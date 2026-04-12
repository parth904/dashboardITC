import React, { useEffect, useMemo, useState } from "react";
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "../firebase";

function formatDateTime(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

function percentText(value, suffix = "%") {
  if (value === null || value === undefined || value === "") return "-";
  return `${value}${suffix}`;
}

function gbText(value) {
  if (value === null || value === undefined || value === "") return "-";
  return `${value} GB`;
}

function compactNumber(value) {
  const num = Number(value ?? 0);
  return new Intl.NumberFormat("en-IN").format(num);
}

function getResultClasses(result) {
  return result === "NOT OK"
    ? "bg-rose-500/10 text-rose-300 ring-1 ring-rose-400/20"
    : "bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-400/20";
}

function getDefectBarWidth(total, value) {
  if (!total || total <= 0) return "0%";
  return `${Math.max(8, Math.round((value / total) * 100))}%`;
}

const DUMMY_DEVICE_DOCS = [
  {
    id: "demo_kp_factory_a_cam_01",
    factory_location: "Factory A",
    camera: "Cam 01",
    last_scan_id: "scan_demo_001",
    last_scan_timestamp: "2026-04-13T14:22:00.000Z",
    last_result: "NOT OK",
    last_defect_type: "Hair",
    last_defect_types: ["Hair"],
    last_image_url:
      "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=1200&q=80",
    module_status: {
      hair: true,
      overcooked: true,
      shape: true,
    },
    device_info: {
      cpu_percent: 31.8,
      ram_percent: 57.2,
      ram_used_gb: 9.14,
      ram_total_gb: 16,
      disk_percent: 63.5,
      disk_used_gb: 318,
      disk_total_gb: 500,
    },
    cleanup: {
      last_run_date: "2026-04-13T05:30:00.000Z",
      retention_days: 7,
    },
    captured_images: 1284,
    rejected_images: 126,
    defect_count_hair: 51,
    defect_count_overcooked: 39,
    defect_count_shape: 36,
    defect_count_none: 1158,
    updated_at: "2026-04-13T14:22:00.000Z",
  },
  {
    id: "demo_kp_factory_b_cam_04",
    factory_location: "Factory B",
    camera: "Cam 04",
    last_scan_id: "scan_demo_021",
    last_scan_timestamp: "2026-04-13T13:51:00.000Z",
    last_result: "OK",
    last_defect_type: "None",
    last_defect_types: ["None"],
    last_image_url:
      "https://images.unsplash.com/photo-1608198093002-ad4e005484ec?auto=format&fit=crop&w=1200&q=80",
    module_status: {
      hair: true,
      overcooked: false,
      shape: true,
    },
    device_info: {
      cpu_percent: 22.4,
      ram_percent: 44.1,
      ram_used_gb: 7.05,
      ram_total_gb: 16,
      disk_percent: 49.8,
      disk_used_gb: 249,
      disk_total_gb: 500,
    },
    cleanup: {
      last_run_date: "2026-04-13T05:30:00.000Z",
      retention_days: 7,
    },
    captured_images: 934,
    rejected_images: 42,
    defect_count_hair: 14,
    defect_count_overcooked: 0,
    defect_count_shape: 28,
    defect_count_none: 892,
    updated_at: "2026-04-13T13:51:00.000Z",
  },
];

const DUMMY_INSPECTION_DOCS = [
  {
    id: "scan_demo_001",
    scan_id: "scan_demo_001",
    timestamp: "2026-04-13T14:22:00.000Z",
    result: "NOT OK",
    defect_type: "Hair",
    defect_types: ["Hair"],
    defects: { hair: true, overcooked: false, shape: false },
    image_data: {
      date_time: "2026-04-13T14:21:48.000Z",
      factory_location: "Factory A",
      camera: "Cam 01",
      shift_time: "Naan",
      source_filename: "demo_naan_001.jpg",
      input_mode: "manual_api_upload",
    },
    image_urls: {
      original: {
        download_url:
          "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=1200&q=80",
      },
      cropped: {
        download_url:
          "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=1200&q=80",
      },
    },
  },
  {
    id: "scan_demo_002",
    scan_id: "scan_demo_002",
    timestamp: "2026-04-13T14:05:00.000Z",
    result: "NOT OK",
    defect_type: "Overcooked",
    defect_types: ["Overcooked"],
    defects: { hair: false, overcooked: true, shape: false },
    image_data: {
      date_time: "2026-04-13T14:04:40.000Z",
      factory_location: "Factory A",
      camera: "Cam 01",
      shift_time: "Naan",
      source_filename: "demo_naan_002.jpg",
      input_mode: "manual_api_upload",
    },
    image_urls: {
      original: {
        download_url:
          "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80",
      },
    },
  },
  {
    id: "scan_demo_003",
    scan_id: "scan_demo_003",
    timestamp: "2026-04-13T13:48:00.000Z",
    result: "OK",
    defect_type: "None",
    defect_types: ["None"],
    defects: { hair: false, overcooked: false, shape: false },
    image_data: {
      date_time: "2026-04-13T13:47:40.000Z",
      factory_location: "Factory A",
      camera: "Cam 01",
      shift_time: "Roti",
      source_filename: "demo_naan_003.jpg",
      input_mode: "manual_api_upload",
    },
    image_urls: {
      original: {
        download_url:
          "https://images.unsplash.com/photo-1608198093002-ad4e005484ec?auto=format&fit=crop&w=1200&q=80",
      },
    },
  },
  {
    id: "scan_demo_021",
    scan_id: "scan_demo_021",
    timestamp: "2026-04-13T13:51:00.000Z",
    result: "OK",
    defect_type: "None",
    defect_types: ["None"],
    defects: { hair: false, overcooked: false, shape: false },
    image_data: {
      date_time: "2026-04-13T13:50:42.000Z",
      factory_location: "Factory B",
      camera: "Cam 04",
      shift_time: "Naan",
      source_filename: "demo_b_001.jpg",
      input_mode: "manual_api_upload",
    },
    image_urls: {
      original: {
        download_url:
          "https://images.unsplash.com/photo-1608198093002-ad4e005484ec?auto=format&fit=crop&w=1200&q=80",
      },
    },
  },
];

function IconCamera() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
      <path
        d="M8 7l1.2-2h5.6L16 7h2a2 2 0 012 2v8a2 2 0 01-2 2H6a2 2 0 01-2-2V9a2 2 0 012-2h2z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="13" r="3.5" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function IconReject() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
      <path
        d="M12 3l7 4v10l-7 4-7-4V7l7-4z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M9 9l6 6M15 9l-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function IconSpark() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
      <path
        d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8L12 3z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconCpu() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
      <rect x="7" y="7" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M10 1v3M14 1v3M10 20v3M14 20v3M20 10h3M20 14h3M1 10h3M1 14h3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconTrash() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
      <path
        d="M4 7h16M9 3h6M8 7l.7 12a1 1 0 001 .94h4.6a1 1 0 001-.94L16 7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StatusBadge({ on }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ${
        on
          ? "bg-emerald-500/10 text-emerald-300 ring-emerald-400/20"
          : "bg-rose-500/10 text-rose-300 ring-rose-400/20"
      }`}
    >
      <span
        className={`inline-block h-2.5 w-2.5 rounded-full ${
          on ? "bg-emerald-400" : "bg-rose-400"
        }`}
      />
      {on ? "ON" : "OFF"}
    </span>
  );
}

function KpiCard({ title, value, subtitle, icon, tone = "slate" }) {
  const toneMap = {
    slate: "from-slate-900 to-slate-800 text-white",
    rose: "from-rose-600 to-rose-500 text-white",
    amber: "from-amber-500 to-orange-500 text-white",
    emerald: "from-emerald-600 to-emerald-500 text-white",
    indigo: "from-indigo-600 to-violet-500 text-white",
  };

  return (
    <div className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/70 p-5 shadow-[0_12px_40px_rgba(15,23,42,0.08)] backdrop-blur-sm">
      <div className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${toneMap[tone] || toneMap.slate}`} />
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-medium text-slate-500">{title}</div>
          <div className="mt-3 text-3xl font-bold tracking-tight text-slate-900">{value}</div>
          {subtitle ? <div className="mt-2 text-sm text-slate-500">{subtitle}</div> : null}
        </div>
        <div className={`rounded-2xl bg-gradient-to-br p-3 ${toneMap[tone] || toneMap.slate}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function SectionCard({ title, children, right, dark = false }) {
  return (
    <div
      className={`rounded-3xl border shadow-[0_12px_40px_rgba(15,23,42,0.08)] ${
        dark
          ? "border-slate-800 bg-slate-950 text-white"
          : "border-white/30 bg-white/75 text-slate-900 backdrop-blur-sm"
      }`}
    >
      <div className="flex items-center justify-between gap-4 border-b border-slate-200/60 px-6 py-5 dark:border-slate-800">
        <h2 className={`text-lg font-semibold ${dark ? "text-white" : "text-slate-900"}`}>{title}</h2>
        {right}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function KeyValue({ label, value, light = false }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-200/60 py-3 last:border-b-0">
      <span className={`text-sm ${light ? "text-slate-300" : "text-slate-500"}`}>{label}</span>
      <span className={`text-sm font-semibold text-right ${light ? "text-white" : "text-slate-900"}`}>
        {value}
      </span>
    </div>
  );
}

function TinyBar({ label, value, total, colorClass }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs">
        <span className="font-medium text-slate-500">{label}</span>
        <span className="font-semibold text-slate-800">{compactNumber(value)}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-200">
        <div
          className={`h-2 rounded-full ${colorClass}`}
          style={{ width: getDefectBarWidth(total, value) }}
        />
      </div>
    </div>
  );
}

function CenterIdentityCard({ selectedDevice, isUsingDummyData }) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-6 text-white shadow-[0_20px_70px_rgba(15,23,42,0.35)]">
      <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-indigo-500/20 blur-3xl" />
      <div className="absolute -bottom-10 -left-10 h-36 w-36 rounded-full bg-cyan-500/20 blur-3xl" />

      <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-slate-200 ring-1 ring-white/10">
            {isUsingDummyData ? "Demo Mode" : "Live Mode"}
          </div>
          <h2 className="mt-4 text-3xl font-bold tracking-tight">
            {selectedDevice.factory_location || "Unknown Center"}
          </h2>
          <p className="mt-2 text-sm text-slate-300">
            Camera: <span className="font-semibold text-white">{selectedDevice.camera || "-"}</span>
          </p>
          <p className="mt-1 text-sm text-slate-300">
            Last Result:{" "}
            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getResultClasses(
                selectedDevice.last_result
              )}`}
            >
              {selectedDevice.last_result || "-"}
            </span>
          </p>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300">
            Production quality monitoring dashboard for captured naan inspection data, defects,
            machine health, module status, and recent scan history.
          </p>
        </div>

        <div className="grid min-w-[320px] grid-cols-2 gap-4">
          <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/10">
            <div className="text-xs uppercase tracking-[0.18em] text-slate-300">Last Scan</div>
            <div className="mt-2 text-sm font-semibold text-white">
              {formatDateTime(selectedDevice.last_scan_timestamp)}
            </div>
          </div>
          <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/10">
            <div className="text-xs uppercase tracking-[0.18em] text-slate-300">Last Defect</div>
            <div className="mt-2 text-sm font-semibold text-white">
              {selectedDevice.last_defect_type || "-"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [deviceDocs, setDeviceDocs] = useState([]);
  const [inspectionDocs, setInspectionDocs] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [loadingDevices, setLoadingDevices] = useState(true);
  const [loadingInspections, setLoadingInspections] = useState(true);
  const [deviceError, setDeviceError] = useState("");
  const [inspectionError, setInspectionError] = useState("");

  useEffect(() => {
    const q = collection(db, "device_status");

    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        rows.sort((a, b) => {
          const aLabel = `${a.factory_location || ""} ${a.camera || ""}`.toLowerCase();
          const bLabel = `${b.factory_location || ""} ${b.camera || ""}`.toLowerCase();
          return aLabel.localeCompare(bLabel);
        });

        setDeviceDocs(rows);
        setLoadingDevices(false);
        setDeviceError("");
      },
      (err) => {
        console.error(err);
        setDeviceError(err.message || "Failed to load device status");
        setLoadingDevices(false);
        setDeviceDocs([]);
      }
    );

    return () => unsub();
  }, []);

  useEffect(() => {
    const q = query(
      collection(db, "inspections"),
      orderBy("timestamp", "desc"),
      limit(100)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setInspectionDocs(rows);
        setLoadingInspections(false);
        setInspectionError("");
      },
      (err) => {
        console.error(err);
        setInspectionError(err.message || "Failed to load inspections");
        setLoadingInspections(false);
        setInspectionDocs([]);
      }
    );

    return () => unsub();
  }, []);

  const effectiveDeviceDocs = useMemo(() => {
    return deviceDocs.length > 0 ? deviceDocs : DUMMY_DEVICE_DOCS;
  }, [deviceDocs]);

  const effectiveInspectionDocs = useMemo(() => {
    return inspectionDocs.length > 0 ? inspectionDocs : DUMMY_INSPECTION_DOCS;
  }, [inspectionDocs]);

  const isUsingDummyData = deviceDocs.length === 0 || inspectionDocs.length === 0;

  useEffect(() => {
    if (!selectedDeviceId && effectiveDeviceDocs.length > 0) {
      setSelectedDeviceId(effectiveDeviceDocs[0].id);
      return;
    }

    if (
      selectedDeviceId &&
      effectiveDeviceDocs.length > 0 &&
      !effectiveDeviceDocs.some((row) => row.id === selectedDeviceId)
    ) {
      setSelectedDeviceId(effectiveDeviceDocs[0].id);
    }
  }, [selectedDeviceId, effectiveDeviceDocs]);

  const selectedDevice = useMemo(() => {
    return effectiveDeviceDocs.find((d) => d.id === selectedDeviceId) || effectiveDeviceDocs[0] || null;
  }, [effectiveDeviceDocs, selectedDeviceId]);

  const filteredScans = useMemo(() => {
    if (!selectedDevice) return effectiveInspectionDocs;

    return effectiveInspectionDocs.filter((scan) => {
      const img = scan.image_data || {};
      return (
        (img.factory_location || "") === (selectedDevice.factory_location || "") &&
        (img.camera || "") === (selectedDevice.camera || "")
      );
    });
  }, [effectiveInspectionDocs, selectedDevice]);

  const recentScans = filteredScans.slice(0, 8);

  const defectTotal = useMemo(() => {
    if (!selectedDevice) return 0;
    return (
      (selectedDevice.defect_count_hair ?? 0) +
      (selectedDevice.defect_count_overcooked ?? 0) +
      (selectedDevice.defect_count_shape ?? 0)
    );
  }, [selectedDevice]);

  const rejectionRate = useMemo(() => {
    if (!selectedDevice) return 0;
    const captured = Number(selectedDevice.captured_images ?? 0);
    const rejected = Number(selectedDevice.rejected_images ?? 0);
    if (!captured) return 0;
    return ((rejected / captured) * 100).toFixed(1);
  }, [selectedDevice]);

  if (loadingDevices && loadingInspections && !selectedDevice) {
    return (
      <div className="min-h-screen bg-slate-950 text-white">
        <div className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-6">
          <div className="rounded-3xl border border-white/10 bg-white/5 px-8 py-6 text-center backdrop-blur-xl">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-slate-500 border-t-white" />
            <div className="mt-4 text-lg font-semibold">Loading dashboard…</div>
            <div className="mt-1 text-sm text-slate-400">Syncing center data from Firebase</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.18),_transparent_35%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_45%,#f8fafc_100%)]">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 rounded-[2rem] border border-white/30 bg-white/70 p-4 shadow-[0_20px_80px_rgba(15,23,42,0.10)] backdrop-blur-xl">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-start gap-4">
              <div className="rounded-3xl bg-slate-950 p-4 text-white shadow-lg">
                <IconCamera />
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-indigo-600">
                  Quality Monitoring
                </div>
                <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                  Naan Production Dashboard
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  Centralized view of captured images, rejection trend, defect distribution,
                  module health, device telemetry, and cleanup status across centers.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-end">
              <div className="min-w-[280px]">
                <label className="mb-2 block text-sm font-semibold text-slate-600">
                  Center / Camera
                </label>
                <select
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                  value={selectedDeviceId}
                  onChange={(e) => setSelectedDeviceId(e.target.value)}
                >
                  {effectiveDeviceDocs.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {(doc.factory_location || "Unknown")} — {(doc.camera || "Unknown")}
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Data Mode
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-900">
                  {isUsingDummyData ? "Using Dummy Fallback Data" : "Using Live Firebase Data"}
                </div>
              </div>
            </div>
          </div>
        </div>

        {(deviceError || inspectionError) && (
          <div className="mb-6 rounded-3xl border border-amber-200 bg-amber-50/80 px-5 py-4 text-sm text-amber-800 shadow-sm backdrop-blur-sm">
            <div className="font-semibold">Firebase fallback active</div>
            <div className="mt-1">
              {deviceError ? `Device status: ${deviceError}. ` : ""}
              {inspectionError ? `Inspections: ${inspectionError}. ` : ""}
              Showing professional dummy data until real data is available.
            </div>
          </div>
        )}

        {selectedDevice && (
          <>
            <div className="mb-6">
              <CenterIdentityCard
                selectedDevice={selectedDevice}
                isUsingDummyData={isUsingDummyData}
              />
            </div>

            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <KpiCard
                title="Captured Images"
                value={compactNumber(selectedDevice.captured_images ?? 0)}
                subtitle="Total images processed"
                icon={<IconCamera />}
                tone="slate"
              />
              <KpiCard
                title="Rejected Images"
                value={compactNumber(selectedDevice.rejected_images ?? 0)}
                subtitle={`${rejectionRate}% rejection rate`}
                icon={<IconReject />}
                tone="rose"
              />
              <KpiCard
                title="Hair Defects"
                value={compactNumber(selectedDevice.defect_count_hair ?? 0)}
                subtitle="Detected hair-related issues"
                icon={<IconSpark />}
                tone="amber"
              />
              <KpiCard
                title="Overcook Defects"
                value={compactNumber(selectedDevice.defect_count_overcooked ?? 0)}
                subtitle="Darkness or overcooked issues"
                icon={<IconSpark />}
                tone="emerald"
              />
              <KpiCard
                title="Shape Defects"
                value={compactNumber(selectedDevice.defect_count_shape ?? 0)}
                subtitle="Geometry or contour mismatch"
                icon={<IconSpark />}
                tone="indigo"
              />
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
              <div className="space-y-6 xl:col-span-8">
                <SectionCard
                  title="Defect Analytics"
                  right={
                    <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                      Total defects: {compactNumber(defectTotal)}
                    </div>
                  }
                >
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <div className="rounded-3xl bg-slate-50 p-5">
                      <div className="text-sm font-semibold text-slate-900">Defect Distribution</div>
                      <div className="mt-5 space-y-5">
                        <TinyBar
                          label="Hair"
                          value={selectedDevice.defect_count_hair ?? 0}
                          total={defectTotal}
                          colorClass="bg-amber-500"
                        />
                        <TinyBar
                          label="Overcook"
                          value={selectedDevice.defect_count_overcooked ?? 0}
                          total={defectTotal}
                          colorClass="bg-emerald-500"
                        />
                        <TinyBar
                          label="Shape"
                          value={selectedDevice.defect_count_shape ?? 0}
                          total={defectTotal}
                          colorClass="bg-indigo-500"
                        />
                        <TinyBar
                          label="No Defect"
                          value={selectedDevice.defect_count_none ?? 0}
                          total={
                            (selectedDevice.captured_images ?? 0) || (selectedDevice.defect_count_none ?? 0)
                          }
                          colorClass="bg-slate-700"
                        />
                      </div>
                    </div>

                    <div className="rounded-3xl bg-slate-50 p-5">
                      <div className="text-sm font-semibold text-slate-900">Center Summary</div>
                      <div className="mt-4">
                        <KeyValue label="Factory Location" value={selectedDevice.factory_location || "-"} />
                        <KeyValue label="Camera" value={selectedDevice.camera || "-"} />
                        <KeyValue label="Last Result" value={selectedDevice.last_result || "-"} />
                        <KeyValue label="Last Defect Type" value={selectedDevice.last_defect_type || "-"} />
                        <KeyValue
                          label="Last Scan"
                          value={formatDateTime(selectedDevice.last_scan_timestamp)}
                        />
                      </div>
                    </div>
                  </div>
                </SectionCard>

                <SectionCard
                  title="Recent Scans"
                  right={
                    <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                      Showing {recentScans.length} latest scans
                    </div>
                  }
                >
                  {recentScans.length === 0 ? (
                    <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-slate-500">
                      No recent scans found for this center.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                      {recentScans.map((scan) => {
                        const originalUrl = scan.image_urls?.original?.download_url;
                        const croppedUrl = scan.image_urls?.cropped?.download_url;
                        const imageUrl = originalUrl || croppedUrl || "";

                        return (
                          <div
                            key={scan.id}
                            className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
                          >
                            <div className="relative">
                              {imageUrl ? (
                                <img
                                  src={imageUrl}
                                  alt="inspection"
                                  className="h-56 w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-56 items-center justify-center bg-slate-100 text-sm text-slate-400">
                                  No image URL
                                </div>
                              )}

                              <div className="absolute inset-x-0 top-0 flex items-start justify-between p-4">
                                <div className="rounded-2xl bg-slate-950/70 px-3 py-2 text-white backdrop-blur-md">
                                  <div className="text-xs uppercase tracking-[0.16em] text-slate-300">
                                    Defect
                                  </div>
                                  <div className="mt-1 text-sm font-semibold">
                                    {scan.defect_type || "None"}
                                  </div>
                                </div>

                                <span
                                  className={`rounded-full px-3 py-1.5 text-xs font-semibold backdrop-blur-md ${getResultClasses(
                                    scan.result
                                  )}`}
                                >
                                  {scan.result || "-"}
                                </span>
                              </div>
                            </div>

                            <div className="space-y-2 p-5">
                              <div className="text-sm font-semibold text-slate-900">
                                {formatDateTime(scan.timestamp)}
                              </div>
                              <div className="rounded-2xl bg-slate-50 p-4">
                                <KeyValue
                                  label="Defect Types"
                                  value={(scan.defect_types || []).join(", ") || "None"}
                                />
                                <KeyValue
                                  label="Shift"
                                  value={scan.image_data?.shift_time || "-"}
                                />
                                <KeyValue
                                  label="File"
                                  value={scan.image_data?.source_filename || "-"}
                                />
                                <KeyValue
                                  label="Mode"
                                  value={scan.image_data?.input_mode || "-"}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </SectionCard>
              </div>

              <div className="space-y-6 xl:col-span-4">
                <SectionCard
                  title="Module Status"
                  dark
                  right={
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Real-time flags
                    </div>
                  }
                >
                  <div className="space-y-4">
                    <div className="rounded-2xl bg-white/5 p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-300">Hair</span>
                        <StatusBadge on={!!selectedDevice.module_status?.hair} />
                      </div>
                    </div>
                    <div className="rounded-2xl bg-white/5 p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-300">Overcooked</span>
                        <StatusBadge on={!!selectedDevice.module_status?.overcooked} />
                      </div>
                    </div>
                    <div className="rounded-2xl bg-white/5 p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-300">Shape</span>
                        <StatusBadge on={!!selectedDevice.module_status?.shape} />
                      </div>
                    </div>
                  </div>
                </SectionCard>

                <SectionCard
                  title="Device Info"
                  right={
                    <div className="rounded-2xl bg-slate-100 p-2 text-slate-700">
                      <IconCpu />
                    </div>
                  }
                >
                  <div className="rounded-3xl bg-slate-50 p-5">
                    <KeyValue
                      label="CPU Usage"
                      value={percentText(selectedDevice.device_info?.cpu_percent)}
                    />
                    <KeyValue
                      label="RAM Usage"
                      value={percentText(selectedDevice.device_info?.ram_percent)}
                    />
                    <KeyValue
                      label="RAM Used"
                      value={gbText(selectedDevice.device_info?.ram_used_gb)}
                    />
                    <KeyValue
                      label="RAM Total"
                      value={gbText(selectedDevice.device_info?.ram_total_gb)}
                    />
                    <KeyValue
                      label="Disk Usage"
                      value={percentText(selectedDevice.device_info?.disk_percent)}
                    />
                    <KeyValue
                      label="Disk Used"
                      value={gbText(selectedDevice.device_info?.disk_used_gb)}
                    />
                    <KeyValue
                      label="Disk Total"
                      value={gbText(selectedDevice.device_info?.disk_total_gb)}
                    />
                  </div>
                </SectionCard>

                <SectionCard
                  title="Clean-Up"
                  right={
                    <div className="rounded-2xl bg-slate-100 p-2 text-slate-700">
                      <IconTrash />
                    </div>
                  }
                >
                  <div className="rounded-3xl bg-slate-50 p-5">
                    <KeyValue
                      label="Last Run Date"
                      value={formatDateTime(selectedDevice.cleanup?.last_run_date)}
                    />
                    <KeyValue
                      label="Retention Days"
                      value={selectedDevice.cleanup?.retention_days ?? "-"}
                    />
                    <KeyValue
                      label="Dashboard State"
                      value={isUsingDummyData ? "Fallback Preview" : "Synced Live"}
                    />
                  </div>
                </SectionCard>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}