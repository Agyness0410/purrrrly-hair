#!/usr/bin/env node

const sqlite3 = require('sqlite3').verbose();

function viewCodes() {
  const db = new sqlite3.Database('avatar_generator.db');
  
  db.serialize(() => {
    db.all('SELECT * FROM invitation_codes ORDER BY created_at DESC', (err, rows) => {
      if (err) {
        console.error('Error reading codes:', err);
        return;
      }
      
      if (rows.length === 0) {
        console.log('No invitation codes found.');
        console.log('Run: node generate-codes.js 10');
        return;
      }
      
      // Statistics
      const totalCodes = rows.length;
      const usedCodes = rows.filter(row => row.used).length;
      const availableCodes = totalCodes - usedCodes;
      
      console.log('INVITATION CODES SUMMARY');
      console.log('========================');
      console.log(`Total Codes: ${totalCodes}`);
      console.log(`Used Codes: ${usedCodes}`);
      console.log(`Available Codes: ${availableCodes}\n`);
      
      console.log('CODE DETAILS:');
      console.log('=============');
      console.log('Status | Code                             | Created              | Used');
      console.log('-------|----------------------------------|----------------------|----------------------');
      
      rows.forEach(row => {
        const status = row.used ? '❌ USED' : '✅ AVAIL';
        const created = new Date(row.created_at).toLocaleString();
        const used = row.used_at ? new Date(row.used_at).toLocaleString() : '-';
        
        console.log(`${status}  | ${row.code} | ${created} | ${used}`);
      });
      
      console.log('\nAvailable codes for sharing:');
      console.log('============================');
      rows.filter(row => !row.used).forEach((row, index) => {
        console.log(`${index + 1}. ${row.code}`);
      });
      
      db.close();
    });
  });
}

viewCodes();