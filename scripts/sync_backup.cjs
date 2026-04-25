
const { initializeApp } = require('firebase/app');
const { getFirestore, getDocs, collection, doc, getDoc } = require('firebase/firestore');
const fs = require('fs');
const path = require('path');

// Go up one level from scripts/ to root
const firebaseConfig = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'firebase-applet-config.json'), 'utf8'));

const app = initializeApp(firebaseConfig);
const DB_ID = 'ai-studio-678ce048-1082-4c2c-bedd-a1b77361ee71';
const db = getFirestore(app, DB_ID);

async function sync() {
  try {
    console.log('Fetching data from Firestore...');
    const genS = await getDoc(doc(db, 'config', 'general'));
    const profS = await getDoc(doc(db, 'config', 'profile'));
    const projS = await getDocs(collection(db, 'projects'));
    const skillS = await getDocs(collection(db, 'skills'));
    const testS = await getDocs(collection(db, 'testimonials'));

    const data = {
      profile: profS.exists() ? profS.data() : {},
      general: genS.exists() ? genS.data() : {},
      projects: projS.docs.map(d => ({ id: d.id, ...d.data() })),
      skills: skillS.docs.map(d => ({ id: d.id, ...d.data() })),
      testimonials: testS.docs.map(d => ({ id: d.id, ...d.data() }))
    };

    const content = `export const BACKUP_PROFILE = ${JSON.stringify(data.profile, null, 2)};

export const BACKUP_GENERAL = ${JSON.stringify(data.general, null, 2)};

export const BACKUP_PROJECTS = ${JSON.stringify(data.projects, null, 2)};

export const BACKUP_SKILLS = ${JSON.stringify(data.skills, null, 2)};

export const BACKUP_TESTIMONIALS = ${JSON.stringify(data.testimonials, null, 2)};
`;

    fs.writeFileSync(path.join(__dirname, '..', 'src', 'data', 'backup.ts'), content);
    console.log('✅ Successfully synced backup.ts with Firestore data');
    process.exit(0);
  } catch (err) {
    if (err.code === 'resource-exhausted') {
      console.error('❌ ERROR: Cuota de Firebase Agotada. No se pudo sincronizar el archivo local backup.ts.');
      console.error('   Los datos siguen seguros en la nube, pero has alcanzado el límite gratuito diario de lectura.');
      console.error('   Espera a que se reinicie la cuota (medianoche) para volver a sincronizar.');
    } else {
      console.error('❌ Error al sincronizar datos:', err.message);
    }
    process.exit(1);
  }
}

sync();
