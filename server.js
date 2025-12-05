require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');

const app = express();

// Increase limit for large Excel files
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ limit: '500mb', extended: true }));
app.use(cors());

// --- 1. CONNECT TO MONGODB ---
// This connects to the "Vault" using the link you will add in Render
const mongoUri = process.env.MONGO_URI;

if (!mongoUri) {
    console.error("❌ FATAL ERROR: MONGO_URI is missing. Add it to Render Environment Variables!");
} else {
    mongoose.connect(mongoUri)
        .then(() => console.log("✅ Connected to MongoDB successfully!"))
        .catch(err => console.error("❌ MongoDB Connection Error:", err));
}

// --- 2. DEFINE THE DATA SHAPE ---
const ProjectSchema = new mongoose.Schema({
    projectCode: String,
    projectDescription: String,
    destination: String,
    poReference: String,
    targetCompletionDate: String,
    estimatedStartDate: String,
    totalParts: String,
    totalPartsProduced: String,
    totalPartsToBeProduced: String,
    percentCompleted: String,
    expectedCompletionDate: String,
    containerNumber: String,
    containerType: String,
    dispatchDate: String,
    arrivalDate: String,
    status: String,
    remarks: String,
}, { strict: false });

const Project = mongoose.model('Project', ProjectSchema);

// --- API ROUTES ---

// GET: Fetch all projects
app.get('/api/projects', async (req, res) => {
    try {
        const projects = await Project.find({});
        res.json(projects);
    } catch (err) {
        console.error("Error fetching projects:", err);
        res.status(500).json([]);
    }
});

// POST: Save all projects
app.post('/api/projects', async (req, res) => {
    try {
        const newProjects = req.body;
        // 1. Delete all old data
        await Project.deleteMany({});
        // 2. Insert new data
        if (newProjects.length > 0) {
            await Project.insertMany(newProjects);
        }
        res.json({ success: true });
    } catch (err) {
        console.error("Error saving projects:", err);
        res.status(500).json({ success: false, message: "Database Error" });
    }
});

// --- SERVE REACT FRONTEND ---
const distPath = path.join(__dirname, 'client', 'dist');
if (require('fs').existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
    });
}

const PORT = process.env.PORT || 5000;
// Only listen if not running on Vercel (Vercel handles this automatically)
if (require.main === module) {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;