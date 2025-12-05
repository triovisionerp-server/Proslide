const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(express.json());
app.use(cors());

// Data Storage (File-based for now)
const DATA_FILE = path.join(__dirname, 'erp_data.json');

// --- API ROUTES ---
app.get('/api/projects', (req, res) => {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const raw = fs.readFileSync(DATA_FILE, 'utf8');
            try {
                const parsed = JSON.parse(raw);
                return res.json(parsed);
            } catch (parseErr) {
                console.error('erp_data.json parse error, returning empty array:', parseErr);
                return res.json([]); // recover by returning empty array
            }
        } else {
            return res.json([]);
        }
    } catch (err) {
        console.error('Failed to read projects file:', err);
        return res.status(500).json({ error: 'Failed to read projects' });
    }
});

app.post('/api/projects', (req, res) => {
    try {
        const body = req.body;
        // Write backup before overwrite
        try {
            if (fs.existsSync(DATA_FILE)) {
                const backupFile = DATA_FILE + '.bak';
                fs.copyFileSync(DATA_FILE, backupFile);
            }
        } catch (bkErr) {
            console.warn('Could not create backup of data file:', bkErr);
        }

        try {
            fs.writeFileSync(DATA_FILE, JSON.stringify(body, null, 2), 'utf8');
            return res.json({ success: true });
        } catch (writeErr) {
            console.error('Failed to write projects file:', writeErr);
            return res.status(500).json({ error: 'Failed to save projects' });
        }
    } catch (err) {
        console.error('Unexpected error in POST /api/projects:', err);
        return res.status(500).json({ error: 'Unexpected server error' });
    }
});

// --- SERVE REACT FRONTEND (Production) ---
app.use(express.static(path.join(__dirname, 'client/dist')));
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/dist/index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
"@ | Set-Content -Path '.\server.js' -Encoding UTF8@"
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement, Filler } from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

// Register ChartJS components and plugins (including Filler)
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement, Filler);

const Dashboard = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [kpi, setKpi] = useState({ total: 0, completed: 0, parts: 0 });

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const res = await axios.get('/api/projects');
      const data = Array.isArray(res.data) ? res.data : [];
      setProjects(data);

      const total = data.length;
      const completed = data.filter(p => (Number(p.percentCompleted) || 0) >= 100).length;
      const parts = data.reduce((sum, p) => sum + (Number(p.totalPartsProduced) || 0), 0);

      setKpi({ total, completed, parts });
    } catch (e) {
      console.error('Sync error', e);
    }
  };

  const timelineData = {
    labels: projects.map(p => p.projectCode || 'Proj'),
    datasets: [{
      label: 'Completion %',
      data: projects.map(p => Number(p.percentCompleted) || 0),
      borderColor: '#2563eb',
      backgroundColor: 'rgba(37, 99, 235, 0.2)',
      fill: true,
      tension: 0.4
    }]
  };

  const completedCount = projects.filter(p => (Number(p.percentCompleted) || 0) >= 100).length;
  const inProgressCount = projects.filter(p => (Number(p.percentCompleted) || 0) > 0 && (Number(p.percentCompleted) || 0) < 100).length;
  const inPlanningCount = projects.filter(p => (Number(p.percentCompleted) || 0) === 0).length;

  const distributionData = {
    labels: ['Completed', 'In Progress', 'In Planning'],
    datasets: [{
      data: [completedCount, inProgressCount, inPlanningCount],
      backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
      borderWidth: 2,
      borderColor: '#ffffff'
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom' }
    }
  };

  return (
    <div className="dashboard-body">
      <img src="/logo.svg" alt="" className="dashboard-watermark" />
      <div className="dashboard-header">
        <div className="dashboard-title">
          <div className="glossy-logo-container">
            <img src="/logo.svg" alt="ProSlide" className="glossy-logo" />
          </div>
          <h1>Pro Slide Dashboard</h1>
        </div>
        <div>
          <span style={{ marginRight: '15px', color: '#333', fontWeight: '500' }}>Last Sync: {new Date().toLocaleTimeString()}</span>
          <button className="btn btn-primary" style={{ background: '#2563eb', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '5px', cursor: 'pointer' }} onClick={() => navigate('/entry')}>
            ✏️ Data Entry
          </button>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card primary">
          <h3>Total Projects</h3>
          <div className="kpi-value">{kpi.total}</div>
        </div>
        <div className="kpi-card" style={{ borderBottom: '4px solid #10b981' }}>
          <h3>Completed Projects</h3>
          <div className="kpi-value" style={{ color: '#10b981' }}>{kpi.completed}</div>
        </div>
        <div className="kpi-card" style={{ borderBottom: '4px solid #d97706' }}>
          <h3>Total Parts Produced</h3>
          <div className="kpi-value" style={{ color: '#d97706' }}>{kpi.parts.toLocaleString()}</div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="chart-container">
          <h3>Production Timeline & Trends</h3>
          <div style={{ height: '300px' }}>
            <Line options={chartOptions} data={timelineData} />
          </div>
        </div>
        <div className="chart-container">
          <h3>Project Status Distribution</h3>
          <div style={{ height: '300px', display: 'flex', justifyContent: 'center' }}>
            {projects.length > 0 ? (
              <Doughnut options={chartOptions} data={distributionData} />
            ) : (
              <p style={{ marginTop: '100px', color: '#666' }}>No Data Available</p>
            )}
          </div>
        </div>
      </div>

      <div className="advanced-grid">
        <div className="data-table" style={{ gridColumn: '1 / -1' }}>
          <h3>Detailed Project Analytics</h3>
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Description</th>
                  <th>Target Date</th>
                  <th>Parts</th>
                  <th>Progress</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p, i) => (
                  <tr key={i}>
                    <td><strong>{p.projectCode}</strong></td>
                    <td>{p.projectDescription}</td>
                    <td>{p.targetCompletionDate}</td>
                    <td>{p.totalPartsProduced} / {p.totalParts}</td>
                    <td>{p.percentCompleted}%</td>
                    <td>
                      <span style={{
                        padding: '5px 10px',
                        borderRadius: '15px',
                        background: (Number(p.percentCompleted) || 0) >= 100 ? '#d1fae5' : ((Number(p.percentCompleted) || 0) > 0 ? '#dbeafe' : '#fee2e2'),
                        color: (Number(p.percentCompleted) || 0) >= 100 ? '#065f46' : ((Number(p.percentCompleted) || 0) > 0 ? '#1e40af' : '#991b1b'),
                        fontSize: '12px', fontWeight: 'bold'
                      }}>
                        {p.status || 'In Planning'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="bottom-watermark-container">
        <img src="/Tlogo.png" alt="TrioVision" className="bottom-watermark-logo" />
      </div>
    </div>
  );
};

export default Dashboard;
"@ | Set-Content -Path '.\client\src\Dashboard.jsx' -Encoding UTF8@"
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement, Filler } from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

// Register ChartJS components and plugins (including Filler)
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement, Filler);

const Dashboard = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [kpi, setKpi] = useState({ total: 0, completed: 0, parts: 0 });

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const res = await axios.get('/api/projects');
      const data = Array.isArray(res.data) ? res.data : [];
      setProjects(data);

      const total = data.length;
      const completed = data.filter(p => (Number(p.percentCompleted) || 0) >= 100).length;
      const parts = data.reduce((sum, p) => sum + (Number(p.totalPartsProduced) || 0), 0);

      setKpi({ total, completed, parts });
    } catch (e) {
      console.error('Sync error', e);
    }
  };

  const timelineData = {
    labels: projects.map(p => p.projectCode || 'Proj'),
    datasets: [{
      label: 'Completion %',
      data: projects.map(p => Number(p.percentCompleted) || 0),
      borderColor: '#2563eb',
      backgroundColor: 'rgba(37, 99, 235, 0.2)',
      fill: true,
      tension: 0.4
    }]
  };

  const completedCount = projects.filter(p => (Number(p.percentCompleted) || 0) >= 100).length;
  const inProgressCount = projects.filter(p => (Number(p.percentCompleted) || 0) > 0 && (Number(p.percentCompleted) || 0) < 100).length;
  const inPlanningCount = projects.filter(p => (Number(p.percentCompleted) || 0) === 0).length;

  const distributionData = {
    labels: ['Completed', 'In Progress', 'In Planning'],
    datasets: [{
      data: [completedCount, inProgressCount, inPlanningCount],
      backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
      borderWidth: 2,
      borderColor: '#ffffff'
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom' }
    }
  };

  return (
    <div className="dashboard-body">
      <img src="/logo.svg" alt="" className="dashboard-watermark" />
      <div className="dashboard-header">
        <div className="dashboard-title">
          <div className="glossy-logo-container">
            <img src="/logo.svg" alt="ProSlide" className="glossy-logo" />
          </div>
          <h1>Pro Slide Dashboard</h1>
        </div>
        <div>
          <span style={{ marginRight: '15px', color: '#333', fontWeight: '500' }}>Last Sync: {new Date().toLocaleTimeString()}</span>
          <button className="btn btn-primary" style={{ background: '#2563eb', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '5px', cursor: 'pointer' }} onClick={() => navigate('/entry')}>
            ✏️ Data Entry
          </button>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card primary">
          <h3>Total Projects</h3>
          <div className="kpi-value">{kpi.total}</div>
        </div>
        <div className="kpi-card" style={{ borderBottom: '4px solid #10b981' }}>
          <h3>Completed Projects</h3>
          <div className="kpi-value" style={{ color: '#10b981' }}>{kpi.completed}</div>
        </div>
        <div className="kpi-card" style={{ borderBottom: '4px solid #d97706' }}>
          <h3>Total Parts Produced</h3>
          <div className="kpi-value" style={{ color: '#d97706' }}>{kpi.parts.toLocaleString()}</div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="chart-container">
          <h3>Production Timeline & Trends</h3>
          <div style={{ height: '300px' }}>
            <Line options={chartOptions} data={timelineData} />
          </div>
        </div>
        <div className="chart-container">
          <h3>Project Status Distribution</h3>
          <div style={{ height: '300px', display: 'flex', justifyContent: 'center' }}>
            {projects.length > 0 ? (
              <Doughnut options={chartOptions} data={distributionData} />
            ) : (
              <p style={{ marginTop: '100px', color: '#666' }}>No Data Available</p>
            )}
          </div>
        </div>
      </div>

      <div className="advanced-grid">
        <div className="data-table" style={{ gridColumn: '1 / -1' }}>
          <h3>Detailed Project Analytics</h3>
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Description</th>
                  <th>Target Date</th>
                  <th>Parts</th>
                  <th>Progress</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p, i) => (
                  <tr key={i}>
                    <td><strong>{p.projectCode}</strong></td>
                    <td>{p.projectDescription}</td>
                    <td>{p.targetCompletionDate}</td>
                    <td>{p.totalPartsProduced} / {p.totalParts}</td>
                    <td>{p.percentCompleted}%</td>
                    <td>
                      <span style={{
                        padding: '5px 10px',
                        borderRadius: '15px',
                        background: (Number(p.percentCompleted) || 0) >= 100 ? '#d1fae5' : ((Number(p.percentCompleted) || 0) > 0 ? '#dbeafe' : '#fee2e2'),
                        color: (Number(p.percentCompleted) || 0) >= 100 ? '#065f46' : ((Number(p.percentCompleted) || 0) > 0 ? '#1e40af' : '#991b1b'),
                        fontSize: '12px', fontWeight: 'bold'
                      }}>
                        {p.status || 'In Planning'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="bottom-watermark-container">
        <img src="/Tlogo.png" alt="TrioVision" className="bottom-watermark-logo" />
      </div>
    </div>
  );
};

export default Dashboard;
"@ | Set-Content -Path '.\client\src\Dashboard.jsx' -Encoding UTF8