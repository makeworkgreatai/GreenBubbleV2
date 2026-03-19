"use client";

import { useState, useRef } from "react";

interface FileResult {
  name: string;
  type: string;
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
}

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  polls_elec: { label: "Locations + Coords + Precincts", color: "bg-blue-100 text-blue-700" },
  vlm_combo: { label: "Locations + Contacts + Phones", color: "bg-emerald-100 text-emerald-700" },
  poll_locations: { label: "Locations + Zones", color: "bg-blue-100 text-blue-700" },
  precincts_list: { label: "Precincts (detailed)", color: "bg-indigo-100 text-indigo-700" },
  contacts: { label: "VLM Contacts + Phones", color: "bg-teal-100 text-teal-700" },
  sms_phones: { label: "SMS Phone Assignments", color: "bg-pink-100 text-pink-700" },
  accounts: { label: "Legacy Accounts", color: "bg-purple-100 text-purple-700" },
  unknown: { label: "Unknown format", color: "bg-red-100 text-red-700" },
};

export default function ImportPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [results, setResults] = useState<FileResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFiles(fileList: FileList | null) {
    if (!fileList) return;
    setFiles(Array.from(fileList));
    setResults(null);
    setError("");
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setResults(null);
  }

  async function handleImport() {
    if (files.length === 0) return;
    setError("");
    setResults(null);
    setLoading(true);

    try {
      const formData = new FormData();
      files.forEach((f) => formData.append("files", f));

      const res = await fetch("/api/admin/import", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Import failed");
        return;
      }

      setResults(data.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed — check your files");
    } finally {
      setLoading(false);
    }
  }

  const totalCreated = results?.reduce((s, r) => s + r.created, 0) || 0;
  const totalUpdated = results?.reduce((s, r) => s + r.updated, 0) || 0;
  const totalSkipped = results?.reduce((s, r) => s + r.skipped, 0) || 0;
  const totalErrors = results?.reduce((s, r) => s + r.errors.length, 0) || 0;

  return (
    <main className="max-w-3xl mx-auto p-6 h-screen overflow-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black">Import Data</h1>
          <p className="text-sm text-gray-500">Drop your files — we'll figure out what's what</p>
        </div>
        <a href="/" className="px-4 py-2 rounded-md border text-sm font-bold hover:bg-gray-100">Back to Dashboard</a>
      </div>

      {/* Drop zone */}
      <label
        className="block mb-4 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-gray-400 hover:bg-gray-50 transition-colors"
        onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("border-emerald-400", "bg-emerald-50"); }}
        onDragLeave={(e) => { e.currentTarget.classList.remove("border-emerald-400", "bg-emerald-50"); }}
        onDrop={(e) => { e.preventDefault(); e.currentTarget.classList.remove("border-emerald-400", "bg-emerald-50"); handleFiles(e.dataTransfer.files); }}
      >
        <svg className="w-10 h-10 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <div className="text-sm font-bold text-gray-700">Drop files here or click to browse</div>
        <div className="text-xs text-gray-500 mt-1">CSV, XLSX — upload all your GIS files at once</div>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.xlsx,.xls,.tab"
          multiple
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
        />
      </label>

      {/* File list */}
      {files.length > 0 && (
        <div className="mb-4 space-y-2">
          {files.map((f, i) => (
            <div key={i} className="flex items-center justify-between px-3 py-2 rounded-md border bg-white">
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono font-bold">{f.name}</span>
                <span className="text-xs text-gray-500">({(f.size / 1024).toFixed(1)} KB)</span>
              </div>
              <button onClick={() => removeFile(i)} className="text-xs text-red-500 hover:text-red-700 font-bold">Remove</button>
            </div>
          ))}
          <button
            onClick={handleImport}
            disabled={loading}
            className="w-full h-11 rounded-lg bg-gray-900 text-white text-sm font-bold hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? "Importing..." : `Import ${files.length} file${files.length > 1 ? "s" : ""}`}
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm font-medium">{error}</div>
      )}

      {/* Results */}
      {results && (
        <div className="rounded-lg border p-4">
          <h2 className="font-bold text-lg mb-3">Import Complete</h2>

          {/* Totals */}
          <div className="grid grid-cols-4 gap-3 mb-4">
            <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-center">
              <div className="text-2xl font-black text-green-700">{totalCreated}</div>
              <div className="text-xs font-bold text-green-600">Created</div>
            </div>
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-center">
              <div className="text-2xl font-black text-blue-700">{totalUpdated}</div>
              <div className="text-xs font-bold text-blue-600">Updated</div>
            </div>
            <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 text-center">
              <div className="text-2xl font-black text-gray-500">{totalSkipped}</div>
              <div className="text-xs font-bold text-gray-500">Skipped</div>
            </div>
            <div className={`rounded-lg p-3 text-center ${totalErrors > 0 ? "bg-red-50 border border-red-200" : "bg-gray-50 border border-gray-200"}`}>
              <div className={`text-2xl font-black ${totalErrors > 0 ? "text-red-600" : "text-gray-400"}`}>{totalErrors}</div>
              <div className={`text-xs font-bold ${totalErrors > 0 ? "text-red-500" : "text-gray-400"}`}>Errors</div>
            </div>
          </div>

          {/* Per-file breakdown */}
          <div className="space-y-3">
            {results.map((r, i) => {
              const typeInfo = TYPE_LABELS[r.type] || TYPE_LABELS.unknown;
              return (
                <div key={i} className="rounded-md border p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono font-bold text-sm">{r.name}</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${typeInfo.color}`}>{typeInfo.label}</span>
                  </div>
                  <div className="flex gap-4 text-xs">
                    <span className="text-green-700 font-bold">{r.created} created</span>
                    <span className="text-blue-700 font-bold">{r.updated} updated</span>
                    <span className="text-gray-500">{r.skipped} skipped</span>
                  </div>
                  {r.errors.length > 0 && (
                    <details className="mt-2">
                      <summary className="text-xs text-red-600 font-bold cursor-pointer">{r.errors.length} errors</summary>
                      <div className="mt-1 max-h-32 overflow-auto rounded bg-red-50 p-2 text-xs font-mono space-y-0.5">
                        {r.errors.map((err, j) => <div key={j} className="text-red-700">{err}</div>)}
                      </div>
                    </details>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Help */}
      <div className="mt-8 rounded-lg border bg-gray-50 p-4">
        <h3 className="font-bold text-sm mb-2">Supported Files</h3>
        <div className="text-sm text-gray-700 space-y-1">
          <div><span className="font-bold text-blue-700">Polls_Elec.csv</span> — Locations with lat/lng, city, and precincts</div>
          <div><span className="font-bold text-blue-700">Poll_Locations.csv</span> — Locations with zones</div>
          <div><span className="font-bold text-emerald-700">VLM Phone List</span> (.csv or .xlsx) — Locations + contacts + all phones in one file</div>
          <div><span className="font-bold text-indigo-700">Precincts_List.csv</span> — Detailed precinct-to-location mapping</div>
          <div><span className="font-bold text-pink-700">SMS Phones</span> (.csv) — Assign cell phones to locations (columns: poll_id, phone)</div>
          <div><span className="font-bold text-purple-700">Legacy Logins Sheet</span> (.csv or .xlsx) — Username/password migration</div>
        </div>
        <p className="text-xs text-gray-500 mt-3">Files are auto-detected by their column headers and processed in the right order. Duplicates are skipped or updated.</p>
      </div>
    </main>
  );
}
