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
    if (fs.existsSync(DATA_FILE)) {
        res.json(JSON.parse(fs.readFileSync(DATA_FILE)));
    } else {
        res.json([]);
    }
});

app.post('/api/projects', (req, res) => {
    fs.writeFileSync(DATA_FILE, JSON.stringify(req.body, null, 2));
    res.json({ success: true });
});

// --- SERVE REACT FRONTEND (Production) ---
// This tells Node to serve the "built" React files
app.use(express.static(path.join(__dirname, 'client/dist')));

// Any request that isn't an API call gets sent to the React App
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/dist/index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));