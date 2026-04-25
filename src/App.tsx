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
  MessageCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AuthProvider, useAuth } from './AuthContext';
import { db } from './firebase';
import { collection, onSnapshot, query, orderBy, doc, getDocs, getDoc, setDoc, addDoc } from 'firebase/firestore';
import { AdminPanel } from './components/AdminPanel';
import { BACKUP_PROFILE, BACKUP_GENERAL, BACKUP_PROJECTS, BACKUP_SKILLS, BACKUP_TESTIMONIALS } from './data/backup';

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
  const { user, isAdmin, login, resetPassword } = useAuth();
  const [cat, setCat] = useState('Todos');
  const [open, setOpen] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  
  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [contactSent, setContactSent] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Dynamic Data States with Fallback
  const [projects, setProjects] = useState<any[]>(BACKUP_PROJECTS);
  const [skills, setSkills] = useState<any[]>(BACKUP_SKILLS);
  const [services, setServices] = useState<any[]>([]); // Se cargará dinámicamente
  const [testimonials, setTestimonials] = useState<any[]>(BACKUP_TESTIMONIALS);
  const [messages, setMessages] = useState<any[]>([]);
  const [general, setGeneral] = useState<any>(BACKUP_GENERAL);
  const [profile, setProfile] = useState(BACKUP_PROFILE);

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

  useEffect(() => {
    // Patrón de recuperación con caché para ahorrar lecturas
    const loadData = async () => {
      const CACHE_KEY = 'josbur_portfolio_data';
      const CACHE_EXPIRY = 3600000; // 1 hora
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

        const newData = {
          general: genS.exists() ? genS.data() : BACKUP_GENERAL,
          profile: profS.exists() ? profS.data() : BACKUP_PROFILE,
          projects: projS.empty ? BACKUP_PROJECTS : projS.docs.map(d => ({ id: d.id, ...d.data() })),
          skills: skillS.empty ? BACKUP_SKILLS : skillS.docs.map(d => ({ id: d.id, ...d.data() })),
          services: servS.empty ? [] : servS.docs.map(d => ({ id: d.id, ...d.data() })),
          testimonials: testS.empty ? [] : testS.docs.map(d => ({ id: d.id, ...d.data() }))
        };

        setGeneral(newData.general);
        setProfile(newData.profile);
        setProjects(newData.projects);
        setSkills(newData.skills);
        setServices(newData.services);
        setTestimonials(newData.testimonials);
        
        localStorage.setItem(CACHE_KEY, JSON.stringify({ data: newData, timestamp: now }));
      } catch (err) {
        console.warn("Firestore fetch error, using cache/fallback:", err);
      }
    };

    // Si es Admin, mantenemos el tiempo real para una mejor UX al editar
    if (isAdmin) {
      const unsubGen = onSnapshot(doc(db, 'config', 'general'), (snap) => snap.exists() && setGeneral(snap.data()));
      const unsubProf = onSnapshot(doc(db, 'config', 'profile'), (snap) => snap.exists() && setProfile(snap.data()));
      const unsubProjects = onSnapshot(collection(db, 'projects'), (s) => setProjects(s.docs.map(d => ({ id: d.id, ...d.data() }))));
      const unsubSkills = onSnapshot(collection(db, 'skills'), (s) => setSkills(s.docs.map(d => ({ id: d.id, ...d.data() }))));
      const unsubMessages = onSnapshot(query(collection(db, 'messages'), orderBy('date', 'desc')), (s) => setMessages(s.docs.map(d => ({ id: d.id, ...d.data() }))));
      
      return () => {
        unsubGen(); unsubProf(); unsubProjects(); unsubSkills(); unsubMessages();
      };
    } else {
      loadData();
    }
  }, [isAdmin]);

  const hasCheckedInit = useRef(false);

  useEffect(() => {
    if (isAdmin && !hasCheckedInit.current) {
      hasCheckedInit.current = true;
      const checkAndInit = async () => {
        try {
          const projectSnap = await getDocs(collection(db, 'projects'));
          if (projectSnap.empty) {
            for (const p of PROJECTS) {
              await addDoc(collection(db, 'projects'), p);
            }
          }
          const skillSnap = await getDocs(collection(db, 'skills'));
          if (skillSnap.empty) {
            for (const s of INITIAL_SKILLS) {
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

  const categories = ['Todos', 'App', 'Diseño Web', 'Wordpress', 'Figma', 'Diseño UX/UI', 'Prestashop'];
  
  const visibleSkills = useMemo(() => {
    return skills.filter(s => !general.hiddenIds?.includes(s.id));
  }, [skills, general.hiddenIds]);

  const visibleProjects = useMemo(() => {
    return projects.filter(p => !general.hiddenIds?.includes(p.id));
  }, [projects, general.hiddenIds]);

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
      <section id="perfil" className="py-20 md:py-32 px-8">
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

      <section id="conocimientos" className="py-20 md:py-32 px-8 bg-black/40">
        <div className="max-w-6xl mx-auto">
          <div className="mb-12 md:mb-20 space-y-6 md:space-y-8">
            <div className="w-12 h-1 bg-[#00f2ff]" />
            <h2 className="text-3xl md:text-4xl font-bold font-mono text-[#00f2ff] tracking-tight italic uppercase">CONOCIMIENTOS</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {visibleSkills.map((s, idx) => (
              <motion.div 
                key={idx}
                whileHover={{ y: -5, scale: 1.02 }}
                className="glass-panel p-6 border-l-4 border-l-[#00f2ff] hover:bg-[#00f2ff]/10 hover:shadow-[0_0_30px_rgba(0,242,255,0.15)] transition-all relative overflow-hidden group cursor-default"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-[#00f2ff]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                
                <div className="flex items-center justify-between mb-4 relative z-10">
                  <div className="text-[#00f2ff] group-hover:scale-110 transition-transform duration-300">
                    {IconMap[s.icon as string] || <Code2 size={18} />}
                  </div>
                  <span className="font-mono text-[12px] text-[#00f2ff] opacity-70 bg-[#00f2ff]/10 px-2 py-0.5 rounded backdrop-blur-sm">{s.level}%</span>
                </div>
                <h3 className="font-mono text-[18px] font-bold uppercase tracking-widest text-white group-hover:text-[#00f2ff] transition-colors relative z-10">{s.name}</h3>
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
        </div>
      </section>

      <section id="proyectos" className="py-20 md:py-32 px-8">
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
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-1px bg-white/10">
            <AnimatePresence mode="popLayout">
              {filtered.map(p => (
                <motion.div layout key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="group relative bg-[#080808] aspect-[4/5] overflow-hidden p-8 border border-white/10 hover:border-[#00f2ff]/30 transition-all duration-500">
                  <img src={p.img} alt={p.title} className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-100 transition-all duration-700 group-hover:scale-105" referrerPolicy="no-referrer" />
                  
                  <div className="absolute inset-0 bg-black/40 group-hover:bg-transparent transition-colors duration-700" />
                  
                  {p.description && (
                    <div className="absolute inset-x-4 top-4 z-20">
                      <div className="bg-black/95 backdrop-blur-md border border-[#00f2ff]/30 p-4 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-[-10px] group-hover:translate-y-0 shadow-[0_0_20px_rgba(0,0,0,0.8)]">
                        <p className="text-[11px] text-white font-medium leading-relaxed line-clamp-6">
                          {p.description}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="relative h-full flex flex-col justify-end z-10">
                    <span className="font-mono text-[11px] font-bold text-[#00f2ff] italic uppercase mb-2 tracking-[0.3em] drop-shadow-md">{p.cat}</span>
                    <h3 className="text-3xl font-black tracking-tighter uppercase mb-6 drop-shadow-lg leading-none text-white">{p.title}</h3>
                    <div className="flex flex-wrap gap-2 mb-8">
                      {p.tech.map(t => <span key={t} className="text-[10px] font-mono border border-white/20 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded-sm drop-shadow-md text-white/70">#{t}</span>)}
                    </div>
                    <a 
                      href={ensureAbsoluteUrl(p.link)} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 font-mono text-[12px] text-[#00f2ff] font-bold uppercase tracking-[0.2em] hover:gap-4 transition-all drop-shadow-[0_2px_4px_rgba(0,0,0,1)]"
                    >
                      Ver_Proyecto <ChevronRight size={18} />
                    </a>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* Servicios: Pricing Section */}
      <section id="servicios" className="py-24 px-8 bg-black/50">
        <div className="max-w-6xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-5xl font-black mb-4 uppercase tracking-tighter">
              Servicios <span className="text-[#00f2ff]">Premium</span>
            </h2>
            <p className="text-white/40 font-mono text-sm uppercase tracking-[0.3em]">Soluciones a medida para proyectos ambiciosos</p>
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
                    <img src={s.img} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
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
      <section id="testimonios" className="py-24 px-8 bg-black/40 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-black mb-4 uppercase tracking-tighter">Experiencia <span className="text-[#00f2ff]">Cliente</span></h2>
            <p className="text-white/40 font-mono text-[10px] uppercase tracking-[0.3em]">Lo que dicen quienes ya confiaron en el sistema</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {testimonials.map((t, idx) => (
              <motion.div 
                key={t.id}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                className="bg-white/5 border border-white/10 p-8 relative"
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className={`w-2 h-2 rounded-full ${i < (t.rating || 5) ? 'bg-[#00f2ff]' : 'bg-white/10'}`} />
                  ))}
                </div>
                <p className="text-sm text-white/80 italic mb-6 leading-relaxed">"{t.comment}"</p>
                <div className="flex items-center gap-3">
                  {t.img ? (
                    <img src={t.img} className="w-10 h-10 object-cover rounded-sm border border-[#00f2ff]/30" />
                  ) : (
                    <div className="w-10 h-10 bg-[#00f2ff]/20 flex items-center justify-center font-mono text-[10px] text-[#00f2ff]">
                      {t.name?.charAt(0)}
                    </div>
                  )}
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest">{t.name}</p>
                    <p className="text-[8px] text-white/20 font-mono">{t.date || 'Cliente Verificado'}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Formulario de Comentarios */}
          <div className="mt-20 max-w-2xl mx-auto">
            <div className="bg-black/60 border border-[#00f2ff]/20 p-10 backdrop-blur-xl shadow-[0_0_50px_rgba(0,242,255,0.05)]">
              <h3 className="font-mono text-[10px] text-[#00f2ff] uppercase tracking-[0.3em] mb-8 text-center">Dejar una Reseña del Sistema</h3>
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
                className="space-y-6"
              >
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="font-mono text-[9px] uppercase text-gray-500 tracking-widest">Identidad (Nombre/Empresa)</label>
                    <input name="name" required type="text" className="w-full bg-white/5 border border-white/10 p-4 text-xs text-white outline-none focus:border-[#00f2ff] transition-all" />
                  </div>
                  <div className="space-y-2">
                    <label className="font-mono text-[9px] uppercase text-gray-500 tracking-widest">Tu Foto (Opcional)</label>
                    <input name="photo" type="file" accept="image/*" className="w-full bg-white/5 border border-white/10 p-3 text-[9px] text-gray-500 file:bg-[#00f2ff]/10 file:text-[#00f2ff] file:border-0 file:px-3 file:py-1 file:mr-4" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="font-mono text-[9px] uppercase text-gray-500 tracking-widest">Mensaje de Feedback</label>
                  <textarea name="comment" required className="w-full bg-white/5 border border-white/10 p-4 text-xs text-white outline-none h-32 resize-none focus:border-[#00f2ff] transition-all" />
                </div>
                <button type="submit" className="w-full cyber-button py-4 font-bold uppercase tracking-widest text-[12px]">Publicar_Testimonio</button>
              </form>
            </div>
          </div>
        </div>
      </section>

      <section id="contacto" className="py-32 px-8 glass-panel border-y border-[#00f2ff]/10">
        <div className="max-w-6xl mx-auto">
          <div className="mb-20 space-y-8">
            <div className="w-12 h-1 bg-[#00f2ff]" />
            <h2 className="text-4xl font-bold font-mono text-[#00f2ff] tracking-tight italic uppercase">ESTABLECER CONTACTO</h2>
          </div>
          {contactSent ? (
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              className="bg-[#00f2ff]/5 border border-[#00f2ff]/30 p-12 text-center space-y-6 backdrop-blur-xl"
            >
              <div className="w-20 h-20 bg-[#00f2ff] rounded-full flex items-center justify-center text-black mx-auto shadow-[0_0_30px_rgba(0,242,255,0.4)]">
                <CheckCircle2 size={40} />
              </div>
              <h3 className="text-2xl font-bold font-mono text-[#00f2ff] uppercase tracking-widest">Transmisión Exitosa</h3>
              <p className="text-white/60 font-mono text-sm uppercase tracking-wider">Tu mensaje ha sido cifrado y enviado al sistema central. <br/> Recibirás una respuesta pronto.</p>
              <button 
                onClick={() => setContactSent(false)} 
                className="text-[#00f2ff] font-mono text-[10px] uppercase border-b border-[#00f2ff]/30 hover:border-[#00f2ff] transition-all pt-4"
              >
                Enviar otro mensaje
              </button>
            </motion.div>
          ) : (
            <form 
              onSubmit={async (e) => {
                e.preventDefault();
                setIsSending(true);
                const form = e.target as any;
                const name = form.elements[0].value;
                const email = form.elements[1].value;
                const message = form.elements[2].value;

                try {
                  await addDoc(collection(db, 'messages'), {
                    name,
                    email,
                    message,
                    date: new Date().toISOString(),
                    status: 'unread'
                  });
                  setContactSent(true);
                  form.reset();
                } catch (err) {
                  alert('Error en la transmisión de datos. Por favor, intenta de nuevo.');
                } finally {
                  setIsSending(false);
                }
              }} 
              className="grid sm:grid-cols-2 gap-6 text-left"
            >
              <div className="space-y-2">
                <label className="font-mono text-[14px] uppercase tracking-widest text-[#00f2ff]">Nombre</label>
                <input type="text" required className="w-full bg-white/5 border border-white/10 p-4 font-mono text-xs focus:border-[#00f2ff] outline-none transition-all" placeholder="Escribe tu nombre..." />
              </div>
              <div className="space-y-2">
                <label className="font-mono text-[14px] uppercase tracking-widest text-[#00f2ff]">Email</label>
                <input type="email" required className="w-full bg-white/5 border border-white/10 p-4 font-mono text-xs focus:border-[#00f2ff] outline-none transition-all" placeholder="correo@ejemplo.com" />
              </div>
              <div className="sm:col-span-2 space-y-2">
                <label className="font-mono text-[14px] uppercase tracking-widest text-[#00f2ff]">Solicitud</label>
                <textarea required className="w-full bg-white/5 border border-white/10 p-4 font-mono text-xs focus:border-[#00f2ff] outline-none transition-all h-32 resize-none" placeholder="¿En qué puedo ayudarte?" />
              </div>
              <button disabled={isSending} className="sm:col-span-2 cyber-button w-full h-14 flex items-center justify-center gap-4 text-[18px] font-bold">
                {isSending ? 'Transmitiendo...' : 'Transmitir_Datos'} <Send size={16} />
              </button>
            </form>
          )}
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
