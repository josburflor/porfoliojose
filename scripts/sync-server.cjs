const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PORT = 3005;
const SNAPSHOT_PATH = path.join(__dirname, '../src/data/local_db_snapshot.json');

const server = http.createServer((req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.end();
    return;
  }

  if (req.method === 'POST' && req.url === '/sync') {
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        
        // 1. Guardar Snapshot
        fs.writeFileSync(SNAPSHOT_PATH, JSON.stringify(data, null, 2));
        
        // 2. Ejecutar Git Commit (Solo si hay cambios)
        try {
          execSync('git add .');
          const status = execSync('git status --porcelain').toString();
          if (status) {
            execSync('git commit -m "sync: actualización automática de base de datos local"');
            console.log('✅ Commit realizado con éxito.');
            res.end(JSON.stringify({ status: 'committed' }));
          } else {
            console.log('ℹ️ No hay cambios para committear.');
            res.end(JSON.stringify({ status: 'no_changes' }));
          }
        } catch (gitErr) {
          console.error('❌ Error Git:', gitErr.message);
          res.end(JSON.stringify({ status: 'error', message: gitErr.message }));
        }
      } catch (err) {
        res.statusCode = 400;
        res.end(JSON.stringify({ status: 'error', message: 'Invalid JSON' }));
      }
    });
  } else {
    res.statusCode = 404;
    res.end();
  }
});

server.listen(PORT, () => {
  console.log(`🚀 Git Sync Server activo en http://localhost:${PORT}`);
  console.log(`📡 Esperando señales de sincronización del panel administrativo...`);
});
