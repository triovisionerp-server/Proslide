import React, { useState, useEffect } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { useNavigate } from 'react-router-dom';
import './DataEntry.css';

const DataEntry = () => {
  const navigate = useNavigate();
  
  // 1. DASHBOARD COLUMNS
  const [columns, setColumns] = useState([
    { id: 'projectCode', name: 'Project', type: 'text' },
    { id: 'projectDescription', name: 'Description', type: 'text' },
    { id: 'destination', name: 'Destination', type: 'text' },
    { id: 'containerNumber', name: 'No. of Containers', type: 'text' },
    { id: 'dispatchTimings', name: 'Dispatch Timings', type: 'text' },
    { id: 'totalParts', name: 'Total Parts', type: 'number' },
    { id: 'totalPartsProduced', name: 'Produced', type: 'number' },
    { id: 'percentCompleted', name: 'Progress', type: 'number' },
    { id: 'status', name: 'Status', type: 'text' },
    { id: 'targetCompletionDate', name: 'Target Date', type: 'date' }
  ]);
  
  const [projectData, setProjectData] = useState([]);
  const [stats, setStats] = useState({ total: 0, completed: 0, inProgress: 0 });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const res = await axios.get('/api/projects');
      if (Array.isArray(res.data)) {
        // If server has data, use it. If empty, start with 1 empty row.
        setProjectData(res.data.length ? res.data : []); 
        updateCounts(res.data);
      }
    } catch (err) { console.error(err); }
  };

  const saveData = async () => {
    try {
      // Filter out empty rows before saving
      const cleanData = projectData.filter(row => Object.values(row).some(val => val && String(val).trim() !== ''));
      await axios.post('/api/projects', cleanData);
      updateCounts(cleanData);
      alert("✅ Data Saved Successfully!");
    } catch (err) { alert("Save failed"); }
  };

  // --- DELETE ROW & AUTO-RENUMBER ---
  const deleteRow = (indexToDelete) => {
    if(confirm("Are you sure you want to delete this row?")) {
        // 1. Create copy of data
        const updatedData = [...projectData];
        // 2. Remove the specific row
        updatedData.splice(indexToDelete, 1);
        // 3. Update State (React automatically fixes S.No because of the map index)
        setProjectData(updatedData);
        updateCounts(updatedData);
    }
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(projectData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Projects");
    XLSX.writeFile(wb, "ProSlide_Data.xlsx");
  };

  // --- SMART EXCEL IMPORT ---
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    
    reader.onload = (evt) => {
      const bstr = evt.target.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const rawData = XLSX.utils.sheet_to_json(ws, { defval: "" });

      if(rawData.length > 0) {
        const cleanImport = rawData.map(row => {
            let cleanRow = {};
            columns.forEach(col => {
                // Match Header Name OR ID
                let val = row[col.name] || row[col.id] || "";
                cleanRow[col.id] = val;
            });

            // Auto-Calculations
            const total = parseFloat(cleanRow.totalParts) || 0;
            const produced = parseFloat(cleanRow.totalPartsProduced) || 0;
            
            if (total > 0) {
                cleanRow.percentCompleted = Math.round((produced/total)*100);
            }

            // Auto-Status
            if (!cleanRow.status || cleanRow.status === '') {
                if (cleanRow.percentCompleted >= 100) cleanRow.status = "Completed";
                else if (cleanRow.percentCompleted > 0) cleanRow.status = "In Progress";
                else cleanRow.status = "In Planning";
            }
            return cleanRow;
        });

        // MERGE LOGIC: Add new excel rows to existing data
        const mergedData = [...projectData, ...cleanImport];
        // Remove empty rows if any
        const finalData = mergedData.filter(row => Object.values(row).some(v => v));
        
        setProjectData(finalData);
        updateCounts(finalData);
        alert(`📥 Successfully added ${cleanImport.length} rows from Excel!`);
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
    }
    setProjectData(newData);
  };

  const addNewRow = () => {
      const newRow = { status: "In Planning" };
      setProjectData([...projectData, newRow]);
  };
  
  const updateCounts = (data) => {
    const total = data.length;
    const completed = data.filter(p => (p.percentCompleted || 0) >= 100).length;
    const inProgress = data.filter(p => (p.percentCompleted || 0) > 0 && (p.percentCompleted || 0) < 100).length;
    setStats({ total, completed, inProgress });
  };

  return (
    <div className="data-entry-container">
      <img src="/logo.svg" alt="" className="dashboard-watermark" />
      <div className="header">
        <div className="header-content">
            <div className="glossy-logo-container"><img src="/logo.svg" alt="ProSlide" className="glossy-logo" /></div>
            <h1>Pro Slide Dashboard</h1>
        </div>
      </div>

      <div className="toolbar">
        <div className="toolbar-left">
          <button className="btn" onClick={saveData}>💾 Save Data</button>
          <button className="btn" onClick={loadData}>🔁 Sync Now</button>
          <label className="btn btn-import">📥 Import <input type="file" hidden accept=".xlsx,.csv" onChange={handleFileUpload} /></label>
          <button className="btn btn-secondary" onClick={exportToExcel}>📤 Export Excel</button>
        </div>
        <div className="toolbar-right">
           <button className="btn btn-danger" onClick={() => { if(confirm("Clear all?")) setProjectData([]); }}>🗑️ Clear All</button>
           <button className="btn" onClick={() => navigate('/')}>📈 View Dashboard</button>
        </div>
      </div>

      <div className="table-info">
        <span>Projects: <span style={{color: '#4CAF50', fontWeight:'bold'}}>{stats.total}</span></span>
        <span style={{color: '#666', fontSize: '12px'}}>Last Updated: {new Date().toLocaleTimeString()}</span>
      </div>

      <div className="excel-container">
        <div className="excel-header">📋 Project Visibility Dashboard</div>
        <div className="table-container">
            <table className="excel-table">
                <thead>
                    <tr>
                        <th className="row-number">S.No</th>
                        {columns.map(col => <th key={col.id}>{col.name}</th>)}
                        <th className="action-col">Action</th> {/* NEW DELETE COLUMN */}
                    </tr>
                </thead>
                <tbody>
                    {projectData.map((row, rIndex) => (
                        <tr key={rIndex}>
                            {/* Auto-Renumbering: rIndex + 1 ensures 2 becomes 1 if 1 is deleted */}
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
                            
                            {/* DELETE BUTTON */}
                            <td style={{textAlign: 'center'}}>
                                <button className="btn-delete-row" onClick={() => deleteRow(rIndex)}>🗑️</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
        <div className="status-bar">
            <span>Total: <b>{stats.total}</b></span>
            <span>Completed: <b>{stats.completed}</b></span>
            <span>In Progress: <b>{stats.inProgress}</b></span>
        </div>
      </div>
      
      <div className="bottom-watermark-container"><img src="/Tlogo.png" alt="TrioVision" className="bottom-watermark-logo" /></div>
      <button className="float-btn" onClick={addNewRow}>+</button>
    </div>
  );
};

export default DataEntry;