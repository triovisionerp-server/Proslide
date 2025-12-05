const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();

// High limit for large files
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ limit: '500mb', extended: true }));
app.use(cors());

// --- EMERGENCY MODE: FILE STORAGE ---
// This saves data to a temporary file on the server.
// PERFECT for a demo/meeting.
const DATA_FILE = path.join(__dirname, 'erp_data.json');

// GET DATA
app.get('/api/projects', (req, res) => {
    if (fs.existsSync(DATA_FILE)) {
        try {
            const data = fs.readFileSync(DATA_FILE, 'utf8');
            res.json(JSON.parse(data));
        } catch (err) {
            console.error("Error reading file:", err);
            res.json([]);
        }
    } else {
        res.json([]);
    }
});

// SAVE DATA
app.post('/api/projects', (req, res) => {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(req.body, null, 2));
        console.log("Saved to file successfully.");
        res.json({ success: true });
    } catch (err) {
        console.error("Error saving file:", err);
        res.json({ success: false });
    }
});

// --- SERVE REACT FRONTEND ---
const distPath = path.join(__dirname, 'client', 'dist');

if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
    });
} else {
    app.get('*', (req, res) => {
        res.send('API Running. React Build pending.');
    });
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));