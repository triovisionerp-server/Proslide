import React, { useState, useEffect } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { useNavigate } from 'react-router-dom';
import './DataEntry.css';

const DataEntry = () => {
  const navigate = useNavigate();
  const [columns, setColumns] = useState([
    { id: 'projectCode', name: 'Project Code', type: 'text' },
    { id: 'projectDescription', name: 'Project Description', type: 'text' },
    { id: 'destination', name: 'Destination', type: 'text' },
    { id: 'poReference', name: 'PO Reference', type: 'text' },
    { id: 'targetCompletionDate', name: 'Target Completion Date', type: 'date' },
    { id: 'estimatedStartDate', name: 'Estimated Start Date', type: 'date' },
    { id: 'totalParts', name: 'Total No. of parts', type: 'number' },
    { id: 'totalPartsProduced', name: 'Total parts produced', type: 'number' },
    { id: 'totalPartsToBeProduced', name: 'Total parts to be produced', type: 'number' },
    { id: 'percentCompleted', name: '% Completed', type: 'number' },
    { id: 'expectedCompletionDate', name: 'Expected Completion Date', type: 'date' },
    { id: 'containerNumber', name: 'Container Number', type: 'text' },
    { id: 'containerType', name: 'Container Type', type: 'text' },
    { id: 'dispatchDate', name: 'Dispatch Date', type: 'date' },
    { id: 'arrivalDate', name: 'Arrival Date', type: 'date' },
    { id: 'status', name: 'Status', type: 'text' },
    { id: 'remarks', name: 'Remarks', type: 'text' }
  ]);
  
  const [projectData, setProjectData] = useState([]);
  const [stats, setStats] = useState({ total: 0, completed: 0, inProgress: 0 });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const res = await axios.get('/api/projects');
      if (Array.isArray(res.data)) {
        setProjectData(res.data.length ? res.data : [{}]);
        updateCounts(res.data);
      }
    } catch (err) { console.error("Load failed", err); }
  };

  const saveData = async () => {
    try {
      const cleanData = projectData.filter(row => Object.values(row).some(val => val && String(val).trim() !== ''));
      await axios.post('/api/projects', cleanData);
      updateCounts(cleanData);
      alert("✅ Data Saved Successfully!");
    } catch (err) { alert("Save failed"); }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws, { defval: "" });

      if(data.length > 0) {
        const newCols = [...columns];
        Object.keys(data[0]).forEach(key => {
            const exists = newCols.find(c => c.name === key || c.id === key);
            if(!exists) {
                newCols.push({ id: key, name: key, type: 'text' });
            }
        });
        setColumns(newCols);
        setProjectData(data);
        alert(`📥 Imported ${data.length} rows successfully!`);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleCellChange = (index, colId, value) => {
    const newData = [...projectData];
    if(!newData[index]) newData[index] = {};
    newData[index][colId] = value;

    if(colId === 'totalParts' || colId === 'totalPartsProduced') {
        const total = parseFloat(newData[index].totalParts) || 0;
        const produced = parseFloat(newData[index].totalPartsProduced) || 0;
        newData[index].percentCompleted = total > 0 ? Math.round((produced/total)*100) : 0;
        newData[index].totalPartsToBeProduced = Math.max(0, total - produced);
    }
    setProjectData(newData);
  };

  const addNewRow = () => setProjectData([...projectData, {}]);
  
  const updateCounts = (data) => {
    const total = data.length;
    const completed = data.filter(p => (p.percentCompleted || 0) >= 100).length;
    const inProgress = data.filter(p => (p.percentCompleted || 0) > 0 && (p.percentCompleted || 0) < 100).length;
    setStats({ total, completed, inProgress });
  };

  return (
    <div className="data-entry-container">
      {/* HEADER WITH LOGO */}
      <div className="header">
        <div className="header-content">
            {/* Make sure to put your logo.png in the 'public' folder */}
            <img src="/logo.svg" alt="ProSlide" className="logo" /> 
            <div>
                <h1>📊 ProSlide Visibility Dashboard</h1>
                <p>Production tracking and project management system</p>
            </div>
        </div>
      </div>

      <div className="toolbar">
        <div className="toolbar-left">
          <button className="btn" onClick={saveData}>💾 Save Data</button>
          <button className="btn" onClick={loadData}>🔁 Sync Now</button>
          <label className="btn btn-import">
             📥 Import Excel
             <input type="file" hidden accept=".xlsx,.csv" onChange={handleFileUpload} />
          </label>
        </div>
        <div className="toolbar-right">
           <button className="btn btn-danger" onClick={() => { if(confirm("Clear all?")) setProjectData([{}]); }}>🗑️ Clear All</button>
           <button className="btn" onClick={() => navigate('/')}>📈 View Dashboard</button>
        </div>
      </div>

      <div className="table-info">
        <span>Projects: <b>{stats.total}</b></span>
        <span>Last Updated: {new Date().toLocaleTimeString()}</span>
      </div>

      <div className="excel-container">
        <div className="excel-header">📋 Project Data Table</div>
        <div className="table-container">
            <table className="excel-table">
                <thead>
                    <tr>
                        <th className="row-number">No.</th>
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
                                        type={col.type} 
                                        value={row[col.id] || ''}
                                        onChange={(e) => handleCellChange(rIndex, col.id, e.target.value)}
                                    />
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>

      <button className="float-btn" onClick={addNewRow}>+</button>
    </div>
  );
};

export default DataEntry;