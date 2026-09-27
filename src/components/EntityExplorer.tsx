import React, { useState } from 'react';
import {
  Boxes,
  Search,
  Filter,
  Battery,
  BatteryWarning,
  AlertTriangle,
  Radio,
  Wifi,
  Tag,
  CheckCircle,
  XCircle,
  MapPin,
} from 'lucide-react';
import { HAArea, HADevice, HAState } from '../../packages/shared/src/types.js';

interface EntityExplorerProps {
  states: HAState[];
  devices: HADevice[];
  areas: HAArea[];
}

export const EntityExplorer: React.FC<EntityExplorerProps> = ({
  states,
  devices,
  areas,
}) => {
  const [search, setSearch] = useState('');
  const [selectedDomain, setSelectedDomain] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedEntity, setSelectedEntity] = useState<HAState | null>(null);

  // Extract unique domains
  const domains = Array.from(new Set(states.map((s) => s.entity_id.split('.')[0]))).sort();

  // Create area map
  const areaMap = new Map<string, string>();
  areas.forEach((a) => areaMap.set(a.area_id, a.name));

  // Filtered states
  const filtered = states.filter((st) => {
    const domain = st.entity_id.split('.')[0];
    const friendlyName = st.attributes.friendly_name || '';

    const matchesSearch =
      st.entity_id.toLowerCase().includes(search.toLowerCase()) ||
      friendlyName.toLowerCase().includes(search.toLowerCase());

    const matchesDomain = selectedDomain === 'all' || domain === selectedDomain;

    let matchesStatus = true;
    if (selectedStatus === 'unavailable') {
      matchesStatus = st.state === 'unavailable' || st.state === 'unknown';
    } else if (selectedStatus === 'battery_low') {
      const isBat = st.attributes.device_class === 'battery' || st.entity_id.includes('battery');
      matchesStatus = isBat && parseFloat(st.state) < 20;
    }

    return matchesSearch && matchesDomain && matchesStatus;
  });

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-800 gap-4">
        <div>
          <h1 className="text-xl font-bold font-mono tracking-tight text-slate-100 flex items-center gap-2.5">
            <Boxes className="w-5 h-5 text-cyan-400" />
            Enheter & Entiteter Explorer
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Undersøk og overvåk {states.length} entiteter fordelt over {devices.length} fysiske enheter og {areas.length} områder.
          </p>
        </div>

        {/* Status Quick Filters */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedStatus(selectedStatus === 'unavailable' ? 'all' : 'unavailable')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer ${
              selectedStatus === 'unavailable'
                ? 'bg-rose-950 text-rose-300 border border-rose-600 font-semibold'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Utilgjengelige</span>
          </button>
          <button
            onClick={() => setSelectedStatus(selectedStatus === 'battery_low' ? 'all' : 'battery_low')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer ${
              selectedStatus === 'battery_low'
                ? 'bg-amber-950 text-amber-300 border border-amber-600 font-semibold'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <BatteryWarning className="w-3.5 h-3.5" />
            <span>Lavt batteri</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-[#0f172a] p-3 rounded-xl border border-slate-800">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Søk i entitets-ID eller navn (f.eks. sensor.stue)..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-700/80 rounded-lg text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={selectedDomain}
            onChange={(e) => setSelectedDomain(e.target.value)}
            className="w-full sm:w-44 px-2.5 py-1.5 bg-slate-900 border border-slate-700/80 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
          >
            <option value="all">Alle domener ({domains.length})</option>
            {domains.map((dom) => (
              <option key={dom} value={dom}>
                {dom} ({states.filter((s) => s.entity_id.startsWith(`${dom}.`)).length})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table & Inspector View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Table List */}
        <div className={`overflow-hidden rounded-xl border border-slate-800 bg-[#0f172a] shadow-xl ${selectedEntity ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
          <div className="max-h-[550px] overflow-y-auto">
            <table className="w-full text-left text-xs font-mono border-collapse">
              <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 sticky top-0 z-10 text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="p-3">Entitet / Navn</th>
                  <th className="p-3">Tilstand</th>
                  <th className="p-3 hidden sm:table-cell">Domene</th>
                  <th className="p-3 text-right">Sist Endret</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-500">
                      Ingen entiteter funnet som samsvarer med søket.
                    </td>
                  </tr>
                ) : (
                  filtered.map((st) => {
                    const isSelected = selectedEntity?.entity_id === st.entity_id;
                    const isUnavail = st.state === 'unavailable' || st.state === 'unknown';
                    const domain = st.entity_id.split('.')[0];
                    const isBattery = st.attributes.device_class === 'battery' || st.entity_id.includes('battery');
                    const batVal = isBattery ? parseFloat(st.state) : null;

                    return (
                      <tr
                        key={st.entity_id}
                        onClick={() => setSelectedEntity(st)}
                        className={`hover:bg-slate-800/60 transition-colors cursor-pointer ${
                          isSelected ? 'bg-cyan-950/40 text-cyan-200' : ''
                        }`}
                      >
                        <td className="p-3">
                          <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                            {isUnavail ? (
                              <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                            ) : (
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            )}
                            <span>{st.attributes.friendly_name || st.entity_id}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">{st.entity_id}</div>
                        </td>

                        <td className="p-3 font-semibold">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] border ${
                              isUnavail
                                ? 'bg-rose-950/80 border-rose-800 text-rose-300'
                                : batVal !== null && batVal < 15
                                ? 'bg-rose-950/80 border-rose-800 text-rose-300'
                                : 'bg-slate-900 border-slate-700/80 text-cyan-300'
                            }`}
                          >
                            {st.state} {st.attributes.unit_of_measurement || ''}
                          </span>
                        </td>

                        <td className="p-3 hidden sm:table-cell text-slate-400">
                          <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px]">
                            {domain}
                          </span>
                        </td>

                        <td className="p-3 text-right text-slate-400 text-[10px]">
                          {new Date(st.last_changed).toLocaleTimeString('no-NO')}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Selected Entity Inspector */}
        {selectedEntity && (
          <div className="p-4 rounded-xl border border-slate-800 bg-[#0f172a] shadow-xl space-y-4 font-mono text-xs flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-semibold text-slate-200">Entitetsinspektør</span>
                <button
                  onClick={() => setSelectedEntity(null)}
                  className="text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div>
                <div className="text-slate-400 text-[10px]">Entity ID:</div>
                <div className="text-cyan-300 font-bold break-all">{selectedEntity.entity_id}</div>
              </div>

              <div>
                <div className="text-slate-400 text-[10px]">Gjeldende Tilstand:</div>
                <div className="text-lg font-bold text-slate-100">
                  {selectedEntity.state} {selectedEntity.attributes.unit_of_measurement || ''}
                </div>
              </div>

              <div>
                <div className="text-slate-400 text-[10px] mb-1">Råattributter (JSON):</div>
                <pre className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-300 max-h-56 overflow-y-auto overflow-x-auto">
                  {JSON.stringify(selectedEntity.attributes, null, 2)}
                </pre>
              </div>
            </div>

            <div className="text-[10px] text-slate-400 pt-2 border-t border-slate-800">
              Sist oppdatert: {new Date(selectedEntity.last_updated).toLocaleString('no-NO')}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
