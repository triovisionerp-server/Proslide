const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();

// INCREASED LIMIT TO 500MB
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ limit: '500mb', extended: true }));
app.use(cors());

// Data Storage (File-based)
const DATA_FILE = path.join(__dirname, 'erp_data.json');

// --- API ROUTES ---
app.get('/api/projects', (req, res) => {
    if (fs.existsSync(DATA_FILE)) {
        try {
            const data = fs.readFileSync(DATA_FILE, 'utf8');
            res.json(JSON.parse(data));
        } catch (err) {
            console.error("Error reading data file:", err);
            res.json([]);
        }
    } else {
        res.json([]);
    }
});

app.post('/api/projects', (req, res) => {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(req.body, null, 2));
        res.json({ success: true });
    } catch (err) {
        console.error("Error writing data file:", err);
        res.status(500).json({ success: false, message: "Failed to save data" });
    }
});

// --- SERVE REACT FRONTEND (Production) ---
const distPath = path.join(__dirname, 'client', 'dist');

if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));

    app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
    });
} else {
    app.get('*', (req, res) => {
        res.send('API is running, but React build is missing. Did you run "npm run build"?');
    });
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));