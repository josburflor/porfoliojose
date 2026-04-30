const { spawn, execSync } = require('child_process');
const path = require('path');

console.log('🔄 Sincronizando base de datos de Firebase hacia Local (backup.ts)...');
try {
  execSync('node ' + path.join(__dirname, 'sync_backup.cjs'), { stdio: 'inherit' });
} catch (e) {
  console.log('⚠️ Aviso: No se pudo bajar la base de datos (quizás falta internet o cuota). Usando versión en caché.');
}

console.log('🚀 Iniciando Servidor de Sincronización Local-Git (Puerto 3005)...');
const syncServer = spawn('node', [path.join(__dirname, 'sync-server.cjs')], { stdio: 'inherit' });

console.log('🌐 Iniciando Entorno de Desarrollo React (Vite)...');
const vite = spawn('npx', ['vite', '--port=3003', '--host=0.0.0.0'], { stdio: 'inherit', shell: true });

process.on('SIGINT', () => {
  syncServer.kill();
  vite.kill();
  process.exit();
});
