import React, { useState, useEffect } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { useNavigate } from 'react-router-dom';
import './DataEntry.css';

const DataEntry = () => {
  const navigate = useNavigate();

  const [columns] = useState([
    { id: 'projectCode', name: 'Project', type: 'text' },
    { id: 'projectDescription', name: 'Description', type: 'text' },
    { id: 'destination', name: 'Destination', type: 'text' },
    { id: 'containerCount', name: 'No. of Containers', type: 'number' },
    { id: 'dispatchTimings', name: 'Dispatch Timings', type: 'text' },
    { id: 'totalParts', name: 'Total Parts', type: 'number' },
    { id: 'totalPartsProduced', name: 'Produced', type: 'number' },
    { id: 'percentCompleted', name: 'Progress', type: 'number' }, // computed
    { id: 'status', name: 'Status', type: 'text' },
    { id: 'targetCompletionDate', name: 'Target Date', type: 'date' }
  ]);

  const [projectData, setProjectData] = useState([{}]);
  const [stats, setStats] = useState({ total: 0, completed: 0, inProgress: 0 });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const res = await axios.get('/api/projects');
      const data = Array.isArray(res.data) && res.data.length ? res.data : [{}];
      setProjectData(data);
      updateCounts(data);
    } catch (err) { console.error('Load failed', err); }
  };

  const saveData = async () => {
    try {
      const cleanData = projectData.filter(row => Object.values(row).some(v => v !== undefined && v !== null && String(v).trim() !== ''));
      await axios.post('/api/projects', cleanData);
      updateCounts(cleanData);
      alert('✅ Data Saved Successfully!');
    } catch (err) { console.error('Save failed', err); alert('Save failed'); }
  };

  const exportToExcel = () => {
    const exportData = projectData.map(row => {
      const o = {};
      columns.forEach(col => { o[col.name] = row[col.id] !== undefined ? row[col.id] : ''; });
      return o;
    });
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Projects');
    XLSX.writeFile(wb, 'ProSlide_Data.xlsx');
  };

  const normalize = (s) => (s || '').toString().trim().toLowerCase().replace(/[^a-z0-9]/g, '');

  const alternateHeaderMap = {
    project: 'projectCode', projectcode: 'projectCode', projectname: 'projectCode',
    description: 'projectDescription',
    dest: 'destination', destination: 'destination',
    containers: 'containerCount', noofcontainers: 'containerCount',
    dispatch: 'dispatchTimings', dispatchtimings: 'dispatchTimings',
    totalparts: 'totalParts', produced: 'totalPartsProduced',
    progress: 'percentCompleted', percent: 'percentCompleted',
    status: 'status', targetdate: 'targetCompletionDate'
  };

  const parseDateCell = (cellValue) => {
    if (!cellValue) return '';
    if (cellValue instanceof Date && !isNaN(cellValue)) {
      const y = cellValue.getFullYear(); const m = String(cellValue.getMonth() + 1).padStart(2, '0'); const d = String(cellValue.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    if (typeof cellValue === 'number') {
      const date = XLSX.SSF.parse_date_code(cellValue);
      if (date) { const y = date.y; const m = String(date.m).padStart(2, '0'); const d = String(date.d).padStart(2, '0'); return `${y}-${m}-${d}`; }
    }
    return String(cellValue).trim();
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const arrayBuffer = evt.target.result;
        const data = new Uint8Array(arrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rawData = XLSX.utils.sheet_to_json(ws, { defval: '' });
        if (!rawData || rawData.length === 0) { alert('No rows found in the uploaded file.'); return; }

        const cleaned = rawData.map(row => {
          const normalizedRow = {};
          Object.keys(row).forEach(k => { normalizedRow[normalize(k)] = row[k]; });

          const cleanRow = {};
          columns.forEach(col => {
            let val = undefined;
            if (row[col.name] !== undefined) val = row[col.name];
            if (val === undefined && row[col.id] !== undefined) val = row[col.id];
            if (val === undefined && normalizedRow[normalize(col.name)] !== undefined) val = normalizedRow[normalize(col.name)];
            if (val === undefined && normalizedRow[normalize(col.id)] !== undefined) val = normalizedRow[normalize(col.id)];
            if (val === undefined) {
              for (const inKey of Object.keys(normalizedRow)) {
                const mapped = alternateHeaderMap[inKey];
                if (mapped && mapped === col.id) { val = normalizedRow[inKey]; break; }
              }
            }
            if (col.id === 'targetCompletionDate') val = parseDateCell(val);
            cleanRow[col.id] = val !== undefined && val !== null ? val : '';
          });

          const total = parseFloat(cleanRow.totalParts) || 0;
          const produced = parseFloat(cleanRow.totalPartsProduced) || 0;
          if (total > 0) {
            cleanRow.percentCompleted = Math.round((produced / total) * 100);
            cleanRow.totalPartsToBeProduced = Math.max(0, total - produced);
          } else {
            cleanRow.percentCompleted = Number(cleanRow.percentCompleted) || 0;
            cleanRow.totalPartsToBeProduced = '';
          }
          if (!cleanRow.status || String(cleanRow.status).trim() === '') {
            if (cleanRow.percentCompleted >= 100) cleanRow.status = 'Completed';
            else if (cleanRow.percentCompleted > 0) cleanRow.status = 'In Progress';
            else cleanRow.status = 'In Planning';
          }
          return cleanRow;
        });

        setProjectData(cleaned.length ? cleaned : [{}]);
        updateCounts(cleaned);
        alert(`📥 Imported & mapped ${cleaned.length} rows.`);
      } catch (err) {
        console.error('Import failed', err);
        alert('Import failed - see console for details.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleCellChange = (index, colId, value) => {
    const newData = [...projectData];
    if (!newData[index]) newData[index] = {};
    newData[index][colId] = value;

    const total = parseFloat(newData[index].totalParts) || 0;
    const produced = parseFloat(newData[index].totalPartsProduced) || 0;

    if (colId === 'totalParts' || colId === 'totalPartsProduced') {
      newData[index].percentCompleted = total > 0 ? Math.round((produced / total) * 100) : 0;
      newData[index].totalPartsToBeProduced = total > 0 ? Math.max(0, total - produced) : '';
    }

    const pct = Number(newData[index].percentCompleted) || 0;
    if (pct >= 100) newData[index].status = 'Completed';
    else if (pct > 0) newData[index].status = 'In Progress';
    else newData[index].status = 'In Planning';

    setProjectData(newData);
  };

  const addNewRow = () => {
    const newRow = { status: 'In Planning' };
    columns.forEach(c => { if (c.id !== 'status') newRow[c.id] = ''; });
    setProjectData([...projectData, newRow]);
  };

  const updateCounts = (data) => {
    const total = data.length || 0;
    const completed = data.filter(p => (Number(p.percentCompleted) || 0) >= 100).length;
    const inProgress = data.filter(p => (Number(p.percentCompleted) || 0) > 0 && (Number(p.percentCompleted) || 0) < 100).length;
    setStats({ total, completed, inProgress });
  };

  return (
    <div className="data-entry-container">
      <img src="/logo.svg" alt="" className="dashboard-watermark" />
      <div className="header">
        <div className="header-content">
          <div className="glossy-logo-container">
            <img src="/logo.svg" alt="ProSlide" className="glossy-logo" />
          </div>
          <h1>Pro Slide Dashboard</h1>
        </div>
      </div>

      <div className="toolbar">
        <div className="toolbar-left">
          <button className="btn" onClick={saveData}>💾 Save Data</button>
          <button className="btn" onClick={loadData}>🔁 Sync Now</button>
          <label className="btn btn-import">
            📥 Import
            <input type="file" hidden accept=".xlsx,.xls,.csv" onChange={handleFileUpload} />
          </label>
          <button className="btn btn-secondary" onClick={exportToExcel}>📤 Export Excel</button>
        </div>
        <div className="toolbar-right">
          <button className="btn btn-danger" onClick={() => { if (confirm('Clear all?')) setProjectData([{}]); }}>🗑️ Clear All</button>
          <button className="btn" onClick={() => navigate('/')}>📈 View Dashboard</button>
        </div>
      </div>

      <div className="table-info">
        <span>Projects: <span style={{ color: '#4CAF50', fontWeight: 'bold' }}>{stats.total}</span></span>
        <span style={{ color: '#666', fontSize: '12px' }}>Last Updated: {new Date().toLocaleTimeString()}</span>
      </div>

      <div className="excel-container">
        <div className="excel-header">📋 Detailed Project Analytics</div>
        <div className="table-container">
          <table className="excel-table">
            <thead>
              <tr>
                <th className="row-number">S.<br />No.</th>
                {columns.map(col => <th key={col.id}>{col.name}</th>)}
              </tr>
            </thead>
            <tbody>
              {projectData.map((row, rIndex) => (
                <tr key={rIndex}>
                  <td className="row-number">{rIndex + 1}</td>
                  {columns.map(col => (
                    <td key={col.id}>
                      <input
                        className="cell-input"
                        type={col.type === 'date' ? 'date' : col.type}
                        value={row[col.id] || ''}
                        onChange={(e) => handleCellChange(rIndex, col.id, e.target.value)}
                        readOnly={col.id === 'percentCompleted'}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="status-bar">
          <span>Total Projects: <b>{stats.total}</b></span>
          <span>Completed: <b>{stats.completed}</b></span>
          <span>In Progress: <b>{stats.inProgress}</b></span>
        </div>
      </div>

      <div className="bottom-watermark-container">
        <img src="/Tlogo.png" alt="TrioVision" className="bottom-watermark-logo" />
      </div>

      <button className="float-btn" onClick={addNewRow}>+</button>
    </div>
  );
};

export default DataEntry;