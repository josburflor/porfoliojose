import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Github, 
  Linkedin, 
  Instagram, 
  ExternalLink, 
  Code2, 
  Layout, 
  Figma as FigmaIcon, 
  Layers, 
  Cpu, 
  Menu, 
  X,
  ChevronRight,
  Send,
  CheckCircle2,
  Terminal,
  Zap,
  Globe,
  LogIn,
  ShieldCheck,
  Youtube,
  Mail,
  Box,
  LogOut,
  MessageCircle,
  Search,
  Star,
  Quote,
  ChevronLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AuthProvider, useAuth } from './AuthContext';
import { collection, onSnapshot, query, orderBy, doc, getDocs, getDoc, setDoc, addDoc, updateDoc } from './localDb';
import { db } from './firebase';
import { AdminPanel } from './components/AdminPanel';
import { BACKUP_PROFILE, BACKUP_GENERAL, BACKUP_PROJECTS, BACKUP_SKILLS, BACKUP_TESTIMONIALS } from './data/backup';
import { BACKUP_SERVICES } from './data/servicesBackup';

// --- Icon Mapping Utility ---
const IconMap: Record<string, any> = {
  github: <Github size={18} />,
  cpu: <Cpu size={18} />,
  globe: <Globe size={18} />,
  figma: <FigmaIcon size={18} />,
  code: <Code2 size={18} />,
  layers: <Layers size={18} />,
  zap: <Zap size={18} />,
  box: <Box size={18} />,
  terminal: <Terminal size={18} />,
};

// --- App Component ---

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

function AppContent() {
  const { user, isAdmin, login, resetPassword, logout } = useAuth();


  // UI State
  const [cat, setCat] = useState('Todos');
  const [open, setOpen] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [contactSent, setContactSent] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Data State
  const [projects, setProjects] = useState<any[]>(BACKUP_PROJECTS);
  const [skills, setSkills] = useState<any[]>(BACKUP_SKILLS);
  const [services, setServices] = useState<any[]>(BACKUP_SERVICES); 
  const [testimonials, setTestimonials] = useState<any[]>(BACKUP_TESTIMONIALS);
  const [messages, setMessages] = useState<any[]>([]);
  const [general, setGeneral] = useState<any>(BACKUP_GENERAL);
  const [profile, setProfile] = useState(BACKUP_PROFILE);

  // Memoized Values
  const visibleSkills = useMemo(() => {
    return (skills || []).filter(s => !general?.hiddenIds?.includes(s.id));
  }, [skills, general?.hiddenIds]);

  const visibleProjects = useMemo(() => {
    return (projects || []).filter(p => !general?.hiddenIds?.includes(p.id));
  }, [projects, general?.hiddenIds]);

  // Scroll variables
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isHoveringScroll, setIsHoveringScroll] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeftState, setScrollLeftState] = useState(0);

  const handleDragStart = (x: number) => {
    if (!scrollRef.current) return;
    setIsDragging(true);
    setStartX(x - scrollRef.current.offsetLeft);
    setScrollLeftState(scrollRef.current.scrollLeft);
  };

  const handleDragMove = (x: number) => {
    if (!isDragging || !scrollRef.current) return;
    const currentX = x - scrollRef.current.offsetLeft;
    const walk = (currentX - startX) * 2;
    scrollRef.current.scrollLeft = scrollLeftState - walk;
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    let animationId: number;
    const scroll = () => {
      if (scrollRef.current && !isHoveringScroll && !isDragging) {
        scrollRef.current.scrollLeft += 0.5; // Slower, more elegant speed
        
        const { scrollLeft, scrollWidth } = scrollRef.current;
        const oneThird = scrollWidth / 3;

        if (scrollLeft >= oneThird * 2) {
          scrollRef.current.scrollLeft = oneThird;
        } else if (scrollLeft <= 0) {
          scrollRef.current.scrollLeft = oneThird;
        }
      }
      animationId = requestAnimationFrame(scroll);
    };
    
    animationId = requestAnimationFrame(scroll);
    return () => cancelAnimationFrame(animationId);
  }, [isHoveringScroll, isDragging]);

  // Manejo de posición inicial independiente (evita saltos al hacer hover)
  useEffect(() => {
    if (scrollRef.current && (visibleSkills || []).length > 0) {
      const timer = setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollLeft = scrollRef.current.scrollWidth / 3;
        }
      }, 500); // Dar tiempo al renderizado
      return () => clearTimeout(timer);
    }
  }, [(visibleSkills || []).length]);

  const handleResetPassword = async () => {
    if (!email) {
      setLoginError('Ingresa tu email para resetear la clave.');
      return;
    }
    try {
      await resetPassword(email);
      setResetSent(true);
      setLoginError('');
    } catch (err: any) {
      setLoginError('Error al enviar correo: ' + err.message);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      await login(email, password);
      setShowLogin(false);
      setEmail('');
      setPassword('');
    } catch (err: any) {
      console.error("Login detail:", err.code, err.message);
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setLoginError('Contraseña incorrecta.');
      } else {
        setLoginError('Error de acceso: ' + (err.message || 'Verifica tus datos.'));
      }
    }
  };

  // --- Auto-Caching System ---
  // Sincroniza el estado actual con el localStorage cada vez que algo cambia (Admin o Cloud)
  useEffect(() => {
    if (projects.length > 0 || skills.length > 0) {
      const dataToCache = {
        data: {
          general,
          profile,
          projects,
          skills,
          services,
          testimonials
        },
      try {
        localStorage.setItem('josbur_portfolio_data', JSON.stringify(dataToCache));
      } catch (e) {
        console.warn('No se pudo guardar la caché (probablemente excedió la cuota de 5MB).', e);
        localStorage.removeItem('josbur_portfolio_data'); // Auto-curación: elimina la caché pesada
      }
    }
  }, [projects, skills, services, testimonials, general, profile]);

  useEffect(() => {
    // Patrón de recuperación con caché para ahorrar lecturas
    const loadData = async () => {
      const CACHE_KEY = 'josbur_portfolio_data';
      const CACHE_EXPIRY = 300000; // 5 minutos (reducido para evitar persistencia de errores)
      const now = Date.now();
      
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        setGeneral(data.general);
        setProfile(data.profile);
        setProjects(data.projects);
        setSkills(data.skills);
        setServices(data.services);
        setTestimonials(data.testimonials);
        
        // Si la caché es reciente, no consultamos Firestore
        if (now - timestamp < CACHE_EXPIRY && !isAdmin) return;
      }

      // Si no hay caché o ha expirado, o es admin, consultamos Firestore una sola vez
      try {
        const [genS, profS, projS, skillS, servS, testS] = await Promise.all([
          getDoc(doc(db, 'config', 'general')),
          getDoc(doc(db, 'config', 'profile')),
          getDocs(collection(db, 'projects')),
          getDocs(collection(db, 'skills')),
          getDocs(collection(db, 'services')),
          getDocs(collection(db, 'testimonials'))
        ]);

        const rawProjects = projS.empty ? BACKUP_PROJECTS : projS.docs.map(d => ({ id: d.id, ...d.data() }));
        // Deduplicación en la carga (visitante) - Normalización de títulos para evitar duplicados por espacios o mayúsculas
        const uniqueProjects = Array.from(new Map(rawProjects.map((item: any) => [item.title?.toString().trim().toLowerCase(), item])).values());

        const newData = {
          general: genS.exists() ? genS.data() : BACKUP_GENERAL,
          profile: profS.exists() ? profS.data() : BACKUP_PROFILE,
          projects: uniqueProjects,
          skills: skillS.empty ? BACKUP_SKILLS : skillS.docs.map(d => ({ id: d.id, ...d.data() })),
          services: servS.empty ? BACKUP_SERVICES : servS.docs.map(d => ({ id: d.id, ...d.data() })),
          testimonials: testS.empty ? BACKUP_TESTIMONIALS : testS.docs.map(d => ({ id: d.id, ...d.data() }))
        };

        setGeneral(newData.general);
        setProfile(newData.profile);
        setProjects(newData.projects);
        setSkills(newData.skills);
        setServices(newData.services);
        setTestimonials(newData.testimonials);
        
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify({ data: newData, timestamp: now }));
        } catch (e) {
          console.warn('Caché excedida al intentar cargar datos', e);
          localStorage.removeItem(CACHE_KEY); // Auto-curación
        }
      } catch (err) {
        console.warn("Firestore fetch error, using cache/fallback:", err);
      }
    };

    if (isAdmin) {
      const unsubGen = onSnapshot(doc(db, 'config', 'general'), (snap) => snap.exists() ? setGeneral(snap.data()) : setGeneral(BACKUP_GENERAL));
      const unsubProf = onSnapshot(doc(db, 'config', 'profile'), (snap) => snap.exists() ? setProfile(snap.data()) : setProfile(BACKUP_PROFILE));
      const unsubProjects = onSnapshot(collection(db, 'projects'), (s) => {
        const raw = s.docs.map(d => ({ id: d.id, ...d.data() }));
        // Deduplicación en tiempo real en el estado - Normalización agresiva
        const unique = Array.from(new Map(raw.map(item => [item.title?.toString().trim().toLowerCase(), item])).values());
        setProjects(unique.length === 0 ? BACKUP_PROJECTS : unique);
      });
      const unsubSkills = onSnapshot(collection(db, 'skills'), (s) => setSkills(s.empty ? BACKUP_SKILLS : s.docs.map(d => ({ id: d.id, ...d.data() }))));
      const unsubServices = onSnapshot(collection(db, 'services'), (s) => setServices(s.empty ? BACKUP_SERVICES : s.docs.map(d => ({ id: d.id, ...d.data() }))));
      const unsubTestimonials = onSnapshot(collection(db, 'testimonials'), (s) => setTestimonials(s.empty ? BACKUP_TESTIMONIALS : s.docs.map(d => ({ id: d.id, ...d.data() }))));
      const unsubMessages = onSnapshot(query(collection(db, 'messages'), orderBy('date', 'desc')), (s) => setMessages(s.docs.map(d => ({ id: d.id, ...d.data() }))));
      
      return () => {
        unsubGen(); unsubProf(); unsubProjects(); unsubSkills(); unsubServices(); unsubTestimonials(); unsubMessages();
      };
    } else {
      loadData();
    }
  }, [isAdmin]);

  // Migración automática de categorías (Ingeniería de Consistencia)
  useEffect(() => {
    if (isAdmin) {
      const migrate = async () => {
        try {
          const snap = await getDocs(collection(db, 'projects'));
          snap.docs.forEach(async (d) => {
            if (d.data().cat === 'Diseño UX/UI') {
              await updateDoc(doc(db, 'projects', d.id), { cat: 'Animaciones' });
              console.log(`Migrado nodo ${d.id} a Animaciones`);
            }
          });
        } catch (e) { console.error("Migration error:", e); }
      };
      migrate();
    }
  }, [isAdmin]);

  // Sistema de Limpieza de Duplicados (Ingeniería de Consistencia)
  useEffect(() => {
    if (isAdmin && projects.length > 0) {
      const titles = new Set();
      const uniqueProjects = projects.filter(p => {
        if (!p.title) return true;
        const isDuplicate = titles.has(p.title);
        titles.add(p.title);
        return !isDuplicate;
      });

      if (uniqueProjects.length < projects.length) {
        console.log('Detectados duplicados en Proyectos. Limpiando...');
        try {
          localStorage.setItem('local_db_projects', JSON.stringify(uniqueProjects));
        } catch (e) {
          console.warn('No se pudo guardar local_db_projects', e);
          localStorage.removeItem('local_db_projects');
        }
        window.dispatchEvent(new Event('local_db_change_projects'));
      }
    }
  }, [isAdmin, projects]);

  const hasCheckedInit = useRef(false);

  useEffect(() => {
    if (isAdmin && !hasCheckedInit.current) {
      hasCheckedInit.current = true;
      const checkAndInit = async () => {
        try {
          const projectSnap = await getDocs(collection(db, 'projects'));
          if (projectSnap.empty) {
            for (const p of BACKUP_PROJECTS) {
              await addDoc(collection(db, 'projects'), p);
            }
          }
          const skillSnap = await getDocs(collection(db, 'skills'));
          if (skillSnap.empty) {
            for (const s of BACKUP_SKILLS) {
              await addDoc(collection(db, 'skills'), s);
            }
          }

          // Initialize Config if missing
          const genDoc = await getDoc(doc(db, 'config', 'general'));
          if (!genDoc.exists()) {
            await setDoc(doc(db, 'config', 'general'), {
              heroTitle1: 'ARQUITECTO',
              heroTitle2: 'DIGITAL',
              heroSubtitle: 'Construyendo el futuro de la web a través de interfaces inteligentes, sistemas robustos y diseño vanguardista.',
              heroVideoUrl: 'https://player.vimeo.com/video/1185319571?background=1&autoplay=1&loop=1&byline=0&title=0&muted=1&transparent=1',
              socialGithub: 'https://github.com',
              socialLinkedin: 'https://linkedin.com',
              socialInstagram: 'https://instagram.com',
              socialYoutube: 'https://youtube.com',
              hiddenIds: [],
              cvUrl: '',
              menuItems: [
                { label: 'Inicio', link: '#inicio' },
                { label: 'Perfil', link: '#perfil' },
                { label: 'Conocimientos', link: '#conocimientos' },
                { label: 'Proyectos', link: '#proyectos' },
                { label: 'Contacto', link: '#contacto' },
                { label: 'Currículo', link: 'cv' }
              ]
            });
          }

          const profDoc = await getDoc(doc(db, 'config', 'profile'));
          if (!profDoc.exists()) {
            await setDoc(doc(db, 'config', 'profile'), {
              bio: 'Soy un <span class="text-white font-medium">desarrollador web, arquitecto e ingeniero electrónico</span> radicado en España...',
              img: 'https://picsum.photos/seed/future/1000/1000',
              userId: '88219X',
              location: 'ESPAÑA/UE'
            });
          }
        } catch (e) {
          console.error("Init error:", e);
        }
      };
      checkAndInit();
    }
  }, [isAdmin]);

  const categories = ['Todos', 'App', 'Diseño Web', 'Wordpress', 'Figma', 'Animaciones', 'Prestashop'];
  


  const filtered = useMemo(() => cat === 'Todos' ? visibleProjects : visibleProjects.filter(p => p.cat === cat), [cat, visibleProjects]);

  const ensureAbsoluteUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `https://${url}`;
  };

  return (
    <div className="min-h-screen cyber-grid overflow-x-hidden">
      <header>
        <nav className="fixed top-0 w-full z-50 glass-panel h-16 flex items-center px-8 border-b border-[#00f2ff]/20" aria-label="Navegación principal">
          <div className="max-w-7xl mx-auto w-full flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#00f2ff] flex items-center justify-center text-black">
                <Terminal size={20} />
              </div>
              <span className="font-mono text-sm tracking-[0.3em] font-bold text-[#00f2ff]">BURGOS.DiSEÑO</span>
            </div>
            
            <div className="hidden md:flex gap-8 font-mono text-[16px] tracking-widest text-[#00f2ff]/80 uppercase">
              {general.menuItems?.map((item: any) => (
                <a 
                  key={item.label} 
                  href={item.link === 'cv' ? (general.cvUrl || '#') : item.link} 
                  target={item.link === 'cv' ? '_blank' : '_self'}
                  rel={item.link === 'cv' ? 'noopener noreferrer' : ''}
                  className="hover:text-[#00f2ff] transition-colors"
                >
                  {item.label}
                </a>
              ))}
              {isAdmin ? (
                <button onClick={() => setShowAdmin(true)} className="flex items-center gap-1 text-yellow-400 hover:text-yellow-200" aria-label="Abrir panel de administración">
                  <ShieldCheck size={14} /> Admin
                </button>
              ) : !user && (
                <button onClick={() => setShowLogin(true)} className="flex items-center gap-1 hover:text-[#00f2ff]" aria-label="Iniciar sesión">
                  <LogIn size={14} /> Acceso
                </button>
              )}
              
            </div>

            <button className="md:hidden text-[#00f2ff]" onClick={() => setOpen(!open)} aria-label="Abrir menú">
              {open ? <X /> : <Menu />}
            </button>
          </div>
        </nav>

        <AnimatePresence>
          {open && (
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-0 z-[60] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center gap-8 md:hidden"
            >
              {['Inicio', 'Perfil', 'Conocimientos', 'Proyectos', 'Contacto'].map(l => (
                <a 
                  key={l} 
                  href={`#${l.toLowerCase()}`} 
                  onClick={() => setOpen(false)}
                  className="font-mono text-2xl tracking-[0.3em] text-[#00f2ff] uppercase hover:scale-110 transition-transform"
                >
                  {l}
                </a>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main>
      <section id="inicio" className="relative h-screen px-8 flex flex-col items-center justify-center text-center overflow-hidden">
        <div className="absolute inset-0 bg-black">
          {general.heroVideoUrl ? (
            <div className="absolute inset-0 pointer-events-none opacity-40">
              {general.heroVideoUrl.includes('vimeo') || !isNaN(Number(general.heroVideoUrl)) ? (
                <iframe 
                  src={`https://player.vimeo.com/video/${general.heroVideoUrl.split('/').pop()}?background=1&autoplay=1&loop=1&byline=0&title=0&muted=1`}
                  className="absolute top-1/2 left-1/2 w-[100vw] h-[56.25vw] min-h-[100vh] min-w-[177.77vh] -translate-x-1/2 -translate-y-1/2"
                  frameBorder="0"
                  allow="autoplay; fullscreen"
                />
              ) : (
                <iframe 
                  src={`https://www.youtube.com/embed/${general.heroVideoUrl.includes('v=') ? general.heroVideoUrl.split('v=')[1].split('&')[0] : general.heroVideoUrl.split('/').pop()}?autoplay=1&mute=1&loop=1&controls=0&showinfo=0&rel=0&playlist=${general.heroVideoUrl.includes('v=') ? general.heroVideoUrl.split('v=')[1].split('&')[0] : general.heroVideoUrl.split('/').pop()}`}
                  className="absolute top-1/2 left-1/2 w-[100vw] h-[56.25vw] min-h-[100vh] min-w-[177.77vh] -translate-x-1/2 -translate-y-1/2"
                  frameBorder="0"
                  allow="autoplay; encrypted-media"
                />
              )}
            </div>
          ) : general.heroBgImg ? (
            <div 
              className="absolute inset-0 opacity-40 bg-cover bg-center"
              style={{ backgroundImage: `url(${general.heroBgImg})` }}
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-[#00f2ff]/10 to-transparent opacity-30" />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-black" />
        </div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-[-2] opacity-20">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#00f2ff] rounded-full blur-[160px] animate-pulse" />
        </motion.div>

        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="max-w-4xl relative z-10">
          <h2 className="font-mono text-[12px] sm:text-[16px] md:text-[20px] font-bold text-[#00f2ff] mb-4 block tracking-[0.3em] uppercase drop-shadow-lg">PORFOLIO</h2>
          <h1 className="text-4xl sm:text-6xl md:text-8xl font-black italic tracking-tighter mb-8 glow-text drop-shadow-[0_0_20px_rgba(0,242,255,0.3)] leading-[0.9]">
            {general.heroTitle1} <br /> <span className="text-[#00f2ff]">{general.heroTitle2}</span>
          </h1>
          <p className="text-[14px] sm:text-[18px] md:text-[20px] text-white/90 font-medium max-w-2xl mx-auto mb-12 drop-shadow-md leading-relaxed px-4">
            {general.heroSubtitle}
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4 sm:gap-6 px-8">
            <a 
              href="#proyectos" 
              className="w-full sm:w-auto px-8 md:px-12 py-4 md:py-5 font-mono text-[14px] md:text-[18px] font-bold border border-[#00f2ff]/30 hover:border-[#00f2ff] transition-all uppercase tracking-widest bg-[#00f2ff]/5 backdrop-blur-sm text-[#00f2ff] text-center hover:bg-[#00f2ff]/10 shadow-[0_0_20px_rgba(0,242,255,0.05)]"
            >
              Acceder Proyectos
            </a>
            <a 
              href={general.cvUrl || '#'} 
              download="Curriculo_Profesional.pdf"
              target="_blank" 
              rel="noopener noreferrer"
              onClick={(e) => {
                if (!general.cvUrl) {
                  e.preventDefault();
                  alert('El currículo se está cargando o no ha sido subido aún.');
                }
              }}
              className={`w-full sm:w-auto px-8 md:px-12 py-4 md:py-5 font-mono text-[14px] md:text-[18px] font-bold border border-[#00f2ff]/30 hover:border-[#00f2ff] transition-all uppercase tracking-widest bg-[#00f2ff]/5 backdrop-blur-sm text-[#00f2ff] text-center hover:bg-[#00f2ff]/10 shadow-[0_0_20px_rgba(0,242,255,0.05)] ${!general.cvUrl ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              Currículo
            </a>
          </div>
        </motion.div>
      </section>

      {/* Perfil: Neural Core */}
      <section id="perfil" className="py-20 md:py-32 px-8 border border-[#00f2ff]/30 mx-4 md:mx-8 my-12 rounded-[2rem] bg-black/20 shadow-[0_0_30px_rgba(0,242,255,0.05)]">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <div className="space-y-6 md:space-y-8">
            <div className="w-12 h-1 bg-[#00f2ff]" />
            <h2 className="text-3xl md:text-4xl font-bold font-mono text-[#00f2ff] tracking-tight italic uppercase">SOBRE MI PERSONA</h2>
            <div className="space-y-8 h-full max-h-[400px] md:max-h-[500px] overflow-y-auto pr-4 custom-scrollbar lg:max-h-none">
              <div className="space-y-6 text-gray-400 font-light text-base md:text-lg text-justify whitespace-pre-wrap leading-relaxed">
                {typeof profile.bio === 'string' ? (
                  <div dangerouslySetInnerHTML={{ __html: profile.bio }} />
                ) : Array.isArray(profile.bio) ? (
                  profile.bio.map((line, idx) => (
                    <p key={idx} dangerouslySetInnerHTML={{ __html: line }} className="mb-4" />
                  ))
                ) : null}
              </div>
            </div>
          </div>
          <div className="relative">
            <div className="aspect-square glass-panel p-1 border-[#00f2ff]/30 border shadow-[0_0_50px_rgba(0,242,255,0.1)]">
               <img src={profile.img} alt="Burgos Diseño - Desarrollador Digital y Desarrollador Web" className="w-full h-full object-cover grayscale brightness-75" referrerPolicy="no-referrer" />
            </div>
            <div className="absolute -top-4 -right-4 p-4 glass-panel font-mono text-[9px] text-[#00f2ff]">
              ID_USUARIO: {profile.userId}<br/>LATENCIA: 4MS<br/>LOC: {profile.location}
            </div>
          </div>
        </div>
      </section>

      <section id="conocimientos" className="py-12 md:py-20 w-full overflow-hidden relative group">
        <div className="max-w-6xl mx-auto px-8 mb-12">
          <div className="space-y-4">
            <div className="w-12 h-1 bg-[#00f2ff]" />
            <h2 className="text-3xl md:text-5xl font-black font-mono text-[#00f2ff] tracking-tighter italic uppercase">CONOCIMIENTOS</h2>
          </div>
        </div>

        {/* Máscara de desvanecimiento para estética premium */}
        <div className="absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-[#080808] to-transparent z-20 pointer-events-none" />
        <div className="absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-[#080808] to-transparent z-20 pointer-events-none" />
        
        <div 
          className="flex gap-6 overflow-x-auto pb-8 pt-4 px-8 no-scrollbar cursor-grab active:cursor-grabbing select-none relative z-10"
          ref={scrollRef}
          onMouseEnter={() => setIsHoveringScroll(true)}
          onMouseLeave={() => {
            setIsHoveringScroll(false);
            handleDragEnd();
          }}
          onMouseDown={(e) => handleDragStart(e.pageX)}
          onMouseUp={handleDragEnd}
          onMouseMove={(e) => handleDragMove(e.pageX)}
          onTouchStart={(e) => handleDragStart(e.touches[0].pageX)}
          onTouchMove={(e) => handleDragMove(e.touches[0].pageX)}
          onTouchEnd={handleDragEnd}
        >
          {[...visibleSkills, ...visibleSkills, ...visibleSkills].map((s, idx) => (
            <motion.div 
              key={`${s.id}-${idx}`}
              whileHover={{ y: -5, scale: 1.02 }}
              className="min-w-[280px] md:min-w-[320px] glass-panel p-6 border-l-4 border-l-[#00f2ff] hover:bg-[#00f2ff]/10 hover:shadow-[0_0_30px_rgba(0,242,255,0.15)] transition-all relative overflow-hidden flex-shrink-0 cursor-pointer"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[#00f2ff]/5 to-transparent opacity-0 hover:opacity-100 transition-opacity" />
              
              <div className="flex items-center justify-between mb-4 relative z-10">
                <div className="text-[#00f2ff] hover:scale-110 transition-transform duration-300">
                  {IconMap[s.icon as string] || <Code2 size={18} />}
                </div>
                <span className="font-mono text-[12px] text-[#00f2ff] opacity-70 bg-[#00f2ff]/10 px-2 py-0.5 rounded backdrop-blur-sm">{s.level}%</span>
              </div>
              <h3 className="font-mono text-[18px] font-bold uppercase tracking-widest text-white transition-colors relative z-10 line-clamp-1">{s.name}</h3>
              <div className="w-full h-[1px] bg-white/5 mt-4 relative z-10">
                <motion.div 
                  initial={{ width: 0 }} 
                  whileInView={{ width: `${s.level}%` }} 
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="h-full bg-[#00f2ff] shadow-[0_0_10px_#00f2ff]" 
                />
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      <section id="proyectos" className="py-20 md:py-32 px-8 bg-black/40 border border-[#00f2ff]/30 mx-4 md:mx-8 my-12 rounded-[2rem] shadow-[0_0_30px_rgba(0,242,255,0.05)]">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-end mb-12 md:mb-16 gap-8">
            <div className="space-y-8">
              <div className="w-12 h-1 bg-[#00f2ff]" />
              <h2 className="text-4xl font-bold font-mono text-[#00f2ff] tracking-tight italic uppercase">PROYECTOS</h2>
            </div>
            <div className="flex flex-wrap shadow-inner gap-2">
              {categories.map(c => (
                <button key={c} onClick={() => setCat(c)} className={`px-4 py-2 font-mono text-[18px] uppercase tracking-widest border transition-all ${cat === c ? 'bg-[#00f2ff] text-black border-[#00f2ff] shadow-[0_0_15px_rgba(0,242,255,0.3)]' : 'border-white/20 text-white hover:border-[#00f2ff]'}`}>
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-white/10 max-h-[1400px] overflow-y-auto custom-scrollbar scroll-smooth">
            <AnimatePresence mode="popLayout">
              {filtered.map(p => (
                <motion.div layout key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="group relative bg-[#080808] aspect-[4/5] overflow-hidden p-0 border border-white/10 hover:border-[#00f2ff]/30 transition-all duration-700 rounded-3xl">
                  {/* Background Image - NO OPACITY FADE */}
                  <img src={p.img} alt={p.title} className="absolute inset-0 w-full h-full object-cover opacity-100 transition-all duration-1000 group-hover:scale-110" referrerPolicy="no-referrer" />
                  
                  {/* Subtle Gradient for legibility */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80" />
                  
                  {/* Lupa Box (Description) */}
                  {p.description && (
                    <div className="absolute inset-x-6 top-6 z-30 pointer-events-none group-hover:pointer-events-auto">
                      <div className="bg-[#00f2ff]/60 backdrop-blur-md border border-[#00f2ff]/50 p-5 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-[-20px] group-hover:translate-y-0 shadow-[0_0_40px_rgba(0,242,255,0.2)] rounded-2xl rounded-tl-none">
                        <div className="flex items-start gap-4">
                          <div className="bg-black/60 p-2.5 rounded-xl shadow-inner flex-shrink-0">
                            <Search size={18} className="text-[#00f2ff]" />
                          </div>
                          <p className="text-[12px] text-white font-black leading-relaxed line-clamp-6 uppercase text-justify drop-shadow-sm">
                            {p.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Floating Content 'Card' at the bottom - MAXIMUM TRANSPARENCY (GLASS ONLY) */}
                  <div className="absolute inset-x-4 bottom-4 z-20">
                    <div className="bg-white/[0.02] backdrop-blur-3xl p-6 rounded-[2.5rem] border border-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.3)] group-hover:border-[#00f2ff]/10 transition-all duration-700">
                      <span className="font-mono text-[8px] font-black text-[#00f2ff] uppercase mb-1 block tracking-[0.6em] opacity-60">{p.cat}</span>
                      <h3 className="text-lg font-black tracking-tighter uppercase mb-4 text-white leading-tight group-hover:text-[#00f2ff] transition-colors drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">{p.title}</h3>
                      
                      <div className="flex flex-wrap gap-1 mb-6">
                        {p.tech.map(t => <span key={t} className="text-[7px] font-mono border border-white/5 bg-white/[0.01] px-1.5 py-0.5 rounded-full text-white/20 uppercase tracking-widest">#{t}</span>)}
                      </div>
                      
                      <a 
                        href={ensureAbsoluteUrl(p.link)} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center justify-between w-full p-1 text-[#00f2ff] font-mono text-[9px] font-black uppercase tracking-[0.4em] group/link hover:pl-2 transition-all opacity-60 hover:opacity-100"
                      >
                        <span>Explorar</span>
                        <div className="bg-[#00f2ff]/5 p-1 rounded-full group-hover/link:bg-[#00f2ff] group-hover/link:text-black transition-all">
                          <ChevronRight size={12} />
                        </div>
                      </a>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* Servicios: Pricing Section */}
      <section id="servicios" className="py-24 px-8 bg-black/50 border border-[#00f2ff]/30 mx-4 md:mx-8 my-12 rounded-[2rem] shadow-[0_0_30px_rgba(0,242,255,0.05)]">
        <div className="max-w-6xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-5xl font-black mb-4 uppercase tracking-tighter">
              Servicios <span className="text-[#00f2ff]">a tu medida</span>
            </h2>
            <p className="text-white/40 font-mono text-sm uppercase tracking-[0.3em]">Soluciones adaptadas para proyectos ambiciosos</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {services.sort((a,b) => (a.order || 0) - (b.order || 0)).map((s, idx) => (
              <motion.div 
                key={s.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-white/5 border border-white/10 p-0 hover:border-[#00f2ff]/50 transition-all group relative overflow-hidden flex flex-col"
              >
                {s.img && (
                  <div className="w-full h-40 overflow-hidden relative border-b border-white/10">
                    <img src={s.img} className="w-full h-full object-cover transition-all duration-700" />
                  </div>
                )}
                <div className="p-8 flex-1 flex flex-col">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-[#00f2ff]/5 -rotate-45 translate-x-12 -translate-y-12 group-hover:bg-[#00f2ff]/10 transition-colors" />
                  <h3 className="text-xl font-bold mb-2 uppercase tracking-tight">{s.title}</h3>
                  <p className="text-white/40 text-sm mb-6 h-12 line-clamp-2">{s.description}</p>
                  <div className="text-3xl font-black text-[#00f2ff] mb-8">
                    {s.price} <span className="text-[10px] text-white/20 uppercase font-mono tracking-widest">/ proyecto</span>
                  </div>
                  <ul className="space-y-3 mb-10 flex-1">
                    {s.features?.filter((f: string) => f.trim() !== '').map((f: string, i: number) => (
                      <li key={i} className="flex items-center gap-2 text-xs text-white/60">
                        <div className="w-1 h-1 bg-[#00f2ff] rounded-full" /> {f}
                      </li>
                    ))}
                  </ul>
                  <a href="#contacto" className="block w-full py-4 border border-[#00f2ff]/30 text-center text-[10px] font-mono uppercase tracking-[0.2em] hover:bg-[#00f2ff] hover:text-black transition-all">Contratar</a>
                </div>
              </motion.div>
            ))}
          </div>
          
          <div className="mt-20 p-8 border border-[#00f2ff]/20 bg-[#00f2ff]/5 text-center backdrop-blur-md">
            <p className="font-mono text-[10px] text-white/40 uppercase tracking-widest mb-4">¿Necesitas algo más específico?</p>
            <a href="#contacto" className="text-[#00f2ff] font-bold text-xl uppercase tracking-tighter hover:glow-text transition-all">Solicitar presupuesto personalizado →</a>
          </div>
        </div>
      </section>

      {/* Testimonios: Client Feedback */}
      <section id="testimonios" className="py-24 px-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#00f2ff]/5 to-transparent opacity-30 pointer-events-none" />
        
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-center mb-16 gap-8">
            <div className="text-center md:text-left">
              <div className="w-12 h-1 bg-[#00f2ff] mb-4 mx-auto md:mx-0" />
              <h2 className="text-3xl md:text-5xl font-black mb-2 uppercase tracking-tighter glow-text">
                Experiencia <span className="text-[#00f2ff]">Cliente</span>
              </h2>
              <p className="text-white/40 font-mono text-[10px] uppercase tracking-[0.3em]">
                Feedback directo desde el centro de control
              </p>
            </div>
            
            <div className="hidden md:flex gap-4">
              <button 
                onClick={() => {
                  const el = document.getElementById('testimonials-slider');
                  if (el) el.scrollBy({ left: -400, behavior: 'smooth' });
                }}
                className="p-3 border border-[#00f2ff]/30 text-[#00f2ff] hover:bg-[#00f2ff] hover:text-black transition-all rounded-full"
              >
                <ChevronLeft size={20} />
              </button>
              <button 
                onClick={() => {
                  const el = document.getElementById('testimonials-slider');
                  if (el) el.scrollBy({ left: 400, behavior: 'smooth' });
                }}
                className="p-3 border border-[#00f2ff]/30 text-[#00f2ff] hover:bg-[#00f2ff] hover:text-black transition-all rounded-full"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>

          <div 
            id="testimonials-slider"
            className="flex gap-6 overflow-x-auto pb-12 no-scrollbar snap-x snap-mandatory scroll-smooth"
          >
            {testimonials.map((t, idx) => (
              <motion.div 
                key={t.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                whileHover={{ y: -10 }}
                transition={{ delay: idx * 0.1, duration: 0.4 }}
                viewport={{ once: true }}
                className="min-w-full md:min-w-[450px] snap-center py-4"
              >
                <div className="h-full bg-white/[0.03] backdrop-blur-md border border-white/10 p-12 relative group hover:border-[#00f2ff]/50 hover:bg-[#00f2ff]/5 hover:shadow-[0_20px_50px_rgba(0,242,255,0.1)] transition-all duration-500 rounded-[2.5rem] overflow-hidden">
                  <div className="absolute -top-6 -right-6 text-[#00f2ff]/10 group-hover:text-[#00f2ff]/20 group-hover:scale-110 transition-all duration-700 pointer-events-none">
                    <Quote size={150} />
                  </div>
                  
                  <div className="flex gap-1.5 mb-8">
                    {[...Array(5)].map((_, i) => (
                      <Star 
                        key={i} 
                        size={16} 
                        className={i < (t.rating || 5) ? 'text-[#00f2ff] fill-[#00f2ff] drop-shadow-[0_0_5px_rgba(0,242,255,0.5)]' : 'text-white/10'} 
                      />
                    ))}
                  </div>

                  <p className="text-xl text-white/90 font-light italic mb-12 leading-relaxed relative z-10 group-hover:text-white transition-colors">
                    "{t.comment}"
                  </p>

                  <div className="flex items-center gap-6 relative z-10">
                    <div className="relative">
                      <div className="absolute inset-0 bg-[#00f2ff] blur-xl opacity-20 group-hover:opacity-60 transition-opacity duration-500" />
                      {t.img ? (
                        <img 
                          src={t.img} 
                          className="w-20 h-20 object-cover rounded-[1.5rem] border-2 border-[#00f2ff]/30 group-hover:border-[#00f2ff] relative z-10 transition-all duration-500 group-hover:scale-105" 
                          alt={t.name}
                        />
                      ) : (
                        <div className="w-20 h-20 bg-[#00f2ff]/10 flex items-center justify-center font-mono text-2xl text-[#00f2ff] rounded-[1.5rem] border-2 border-[#00f2ff]/30 group-hover:border-[#00f2ff] relative z-10 transition-all duration-500 group-hover:scale-105">
                          {t.name?.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-lg font-black uppercase tracking-widest text-white group-hover:text-[#00f2ff] transition-colors">{t.name}</p>
                      <p className="text-xs text-[#00f2ff] font-mono uppercase tracking-[0.2em] opacity-60">
                        {t.date || 'Cliente Verificado'}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Formulario de Comentarios */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-20 max-w-2xl mx-auto"
          >
            <div className="bg-white/[0.02] backdrop-blur-3xl border border-[#00f2ff]/20 p-10 rounded-[2.5rem] shadow-[0_0_50px_rgba(0,242,255,0.05)] relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#00f2ff]/50 to-transparent" />
              
              <div className="text-center mb-10">
                <h3 className="font-mono text-[12px] text-[#00f2ff] uppercase tracking-[0.4em] mb-2">Transmisión de Feedback</h3>
                <p className="text-white/40 text-[10px] uppercase tracking-widest">Registra tu experiencia en la red</p>
              </div>

              <form 
                onSubmit={async (e) => {
                  e.preventDefault();
                  const target = e.target as any;
                  const file = target.photo.files[0];
                  let imgData = "";

                  if (file) {
                    if (file.size > 500000) { alert('Foto muy pesada (máx 500kb)'); return; }
                    imgData = await new Promise((res) => {
                      const r = new FileReader();
                      r.onloadend = () => res(r.result as string);
                      r.readAsDataURL(file);
                    });
                  }

                  const newT = {
                    name: target.name.value,
                    comment: target.comment.value,
                    img: imgData,
                    rating: 5,
                    date: new Date().toLocaleDateString(),
                  };
                  try {
                    await addDoc(collection(db, 'testimonials'), newT);
                    alert('¡Gracias por tu comentario! Se ha sincronizado con el sistema.');
                    target.reset();
                  } catch (err) {
                    alert('Error en la transmisión de datos.');
                  }
                }}
                className="space-y-8"
              >
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="font-mono text-[10px] uppercase text-[#00f2ff]/60 tracking-widest ml-1">Identidad</label>
                    <input 
                      name="name" 
                      required 
                      type="text" 
                      placeholder="Nombre o Empresa"
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-white outline-none focus:border-[#00f2ff] focus:bg-[#00f2ff]/5 transition-all placeholder:text-white/10" 
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="font-mono text-[10px] uppercase text-[#00f2ff]/60 tracking-widest ml-1">Avatar_Upload</label>
                    <div className="relative group">
                      <input 
                        name="photo" 
                        type="file" 
                        accept="image/*" 
                        className="w-full opacity-0 absolute inset-0 cursor-pointer z-10" 
                      />
                      <div className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-[10px] text-white/40 flex items-center justify-between group-hover:border-[#00f2ff]/30 transition-all">
                        <span>Seleccionar archivo...</span>
                        <ExternalLink size={14} className="text-[#00f2ff]" />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="font-mono text-[10px] uppercase text-[#00f2ff]/60 tracking-widest ml-1">Mensaje</label>
                  <textarea 
                    name="comment" 
                    required 
                    placeholder="Escribe tu reseña aquí..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-white outline-none h-32 resize-none focus:border-[#00f2ff] focus:bg-[#00f2ff]/5 transition-all placeholder:text-white/10" 
                  />
                </div>
                <button 
                  type="submit" 
                  className="w-full bg-[#00f2ff] text-black py-4 rounded-xl font-black uppercase tracking-[0.3em] text-[12px] hover:shadow-[0_0_30px_rgba(0,242,255,0.4)] transition-all active:scale-[0.98]"
                >
                  Enviar_Testimonio
                </button>
              </form>
            </div>
          </motion.div>
        </div>
      </section>

      <section id="contacto" className="py-32 px-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-tr from-[#00f2ff]/5 via-transparent to-[#00f2ff]/5 pointer-events-none" />
        
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            {/* Info Side */}
            <div className="space-y-12">
              <div className="space-y-6">
                <div className="w-12 h-1 bg-[#00f2ff]" />
                <h2 className="text-4xl md:text-6xl font-black text-white italic uppercase tracking-tighter leading-[0.9]">
                  ¿LISTO PARA EL <br /> <span className="text-[#00f2ff] glow-text">SIGUIENTE NIVEL?</span>
                </h2>
                <p className="text-white/50 font-mono text-sm md:text-lg max-w-md leading-relaxed">
                  Establece una conexión directa con el sistema para iniciar tu proyecto digital.
                </p>
              </div>

              <div className="space-y-8">
                <div className="flex items-center gap-6 group">
                  <div className="w-14 h-14 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-[#00f2ff] group-hover:bg-[#00f2ff] group-hover:text-black transition-all">
                    <Mail size={24} />
                  </div>
                  <div>
                    <p className="font-mono text-[10px] uppercase text-white/30 tracking-widest">Protocolo_Email</p>
                    <p className="text-lg font-bold text-white tracking-tight">contacto@burgosdiseno.com</p>
                  </div>
                </div>

                <div className="flex items-center gap-6 group">
                  <div className="w-14 h-14 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-[#00f2ff] group-hover:bg-[#00f2ff] group-hover:text-black transition-all">
                    <MessageCircle size={24} />
                  </div>
                  <div>
                    <p className="font-mono text-[10px] uppercase text-white/30 tracking-widest">Enlace_WhatsApp</p>
                    <p className="text-lg font-bold text-white tracking-tight">+34 613 476 029</p>
                  </div>
                </div>
              </div>

              <div className="pt-8 flex gap-4">
                {general.socialGithub && <a href={ensureAbsoluteUrl(general.socialGithub)} target="_blank" rel="noopener noreferrer" className="p-4 bg-white/5 border border-white/10 rounded-xl hover:text-[#00f2ff] hover:border-[#00f2ff]/50 transition-all"><Github size={20} /></a>}
                {general.socialLinkedin && <a href={ensureAbsoluteUrl(general.socialLinkedin)} target="_blank" rel="noopener noreferrer" className="p-4 bg-white/5 border border-white/10 rounded-xl hover:text-[#00f2ff] hover:border-[#00f2ff]/50 transition-all"><Linkedin size={20} /></a>}
                {general.socialInstagram && <a href={ensureAbsoluteUrl(general.socialInstagram)} target="_blank" rel="noopener noreferrer" className="p-4 bg-white/5 border border-white/10 rounded-xl hover:text-[#00f2ff] hover:border-[#00f2ff]/50 transition-all"><Instagram size={20} /></a>}
              </div>
            </div>

            {/* Form Side */}
            <div className="relative">
              <div className="absolute inset-0 bg-[#00f2ff]/10 blur-[80px] rounded-full opacity-20 pointer-events-none" />
              
              <div className="bg-white/[0.03] backdrop-blur-3xl border border-white/10 p-10 rounded-[2.5rem] shadow-[0_0_50px_rgba(0,0,0,0.3)] relative z-10">
                {contactSent ? (
                  <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }} 
                    animate={{ scale: 1, opacity: 1 }} 
                    className="py-12 text-center space-y-6"
                  >
                    <div className="w-20 h-20 bg-[#00f2ff] rounded-full flex items-center justify-center text-black mx-auto shadow-[0_0_30px_rgba(0,242,255,0.4)]">
                      <CheckCircle2 size={40} />
                    </div>
                    <h3 className="text-2xl font-bold font-mono text-[#00f2ff] uppercase tracking-widest">Transmisión Exitosa</h3>
                    <p className="text-white/60 font-mono text-xs uppercase tracking-wider">Tu mensaje ha sido cifrado y enviado al sistema central.</p>
                    <button 
                      onClick={() => setContactSent(false)} 
                      className="text-[#00f2ff] font-mono text-[10px] uppercase border-b border-[#00f2ff]/30 hover:border-[#00f2ff] transition-all pt-4"
                    >
                      Enviar otro mensaje
                    </button>
                  </motion.div>
                ) : (
                  <form 
                    action="javascript:void(0)"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      setIsSending(true);
                      const currentForm = e.currentTarget;
                      const formData = new FormData(currentForm);
                      const name = formData.get('nombre') as string;
                      const email = formData.get('correo') as string;
                      const phone = formData.get('telefono') as string;
                      const message = formData.get('mensaje') as string;

                      try {
                        await addDoc(collection(db, 'messages'), {
                          name,
                          email,
                          phone,
                          message,
                          date: new Date().toISOString(),
                          status: 'unread'
                        });
                        setContactSent(true);
                        currentForm.reset();
                      } catch (err: any) {
                        alert('Error al transmitir datos: ' + err.message);
                      } finally {
                        setIsSending(false);
                      }
                    }} 
                    className="space-y-6"
                  >
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="font-mono text-[10px] uppercase tracking-widest text-[#00f2ff]/60 ml-1">Nombre</label>
                        <input name="nombre" type="text" required className="w-full bg-white/5 border border-white/10 rounded-xl p-4 font-mono text-xs text-white focus:border-[#00f2ff] outline-none transition-all" placeholder="ID_USUARIO" />
                      </div>
                      <div className="space-y-2">
                        <label className="font-mono text-[10px] uppercase tracking-widest text-[#00f2ff]/60 ml-1">Email</label>
                        <input name="correo" type="email" required className="w-full bg-white/5 border border-white/10 rounded-xl p-4 font-mono text-xs text-white focus:border-[#00f2ff] outline-none transition-all" placeholder="CANAL_DATOS" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="font-mono text-[10px] uppercase tracking-widest text-[#00f2ff]/60 ml-1">Número de Teléfono</label>
                      <input name="telefono" type="tel" required className="w-full bg-white/5 border border-white/10 rounded-xl p-4 font-mono text-xs text-white focus:border-[#00f2ff] outline-none transition-all" placeholder="+XX XXX XXX XXX" />
                    </div>
                    <div className="space-y-2">
                      <label className="font-mono text-[10px] uppercase tracking-widest text-[#00f2ff]/60 ml-1">Solicitud</label>
                      <textarea name="mensaje" required className="w-full bg-white/5 border border-white/10 rounded-xl p-4 font-mono text-xs text-white focus:border-[#00f2ff] outline-none transition-all h-32 resize-none" placeholder="DESCRIBE_TU_PROYECTO..." />
                    </div>
                    <button disabled={isSending} className="w-full bg-[#00f2ff] text-black h-14 rounded-xl flex items-center justify-center gap-4 text-[14px] font-black uppercase tracking-[0.3em] hover:shadow-[0_0_30px_rgba(0,242,255,0.4)] transition-all active:scale-[0.98]">
                      {isSending ? 'Transmitiendo...' : 'Iniciar_Conexión'} <Send size={16} />
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Modals */}
      {showAdmin && <AdminPanel 
        projects={projects} 
        skills={skills} 
        services={services}
        testimonials={testimonials}
        messages={messages}
        initialGeneral={general} 
        initialProfile={profile} 
        onClose={() => setShowAdmin(false)} 
      />}
      
      {showLogin && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[#0a0a0a] border border-[#00f2ff]/30 p-8 max-w-md w-full">
            <div className="flex justify-between items-center mb-8">
              <h2 className="font-mono text-xl text-[#00f2ff] tracking-widest uppercase">Admin_Auth</h2>
              <button onClick={() => setShowLogin(false)} className="text-white/40 hover:text-[#00f2ff]"><X size={20} /></button>
            </div>
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <label className="font-mono text-[9px] uppercase tracking-widest text-gray-500">Protocolo_Email</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 p-4 font-mono text-xs focus:border-[#00f2ff] outline-none"
                  required
                />
              </div>
              
              {!isResetting ? (
                <>
                  <div className="space-y-2">
                    <label className="font-mono text-[9px] uppercase tracking-widest text-gray-500">Clave_Acceso</label>
                    <input 
                      type="password" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 p-4 font-mono text-xs focus:border-[#00f2ff] outline-none"
                      required
                    />
                  </div>
                  {loginError && <p className="text-red-500 font-mono text-[10px] uppercase">{loginError}</p>}
                  <button type="submit" className="cyber-button w-full py-4 flex items-center justify-center gap-2 uppercase tracking-widest">
                    Autenticar_Sistema <ShieldCheck size={16} />
                  </button>

                  <button 
                    type="button" 
                    onClick={() => setIsResetting(true)}
                    className="w-full text-center font-mono text-[8px] text-white/30 uppercase tracking-widest hover:text-[#00f2ff]"
                  >
                    ¿Olvidaste tu clave?
                  </button>
                </>
              ) : (
                <div className="space-y-6">
                  {resetSent ? (
                    <div className="p-4 border border-green-500/30 bg-green-500/5 text-green-400 font-mono text-[10px] uppercase">
                      Email de recuperación enviado. Revisa tu bandeja de entrada.
                    </div>
                  ) : (
                    <>
                      <p className="text-white/50 font-mono text-[10px] uppercase tracking-widest leading-relaxed">Se enviará un enlace de recuperación a tu correo electrónico.</p>
                      {loginError && <p className="text-red-500 font-mono text-[10px] uppercase">{loginError}</p>}
                      <button 
                        type="button" 
                        onClick={handleResetPassword}
                        className="cyber-button w-full py-4 flex items-center justify-center gap-2 uppercase tracking-widest"
                      >
                        Enviar Enlace <Mail size={16} />
                      </button>
                    </>
                  )}
                  <button 
                    type="button" 
                    onClick={() => { setIsResetting(false); setResetSent(false); }}
                    className="w-full text-center font-mono text-[8px] text-white/30 uppercase tracking-widest hover:text-[#00f2ff]"
                  >
                    Volver al Login
                  </button>
                </div>
              )}
            </form>
          </motion.div>
        </div>
      )}

      </main>

      <footer className="py-12 px-8 flex flex-col items-center gap-8 border-t border-white/5 bg-black/40 relative overflow-hidden">
        {/* Cyber decoration */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-px bg-gradient-to-r from-transparent via-[#00f2ff]/50 to-transparent" />
        
        <div className="flex flex-col items-center gap-4">
          <div className="font-mono text-[10px] text-gray-500 tracking-[0.5em] uppercase text-center">Protocolo de Identidad // {new Date().getFullYear()} Burgos Diseño ✨</div>
          <div className="flex items-center gap-6">
            <div className="font-mono text-[11px] text-[#00f2ff] tracking-widest uppercase flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#00f2ff] animate-pulse" /> +34 613 476 029
            </div>
            
            {/* Admin Entry/Exit Button */}
            <button 
              onClick={() => user ? logout() : setShowLogin(true)} 
              className="flex items-center gap-2 px-4 py-1.5 border border-[#00f2ff]/20 hover:border-[#00f2ff] bg-white/5 font-mono text-[9px] text-white/50 hover:text-[#00f2ff] transition-all uppercase tracking-widest group"
            >
              {user ? <LogOut size={12} className="group-hover:rotate-180 transition-transform" /> : <LogIn size={12} />}
              {user ? 'Cerrar_Enlace' : 'Acceso_Privado'}
            </button>
          </div>
          <div className="flex gap-8">
            {general.socialGithub && <a href={ensureAbsoluteUrl(general.socialGithub)} target="_blank" rel="noopener noreferrer" className="hover:text-[#00f2ff] transition-all" aria-label="GitHub"><Github size={20} /></a>}
            {general.socialLinkedin && <a href={ensureAbsoluteUrl(general.socialLinkedin)} target="_blank" rel="noopener noreferrer" className="hover:text-[#00f2ff] transition-all" aria-label="LinkedIn"><Linkedin size={20} /></a>}
            {general.socialInstagram && <a href={ensureAbsoluteUrl(general.socialInstagram)} target="_blank" rel="noopener noreferrer" className="hover:text-[#00f2ff] transition-all" aria-label="Instagram"><Instagram size={20} /></a>}
            {general.socialYoutube && <a href={ensureAbsoluteUrl(general.socialYoutube)} target="_blank" rel="noopener noreferrer" className="hover:text-[#ff0000] transition-all" aria-label="YouTube"><Youtube size={20} /></a>}
          </div>
        </div>
      </footer>

      {/* Floating Social Sidebar */}
      <div className="fixed right-4 top-1/2 -translate-y-1/2 z-[150] flex flex-col gap-5 p-3 bg-black/60 backdrop-blur-xl border border-[#00f2ff]/20 rounded-full transition-all duration-500 hover:border-[#00f2ff] hover:shadow-[0_0_20px_rgba(0,242,255,0.2)] group">
        {general.socialGithub && <a href={ensureAbsoluteUrl(general.socialGithub)} target="_blank" rel="noopener noreferrer" className="text-white/60 hover:text-[#00f2ff] transition-all hover:scale-125" aria-label="Github"><Github size={18} /></a>}
        {general.socialLinkedin && <a href={ensureAbsoluteUrl(general.socialLinkedin)} target="_blank" rel="noopener noreferrer" className="text-white/60 hover:text-[#00f2ff] transition-all hover:scale-125" aria-label="LinkedIn"><Linkedin size={18} /></a>}
        {general.socialInstagram && <a href={ensureAbsoluteUrl(general.socialInstagram)} target="_blank" rel="noopener noreferrer" className="text-white/60 hover:text-[#00f2ff] transition-all hover:scale-125" aria-label="Instagram"><Instagram size={18} /></a>}
        {general.socialYoutube && <a href={ensureAbsoluteUrl(general.socialYoutube)} target="_blank" rel="noopener noreferrer" className="text-white/60 hover:text-[#ff0000] transition-all hover:scale-125" aria-label="YouTube"><Youtube size={18} /></a>}
      </div>

      {/* Floating WhatsApp Button */}
      <a 
        href="https://wa.me/34613476029" 
        target="_blank" 
        rel="noopener noreferrer"
        className="fixed left-4 bottom-4 md:left-6 md:bottom-6 z-[160] w-12 h-12 md:w-14 md:h-14 bg-[#25D366] rounded-full flex items-center justify-center text-white shadow-[0_0_20px_rgba(37,211,102,0.4)] hover:scale-110 active:scale-90 transition-all group"
      >
        <MessageCircle size={24} className="md:w-7 md:h-7" />
        <span className="absolute left-16 bg-black/90 border border-white/10 px-4 py-2 rounded font-mono text-[10px] text-[#25D366] uppercase tracking-widest whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity hidden md:block pointer-events-none">
          Contactar por WhatsApp
        </span>
      </a>
    </div>
  );
}
