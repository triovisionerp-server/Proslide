import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement);

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
        const data = res.data;
        setProjects(data);

        // Calculate KPIs
        const total = data.length;
        const completed = data.filter(p => (Number(p.percentCompleted)||0) >= 100).length;
        const parts = data.reduce((sum, p) => sum + (Number(p.totalPartsProduced)||0), 0);
        
        setKpi({ total, completed, parts });
    } catch (e) { console.error("Sync error", e); }
  };

  const timelineData = {
    labels: projects.map(p => p.projectCode || 'Proj'),
    datasets: [{
        label: 'Completion %',
        data: projects.map(p => p.percentCompleted || 0),
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37, 99, 235, 0.2)',
        fill: true,
        tension: 0.4
    }]
  };

  const statusCounts = [
    projects.filter(p => (p.percentCompleted||0) >= 100).length,
    projects.filter(p => (p.percentCompleted||0) > 0 && (p.percentCompleted||0) < 100).length,
    projects.filter(p => !p.percentCompleted || (p.percentCompleted||0) === 0).length
  ];

  const distributionData = {
    labels: ['Completed', 'In Progress', 'Not Started'],
    datasets: [{
        data: statusCounts,
        backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
        borderWidth: 0
    }]
  };

  return (
    <div className="dashboard-body">
      <div className="dashboard-header">
         <div className="dashboard-title">
            <h1>ProSlide Dashboard</h1>
         </div>
         <div>
            <span style={{marginRight: '15px', color: '#666'}}>Last Sync: {new Date().toLocaleTimeString()}</span>
            <button className="btn btn-primary" style={{background: '#2563eb', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '5px', cursor: 'pointer'}} onClick={() => navigate('/entry')}>
                ✏️ Data Entry
            </button>
         </div>
      </div>

      <div className="kpi-grid">
         <div className="kpi-card primary">
            <h3>Total Projects</h3>
            <div className="kpi-value">{kpi.total}</div>
         </div>
         <div className="kpi-card" style={{borderBottom: '4px solid #10b981'}}>
            <h3>Completed</h3>
            <div className="kpi-value" style={{color: '#10b981'}}>{kpi.completed}</div>
         </div>
         <div className="kpi-card" style={{borderBottom: '4px solid #d97706'}}>
            <h3>Parts Produced</h3>
            <div className="kpi-value" style={{color: '#d97706'}}>{kpi.parts.toLocaleString()}</div>
         </div>
         {/* Average KPI Removed */}
      </div>

      <div className="charts-grid">
         <div className="chart-container">
            <h3>Production Timeline</h3>
            <div style={{height: '300px'}}>
                <Line options={{maintainAspectRatio: false, plugins: {legend: {display: false}}}} data={timelineData} />
            </div>
         </div>
         <div className="chart-container">
            <h3>Status Distribution</h3>
            <div style={{height: '300px', display: 'flex', justifyContent: 'center'}}>
                <Doughnut options={{maintainAspectRatio: false}} data={distributionData} />
            </div>
         </div>
      </div>

      <div className="advanced-grid">
         {/* HEATMAP REMOVED */}

         {/* Detailed Data Table */}
         <div className="data-table" style={{gridColumn: '1 / -1'}}>
            <h3>Detailed Analytics</h3>
            <div style={{overflowX: 'auto'}}>
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
                                <td>
                                    <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                                        <div style={{width:'100px', height:'8px', background:'#eee', borderRadius:'4px'}}>
                                            <div style={{width: `${p.percentCompleted}%`, background: p.percentCompleted >= 100 ? '#10b981' : '#2563eb', height:'100%', borderRadius:'4px'}}></div>
                                        </div>
                                        {p.percentCompleted}%
                                    </div>
                                </td>
                                <td>
                                    <span style={{
                                        padding:'5px 10px', 
                                        borderRadius:'15px', 
                                        background: p.percentCompleted >= 100 ? '#d1fae5' : '#dbeafe', 
                                        color: p.percentCompleted >= 100 ? '#065f46' : '#1e40af',
                                        fontSize: '12px', fontWeight: 'bold'
                                    }}>
                                        {p.percentCompleted >= 100 ? 'Completed' : 'Active'}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
         </div>
      </div>
    </div>
  );
};

export default Dashboard;