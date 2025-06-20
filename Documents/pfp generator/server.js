const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const sharp = require('sharp');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/traits', express.static('input 2'));

const db = new sqlite3.Database('avatar_generator.db');

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS invitation_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE,
    used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS generated_avatars (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dna_hash TEXT UNIQUE,
    combination_data TEXT,
    invitation_code TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
});

function generateInvitationCode() {
  return crypto.randomBytes(16).toString('hex').toUpperCase();
}

function generateDNAHash(combination) {
  const dnaString = Object.entries(combination)
    .sort()
    .map(([key, value]) => `${key}:${value}`)
    .join('|');
  return crypto.createHash('sha256').update(dnaString).digest('hex');
}

function getTraitStructure() {
  const inputDir = path.join(__dirname, 'input 2');
  const structure = {};
  
  const categories = fs.readdirSync(inputDir).filter(item => 
    fs.statSync(path.join(inputDir, item)).isDirectory()
  );
  
  categories.forEach(category => {
    structure[category] = {};
    const categoryPath = path.join(inputDir, category);
    const rarities = fs.readdirSync(categoryPath).filter(item =>
      fs.statSync(path.join(categoryPath, item)).isDirectory()
    );
    
    rarities.forEach(rarity => {
      const rarityPath = path.join(categoryPath, rarity);
      const files = fs.readdirSync(rarityPath).filter(file => 
        file.toLowerCase().match(/\.(png|jpg|jpeg)$/)
      );
      structure[category][rarity] = files.map(file => ({
        name: file.replace(/\.(png|jpg|jpeg)$/i, ''),
        path: `${category}/${rarity}/${file}`
      }));
    });
  });
  
  return structure;
}

// Admin route to generate invitation codes
app.post('/admin/generate-codes', (req, res) => {
  const { count = 1 } = req.body;
  const codes = [];
  
  let completed = 0;
  for (let i = 0; i < count; i++) {
    const code = generateInvitationCode();
    codes.push(code);
    
    db.run('INSERT INTO invitation_codes (code) VALUES (?)', [code], function(err) {
      if (err) {
        console.error('Error inserting code:', err);
      }
      completed++;
      if (completed === count) {
        res.json({ success: true, codes });
      }
    });
  }
});

// Get all invitation codes (admin)
app.get('/admin/codes', (req, res) => {
  db.all('SELECT * FROM invitation_codes ORDER BY created_at DESC', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(rows);
    }
  });
});

// Validate invitation code
app.post('/validate-code', (req, res) => {
  const { code } = req.body;
  
  db.get('SELECT * FROM invitation_codes WHERE code = ? AND used = FALSE', [code], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else if (!row) {
      res.json({ valid: false, message: 'Invalid or already used invitation code' });
    } else {
      res.json({ valid: true });
    }
  });
});

// Get trait structure
app.get('/api/traits', (req, res) => {
  try {
    const structure = getTraitStructure();
    res.json(structure);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Check if combination exists
app.post('/api/check-combination', (req, res) => {
  const { combination } = req.body;
  const dnaHash = generateDNAHash(combination);
  
  db.get('SELECT * FROM generated_avatars WHERE dna_hash = ?', [dnaHash], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json({ exists: !!row, dnaHash });
    }
  });
});

// Generate and download avatar
app.post('/api/generate-avatar', async (req, res) => {
  const { combination, invitationCode } = req.body;
  
  try {
    // Validate invitation code
    const codeRow = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM invitation_codes WHERE code = ? AND used = FALSE', [invitationCode], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    if (!codeRow) {
      return res.status(400).json({ error: 'Invalid or already used invitation code' });
    }
    
    // Check if combination already exists
    const dnaHash = generateDNAHash(combination);
    const existingAvatar = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM generated_avatars WHERE dna_hash = ?', [dnaHash], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    if (existingAvatar) {
      return res.status(400).json({ error: 'This avatar combination already exists' });
    }
    
    // Generate avatar image
    const layers = [];
    const layerOrder = ['00background', '01body', '02face', '03hair', '03body hoodie', '04mouth', '05eye', '06accessory', '07facemask'];
    
    for (const category of layerOrder) {
      if (combination[category] && combination[category] !== 'skip') {
        const imagePath = path.join(__dirname, 'input 2', combination[category]);
        if (fs.existsSync(imagePath)) {
          layers.push(imagePath);
        }
      }
    }
    
    // Compose image using Sharp
    let composite = sharp({
      create: {
        width: 1000,
        height: 1000,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    });
    
    const compositeArray = layers.map(layer => ({ input: layer }));
    
    if (compositeArray.length > 0) {
      composite = composite.composite(compositeArray);
    }
    
    const outputBuffer = await composite.png().toBuffer();
    
    // Mark invitation code as used and save avatar
    await new Promise((resolve, reject) => {
      db.run('UPDATE invitation_codes SET used = TRUE, used_at = CURRENT_TIMESTAMP WHERE code = ?', [invitationCode], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    
    await new Promise((resolve, reject) => {
      db.run('INSERT INTO generated_avatars (dna_hash, combination_data, invitation_code) VALUES (?, ?, ?)', 
        [dnaHash, JSON.stringify(combination), invitationCode], (err) => {
          if (err) reject(err);
          else resolve();
        });
    });
    
    // Send image as response
    res.set({
      'Content-Type': 'image/png',
      'Content-Disposition': `attachment; filename="avatar_${dnaHash.substring(0, 8)}.png"`
    });
    res.send(outputBuffer);
    
  } catch (error) {
    console.error('Error generating avatar:', error);
    res.status(500).json({ error: error.message });
  }
});

// Admin panel route
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Main app route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Avatar Generator running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  if (process.env.NODE_ENV !== 'production') {
    console.log(`Local access: http://localhost:${PORT}`);
    console.log(`Admin panel: http://localhost:${PORT}/admin`);
  }
});