
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, doc, setDoc, getDocs } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, '(default)');

const INITIAL_SKILLS = [
  { name: 'Frontend con frameworks (GITHUB)', level: 95, icon: 'github', order: 0 },
  { name: 'Inteligencia Artificial', level: 85, icon: 'cpu', order: 1 },
  { name: 'Diseño web con HTML5 y CSS', level: 98, icon: 'globe', order: 2 },
  { name: 'Diseño UX/UI con Figma', level: 90, icon: 'figma', order: 3 },
  { name: 'Javascript y ReactJs', level: 92, icon: 'code', order: 4 },
  { name: 'Adobe Illustrator Photoshop', level: 85, icon: 'layers', order: 5 },
  { name: 'Capcut', level: 80, icon: 'zap', order: 6 },
  { name: 'Aplicaciones web con PHP y MySQL', level: 88, icon: 'box', order: 7 },
];

const PROJECTS = [
  { title: 'EXPLORADOR NEURAL', cat: 'App', tech: ['React', 'IA'], img: 'https://picsum.photos/seed/cyber1/800/600', order: 0, link: '#' },
  { title: 'DISEÑO ZENITH', cat: 'Diseño Web', tech: ['Next.js', 'Tailwind'], img: 'https://picsum.photos/seed/cyber2/800/600', order: 1, link: '#' },
  { title: 'LOGOTIPO VECTOR', cat: 'Illustrator', tech: ['Vectores', 'Branding'], img: 'https://picsum.photos/seed/cyber3/800/600', order: 2, link: '#' },
  { title: 'MAQUETA ORION', cat: 'Figma', tech: ['UX/UI', 'Prototipo'], img: 'https://picsum.photos/seed/cyber4/800/600', order: 3, link: '#' },
];

async function seed() {
  console.log("🚀 Iniciando subida de datos de emergencia...");

  try {
    // 1. Skills
    console.log("Cargando Skills...");
    for (const s of INITIAL_SKILLS) {
      await addDoc(collection(db, 'skills'), s);
    }

    // 2. Projects
    console.log("Cargando Proyectos...");
    for (const p of PROJECTS) {
      await addDoc(collection(db, 'projects'), p);
    }

    // 3. Config General
    console.log("Configurando General...");
    await setDoc(doc(db, 'config', 'general'), {
      heroTitle1: 'ARQUITECTO',
      heroTitle2: 'DIGITAL',
      heroSubtitle: 'Construyendo el futuro de la web a través de interfaces inteligentes, sistemas robustos y diseño vanguardista.',
      heroVideoUrl: 'https://player.vimeo.com/video/1185319571?background=1&autoplay=1&loop=1&byline=0&title=0&muted=1&transparent=1',
      socialGithub: 'https://github.com',
      socialLinkedin: 'https://linkedin.com',
      socialInstagram: 'https://instagram.com',
      socialYoutube: 'https://youtube.com',
      hiddenIds: []
    });

    // 4. Profile
    console.log("Configurando Perfil...");
    await setDoc(doc(db, 'config', 'profile'), {
      bio: 'Soy un <span class="text-white font-medium">desarrollador web, arquitecto e ingeniero electrónico</span> radicado en España...',
      img: 'https://picsum.photos/seed/future/1000/1000',
      userId: '88219X',
      location: 'ESPAÑA/UE'
    });

    console.log("✅ ¡Base de datos preparada con éxito!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error subiendo datos:", error);
    process.exit(1);
  }
}

seed();
