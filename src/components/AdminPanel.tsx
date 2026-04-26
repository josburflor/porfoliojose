import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { db } from '../firebase';
import { doc, updateDoc, setDoc, collection, addDoc, deleteDoc, arrayUnion } from '../localDb';
import { updateEmail, updatePassword } from 'firebase/auth';
import { X, Plus, Save, Trash2, LogOut, Shield, Key, Edit2, Globe, FileText, Settings, User, CreditCard, MessageSquare, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AdminPanelProps {
  onClose: () => void;
  projects: any[];
  skills: any[];
  services: any[];
  testimonials: any[];
  messages: any[];
  initialGeneral: any;
  initialProfile: any;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onClose, projects, skills, services, testimonials, messages, initialGeneral, initialProfile }) => {
  const { logout, isAdmin, user } = useAuth();
  const [activeTab, setActiveTab] = useState<'proyectos' | 'habilidades' | 'servicios' | 'testimonios' | 'mensajes' | 'contenido' | 'configuracion' | 'seguridad'>('proyectos');

  // Security & Global States
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [secMsg, setSecMsg] = useState({ type: '', text: '' });
  const [genData, setGenData] = useState(initialGeneral);
  const [profData, setProfData] = useState(initialProfile);
  const [contMsg, setContMsg] = useState({ type: '', text: '' });
  const [isSaving, setIsSaving] = useState(false);

  // Editing States
  const [editingProject, setEditingProject] = useState<any>(null);
  const [editingSkill, setEditingSkill] = useState<any>(null);
  const [editingService, setEditingService] = useState<any>(null);

  useEffect(() => {
    if (contMsg.text) {
      const timer = setTimeout(() => setContMsg({ type: '', text: '' }), 4000);
      return () => clearTimeout(timer);
    }
  }, [contMsg]);

  // Handlers
  const handleUpdateContent = async () => {
    setIsSaving(true);
    try {
      await setDoc(doc(db, 'config', 'general'), genData, { merge: true });
      await setDoc(doc(db, 'config', 'profile'), profData, { merge: true });
      setContMsg({ type: 'success', text: 'ACTUALIZADO' });
    } catch (err: any) {
      setContMsg({ type: 'error', text: err.message });
    } finally { setIsSaving(false); }
  };

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault(); setIsSaving(true);
    try {
      const { id, ...data } = editingProject;
      if (id) await updateDoc(doc(db, 'projects', id), data);
      else await addDoc(collection(db, 'projects'), { ...data, order: projects.length });
      setEditingProject(null);
      setContMsg({ type: 'success', text: 'ACTUALIZADO' });
    } catch (err: any) { setContMsg({ type: 'error', text: err.message }); }
    finally { setIsSaving(false); }
  };

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault(); setIsSaving(true);
    try {
      const { id, ...data } = editingService;
      if (id) await updateDoc(doc(db, 'services', id), data);
      else await addDoc(collection(db, 'services'), { ...data, order: services.length });
      setEditingService(null);
    } catch (err: any) { setContMsg({ type: 'error', text: err.message }); }
    finally { setIsSaving(false); }
  };

  const handleDelete = async (coll: string, id: string) => {
    if (!window.confirm('¿Eliminar definitivamente?')) return;
    try { await deleteDoc(doc(db, coll, id)); }
    catch (err: any) { setContMsg({ type: 'error', text: err.message }); }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'project' | 'hero' | 'profile') => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500000) { 
        alert('OPTIMIZACIÓN REQUERIDA: La imagen pesa ' + (file.size/1024).toFixed(0) + 'KB. El máximo permitido es 500KB para mantener la web rápida.'); 
        return; 
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const res = reader.result as string;
        if (target === 'project') setEditingProject({ ...editingProject, img: res });
        else if (target === 'hero') setGenData({ ...genData, heroBgImg: res });
        else if (target === 'profile') setProfData({ ...profData, img: res });
      };
      reader.readAsDataURL(file);
    }
  };

  const tabs = [
    { id: 'proyectos', label: 'Proyectos', icon: <Globe size={14} /> },
    { id: 'habilidades', label: 'Habilidades', icon: <Settings size={14} /> },
    { id: 'servicios', label: 'Servicios', icon: <CreditCard size={14} /> },
    { id: 'testimonios', label: 'Testimonios', icon: <Star size={14} /> },
    { id: 'mensajes', label: 'Mensajes', icon: <MessageSquare size={14} /> },
    { id: 'contenido', label: 'Contenido', icon: <User size={14} /> },
    { id: 'configuracion', label: 'Configuración', icon: <Settings size={14} /> },
    { id: 'seguridad', label: 'Seguridad', icon: <Shield size={14} /> },
  ];

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-2 md:p-4">
      <div className="bg-[#080808] border border-[#00f2ff]/20 w-full max-w-6xl h-[95vh] md:h-[85vh] flex flex-col relative">
        
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-black/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#00f2ff] flex items-center justify-center text-black font-bold">Z</div>
            <h2 className="font-mono text-sm tracking-[0.2em] font-bold text-[#00f2ff] uppercase">Core Administration</h2>
          </div>
          <div className="flex gap-4">
            <button onClick={logout} className="text-white/40 hover:text-red-500"><LogOut size={20} /></button>
            <button onClick={onClose} className="text-white/40 hover:text-[#00f2ff]"><X size={24} /></button>
          </div>
        </div>

        {/* Tab Selector - Responsive with horizontal scroll */}
        <div className="flex border-b border-white/5 bg-black/20 overflow-x-auto no-scrollbar scroll-smooth snap-x">
          {tabs.map(t => (
            <button 
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`flex items-center gap-2 px-6 py-4 font-mono text-[10px] uppercase tracking-widest transition-all relative whitespace-nowrap snap-start ${activeTab === t.id ? 'text-[#00f2ff]' : 'text-white/40 hover:text-white'}`}
            >
              <span className="opacity-70">{t.icon}</span> {t.label}
              {activeTab === t.id && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00f2ff] shadow-[0_0_10px_#00f2ff]" />}
            </button>
          ))}
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar relative">
          <AnimatePresence>
            {contMsg.text && (
              <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={`fixed top-24 left-1/2 -translate-x-1/2 z-50 px-6 py-3 border font-mono text-[9px] uppercase tracking-[0.2em] backdrop-blur-xl ${contMsg.type === 'success' ? 'bg-green-500/10 border-green-500/50 text-green-400' : 'bg-red-500/10 border-red-500/50 text-red-400'}`}>
                {contMsg.text}
              </motion.div>
            )}
          </AnimatePresence>

          {/* PROYECTOS */}
          {activeTab === 'proyectos' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center mb-8">
                <h3 className="font-mono text-[10px] text-white/50 uppercase tracking-[0.3em]">Nodos de Portafolio</h3>
                {!editingProject && (
                  <button onClick={() => setEditingProject({ title: '', cat: 'App', tech: [], img: '', description: '', link: '' })} className="cyber-button text-[9px] px-6 py-2">Nuevo Nodo</button>
                )}
              </div>
              {editingProject ? (
                <form onSubmit={handleSaveProject} className="bg-white/5 border border-white/10 p-8 space-y-6 animate-in fade-in duration-500">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[9px] font-mono uppercase text-gray-500 tracking-widest">Título del Proyecto</label>
                      <input type="text" placeholder="Ej: E-commerce Premium" required value={editingProject.title} onChange={e => setEditingProject({...editingProject, title: e.target.value})} className="w-full bg-black/50 border border-white/10 p-4 text-xs text-white outline-none focus:border-[#00f2ff]" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-mono uppercase text-gray-500 tracking-widest">Categoría del Nodo</label>
                      <select value={editingProject.cat} onChange={e => setEditingProject({...editingProject, cat: e.target.value})} className="w-full bg-black/50 border border-white/10 p-4 text-xs text-white outline-none focus:border-[#00f2ff]">
                        {['App', 'Diseño Web', 'Wordpress', 'Figma', 'Animaciones', 'Prestashop'].map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] font-mono uppercase text-gray-500 tracking-widest">Imagen del Proyecto</label>
                    <div className="flex gap-4 items-center bg-black/30 p-4 border border-white/5">
                      {editingProject.img && <img src={editingProject.img} className="w-20 h-20 object-cover border border-[#00f2ff]/30" />}
                      <div className="space-y-2 flex-1">
                        <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'project')} className="text-[9px] text-gray-500 file:bg-[#00f2ff]/10 file:text-[#00f2ff] file:border-0 file:px-4 file:py-1 file:cursor-pointer" />
                        <input type="text" placeholder="O pega URL de imagen" value={editingProject.img} onChange={e => setEditingProject({...editingProject, img: e.target.value})} className="w-full bg-black/20 border border-white/5 p-2 text-[10px] text-white/50 outline-none" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] font-mono uppercase text-gray-500 tracking-widest">Descripción Técnica</label>
                    <textarea placeholder="Describe las tecnologías y el objetivo del proyecto..." value={editingProject.description} onChange={e => setEditingProject({...editingProject, description: e.target.value})} className="w-full bg-black/50 border border-white/10 p-4 text-xs text-white outline-none h-32 resize-none" />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] font-mono uppercase text-gray-500 tracking-widest">Enlace de Producción (Link)</label>
                    <input type="text" placeholder="https://..." value={editingProject.link} onChange={e => setEditingProject({...editingProject, link: e.target.value})} className="w-full bg-black/50 border border-white/10 p-4 text-xs text-[#00f2ff] outline-none" />
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button type="submit" className="cyber-button flex-1 py-4 font-bold uppercase text-[10px]">Sincronizar Nodo</button>
                    <button type="button" onClick={() => setEditingProject(null)} className="flex-1 bg-white/5 text-white/50 uppercase text-[10px] hover:bg-white/10 transition-colors">Descartar</button>
                  </div>
                </form>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {projects.map(p => (
                    <div key={p.id} className="bg-white/5 border border-white/10 p-4 flex justify-between items-center group hover:border-[#00f2ff]/30 transition-all">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <img src={p.img} className="w-10 h-10 object-cover grayscale group-hover:grayscale-0 transition-all" />
                        <div className="overflow-hidden">
                          <p className="font-bold text-[10px] truncate uppercase">{p.title}</p>
                          <p className="text-[8px] font-mono text-[#00f2ff]">{p.cat}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setEditingProject(p)} className="p-2 text-white/20 hover:text-[#00f2ff]"><Edit2 size={12} /></button>
                        <button onClick={() => handleDelete('projects', p.id)} className="p-2 text-white/20 hover:text-red-500"><Trash2 size={12} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* HABILIDADES (CONOCIMIENTOS) */}
          {activeTab === 'habilidades' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center mb-8">
                <h3 className="font-mono text-[10px] text-white/50 uppercase tracking-[0.3em]">Matriz de Conocimientos</h3>
                {!editingSkill && (
                  <button onClick={() => setEditingSkill({ name: '', level: 80, icon: 'Code2' })} className="cyber-button text-[9px] px-6 py-2">Nueva Habilidad</button>
                )}
              </div>
              
              {editingSkill ? (
                <form onSubmit={async (e) => {
                  e.preventDefault(); setIsSaving(true);
                  try {
                    const { id, ...data } = editingSkill;
                    if (id) await updateDoc(doc(db, 'skills', id), data);
                    else await addDoc(collection(db, 'skills'), { ...data, order: skills.length });
                    setEditingSkill(null);
                  } catch (err: any) { setContMsg({ type: 'error', text: err.message }); }
                  finally { setIsSaving(false); }
                }} className="bg-white/5 border border-white/10 p-8 space-y-6">
                  <div className="grid md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="text-[9px] font-mono uppercase text-gray-500">Nombre</label>
                      <input type="text" required value={editingSkill.name} onChange={e => setEditingSkill({...editingSkill, name: e.target.value})} className="w-full bg-black/50 border border-white/10 p-4 text-xs text-white outline-none" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-mono uppercase text-gray-500">Nivel (%)</label>
                      <input type="number" min="0" max="100" required value={editingSkill.level} onChange={e => setEditingSkill({...editingSkill, level: parseInt(e.target.value)})} className="w-full bg-black/50 border border-white/10 p-4 text-xs text-[#00f2ff] outline-none" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-mono uppercase text-gray-500">Icono (Lucide ID)</label>
                      <input type="text" placeholder="Code2, Figma, Database..." value={editingSkill.icon} onChange={e => setEditingSkill({...editingSkill, icon: e.target.value})} className="w-full bg-black/50 border border-white/10 p-4 text-xs text-white outline-none" />
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <button type="submit" className="cyber-button flex-1 py-4 uppercase text-[10px]">Guardar Habilidad</button>
                    <button type="button" onClick={() => setEditingSkill(null)} className="flex-1 bg-white/5 text-white/50 text-[10px] uppercase">Cancelar</button>
                  </div>
                </form>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {skills.map(s => (
                    <div key={s.id} className="bg-white/5 border border-white/10 p-4 flex justify-between items-center group">
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 bg-[#00f2ff]/10 flex items-center justify-center text-[#00f2ff] font-mono text-[10px]">{s.level}%</div>
                        <p className="font-bold text-[10px] uppercase tracking-widest">{s.name}</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setEditingSkill(s)} className="p-2 text-white/20 hover:text-[#00f2ff]"><Edit2 size={12} /></button>
                        <button onClick={() => handleDelete('skills', s.id)} className="p-2 text-white/20 hover:text-red-500"><Trash2 size={12} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SERVICIOS */}
          {activeTab === 'servicios' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center mb-8">
                <h3 className="font-mono text-[10px] text-white/50 uppercase tracking-[0.3em]">Modelos de Servicio ({services.length})</h3>
                {!editingService && (
                  <button onClick={() => setEditingService({ title: '', description: '', price: '', features: [] })} className="cyber-button text-[9px] px-6 py-2">Nuevo Servicio</button>
                )}
              </div>
              {editingService ? (
                <form onSubmit={handleSaveService} className="bg-white/5 border border-white/10 p-8 space-y-6 animate-in fade-in duration-500">
                  <div className="grid md:grid-cols-2 gap-6">
                    <input type="text" placeholder="Nombre del Servicio" required value={editingService.title} onChange={e => setEditingService({...editingService, title: e.target.value})} className="w-full bg-black/50 border border-white/10 p-4 text-xs text-white outline-none" />
                    <input type="text" placeholder="Precio (ej: 499€)" required value={editingService.price} onChange={e => setEditingService({...editingService, price: e.target.value})} className="w-full bg-black/50 border border-white/10 p-4 text-xs text-[#00f2ff] outline-none" />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[9px] font-mono uppercase text-gray-500 tracking-widest">Imagen del Servicio (Jerárquica)</label>
                    <div className="flex flex-col sm:flex-row gap-4 items-center bg-black/30 p-4 border border-white/5">
                      {editingService.img && <img src={editingService.img} className="w-full sm:w-20 h-24 sm:h-12 object-cover border border-[#00f2ff]/30" />}
                      <input type="file" accept="image/*" onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) {
                          if (f.size > 500000) { alert('Máximo 500KB.'); return; }
                          const r = new FileReader();
                          r.onloadend = () => setEditingService({...editingService, img: r.result as string});
                          r.readAsDataURL(f);
                        }
                      }} className="text-[9px] text-gray-500 file:bg-[#00f2ff]/10 file:text-[#00f2ff] file:border-0 file:px-4 file:py-1 file:cursor-pointer" />
                    </div>
                  </div>

                  <textarea placeholder="Descripción Corta" value={editingService.description} onChange={e => setEditingService({...editingService, description: e.target.value})} className="w-full bg-black/50 border border-white/10 p-4 text-xs text-white outline-none h-20 resize-none" />
                  <div className="space-y-2">
                    <label className="text-[9px] font-mono uppercase text-gray-500">Características (una por línea)</label>
                    <textarea 
                      placeholder="Característica 1&#10;Característica 2..." 
                      value={editingService.features?.join('\n') || ''} 
                      onChange={e => setEditingService({...editingService, features: e.target.value.split('\n')})} 
                      className="w-full bg-black/50 border border-white/10 p-4 text-xs text-white outline-none h-32 font-mono" 
                    />
                  </div>
                  <div className="flex gap-4">
                    <button type="submit" className="cyber-button flex-1 py-4 uppercase font-bold text-[10px]">Guardar Servicio</button>
                    <button type="button" onClick={() => setEditingService(null)} className="flex-1 bg-white/5 text-white/50 text-[10px] uppercase">Cancelar</button>
                  </div>
                </form>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {services.map(s => (
                    <div key={s.id} className="bg-white/5 border border-white/10 p-6 flex justify-between items-start hover:border-[#00f2ff]/30 transition-all">
                      <div>
                        <h4 className="font-bold text-xs uppercase tracking-tight mb-1">{s.title}</h4>
                        <p className="text-[#00f2ff] font-mono text-sm font-black mb-2">{s.price}</p>
                        <p className="text-[10px] text-white/40 line-clamp-2">{s.description}</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setEditingService(s)} className="p-2 text-white/20 hover:text-[#00f2ff] transition-colors"><Edit2 size={14} /></button>
                        <button onClick={() => handleDelete('services', s.id)} className="p-2 text-white/20 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TESTIMONIOS */}
          {activeTab === 'testimonios' && (
            <div className="space-y-6">
              <h3 className="font-mono text-[10px] text-white/50 uppercase tracking-[0.3em] mb-8">Gestión de Feedback Cliente ({testimonials.length})</h3>
              <div className="grid gap-4">
                {testimonials.length === 0 ? (
                  <div className="text-center py-20 border border-dashed border-white/10 font-mono text-[10px] text-white/20 uppercase">No hay testimonios registrados</div>
                ) : testimonials.map(t => (
                  <div key={t.id} className="bg-white/5 border border-white/10 p-6 flex justify-between items-center group">
                    <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-center">
                      <div className="w-12 h-12 bg-[#00f2ff]/10 flex-shrink-0 flex items-center justify-center font-mono text-xs text-[#00f2ff]">
                        {t.name?.charAt(0)}
                      </div>
                      <div className="text-center sm:text-left flex-1">
                        <div className="flex flex-col sm:flex-row items-center gap-3 mb-1">
                          <p className="font-bold text-[10px] uppercase tracking-widest">{t.name}</p>
                          <div className="flex gap-0.5">
                            {[...Array(5)].map((_, i) => <Star key={i} size={8} className={i < (t.rating || 5) ? 'fill-[#00f2ff] text-[#00f2ff]' : 'text-white/10'} />)}
                          </div>
                        </div>
                        <p className="text-[11px] text-white/60 italic">"{t.comment}"</p>
                      </div>
                    </div>
                    <button onClick={() => handleDelete('testimonials', t.id)} className="p-4 text-white/10 group-hover:text-red-500 transition-colors ml-4" title="Eliminar Comentario">
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* MENSAJES DE CONTACTO */}
          {activeTab === 'mensajes' && (
            <div className="space-y-6">
              <h3 className="font-mono text-[10px] text-white/50 uppercase tracking-[0.3em] mb-8">Bandeja de Entrada ({messages.length})</h3>
              <div className="grid gap-4">
                {messages.length === 0 ? (
                  <div className="text-center py-20 border border-dashed border-white/10 font-mono text-[10px] text-white/20 uppercase">No hay mensajes entrantes</div>
                ) : messages.map(m => (
                  <div key={m.id} className="bg-white/5 border border-white/10 p-6 flex flex-col gap-4 group hover:border-[#00f2ff]/30 transition-all">
                    <div className="flex justify-between items-start">
                      <div className="flex gap-4 items-center">
                        <div className="w-10 h-10 bg-[#00f2ff] flex items-center justify-center text-black font-bold text-xs">
                          {m.name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-[11px] uppercase tracking-widest text-white">{m.name}</p>
                          <p className="text-[10px] font-mono text-[#00f2ff]">{m.email}</p>
                          {m.phone && <p className="text-[9px] font-mono text-white/40">{m.phone}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-[9px] font-mono text-white/20 uppercase">
                          {new Date(m.date).toLocaleString()}
                        </span>
                        <button onClick={() => handleDelete('messages', m.id)} className="text-white/20 hover:text-red-500 transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    <div className="bg-black/40 p-4 border border-white/5">
                      <p className="text-xs text-white/80 leading-relaxed whitespace-pre-wrap">{m.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CONTENIDO (HERO, PERFIL Y REDES) */}
          {activeTab === 'contenido' && (
            <div className="space-y-12">
              {/* HERO SECTION */}
              <div className="bg-white/5 border border-white/10 p-8 space-y-8">
                <h3 className="font-mono text-[10px] text-[#00f2ff] uppercase tracking-widest border-b border-white/10 pb-4">Personalización Hero</h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[8px] font-mono text-gray-500 uppercase">Título Línea 1 (Principal)</label>
                    <input type="text" placeholder="Ej: ARQUITECTO" value={genData.heroTitle1} onChange={e => setGenData({...genData, heroTitle1: e.target.value})} className="w-full bg-black/50 border border-white/10 p-4 text-xs text-white outline-none focus:border-[#00f2ff]" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[8px] font-mono text-gray-500 uppercase">Título Línea 2 (Destacado)</label>
                    <input type="text" placeholder="Ej: DIGITAL" value={genData.heroTitle2} onChange={e => setGenData({...genData, heroTitle2: e.target.value})} className="w-full bg-black/50 border border-white/10 p-4 text-xs text-white outline-none focus:border-[#00f2ff]" />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-[8px] font-mono text-gray-500 uppercase">Subtítulo Hero (Mensaje de Bienvenida)</label>
                    <textarea value={genData.heroSubtitle} onChange={e => setGenData({...genData, heroSubtitle: e.target.value})} rows={3} className="w-full bg-black/50 border border-white/10 p-4 text-xs text-white resize-none outline-none focus:border-[#00f2ff]" placeholder="Describe tu propuesta de valor..." />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[8px] font-mono text-gray-500 uppercase">Video ID o URL (Vimeo/YouTube)</label>
                    <input type="text" placeholder="Ej: 1185319571" value={genData.heroVideoUrl} onChange={e => setGenData({...genData, heroVideoUrl: e.target.value})} className="w-full bg-black/50 border border-white/10 p-4 text-xs text-white outline-none focus:border-[#00f2ff]" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[8px] font-mono text-gray-500 uppercase">Fondo Alternativo (Imagen)</label>
                    <div className="flex gap-4 items-center bg-black/30 p-4 border border-white/5">
                      {genData.heroBgImg && <img src={genData.heroBgImg} className="w-12 h-12 object-cover border border-[#00f2ff]/30" />}
                      <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'hero')} className="text-[9px] text-gray-500 file:bg-[#00f2ff]/10 file:text-[#00f2ff] file:border-0 file:px-3 file:py-1 file:cursor-pointer" />
                    </div>
                  </div>
                </div>
              </div>

              {/* SOCIAL & IDENTITY */}
              <div className="bg-white/5 border border-white/10 p-8 space-y-8">
                <div className="flex justify-between items-center border-b border-white/10 pb-4">
                  <h3 className="font-mono text-[10px] text-[#00f2ff] uppercase tracking-widest">Identidad y Redes Sociales</h3>
                  <span className="text-[8px] text-white/20 font-mono">Los links se actualizan en tiempo real en Footer y Sidebar</span>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[8px] font-mono text-gray-500 uppercase">LinkedIn Profile URL</label>
                    <input 
                      type="text" 
                      placeholder="www.linkedin.com/in/usuario" 
                      value={genData.socialLinkedin} 
                      onChange={e => setGenData({...genData, socialLinkedin: e.target.value})} 
                      className="w-full bg-black/50 border border-white/10 p-4 text-xs text-[#00f2ff] outline-none focus:border-[#00f2ff]" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[8px] font-mono text-gray-500 uppercase">GitHub Profile URL</label>
                    <input 
                      type="text" 
                      placeholder="github.com/usuario" 
                      value={genData.socialGithub} 
                      onChange={e => setGenData({...genData, socialGithub: e.target.value})} 
                      className="w-full bg-black/50 border border-white/10 p-4 text-xs text-white outline-none focus:border-[#00f2ff]" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[8px] font-mono text-gray-500 uppercase">Instagram Profile URL</label>
                    <input 
                      type="text" 
                      placeholder="instagram.com/usuario" 
                      value={genData.socialInstagram} 
                      onChange={e => setGenData({...genData, socialInstagram: e.target.value})} 
                      className="w-full bg-black/50 border border-white/10 p-4 text-xs text-white outline-none focus:border-[#00f2ff]" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[8px] font-mono text-gray-500 uppercase">YouTube Channel URL</label>
                    <input 
                      type="text" 
                      placeholder="youtube.com/@canal" 
                      value={genData.socialYoutube} 
                      onChange={e => setGenData({...genData, socialYoutube: e.target.value})} 
                      className="w-full bg-black/50 border border-white/10 p-4 text-xs text-white outline-none focus:border-[#00f2ff]" 
                    />
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-6 pt-4 border-t border-white/5">
                  <div className="space-y-2">
                    <label className="text-[8px] font-mono text-gray-500 uppercase">ID de Usuario</label>
                    <input type="text" value={profData.userId} onChange={e => setProfData({...profData, userId: e.target.value})} className="w-full bg-black/50 border border-white/10 p-4 text-xs text-white" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[8px] font-mono text-gray-500 uppercase">Ubicación</label>
                    <input type="text" value={profData.location} onChange={e => setProfData({...profData, location: e.target.value})} className="w-full bg-black/50 border border-white/10 p-4 text-xs text-white" />
                  </div>
                </div>
              </div>

              {/* PROFILE SECTION */}
              <div className="bg-white/5 border border-white/10 p-8 space-y-8">
                <h3 className="font-mono text-[10px] text-[#00f2ff] uppercase tracking-widest border-b border-white/10 pb-4">Biografía y Foto de Perfil</h3>
                <div className="flex flex-col sm:flex-row gap-6 items-center mb-6 bg-black/20 p-4">
                  <img src={profData.img} className="w-24 h-24 object-cover border border-[#00f2ff]/30 rounded-full" />
                  <div className="space-y-2">
                    <label className="text-[8px] font-mono text-gray-500 uppercase">Actualizar Foto</label>
                    <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'profile')} className="text-[10px] text-white/50" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[8px] font-mono text-gray-500 uppercase">Bio (HTML Permitido)</label>
                  <textarea value={profData.bio} onChange={e => setProfData({...profData, bio: e.target.value})} className="w-full bg-black/50 border border-white/10 p-4 text-xs text-white h-48 resize-none font-mono" placeholder="Usa etiquetas <span> para destacar texto..." />
                </div>
              </div>

              <div className="flex justify-end gap-4 sticky bottom-0 bg-[#080808] py-4 border-t border-white/5 z-20">
                <button onClick={handleUpdateContent} disabled={isSaving} className="cyber-button w-full sm:w-auto px-12 py-4 flex items-center justify-center gap-2">
                  <Save size={16} /> {isSaving ? 'Guardando...' : 'Sincronizar Todo el Contenido'}
                </button>
              </div>
            </div>
          )}

          {/* CONFIGURACIÓN */}
          {activeTab === 'configuracion' && (
            <div className="space-y-8">
              <div className="bg-white/5 border border-white/10 p-8 space-y-6">
                <h3 className="font-mono text-[10px] text-[#00f2ff] uppercase tracking-widest border-b border-white/10 pb-4">Documentación y Menú</h3>
                <label className="flex items-center gap-4 cursor-pointer bg-white/5 p-8 border border-dashed border-white/20 hover:border-[#00f2ff] transition-all">
                  <FileText className="text-[#00f2ff]" />
                  <span className="font-mono text-[10px] uppercase text-white/50">{genData.cvUrl ? '✓ Currículo Cargado' : 'Subir PDF del Currículo'}</span>
                  <input type="file" accept=".pdf" className="hidden" onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      const r = new FileReader();
                      r.onloadend = () => setGenData({...genData, cvUrl: r.result as string});
                      r.readAsDataURL(f);
                    }
                  }} />
                </label>
                <div className="space-y-3 mt-6">
                  {genData.menuItems?.map((m: any, i: number) => (
                    <div key={i} className="flex gap-2">
                      <input type="text" value={m.label} onChange={e => {
                        const ni = [...genData.menuItems]; ni[i].label = e.target.value; setGenData({...genData, menuItems: ni});
                      }} className="w-1/3 bg-black/50 border border-white/10 p-3 text-[10px] text-white" />
                      <input type="text" value={m.link} onChange={e => {
                        const ni = [...genData.menuItems]; ni[i].link = e.target.value; setGenData({...genData, menuItems: ni});
                      }} className="flex-1 bg-black/50 border border-white/10 p-3 text-[10px] text-[#00f2ff]" />
                    </div>
                  ))}
                </div>
              </div>
              <button onClick={handleUpdateContent} className="cyber-button w-full py-4 uppercase font-bold text-[10px]">Guardar Configuración Global</button>
            </div>
          )}

          {/* SEGURIDAD */}
          {activeTab === 'seguridad' && (
            <div className="max-w-xl bg-white/5 border border-white/10 p-8 space-y-6">
              <h3 className="font-mono text-[10px] text-[#00f2ff] uppercase tracking-widest border-b border-white/10 pb-4">Control de Acceso Crítico</h3>
              <div className="p-4 bg-blue-500/5 border border-blue-500/20 mb-6">
                <p className="font-mono text-[9px] text-blue-300 leading-relaxed uppercase">
                  Nota: Por seguridad, Firebase puede requerir un inicio de sesión reciente para cambiar el email o la contraseña. Si recibes un error, cierra sesión e ingresa de nuevo.
                </p>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[8px] font-mono text-gray-500 uppercase">Nuevo Email del Administrador</label>
                  <input type="email" placeholder="ejemplo@correo.com" value={newEmail} onChange={e => setNewEmail(e.target.value)} className="w-full bg-black/50 border border-white/10 p-4 text-xs text-white outline-none focus:border-[#00f2ff]" />
                </div>
                <button 
                  onClick={async () => {
                    if (!newEmail) return;
                    setSecMsg({type:'info', text:'Procesando cambio de email...'});
                    try { 
                      await updateEmail(user!, newEmail); 
                      setSecMsg({type:'success', text:'Email actualizado correctamente.'}); 
                    } catch (e: any) { 
                      const msg = e.code === 'auth/requires-recent-login' ? 'Error: Debes re-autenticarte (Log Out/Log In) para cambiar el email.' : e.message;
                      setSecMsg({type:'error', text: msg}); 
                    }
                  }} 
                  className="w-full border border-[#00f2ff]/30 py-3 text-[#00f2ff] text-[10px] font-mono uppercase hover:bg-[#00f2ff]/10 transition-all"
                >
                  Actualizar Protocolo de Email
                </button>
              </div>

              <div className="pt-6 border-t border-white/10 space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="text-[10px] font-mono text-white uppercase tracking-widest">Base de Datos Local (Offline)</h4>
                    <p className="text-[8px] text-white/40 uppercase mt-1">Si se activa, la web funcionará 100% local sin usar la nube.</p>
                  </div>
                  <button 
                    onClick={() => {
                      const isLocal = localStorage.getItem('DEV_LOCAL_MODE') === 'true';
                      localStorage.setItem('DEV_LOCAL_MODE', (!isLocal).toString());
                      window.location.reload();
                    }}
                    className={`px-4 py-2 text-[10px] font-mono uppercase border transition-all ${
                      localStorage.getItem('DEV_LOCAL_MODE') === 'true' 
                        ? 'bg-green-500/20 border-green-500 text-green-400' 
                        : 'border-white/20 text-white/40 hover:border-[#00f2ff] hover:text-[#00f2ff]'
                    }`}
                  >
                    {localStorage.getItem('DEV_LOCAL_MODE') === 'true' ? 'Activado: MODO LOCAL' : 'Desactivado: MODO CLOUD'}
                  </button>
                </div>
              </div>

              {secMsg.text && (
                <div className={`p-4 text-[9px] uppercase border animate-pulse ${
                  secMsg.type === 'success' ? 'border-green-500/30 text-green-400 bg-green-500/5' : 
                  secMsg.type === 'info' ? 'border-blue-500/30 text-blue-400 bg-blue-500/5' :
                  'border-red-500/30 text-red-400 bg-red-500/5'
                }`}>
                  {secMsg.text}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-white/5 bg-black/50 text-right">
          <p className="font-mono text-[7px] text-white/20 uppercase tracking-[0.4em]">SISTEMA CENTRAL // BURGOS.ADMIN</p>
        </div>
      </div>
    </div>
  );
};
