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
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString();
}

function getImageUrl(scan) {
  return (
    scan?.image_urls?.original?.download_url ||
    scan?.image_urls?.cropped?.download_url ||
    scan?.image_urls?.hair_annotated?.download_url ||
    scan?.image_urls?.overcooked_annotated?.download_url ||
    scan?.image_urls?.shape_annotated?.download_url ||
    ""
  );
}

function compactNumber(value) {
  const num = Number(value ?? 0);
  return new Intl.NumberFormat("en-IN").format(num);
}

function statusPill(on) {
  return on
    ? "bg-green-100 text-green-700"
    : "bg-red-100 text-red-700";
}

const DUMMY_SCANS = [
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
      camera: "Front Cam 01",
      shift_time: "Naan",
      source_filename: "demo_naan_001.jpg",
      input_mode: "manual_api_upload",
      view_type: "front",
    },
    image_urls: {
      original: {
        download_url:
          "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=1200&q=80",
      },
    },
    module_status: {
      hair: true,
      overcooked: true,
      shape: true,
    },
    device_info: {
      cpu_percent: 28.4,
      ram_percent: 51.2,
      ram_used_gb: 8.2,
      ram_total_gb: 16,
      disk_percent: 62.1,
      disk_used_gb: 310.5,
      disk_total_gb: 500,
    },
    cleanup: {
      last_run_date: "2026-04-13T05:30:00.000Z",
      retention_days: 7,
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
      camera: "Back Cam 01",
      shift_time: "Naan",
      source_filename: "demo_naan_002.jpg",
      input_mode: "manual_api_upload_back",
      view_type: "back",
    },
    image_urls: {
      original: {
        download_url:
          "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80",
      },
    },
    module_status: {
      hair: true,
      overcooked: true,
      shape: false,
    },
    device_info: {
      cpu_percent: 31.1,
      ram_percent: 54.3,
      ram_used_gb: 8.7,
      ram_total_gb: 16,
      disk_percent: 62.9,
      disk_used_gb: 314.5,
      disk_total_gb: 500,
    },
    cleanup: {
      last_run_date: "2026-04-13T05:30:00.000Z",
      retention_days: 7,
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
      factory_location: "Factory B",
      camera: "Front Cam 02",
      shift_time: "Roti",
      source_filename: "demo_naan_003.jpg",
      input_mode: "manual_api_upload",
      view_type: "front",
    },
    image_urls: {
      original: {
        download_url:
          "https://images.unsplash.com/photo-1608198093002-ad4e005484ec?auto=format&fit=crop&w=1200&q=80",
      },
    },
    module_status: {
      hair: true,
      overcooked: true,
      shape: true,
    },
    device_info: {
      cpu_percent: 18.8,
      ram_percent: 42.1,
      ram_used_gb: 6.7,
      ram_total_gb: 16,
      disk_percent: 49.2,
      disk_used_gb: 246,
      disk_total_gb: 500,
    },
    cleanup: {
      last_run_date: "2026-04-13T05:30:00.000Z",
      retention_days: 7,
    },
  },
];

function DetailRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-3 last:border-b-0">
      <span className="min-w-[120px] text-sm font-medium text-slate-500">{label}</span>
      <span className="break-all text-right text-sm font-semibold text-slate-900">
        {value ?? "-"}
      </span>
    </div>
  );
}

function Modal({ scan, onClose }) {
  useEffect(() => {
    if (!scan) return;

    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [scan, onClose]);

  if (!scan) return null;

  const imageUrl = getImageUrl(scan);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Scan Details</h2>
            <p className="mt-1 text-sm text-slate-500">{scan.scan_id || scan.id}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
          >
            Close
          </button>
        </div>

        <div className="grid max-h-[calc(92vh-80px)] grid-cols-1 overflow-y-auto lg:grid-cols-2">
          <div className="border-b border-slate-200 p-6 lg:border-b-0 lg:border-r">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt="scan"
                className="h-[320px] w-full rounded-2xl object-cover shadow-md"
              />
            ) : (
              <div className="flex h-[320px] w-full items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                No image available
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-3">
              <span
                className={`rounded-full px-3 py-1 text-sm font-semibold ${
                  scan.result === "OK"
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {scan.result || "-"}
              </span>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700">
                {scan.defect_type || "None"}
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold capitalize text-slate-700">
                {scan?.image_data?.view_type || "-"}
              </span>
            </div>

            <div className="mt-6 rounded-2xl bg-slate-50 p-4">
              <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-600">
                Module Status
              </h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl bg-white p-3 text-center shadow-sm">
                  <div className="text-xs text-slate-500">Hair</div>
                  <div
                    className={`mt-2 rounded-full px-2 py-1 text-xs font-semibold ${statusPill(
                      !!scan?.module_status?.hair
                    )}`}
                  >
                    {scan?.module_status?.hair ? "ON" : "OFF"}
                  </div>
                </div>
                <div className="rounded-xl bg-white p-3 text-center shadow-sm">
                  <div className="text-xs text-slate-500">Overcooked</div>
                  <div
                    className={`mt-2 rounded-full px-2 py-1 text-xs font-semibold ${statusPill(
                      !!scan?.module_status?.overcooked
                    )}`}
                  >
                    {scan?.module_status?.overcooked ? "ON" : "OFF"}
                  </div>
                </div>
                <div className="rounded-xl bg-white p-3 text-center shadow-sm">
                  <div className="text-xs text-slate-500">Shape</div>
                  <div
                    className={`mt-2 rounded-full px-2 py-1 text-xs font-semibold ${statusPill(
                      !!scan?.module_status?.shape
                    )}`}
                  >
                    {scan?.module_status?.shape ? "ON" : "OFF"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="rounded-2xl bg-slate-50 p-4">
              <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-600">
                Inspection Data
              </h3>
              <DetailRow label="Timestamp" value={formatDateTime(scan.timestamp)} />
              <DetailRow label="Result" value={scan.result} />
              <DetailRow label="Defect Type" value={scan.defect_type || "None"} />
              <DetailRow
                label="Defect Types"
                value={(scan.defect_types || []).join(", ") || "None"}
              />
              <DetailRow label="Location" value={scan?.image_data?.factory_location} />
              <DetailRow label="Camera" value={scan?.image_data?.camera} />
              <DetailRow label="Shift" value={scan?.image_data?.shift_time} />
              <DetailRow label="Mode" value={scan?.image_data?.input_mode} />
              <DetailRow label="View Type" value={scan?.image_data?.view_type} />
              <DetailRow label="Filename" value={scan?.image_data?.source_filename} />
              <DetailRow label="Scan ID" value={scan.scan_id || scan.id} />
            </div>

            <div className="mt-4 rounded-2xl bg-slate-50 p-4">
              <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-600">
                Device Info
              </h3>
              <DetailRow
                label="CPU"
                value={
                  scan?.device_info?.cpu_percent != null
                    ? `${scan.device_info.cpu_percent}%`
                    : "-"
                }
              />
              <DetailRow
                label="RAM"
                value={
                  scan?.device_info?.ram_percent != null
                    ? `${scan.device_info.ram_percent}%`
                    : "-"
                }
              />
              <DetailRow
                label="RAM Used"
                value={
                  scan?.device_info?.ram_used_gb != null
                    ? `${scan.device_info.ram_used_gb} GB`
                    : "-"
                }
              />
              <DetailRow
                label="RAM Total"
                value={
                  scan?.device_info?.ram_total_gb != null
                    ? `${scan.device_info.ram_total_gb} GB`
                    : "-"
                }
              />
              <DetailRow
                label="Disk"
                value={
                  scan?.device_info?.disk_percent != null
                    ? `${scan.device_info.disk_percent}%`
                    : "-"
                }
              />
              <DetailRow
                label="Disk Used"
                value={
                  scan?.device_info?.disk_used_gb != null
                    ? `${scan.device_info.disk_used_gb} GB`
                    : "-"
                }
              />
              <DetailRow
                label="Disk Total"
                value={
                  scan?.device_info?.disk_total_gb != null
                    ? `${scan.device_info.disk_total_gb} GB`
                    : "-"
                }
              />
            </div>

            <div className="mt-4 rounded-2xl bg-slate-50 p-4">
              <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-600">
                Cleanup
              </h3>
              <DetailRow label="Last Run" value={formatDateTime(scan?.cleanup?.last_run_date)} />
              <DetailRow label="Retention Days" value={scan?.cleanup?.retention_days} />
            </div>

            {imageUrl ? (
              <div className="mt-4">
                <button
                  onClick={() => window.open(imageUrl, "_blank")}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Open Image
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function ScanGridCard({ scan, onOpen }) {
  const imageUrl = getImageUrl(scan);

  return (
    <button
      onClick={() => onOpen(scan)}
      className="overflow-hidden rounded-2xl bg-white text-left shadow-md transition hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="relative">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={scan.defect_type || "scan"}
            className="h-56 w-full object-cover"
          />
        ) : (
          <div className="flex h-56 items-center justify-center bg-slate-100 text-sm text-slate-400">
            No Image
          </div>
        )}

        <div className="absolute left-3 top-3 flex gap-2">
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              scan.result === "OK"
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {scan.result || "-"}
          </span>

          <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold capitalize text-slate-700 backdrop-blur">
            {scan?.image_data?.view_type || "-"}
          </span>
        </div>
      </div>

      <div className="space-y-3 p-4">
        <div>
          <div className="text-sm font-bold text-slate-900">
            {scan.defect_type || "None"}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {formatDateTime(scan.timestamp)}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl bg-slate-50 p-3">
            <div className="text-xs text-slate-500">Location</div>
            <div className="mt-1 font-semibold text-slate-800">
              {scan?.image_data?.factory_location || "-"}
            </div>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <div className="text-xs text-slate-500">Camera</div>
            <div className="mt-1 font-semibold text-slate-800">
              {scan?.image_data?.camera || "-"}
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700">
          Click to view full details
        </div>
      </div>
    </button>
  );
}

export default function App() {
  const [scans, setScans] = useState([]);
  const [selectedScan, setSelectedScan] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState("All");
  const [selectedView, setSelectedView] = useState("All");
  const [viewMode, setViewMode] = useState("grid");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [usingDummy, setUsingDummy] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, "inspections"),
      orderBy("timestamp", "desc"),
      limit(100)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        if (data.length === 0) {
          setScans(DUMMY_SCANS);
          setUsingDummy(true);
        } else {
          setScans(data);
          setUsingDummy(false);
        }

        setLoading(false);
        setError("");
      },
      (err) => {
        console.error("Firestore error:", err);
        setError(err.message || "Failed to load inspections");
        setScans(DUMMY_SCANS);
        setUsingDummy(true);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  const locations = useMemo(() => {
    const vals = Array.from(
      new Set(scans.map((s) => s?.image_data?.factory_location).filter(Boolean))
    );
    return ["All", ...vals];
  }, [scans]);

  const views = useMemo(() => {
    const vals = Array.from(
      new Set(scans.map((s) => s?.image_data?.view_type).filter(Boolean))
    );
    return ["All", ...vals];
  }, [scans]);

  const filteredScans = useMemo(() => {
    return scans.filter((scan) => {
      const locationOk =
        selectedLocation === "All" ||
        scan?.image_data?.factory_location === selectedLocation;

      const viewOk =
        selectedView === "All" ||
        scan?.image_data?.view_type === selectedView;

      return locationOk && viewOk;
    });
  }, [scans, selectedLocation, selectedView]);

  const total = filteredScans.length;

  const rejected = useMemo(() => {
    return filteredScans.filter((d) => d.result === "NOT OK").length;
  }, [filteredScans]);

  const rejectionPercent = total ? ((rejected / total) * 100).toFixed(1) : "0.0";

  const defects = useMemo(() => {
    const defectMap = { Hair: 0, Overcooked: 0, Shape: 0 };

    filteredScans.forEach((d) => {
      if (d.defect_type === "Hair") defectMap.Hair++;
      if (d.defect_type === "Overcooked") defectMap.Overcooked++;
      if (d.defect_type === "Shape") defectMap.Shape++;

      if (Array.isArray(d.defect_types)) {
        d.defect_types.forEach((type) => {
          if (type === "Hair") defectMap.Hair++;
          if (type === "Overcooked") defectMap.Overcooked++;
          if (type === "Shape") defectMap.Shape++;
        });
      }
    });

    return defectMap;
  }, [filteredScans]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white p-6">
        <div className="mx-auto flex min-h-[80vh] max-w-6xl items-center justify-center">
          <div className="rounded-2xl bg-white px-8 py-6 shadow-md">
            <div className="text-lg font-semibold text-blue-600">Loading dashboard...</div>
            <div className="mt-2 text-sm text-slate-500">Syncing inspection data from Firebase</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white p-6">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-blue-600">CollabLens Dashboard</h1>
              <p className="mt-2 text-sm text-slate-600">
                Live production monitoring for naan quality inspections across front and back views.
              </p>
            </div>

            <div className="flex flex-col gap-3 md:flex-row">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-600">
                  Location
                </label>
                <select
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                >
                  {locations.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-600">
                  View Type
                </label>
                <select
                  value={selectedView}
                  onChange={(e) => setSelectedView(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                >
                  {views.map((view) => (
                    <option key={view} value={view}>
                      {view}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-600">
                  View Mode
                </label>
                <div className="flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`rounded-lg px-4 py-2 text-sm font-medium ${
                      viewMode === "grid"
                        ? "bg-blue-600 text-white"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    Grid
                  </button>
                  <button
                    onClick={() => setViewMode("table")}
                    className={`rounded-lg px-4 py-2 text-sm font-medium ${
                      viewMode === "table"
                        ? "bg-blue-600 text-white"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    Table
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Data Mode
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-900">
                  {usingDummy ? "Dummy Fallback" : "Live Firebase"}
                </div>
              </div>
            </div>
          </div>

          {error ? (
            <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800 shadow-sm">
              Firebase fallback active: {error}
            </div>
          ) : null}

          <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="rounded-2xl bg-white p-6 shadow-md transition hover:shadow-lg">
              <p className="text-gray-500">Captured Images</p>
              <h2 className="text-3xl font-bold">{compactNumber(total)}</h2>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-md transition hover:shadow-lg">
              <p className="text-gray-500">Rejected Images</p>
              <h2 className="text-3xl font-bold text-red-500">{compactNumber(rejected)}</h2>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-md transition hover:shadow-lg">
              <p className="text-gray-500">Rejection %</p>
              <h2 className="text-3xl font-bold">{rejectionPercent}%</h2>
            </div>
          </div>

          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-2xl border-l-4 border-yellow-400 bg-white p-5 shadow-md transition hover:shadow-lg">
              <p className="text-sm text-gray-500">Hair</p>
              <h2 className="mt-2 text-2xl font-bold">{compactNumber(defects.Hair)}</h2>
            </div>

            <div className="rounded-2xl border-l-4 border-red-400 bg-white p-5 shadow-md transition hover:shadow-lg">
              <p className="text-sm text-gray-500">Overcooked</p>
              <h2 className="mt-2 text-2xl font-bold">{compactNumber(defects.Overcooked)}</h2>
            </div>

            <div className="rounded-2xl border-l-4 border-blue-400 bg-white p-5 shadow-md transition hover:shadow-lg">
              <p className="text-sm text-gray-500">Shape</p>
              <h2 className="mt-2 text-2xl font-bold">{compactNumber(defects.Shape)}</h2>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl bg-white shadow-md">
            <div className="border-b border-slate-200 bg-blue-50 px-5 py-4">
              <h2 className="text-lg font-bold text-slate-800">Inspection Records</h2>
              <p className="mt-1 text-sm text-slate-500">
                {viewMode === "grid"
                  ? "Click any card to open complete scan details"
                  : "Click any row to open complete scan details"}
              </p>
            </div>

            {filteredScans.length === 0 ? (
              <div className="p-10 text-center text-slate-500">No Data Available</div>
            ) : viewMode === "grid" ? (
              <div className="p-5">
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {filteredScans.map((scan) => (
                    <ScanGridCard
                      key={scan.id}
                      scan={scan}
                      onOpen={setSelectedScan}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-blue-50">
                    <tr>
                      <th className="p-3 text-center font-semibold text-slate-700">Date/Time</th>
                      <th className="p-3 text-center font-semibold text-slate-700">Result</th>
                      <th className="p-3 text-center font-semibold text-slate-700">Defect Type</th>
                      <th className="p-3 text-center font-semibold text-slate-700">View</th>
                      <th className="p-3 text-center font-semibold text-slate-700">Image</th>
                      <th className="p-3 text-center font-semibold text-slate-700">Location</th>
                      <th className="p-3 text-center font-semibold text-slate-700">Camera</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredScans.map((scan) => {
                      const img = getImageUrl(scan);

                      return (
                        <tr
                          key={scan.id}
                          onClick={() => setSelectedScan(scan)}
                          className="cursor-pointer border-t text-center transition hover:bg-blue-50/60"
                        >
                          <td className="p-3">{formatDateTime(scan.timestamp)}</td>

                          <td className="p-3">
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                                scan.result === "OK"
                                  ? "bg-green-100 text-green-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {scan.result}
                            </span>
                          </td>

                          <td className="p-3">{scan.defect_type || "None"}</td>

                          <td className="p-3 capitalize">
                            {scan?.image_data?.view_type || "-"}
                          </td>

                          <td className="p-3">
                            {img ? (
                              <button
                                className="rounded-md bg-blue-500 px-3 py-1 text-white hover:bg-blue-600"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedScan(scan);
                                }}
                              >
                                View
                              </button>
                            ) : (
                              "No Image"
                            )}
                          </td>

                          <td className="p-3">{scan?.image_data?.factory_location || "-"}</td>
                          <td className="p-3">{scan?.image_data?.camera || "-"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal scan={selectedScan} onClose={() => setSelectedScan(null)} />
    </>
  );
}