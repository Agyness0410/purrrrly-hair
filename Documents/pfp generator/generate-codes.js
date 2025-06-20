#!/usr/bin/env node

const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');

function generateInvitationCode() {
  return crypto.randomBytes(16).toString('hex').toUpperCase();
}

function generateCodes(count = 10) {
  const db = new sqlite3.Database('avatar_generator.db');
  
  // Create table if it doesn't exist
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS invitation_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE,
      used BOOLEAN DEFAULT FALSE,
      used_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    
    console.log(`Generating ${count} invitation codes...\n`);
    
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
          console.log('Generated Invitation Codes:');
          console.log('========================');
          codes.forEach((code, index) => {
            console.log(`${index + 1}. ${code}`);
          });
          console.log('\nCodes saved to database successfully!');
          console.log(`Share these codes with users. Each code can only be used once.`);
          
          db.close();
        }
      });
    }
  });
}

// Get count from command line argument
const count = process.argv[2] ? parseInt(process.argv[2]) : 10;

if (isNaN(count) || count < 1 || count > 100) {
  console.log('Usage: node generate-codes.js [number]');
  console.log('Number must be between 1 and 100');
  console.log('Example: node generate-codes.js 5');
  process.exit(1);
}

generateCodes(count);