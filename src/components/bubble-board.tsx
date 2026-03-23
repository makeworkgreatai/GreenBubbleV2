"use client";

import React, { useState, useRef } from "react";

interface Milestone {
  id: number;
  key: string;
  label: string;
  displayOrder: number;
}

interface Status {
  id: number;
  locationId: number;
  milestoneId: number;
  value: boolean;
  updatedBy: number | null;
  updatedAt: string;
  updatedByUser: { displayName: string } | null;
}

interface Location {
  id: number;
  pollId: string | null;
  smsPhone: string | null;
  name: string;
  address: string;
  city: string;
  zoneId: number;
  zone: { id: number; number: number; name: string };
  statuses: Status[];
  precincts: { label: string }[];
  contacts: { id: number; name: string; title: string; phones: { label: string; number: string }[] }[];
}

interface Props {
  locations: Location[];
  milestones: Milestone[];
  canEdit: boolean;
  userRole: string;
  userZoneId: number | null;
  onToggle: (locationId: number, milestoneId: number) => void;
  sortCol: string;
  sortDir: "asc" | "desc";
  onSort: (col: string) => void;
  editMode: boolean;
  onEditField: (locationId: number, field: string, value: string, index?: number) => void;
  onAddItem: (locationId: number, field: string) => void;
  onAddRow: () => void;
  onDeleteRow: (locationId: number) => void;
  nightMode?: boolean;
}

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits[0] === "1") {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return raw;
}

function phoneAbbrev(label: string): string {
  const map: Record<string, string> = {
    "VLM Cell": "VLM",
    "BOE Cell": "BOE",
    "Landline": "LND",
    "IS Phone": "IS",
    "Election Day": "ELC",
    "Personal": "PER",
    "Office": "OFC",
  };
  return map[label] || label.slice(0, 3).toUpperCase();
}

function abbreviate(label: string): string {
  const abbrevMap: Record<string, string> = {
    "Monday Delivery": "Mon Del",
    "Monday Arrival": "Mon Arr",
    "Monday Close": "Mon Close",
    "Building Open": "Bldg Open",
    "Tuesday Arrival": "Tue Arr",
    "Open Ready": "Open Rdy",
    "Close Poll Ready": "Close Poll",
  };
  return abbrevMap[label] || label;
}

function milestoneHeader(label: string): { day: string; action: string } {
  const map: Record<string, { day: string; action: string }> = {
    "Monday Delivery": { day: "Mon", action: "Delivery" },
    "Monday Arrival": { day: "Mon", action: "Staff Arrived" },
    "Monday Close": { day: "Mon", action: "Bldg Closed" },
    "Building Open": { day: "Tue", action: "Bldg Open" },
    "Tuesday Arrival": { day: "Tue", action: "Staff Arrived" },
    "Open Ready": { day: "Tue", action: "Polls Open" },
    "Close Poll Ready": { day: "Tue", action: "Polls Closed" },
  };
  return map[label] || { day: "", action: label };
}

function dayGroupBorder(milestones: { label: string }[], idx: number): string {
  const days = milestones.map((m) => milestoneHeader(m.label).day);
  const day = days[idx];
  const isFirst = idx === 0 || days[idx - 1] !== day;
  const isLast = idx === days.length - 1 || days[idx + 1] !== day;
  let cls = "";
  if (isFirst) cls += " border-l-2 border-l-black/50";
  if (isLast) cls += " border-r-2 border-r-black/50";
  return cls;
}

function bubbleCode(label: string): string {
  const codeMap: Record<string, string> = {
    "Monday Delivery": "MD",
    "Monday Arrival": "MA",
    "Monday Close": "MC",
    "Building Open": "TO",
    "Tuesday Arrival": "TA",
    "Open Ready": "TR",
    "Close Poll Ready": "TC",
  };
  return codeMap[label] || label.slice(0, 2).toUpperCase();
}

const ZONE_COLORS: Record<number, string> = {
  1: "bg-gradient-to-b from-blue-400 to-blue-600 text-white border-blue-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_1px_3px_rgba(0,0,0,0.2)]",
  2: "bg-gradient-to-b from-emerald-400 to-emerald-600 text-white border-emerald-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_1px_3px_rgba(0,0,0,0.2)]",
  3: "bg-gradient-to-b from-purple-400 to-purple-600 text-white border-purple-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_1px_3px_rgba(0,0,0,0.2)]",
  4: "bg-gradient-to-b from-amber-400 to-amber-600 text-white border-amber-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_1px_3px_rgba(0,0,0,0.2)]",
  5: "bg-gradient-to-b from-rose-400 to-rose-600 text-white border-rose-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_1px_3px_rgba(0,0,0,0.2)]",
  6: "bg-gradient-to-b from-cyan-400 to-cyan-600 text-white border-cyan-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_1px_3px_rgba(0,0,0,0.2)]",
};

function progressColor(pct: number): string {
  if (pct === 100) return "text-green-700 font-bold";
  if (pct >= 50) return "text-amber-700 font-bold";
  return "text-red-700 font-bold";
}

function dayBgClass(label: string): string {
  const h = milestoneHeader(label);
  return h.day === "Mon" ? "bg-white" : "bg-gray-200";
}

function dayBgClassHeader(label: string): string {
  const h = milestoneHeader(label);
  return h.day === "Mon" ? "bg-sky-300" : "bg-amber-300";
}

function canUserEditZone(
  userRole: string,
  userZoneId: number | null,
  targetZoneId: number
): boolean {
  if (userRole === "VIEWER") return false;
  if (userRole === "ZONE_CAPTAIN") return userZoneId === targetZoneId;
  return true;
}

function EyeIcon({ open }: { open: boolean }) {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      {open ? (
        <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
      ) : (
        <><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></>
      )}
    </svg>
  );
}

function EyeButton({ label, show, onToggle }: { label: string; show: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
      className="absolute bottom-1 right-1 text-black hover:text-black transition-colors"
      title={show ? `Hide ${label}` : `Show ${label}`}
    >
      <EyeIcon open={show} />
    </button>
  );
}

function EditableCell({
  value,
  onSave,
  className = "",
  allowEmpty = true,
}: {
  value: string;
  onSave: (newValue: string) => void;
  className?: string;
  allowEmpty?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  function startEdit() {
    setDraft(value);
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function save() {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed !== value) {
      if (trimmed || allowEmpty) {
        onSave(trimmed);
      }
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") save();
    if (e.key === "Escape") setEditing(false);
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={handleKeyDown}
        placeholder={allowEmpty ? "Clear to delete" : ""}
        className={`w-full bg-yellow-50 border border-yellow-400 rounded px-1 py-0.5 outline-none focus:ring-2 focus:ring-yellow-400 ${className}`}
      />
    );
  }

  return (
    <span
      onClick={startEdit}
      className={`cursor-pointer hover:bg-yellow-100 rounded px-0.5 -mx-0.5 ${className}`}
      title="Click to edit"
    >
      {value || "—"}
    </span>
  );
}

function SortArrow({ col, sortCol, sortDir }: { col: string; sortCol: string; sortDir: string }) {
  if (col !== sortCol) return <span className="text-black ml-1">↕</span>;
  return <span className="ml-1">{sortDir === "asc" ? "↑" : "↓"}</span>;
}

export function BubbleBoard({
  locations,
  milestones,
  canEdit,
  userRole,
  userZoneId,
  onToggle,
  sortCol,
  sortDir,
  onSort,
  editMode,
  onEditField,
  onAddItem,
  onAddRow,
  onDeleteRow,
  nightMode,
}: Props) {
  const [showPoll, setShowPoll] = useState(true);
  const [showLocation, setShowLocation] = useState(true);
  const [showZone, setShowZone] = useState(true);
  const [showCity, setShowCity] = useState(true);
  const [showContact, setShowContact] = useState(true);
  const [showMon, setShowMon] = useState(true);
  const [showTue, setShowTue] = useState(true);

  const monMilestones = milestones.filter((m) => milestoneHeader(m.label).day === "Mon");
  const tueMilestones = milestones.filter((m) => milestoneHeader(m.label).day === "Tue");
  const monCount = monMilestones.length;
  const tueCount = tueMilestones.length;

  const visibleMilestones = milestones.filter((m) => {
    const day = milestoneHeader(m.label).day;
    return (day === "Mon" && showMon) || (day === "Tue" && showTue);
  });

  const summaries = milestones.map((m) => {
    const total = locations.length;
    const done = locations.filter((loc) =>
      loc.statuses.some((s) => s.milestoneId === m.id && s.value)
    ).length;
    return { milestoneId: m.id, done, total };
  });

  const [mobileSearch, setMobileSearch] = useState("");

  const mobileFiltered = mobileSearch.trim()
    ? locations.filter((loc) => {
        const q = mobileSearch.toLowerCase();
        return loc.name.toLowerCase().includes(q) || loc.address.toLowerCase().includes(q) || loc.city.toLowerCase().includes(q) || (loc.pollId || "").includes(q);
      })
    : locations;

  return (
    <div className={nightMode ? "night-mode" : ""}>
      {/* Mobile card view */}
      <div className="md:hidden flex flex-col h-[calc(100dvh-90px)]">
        <div className="px-3 py-2 border-b bg-gray-50">
          <input
            type="text"
            placeholder="Search locations..."
            value={mobileSearch}
            onChange={(e) => setMobileSearch(e.target.value)}
            className="w-full h-10 rounded-lg border-2 border-gray-200 bg-white px-3 text-sm font-medium focus:border-emerald-500 focus-visible:outline-none"
          />
          <div className="text-xs text-gray-500 mt-1">{mobileFiltered.length} location{mobileFiltered.length !== 1 ? "s" : ""}</div>
        </div>
        <div className="flex-1 overflow-auto px-3 py-2 space-y-2">
          {mobileFiltered.map((loc) => {
            const allDone = milestones.every((m) => loc.statuses.some((s) => s.milestoneId === m.id && s.value));
            const contact = loc.contacts[0];
            return (
              <MobileLocationCard
                key={loc.id}
                location={loc}
                milestones={milestones}
                allDone={allDone}
                contact={contact}
                canEdit={canEdit && !editMode}
                userRole={userRole}
                userZoneId={userZoneId}
                onToggle={onToggle}
              />
            );
          })}
          {mobileFiltered.length === 0 && (
            <div className="text-center text-gray-500 text-sm py-8">No locations found</div>
          )}
        </div>
      </div>
      {/* Desktop table view */}
      <div className={`hidden md:block overflow-auto max-h-[calc(100dvh-90px)] border-t-4 ${editMode ? "border-yellow-400" : "border-gray-400"}`}>
      <table className="w-full border-collapse [&_th]:border-r [&_th]:border-black/50 [&_td]:border-r [&_td]:border-black/50 [&_th:last-child]:border-r-0 [&_td:last-child]:border-r-0 [&_th]:shadow-[inset_0_3px_1px_rgba(255,255,255,0.5),inset_0_-3px_1px_rgba(0,0,0,0.2)]">
        <thead className="sticky -top-px z-10 shadow-[0_3px_6px_rgba(0,0,0,0.2)] will-change-transform [transform:translateZ(0)]">
          {/* Column headers */}
          <tr className="border-b-2 border-black/50 text-black">
            {editMode && <th className="w-8 bg-red-200"></th>}
            {showPoll ? (
              <th
                onClick={() => onSort("pollId")}
                className="relative text-center py-3 px-2 text-sm font-bold cursor-pointer hover:bg-violet-400 hover:text-white select-none whitespace-nowrap w-16 align-top bg-violet-300"
              >
                Poll ID <SortArrow col="pollId" sortCol={sortCol} sortDir={sortDir} />
                <span className="block text-xs font-normal text-transparent">—</span>
                <EyeButton label="Poll ID" show={showPoll} onToggle={() => setShowPoll(false)} />
              </th>
            ) : (
              <th className="bg-violet-300 w-6 cursor-pointer hover:bg-violet-400" onClick={() => setShowPoll(true)} title="Show Poll ID">
                <div className="flex items-center justify-center h-full"><EyeIcon open={false} /></div>
              </th>
            )}
            {showLocation ? (
              <th
                onClick={() => onSort("name")}
                className="relative text-left py-3 px-3 text-sm font-bold cursor-pointer hover:bg-rose-400 hover:text-white select-none whitespace-nowrap align-top bg-rose-300"
              >
                Location <SortArrow col="name" sortCol={sortCol} sortDir={sortDir} />
                <span className="block text-xs font-normal text-black">Address</span>
                <EyeButton label="Location" show={showLocation} onToggle={() => setShowLocation(false)} />
              </th>
            ) : (
              <th className="bg-rose-300 w-6 cursor-pointer hover:bg-rose-400" onClick={() => setShowLocation(true)} title="Show Location">
                <div className="flex items-center justify-center h-full"><EyeIcon open={false} /></div>
              </th>
            )}
            {showZone ? (
              <th
                onClick={() => onSort("zone")}
                className="relative text-center py-3 px-2 text-sm font-bold cursor-pointer hover:bg-teal-400 hover:text-white select-none whitespace-nowrap w-14 align-top bg-teal-300"
              >
                Zone <SortArrow col="zone" sortCol={sortCol} sortDir={sortDir} />
                <span className="block text-xs font-normal text-transparent">—</span>
                <EyeButton label="Zone" show={showZone} onToggle={() => setShowZone(false)} />
              </th>
            ) : (
              <th className="bg-teal-300 w-6 cursor-pointer hover:bg-teal-400" onClick={() => setShowZone(true)} title="Show Zone">
                <div className="flex items-center justify-center h-full"><EyeIcon open={false} /></div>
              </th>
            )}
            {showCity ? (
              <th
                onClick={() => onSort("city")}
                className="relative text-left py-3 px-3 text-sm font-bold cursor-pointer hover:bg-orange-400 hover:text-white select-none whitespace-nowrap align-top bg-orange-300"
              >
                City <SortArrow col="city" sortCol={sortCol} sortDir={sortDir} />
                <span className="block text-xs font-normal text-black">Precincts</span>
                <EyeButton label="City" show={showCity} onToggle={() => setShowCity(false)} />
              </th>
            ) : (
              <th className="bg-orange-300 w-6 cursor-pointer hover:bg-orange-400" onClick={() => setShowCity(true)} title="Show City">
                <div className="flex items-center justify-center h-full"><EyeIcon open={false} /></div>
              </th>
            )}
            {showContact ? (
              <th
                onClick={() => onSort("contact")}
                className="relative text-left py-3 px-3 text-sm whitespace-nowrap align-top bg-fuchsia-300 cursor-pointer hover:bg-fuchsia-400 hover:text-white select-none"
              >
                <span className="font-bold">Contact</span> <SortArrow col="contact" sortCol={sortCol} sortDir={sortDir} />
                <span className="block text-xs font-normal text-black">Number</span>
                <EyeButton label="Contact" show={showContact} onToggle={() => setShowContact(false)} />
              </th>
            ) : (
              <th className="bg-fuchsia-300 w-6 cursor-pointer hover:bg-fuchsia-400" onClick={() => setShowContact(true)} title="Show Contact">
                <div className="flex items-center justify-center h-full"><EyeIcon open={false} /></div>
              </th>
            )}
            {showMon ? (
              monMilestones.map((m, mIdx) => {
                const idx = visibleMilestones.findIndex((vm) => vm.id === m.id);
                const h = milestoneHeader(m.label);
                const s = summaries.find((x) => x.milestoneId === m.id)!;
                const pct = s.total > 0 ? Math.round((s.done / s.total) * 100) : 0;
                const countColor = pct === 100 ? "text-green-700" : pct >= 50 ? "text-amber-700" : "text-red-700";
                const isFirst = mIdx === 0;
                const isLast = m.id === monMilestones[monMilestones.length - 1].id;
                return (
                  <th
                    key={m.id}
                    onClick={() => onSort("monDone")}
                    className={`relative py-2 px-2 text-center font-bold w-22  cursor-pointer select-none hover:bg-sky-400 hover:text-white ${dayBgClassHeader(m.label)}${dayGroupBorder(visibleMilestones, idx)}`}
                    title={m.label}
                  >
                    <span className="text-sm leading-tight block font-black">
                      {h.day}{isFirst && <SortArrow col="monDone" sortCol={sortCol} sortDir={sortDir} />}
                    </span>
                    <span className="text-xs leading-tight block font-semibold text-black">
                      {h.action}
                    </span>
                    <span className={`text-xs leading-tight block font-bold ${countColor}`}>
                      {s.done}/{s.total}
                    </span>
                    {isLast && <EyeButton label="Monday" show={showMon} onToggle={() => setShowMon(false)} />}
                  </th>
                );
              })
            ) : (
              <th className="bg-sky-300 w-6 cursor-pointer hover:bg-sky-400" onClick={() => setShowMon(true)} title="Show Monday">
                <div className="flex flex-col items-center justify-center h-full"><span className="text-[9px] font-bold text-black">M</span><EyeIcon open={false} /></div>
              </th>
            )}
            {showTue ? (
              tueMilestones.map((m, mIdx) => {
                const idx = visibleMilestones.findIndex((vm) => vm.id === m.id);
                const h = milestoneHeader(m.label);
                const s = summaries.find((x) => x.milestoneId === m.id)!;
                const pct = s.total > 0 ? Math.round((s.done / s.total) * 100) : 0;
                const countColor = pct === 100 ? "text-green-700" : pct >= 50 ? "text-amber-700" : "text-red-700";
                const isFirst = mIdx === 0;
                const isLast = m.id === tueMilestones[tueMilestones.length - 1].id;
                return (
                  <th
                    key={m.id}
                    onClick={() => onSort("tueDone")}
                    className={`relative py-2 px-2 text-center font-bold w-22  cursor-pointer select-none hover:bg-amber-400 hover:text-white ${dayBgClassHeader(m.label)}${dayGroupBorder(visibleMilestones, idx)}`}
                    title={m.label}
                  >
                    <span className="text-sm leading-tight block font-black">
                      {h.day}{isFirst && <SortArrow col="tueDone" sortCol={sortCol} sortDir={sortDir} />}
                    </span>
                    <span className="text-xs leading-tight block font-semibold text-black">
                      {h.action}
                    </span>
                    <span className={`text-xs leading-tight block font-bold ${countColor}`}>
                      {s.done}/{s.total}
                    </span>
                    {isLast && <EyeButton label="Tuesday" show={showTue} onToggle={() => setShowTue(false)} />}
                  </th>
                );
              })
            ) : (
              <th className="bg-amber-300 w-6 cursor-pointer hover:bg-amber-400" onClick={() => setShowTue(true)} title="Show Tuesday">
                <div className="flex flex-col items-center justify-center h-full"><span className="text-[9px] font-bold text-black">T</span><EyeIcon open={false} /></div>
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {locations.map((loc) => (
            <LocationRow
              key={loc.id}
              location={loc}
              milestones={visibleMilestones}
              allMilestones={milestones}
              canEdit={canEdit && canUserEditZone(userRole, userZoneId, loc.zoneId)}
              onToggle={onToggle}
              showCols={{ poll: showPoll, location: showLocation, zone: showZone, city: showCity, contact: showContact, mon: showMon, tue: showTue }}
              editMode={editMode}
              onEditField={onEditField}
              onAddItem={onAddItem}
              onDeleteRow={onDeleteRow}
            />
          ))}
          {locations.length === 0 && (
            <tr>
              <td
                colSpan={5 + (!showMon ? 1 : monMilestones.length) + (!showTue ? 1 : tueMilestones.length)}
                className="py-8 text-center text-black text-lg font-medium"
              >
                No locations found
              </td>
            </tr>
          )}
          {editMode && (
            <tr className="border-b border-black/50">
              <td
                colSpan={5 + (!showMon ? 1 : monMilestones.length) + (!showTue ? 1 : tueMilestones.length)}
                className="py-2 px-3 text-center"
              >
                <button
                  onClick={onAddRow}
                  className="px-4 py-1.5 rounded-md bg-green-600 text-white text-sm font-bold hover:bg-green-700"
                >
                  + Add Location Row
                </button>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
    </div>
  );
}

function MobileLocationCard({
  location,
  milestones,
  allDone,
  contact,
  canEdit,
  userRole,
  userZoneId,
  onToggle,
}: {
  location: Location;
  milestones: Milestone[];
  allDone: boolean;
  contact: Location["contacts"][0] | undefined;
  canEdit: boolean;
  userRole: string;
  userZoneId: number | null;
  onToggle: (locationId: number, milestoneId: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const doneCount = milestones.filter((m) => location.statuses.some((s) => s.milestoneId === m.id && s.value)).length;
  const canEditThis = canEdit && canUserEditZone(userRole, userZoneId, location.zoneId);

  return (
    <div className={`rounded-xl border-2 overflow-hidden transition-colors ${allDone ? "border-green-400 bg-green-50" : "border-gray-200 bg-white"}`}>
      {/* Header — always visible */}
      <div className="px-3 py-2.5 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="font-black text-sm truncate">{location.name}</div>
            <div className="text-xs text-gray-500 truncate">{location.address}{location.city ? `, ${location.city}` : ""}</div>
          </div>
          <div className="flex items-center gap-2 ml-2 shrink-0">
            <span className="text-xs font-bold text-gray-500">{doneCount}/{milestones.length}</span>
            <span className={`text-xs ${expanded ? "rotate-180" : ""} transition-transform`}>▼</span>
          </div>
        </div>
        {/* Mini bubble row */}
        <div className="flex gap-1.5 mt-2">
          {milestones.map((m) => {
            const status = location.statuses.find((s) => s.milestoneId === m.id);
            const done = status?.value ?? false;
            return (
              <div
                key={m.id}
                className={`flex-1 h-2 rounded-full ${done ? "bg-green-500" : "bg-red-300"}`}
                title={`${m.label}: ${done ? "Done" : "Not done"}`}
              />
            );
          })}
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-3 pb-3 border-t border-gray-100">
          {/* Info row */}
          <div className="flex gap-3 text-xs text-gray-600 py-2">
            {location.pollId && <span className="font-mono">{location.pollId}</span>}
            <span className="font-bold">{location.zone.name}</span>
            {contact && <span>{contact.name}</span>}
          </div>
          {/* Contact phones */}
          {contact && contact.phones.length > 0 && (
            <div className="mb-2 space-y-0.5">
              {(contact.phones as { label: string; number: string }[]).map((p, i) => (
                <a key={i} href={`tel:${p.number.replace(/\D/g, "")}`} className="flex items-center gap-2 text-xs text-blue-600 hover:underline">
                  <span>{formatPhone(p.number)}</span>
                  <span className="text-gray-400">{p.label}</span>
                </a>
              ))}
            </div>
          )}
          {/* Full-size bubbles */}
          <div className="grid grid-cols-4 gap-2">
            {milestones.map((m) => {
              const status = location.statuses.find((s) => s.milestoneId === m.id);
              const done = status?.value ?? false;
              const code = bubbleCode(m.label);
              return (
                <button
                  key={m.id}
                  disabled={!canEditThis}
                  onClick={() => onToggle(location.id, m.id)}
                  className={`flex flex-col items-center gap-1 rounded-lg p-2 border-2 transition-all ${
                    done
                      ? "border-green-500 bg-green-50"
                      : "border-red-300 bg-red-50"
                  } ${canEditThis ? "active:scale-95" : "opacity-80"}`}
                >
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-black ${
                    done
                      ? "bg-gradient-to-b from-green-300 to-green-700 text-white border-2 border-green-800"
                      : "bg-gradient-to-b from-white to-gray-200 text-red-600 border-2 border-red-500"
                  }`}>
                    {done ? "✓" : code}
                  </div>
                  <span className="text-[10px] font-bold text-gray-700 leading-tight text-center">{milestoneHeader(m.label).action}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function LocationRow({
  location,
  milestones,
  allMilestones,
  canEdit,
  onToggle,
  showCols,
  editMode,
  onEditField,
  onAddItem,
  onDeleteRow,
}: {
  location: Location;
  milestones: Milestone[];
  allMilestones: Milestone[];
  canEdit: boolean;
  onToggle: (locationId: number, milestoneId: number) => void;
  showCols: { poll: boolean; location: boolean; zone: boolean; city: boolean; contact: boolean; mon: boolean; tue: boolean };
  editMode: boolean;
  onEditField: (locationId: number, field: string, value: string, index?: number) => void;
  onAddItem: (locationId: number, field: string) => void;
  onDeleteRow: (locationId: number) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const precinctStr = location.precincts.map((p) => p.label).join(", ");
  const contact = location.contacts[0];

  const monMilestones = allMilestones.filter((m) => milestoneHeader(m.label).day === "Mon");
  const tueMilestones = allMilestones.filter((m) => milestoneHeader(m.label).day === "Tue");
  const monDone = monMilestones.every((m) =>
    location.statuses.some((s) => s.milestoneId === m.id && s.value)
  );
  const tueDone = tueMilestones.every((m) =>
    location.statuses.some((s) => s.milestoneId === m.id && s.value)
  );
  const allDone = monDone && tueDone;

  const dataCellHover = hovered && !allDone ? "bg-blue-200" : "";
  const rowBg = allDone ? "bg-green-200" : "even:bg-gray-200/60 odd:bg-white";

  return (
    <tr
      className={`border-b border-black/50 ${rowBg}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {editMode && (
        <td className="py-2 px-1 text-center align-middle w-8">
          <button
            onClick={() => { if (confirm(`Delete "${location.name}"?`)) onDeleteRow(location.id); }}
            className="w-6 h-6 rounded-full bg-red-500 text-white text-xs font-bold hover:bg-red-700 flex items-center justify-center mx-auto"
            title="Delete row"
          >✕</button>
        </td>
      )}
      {showCols.poll ? (
        <td className={`py-2 px-3 text-center align-middle font-mono text-[16px] font-bold text-black/85 ${dataCellHover}`}>
          {editMode ? (
            <EditableCell
              value={location.pollId || ""}
              onSave={(v) => onEditField(location.id, "pollId", v)}
              className="font-mono text-[16px] font-bold text-center"
            />
          ) : (
            location.pollId || "—"
          )}
        </td>
      ) : <td className="w-6" />}
      {showCols.location ? (
        <td className={`py-2 px-3 text-left align-middle ${dataCellHover}`}>
          {editMode ? (
            <>
              <EditableCell
                value={location.name}
                onSave={(v) => onEditField(location.id, "name", v)}
                className="font-bold text-[16px] text-black"
                allowEmpty={false}
              />
              <EditableCell
                value={location.address}
                onSave={(v) => onEditField(location.id, "address", v)}
                className="text-[13px] font-medium text-black/75"
                allowEmpty={false}
              />
            </>
          ) : (
            <>
              <div className="font-bold text-[16px] text-black leading-snug">{location.name}</div>
              <div className="text-[13px] font-medium text-black/75 leading-snug">{location.address}</div>
            </>
          )}
        </td>
      ) : <td className="w-6" />}
      {showCols.zone ? (
        <td className={`py-2 px-2 text-center align-middle ${dataCellHover}`}>
          <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-[13px] font-black border-2 ${ZONE_COLORS[location.zone.number] || "bg-gray-100 text-black border-gray-300"}`}>
            {location.zone.number}
          </span>
        </td>
      ) : <td className="w-6" />}
      {showCols.city ? (
        <td className={`py-2 px-3 text-left align-middle ${dataCellHover}`}>
          {editMode ? (
            <>
              <EditableCell
                value={location.city}
                onSave={(v) => onEditField(location.id, "city", v)}
                className="font-bold text-[16px] text-black"
                allowEmpty={false}
              />
              <div className="flex flex-wrap gap-x-1 items-center">
                {location.precincts.map((p, i) => (
                  <EditableCell
                    key={i}
                    value={p.label}
                    onSave={(v) => onEditField(location.id, "precinctLabel", v, i)}
                    className="text-[13px] font-medium text-black/75"
                  />
                ))}
                <button
                  onClick={() => onAddItem(location.id, "precinct")}
                  className="w-5 h-5 rounded-full bg-green-500 text-white text-xs font-bold hover:bg-green-600 flex items-center justify-center"
                  title="Add precinct"
                >+</button>
              </div>
            </>
          ) : (
            <>
              <div className="font-bold text-[16px] text-black leading-snug">{location.city}</div>
              <div className="text-[13px] font-medium text-black/75 leading-snug">{precinctStr || "—"}</div>
            </>
          )}
        </td>
      ) : <td className="w-6" />}
      {showCols.contact ? <ContactCell contact={contact} hovered={dataCellHover} editMode={editMode} locationId={location.id} onEditField={onEditField} onAddItem={onAddItem} smsPhone={location.smsPhone} /> : <td className="w-6" />}
      {showCols.mon ? (
        milestones.filter((m) => milestoneHeader(m.label).day === "Mon").map((m, idx) => {
          const status = location.statuses.find((s) => s.milestoneId === m.id);
          const cellBg = monDone ? "" : "";
          const allVisIdx = milestones.indexOf(m);
          return (
            <td
              key={m.id}
              className={`py-2.5 px-2 text-center ${cellBg}${dayGroupBorder(milestones, allVisIdx)} ${canEdit ? "cursor-pointer group/cell active:scale-95" : ""}`}
              onClick={canEdit ? () => onToggle(location.id, m.id) : undefined}
            >
              <StatusBubble
                status={status}
                canEdit={canEdit}
                onClick={() => onToggle(location.id, m.id)}
                locationName={location.name}
                code={bubbleCode(m.label)}
                milestoneLabel={m.label}
                alignRight={allVisIdx >= milestones.length - 3}
              />
            </td>
          );
        })
      ) : <td className="w-6" />}
      {showCols.tue ? (
        milestones.filter((m) => milestoneHeader(m.label).day === "Tue").map((m, idx) => {
          const status = location.statuses.find((s) => s.milestoneId === m.id);
          const cellBg = tueDone ? "" : "";
          const allVisIdx = milestones.indexOf(m);
          return (
            <td
              key={m.id}
              className={`py-2.5 px-2 text-center ${cellBg}${dayGroupBorder(milestones, allVisIdx)} ${canEdit ? "cursor-pointer group/cell active:scale-95" : ""}`}
              onClick={canEdit ? () => onToggle(location.id, m.id) : undefined}
            >
              <StatusBubble
                status={status}
                canEdit={canEdit}
                onClick={() => onToggle(location.id, m.id)}
                locationName={location.name}
                code={bubbleCode(m.label)}
                milestoneLabel={m.label}
                alignRight={allVisIdx >= milestones.length - 3}
              />
            </td>
          );
        })
      ) : <td className="w-6" />}
    </tr>
  );
}

function ContactCell({
  contact,
  hovered,
  editMode,
  locationId,
  onEditField,
  onAddItem,
  smsPhone,
}: {
  contact: { name: string; phones: { label: string; number: string }[] } | undefined;
  hovered: string;
  editMode: boolean;
  locationId: number;
  onEditField: (locationId: number, field: string, value: string, index?: number) => void;
  onAddItem: (locationId: number, field: string) => void;
  smsPhone?: string | null;
}) {
  const [showAll, setShowAll] = useState(false);
  const hideTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleEnter() {
    if (hideTimeout.current) clearTimeout(hideTimeout.current);
    setShowAll(true);
  }
  function handleLeave() {
    hideTimeout.current = setTimeout(() => setShowAll(false), 300);
  }

  if (!contact) {
    return (
      <td className={`py-2 px-3 text-left align-middle ${hovered}`}>
        {editMode ? (
          <button
            onClick={() => onAddItem(locationId, "contact")}
            className="px-2 py-0.5 rounded bg-green-500 text-white text-xs font-bold hover:bg-green-600"
          >+ Contact</button>
        ) : (
          <span className="text-[16px] text-black">—</span>
        )}
      </td>
    );
  }

  const hasMore = contact.phones.length > 1;

  return (
    <td
      className={`py-2 px-3 text-left align-middle ${hovered} relative`}
      onMouseLeave={handleLeave}
    >
      <div>
        {editMode ? (
          <EditableCell
            value={contact.name}
            onSave={(v) => onEditField(locationId, "contactName", v)}
            className="text-[16px] font-bold text-black"
          />
        ) : (
          <div className="text-[16px] font-bold text-black leading-snug">{contact.name}</div>
        )}
        {editMode ? (
          <>
            {contact.phones.map((p, i) => (
              <div key={i} className="flex items-center gap-1">
                <EditableCell
                  value={p.number}
                  onSave={(v) => onEditField(locationId, "contactPhone", v, i)}
                  className="text-[13px] font-medium text-black/75"
                />
                <EditableCell
                  value={p.label}
                  onSave={(v) => onEditField(locationId, "contactPhoneLabel", v, i)}
                  className="text-[11px] text-black/50"
                />
              </div>
            ))}
            <button
              onClick={() => onAddItem(locationId, "contactPhone")}
              className="w-5 h-5 rounded-full bg-green-500 text-white text-xs font-bold hover:bg-green-600 flex items-center justify-center mt-0.5"
              title="Add phone"
            >+</button>
          </>
        ) : showAll ? (
          contact.phones.map((p, i) => (
            <div key={i} className="text-[13px] font-medium text-black/75 whitespace-nowrap leading-snug">
              {formatPhone(p.number)} <span className="text-black">{phoneAbbrev(p.label)}</span>
            </div>
          ))
        ) : (
          <div className="text-[13px] font-medium text-black/75 whitespace-nowrap leading-snug">
            {formatPhone(contact.phones[0]?.number || "")}
          </div>
        )}
        {!editMode && hasMore && !showAll && (
          <div
            className="absolute bottom-1 right-1"
            onMouseEnter={handleEnter}
            onMouseLeave={handleLeave}
          >
            <div className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-gray-200 text-black text-[9px] font-bold cursor-default">
              i
            </div>
          </div>
        )}
      </div>
    </td>
  );
}

function StatusBubble({
  status,
  canEdit,
  onClick,
  locationName,
  code,
  milestoneLabel,
  alignRight,
}: {
  status?: {
    value: boolean;
    updatedAt: string;
    updatedByUser: { displayName: string } | null;
  };
  canEdit: boolean;
  onClick: () => void;
  locationName: string;
  code: string;
  milestoneLabel: string;
  alignRight: boolean;
}) {
  const [showTooltip, setShowTooltip] = useState(false);

  const done = status?.value ?? false;
  const updatedBy = status?.updatedByUser?.displayName;
  const updatedAt = status?.updatedAt
    ? new Date(status.updatedAt).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true, timeZone: "America/New_York" })
    : null;

  const tooltipText = updatedBy
    ? `${milestoneLabel} · ${locationName} · ${updatedBy} · ${updatedAt}`
    : `${milestoneLabel} · ${locationName}`;

  return (
    <div className="relative inline-flex items-center justify-center">
      <button
        type="button"
        disabled={!canEdit}
        onClick={onClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`w-11 h-11 rounded-full border-3 transition-all flex items-center justify-center text-sm font-black ${
          done
            ? "bg-gradient-to-b from-green-300 to-green-700 border-green-800 text-white shadow-[0_3px_6px_rgba(0,0,0,0.4),inset_0_2px_1px_rgba(255,255,255,0.4),inset_0_-2px_1px_rgba(0,0,0,0.2)]"
            : "bg-gradient-to-b from-white to-gray-200 border-red-500 text-red-600 shadow-[0_3px_6px_rgba(0,0,0,0.2),inset_0_2px_1px_rgba(255,255,255,0.9),inset_0_-2px_1px_rgba(0,0,0,0.1)]"
        } ${
          canEdit
            ? "cursor-pointer hover:scale-110 hover:shadow-lg active:scale-95 active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)] group-hover/cell:scale-110 group-hover/cell:shadow-lg group-active/cell:scale-95 group-active/cell:shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)]"
            : "cursor-default"
        } disabled:opacity-60`}
        aria-label={done ? "Done" : "Not done"}
      >
        {done ? "✓" : code}
      </button>
      {showTooltip && (
        <div className={`absolute bottom-full mb-2 z-50 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-semibold shadow-lg pointer-events-none text-white ${done ? "bg-green-700" : "bg-red-600"} ${alignRight ? "right-0" : "left-1/2 -translate-x-1/2"}`}>
          {tooltipText}
          <div className={`absolute top-full border-4 border-transparent ${done ? "border-t-green-700" : "border-t-red-600"} ${alignRight ? "right-3" : "left-1/2 -translate-x-1/2"}`} />
        </div>
      )}
    </div>
  );
}
