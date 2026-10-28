"use client";

import React, { useState } from "react";
import { 
  LayoutDashboard, 
  Ticket as TicketIcon, 
  Kanban, 
  Bot, 
  BarChart3, 
  Bell, 
  Plus, 
  Search, 
  Clock, 
  X, 
  FileText, 
  Send
} from "lucide-react";

// Tipado explícito para las tarjetas de Kanban y evitar el error de TypeScript
interface KanbanCard {
  id: string;
  title: string;
  user: string;
  badge: string;
  active?: boolean;
}

interface KanbanColumn {
  name: string;
  count: number;
  cards: KanbanCard[];
}

const DASHBOARD_METRICS = {
  abiertos: 5,
  enProgreso: 0,
  resueltosHoy: 0,
  total: 7
};

const RECENT_ACTIVITY = [
  { id: 1, user: "Agente IA", action: "comentó (interno) en", target: "PRD-2026-0007", time: "hace alrededor de 12 horas" },
  { id: 2, user: "Recepción Telefónica", action: "creó", target: "PRO-2026-0007", time: "hace 1 día" },
  { id: 3, user: "Felipe Figueroa", action: "actualizó", target: "H12 - Informe de Propuesta y Arquitectura para Aplicación Móvil", time: "hace 7 días" },
  { id: 4, user: "Felipe Figueroa", action: "creó", target: "H12 - Informe de Propuesta y Arquitectura para Aplicación Móvil", time: "hace 7 días" },
  { id: 5, user: "Felipe Figueroa", action: "completó", target: "Prueba tarjeta", time: "hace 7 días" },
];

const SUPPORT_TICKETS = [
  { id: "PRO-2026-0007", title: "Prodeb: Un documento no aparece en la empresa Prodeb, sin mensaje de error, y el cliente no puede entrar a la planta.", source: "RT Recepción Telefónica", status: "Abierto", priority: "Crítica", priorityColor: "bg-red-500/20 text-red-400 border-red-500/30", time: "hace 1 día" },
  { id: "PRO-2026-0006", title: "ProDev: Ticket de prueba para generar un ticket en ProDev Hub.", source: "RT Recepción Telefónica", status: "Abierto", priority: "Media", priorityColor: "bg-amber-500/20 text-amber-400 border-amber-500/30", time: "hace 8 días" },
  { id: "PRO-2026-0005", title: "ProDev: La página de ProDev Hub no responde al intentar registrar un ticket.", source: "RT Recepción Telefónica", status: "Abierto", priority: "Alta", priorityColor: "bg-orange-500/20 text-orange-400 border-orange-500/30", time: "hace 9 días" },
  { id: "PRO-2026-0004", title: "ProDev (prueba): Ticket de prueba del sistema de voz", source: "RT Recepción Telefónica", status: "Abierto", priority: "Baja", priorityColor: "bg-slate-500/20 text-slate-400 border-slate-500/30", time: "hace 10 días" },
  { id: "PRO-2026-0003", title: "Dar horas a tarjetas de GRC", source: "BQ Benjamín Quiroz", status: "Resuelto", priority: "Alta", priorityColor: "bg-orange-500/20 text-orange-400 border-orange-500/30", time: "hace 3 meses" },
  { id: "PRO-2026-0002", title: "Revisar Horas de F80 por solicitud de GRC", source: "BQ Benjamín Quiroz", status: "Resuelto", priority: "Alta", priorityColor: "bg-orange-500/20 text-orange-400 border-orange-500/30", time: "hace 4 meses" },
  { id: "PRO-2026-0001", title: "Usuario tipo MANAGER en Tenant GRC no puede crear un nuevo usuario", source: "BQ Benjamín Quiroz", status: "Abierto", priority: "Baja", priorityColor: "bg-slate-500/20 text-slate-400 border-slate-500/30", time: "hace 4 meses" },
];

const KANBAN_COLUMNS: KanbanColumn[] = [
  {
    name: "Backlog",
    count: 7,
    cards: [
      { id: "H11", title: "Hub en Vivo", user: "Benjamín Quiroz", badge: "BQ" },
      { id: "H2", title: "Enlazar Tickets y/o Cards", user: "Benjamín Quiroz", badge: "BQ" },
      { id: "H3", title: "Asignación automática de IDs a Cards", user: "Benjamín Quiroz", badge: "BQ" },
      { id: "H6", title: "Revisitar Tableros", user: "Benjamín Quiroz", badge: "BQ" },
    ]
  },
  {
    name: "En Progreso",
    count: 1,
    cards: [
      { id: "H00", title: "Prueba tarjeta", user: "Felipe Figueroa", badge: "FF" }
    ]
  },
  {
    name: "En Revisión",
    count: 1,
    cards: [
      { id: "H12", title: "Informe de Propuesta y Arquitectura para Aplicación Móvil", user: "Felipe Figueroa", badge: "FF", active: true }
    ]
  },
  {
    name: "Completado",
    count: 4,
    cards: [
      { id: "H5", title: "Nombrar/Renombrar Adjuntos", user: "Benjamín Quiroz", badge: "BQ" },
      { id: "H1", title: "Base de Conocimientos para IA", user: "Benjamín Quiroz", badge: "BQ" },
    ]
  }
];

export default function Home() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "tickets" | "tableros" | "ia" | "reportes">("dashboard");
  const [selectedCard, setSelectedCard] = useState<boolean>(false);
  const [kanbanColIndex, setKanbanColIndex] = useState(2);
  const [newComment, setNewComment] = useState("");

  return (
    <div className="min-h-screen bg-[#0d111a] text-slate-100 flex flex-col justify-between w-full max-w-md mx-auto shadow-2xl border-x border-slate-800/80 font-sans selection:bg-blue-600">
      
      {/* Header Superior Móvil Fijo */}
      <header className="sticky top-0 z-40 bg-[#0d111a]/95 backdrop-blur-md border-b border-slate-800/80 px-4 py-3 flex items-center justify-between w-full">
        <div className="flex items-center space-x-2.5">
          <div className="bg-blue-600 p-1.5 rounded-lg text-white font-bold text-xs tracking-wider shadow-md shadow-blue-500/20">
            PRODEV
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-bold text-sm tracking-tight text-white">ProDev <span className="text-blue-500">Hub</span></span>
              <span className="text-[9px] bg-blue-500/10 text-blue-400 font-semibold px-1.5 py-0.2 rounded border border-blue-500/20">
                Móvil
              </span>
            </div>
            <p className="text-[10px] text-slate-400 capitalize">{activeTab}</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button className="p-1.5 text-slate-400 hover:text-white rounded-lg relative">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full" />
          </button>
          <div className="w-7 h-7 rounded-full bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-xs font-bold text-blue-300">
            FF
          </div>
        </div>
      </header>

      {/* ÁREA DE CONTENIDO DE ANCHO HOMOGÉNEO */}
      <main className="flex-1 overflow-y-auto px-4 py-4 pb-20 w-full space-y-4">
        
        {/* VISTA 1: DASHBOARD */}
        {activeTab === "dashboard" && (
          <div className="space-y-4 animate-in fade-in duration-200 w-full">
            <div>
              <h2 className="text-base font-bold text-white">Dashboard</h2>
              <p className="text-[11px] text-slate-400">Resumen general de actividad</p>
            </div>

            <div className="grid grid-cols-2 gap-2.5 w-full">
              <div className="bg-[#141a29] p-3 rounded-xl border border-slate-800/80">
                <span className="text-[10px] text-slate-400 block">Tickets Abiertos</span>
                <span className="text-xl font-bold text-white mt-1 block">{DASHBOARD_METRICS.abiertos}</span>
                <span className="text-[9px] text-slate-500 mt-1 block">Pendientes de atención</span>
              </div>
              <div className="bg-[#141a29] p-3 rounded-xl border border-slate-800/80">
                <span className="text-[10px] text-slate-400 block">En Progreso</span>
                <span className="text-xl font-bold text-amber-400 mt-1 block">{DASHBOARD_METRICS.enProgreso}</span>
                <span className="text-[9px] text-slate-500 mt-1 block">Tickets en curso</span>
              </div>
              <div className="bg-[#141a29] p-3 rounded-xl border border-slate-800/80">
                <span className="text-[10px] text-slate-400 block">Resueltos Hoy</span>
                <span className="text-xl font-bold text-emerald-400 mt-1 block">{DASHBOARD_METRICS.resueltosHoy}</span>
                <span className="text-[9px] text-slate-500 mt-1 block">Tickets resueltos</span>
              </div>
              <div className="bg-[#141a29] p-3 rounded-xl border border-slate-800/80">
                <span className="text-[10px] text-slate-400 block">Total</span>
                <span className="text-xl font-bold text-blue-400 mt-1 block">{DASHBOARD_METRICS.total}</span>
                <span className="text-[9px] text-slate-500 mt-1 block">Tickets totales</span>
              </div>
            </div>

            <div className="bg-[#141a29] p-3.5 rounded-xl border border-slate-800/80 space-y-3 w-full">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Actividad Reciente</h3>
              <div className="space-y-3">
                {RECENT_ACTIVITY.map((act) => (
                  <div key={act.id} className="flex items-start space-x-2.5 text-xs pb-2 border-b border-slate-800/50 last:border-0 last:pb-0">
                    <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] font-bold text-blue-400 shrink-0">
                      {act.user.split(" ").map(n => n[0]).join("").slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-300 leading-tight break-words">
                        <span className="font-semibold text-white">{act.user}</span> {act.action} <span className="text-blue-400 font-medium">{act.target}</span>
                      </p>
                      <span className="text-[10px] text-slate-500 block mt-0.5">{act.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* VISTA 2: TICKETS */}
        {activeTab === "tickets" && (
          <div className="space-y-4 animate-in fade-in duration-200 w-full">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white">Tickets de Soporte</h2>
                <p className="text-[11px] text-slate-400">{SUPPORT_TICKETS.length} tickets en total</p>
              </div>
              <button className="bg-blue-600 text-white text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-1 font-semibold shadow-md">
                <Plus className="w-3.5 h-3.5" />
                <span>Nuevo</span>
              </button>
            </div>

            <div className="relative w-full">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input 
                type="text" 
                placeholder="Buscar por título o número..."
                className="w-full bg-[#141a29] border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="space-y-2.5 w-full">
              {SUPPORT_TICKETS.map((ticket) => (
                <div key={ticket.id} className="bg-[#141a29] border border-slate-800 rounded-xl p-3 space-y-2 w-full">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] font-bold text-blue-400">{ticket.id}</span>
                    <div className="flex items-center space-x-1.5">
                      <span className={`text-[9px] font-semibold px-2 py-0.5 rounded border ${ticket.priorityColor}`}>
                        {ticket.priority}
                      </span>
                      <span className={`text-[9px] font-semibold px-2 py-0.5 rounded ${ticket.status === "Abierto" ? "bg-blue-500/20 text-blue-400" : "bg-emerald-500/20 text-emerald-400"}`}>
                        {ticket.status}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-200 line-clamp-2 leading-snug">{ticket.title}</p>
                  <div className="flex items-center justify-between pt-1 text-[10px] text-slate-500 border-t border-slate-800/50">
                    <span className="truncate max-w-[160px]">{ticket.source}</span>
                    <span>{ticket.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VISTA 3: TABLEROS / KANBAN */}
        {activeTab === "tableros" && (
          <div className="space-y-4 animate-in fade-in duration-200 w-full">
            <div>
              <h2 className="text-base font-bold text-white">Hub / Tableros</h2>
              <p className="text-[11px] text-slate-400">ProDev Hub Kanban</p>
            </div>

            <div className="flex space-x-1.5 overflow-x-auto pb-1 w-full max-w-full">
              {KANBAN_COLUMNS.map((col, idx) => (
                <button 
                  key={col.name}
                  onClick={() => setKanbanColIndex(idx)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-colors ${
                    kanbanColIndex === idx 
                      ? "bg-blue-600 text-white" 
                      : "bg-[#141a29] text-slate-400 border border-slate-800"
                  }`}
                >
                  {col.name} ({col.count})
                </button>
              ))}
            </div>

            <div className="space-y-2.5 w-full">
              {KANBAN_COLUMNS[kanbanColIndex].cards.map((card) => (
                <div 
                  key={card.id}
                  onClick={() => card.id === "H12" && setSelectedCard(true)}
                  className={`bg-[#141a29] border rounded-xl p-3 space-y-2 active:scale-98 transition-all cursor-pointer w-full ${
                    card.active ? "border-blue-500 shadow-md shadow-blue-500/10" : "border-slate-800"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-blue-400">{card.id}</span>
                    <span className="w-5 h-5 rounded-full bg-slate-800 text-[9px] font-bold text-slate-300 flex items-center justify-center border border-slate-700">
                      {card.badge}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-white">{card.title}</h4>
                  <p className="text-[10px] text-slate-400">{card.user}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VISTA 4: ASISTENTE IA */}
        {activeTab === "ia" && (
          <div className="space-y-4 animate-in fade-in duration-200 min-h-[65vh] flex flex-col justify-between w-full">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Bot className="w-5 h-5 text-blue-400" />
                <span>Asistente IA</span>
              </h2>
              <p className="text-[11px] text-slate-400">Consultas de tickets y automatización</p>
            </div>

            <div className="bg-[#141a29] border border-slate-800 rounded-xl p-4 text-center space-y-2 my-auto w-full">
              <Bot className="w-10 h-10 text-blue-400 mx-auto" />
              <div className="text-xs font-bold text-white">¿En qué puedo ayudarte hoy?</div>
              <p className="text-[11px] text-slate-400">Pregúntame sobre el estado de un ticket o resumen de actividad.</p>
            </div>

            <div className="relative w-full">
              <input 
                type="text" 
                placeholder="Escribe un mensaje al asistente..."
                className="w-full bg-[#141a29] border border-slate-800 rounded-xl pl-3 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
              <button className="absolute right-2 top-2 p-1 bg-blue-600 text-white rounded-lg">
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* VISTA 5: REPORTES */}
        {activeTab === "reportes" && (
          <div className="space-y-4 animate-in fade-in duration-200 w-full">
            <div>
              <h2 className="text-base font-bold text-white">Reportes</h2>
              <p className="text-[11px] text-slate-400">Métricas y análisis de rendimiento</p>
            </div>

            <div className="bg-[#141a29] border border-slate-800 p-3.5 rounded-xl space-y-3 w-full">
              <div className="text-xs font-bold text-white">Tickets por Prioridad</div>
              <div className="h-28 bg-slate-950/60 rounded-lg border border-slate-800/80 p-2 flex items-center justify-center space-x-4 w-full">
                <div className="w-16 h-16 rounded-full border-4 border-amber-500 border-t-red-500 border-r-orange-500 flex items-center justify-center text-[10px] font-bold text-slate-300 shrink-0">
                  7 Total
                </div>
                <div className="text-[10px] space-y-1">
                  <div className="text-red-400">● Crítica (14%)</div>
                  <div className="text-orange-400">● Alta (43%)</div>
                  <div className="text-amber-400">● Media (14%)</div>
                  <div className="text-slate-400">● Baja (29%)</div>
                </div>
              </div>
            </div>

            <div className="bg-[#141a29] border border-slate-800 p-3.5 rounded-xl space-y-2 w-full">
              <div className="text-xs font-bold text-white">Tiempo Promedio de Resolución</div>
              <div className="text-2xl font-extrabold text-blue-400">68.7 hrs</div>
              <p className="text-[10px] text-slate-500">Basado en los últimos 30 días</p>
            </div>
          </div>
        )}

      </main>

      {/* MODAL MÓVIL: DETALLE DE TARJETA KANBAN */}
      {selectedCard && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-end justify-center p-0">
          <div className="bg-[#141a29] border-t border-slate-800 rounded-t-2xl w-full max-w-md max-h-[85vh] overflow-y-auto p-4 space-y-4 animate-in slide-in-from-bottom duration-200">
            
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-mono font-bold text-blue-400">H12 • En Revisión</span>
                <h3 className="font-bold text-sm text-white mt-0.5">Informe de Propuesta y Arquitectura para Aplicación Móvil</h3>
              </div>
              <button onClick={() => setSelectedCard(false)} className="text-slate-400 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1 text-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Descripción</span>
              <p className="text-slate-300 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80 leading-relaxed text-[11px]">
                Investigar que stack se utilizará en la app móvil para ver los tickets generados, ingresar comentarios y archivos, recibir notificaciones push...
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Adjuntos (1)</span>
              <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800 flex items-center space-x-2 text-xs">
                <FileText className="w-4 h-4 text-blue-400" />
                <div className="flex-1 truncate">
                  <div className="text-white font-medium text-[11px]">Informe Tecnico Estrategia Mov...pdf</div>
                  <div className="text-[9px] text-slate-500">221.0 KB • Felipe Figueroa</div>
                </div>
              </div>
            </div>

            <div className="space-y-2 border-t border-slate-800 pt-3">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Comentarios (3)</span>
              
              <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80 space-y-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="font-bold text-blue-400">Mario Quiroz</span>
                  <span className="text-slate-500">hace 5 días</span>
                </div>
                <p className="text-[11px] text-slate-200">Vamos por la opción B de la propuesta del documento.</p>
              </div>

              <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80 space-y-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="font-bold text-blue-400">Mario Quiroz</span>
                  <span className="text-slate-500">hace 5 días</span>
                </div>
                <div className="text-[11px] text-slate-200 space-y-1">
                  <span className="font-bold text-white block">STACK HUB</span>
                  <p className="text-[10px] text-slate-400">
                    • Next.js 16 (App Router)<br/>
                    • React 19<br/>
                    • TypeScript<br/>
                    • Tailwind CSS 4<br/>
                    • Prisma 6
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <input 
                type="text" 
                placeholder="Escribe un comentario..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
              <button className="bg-blue-600 text-white px-3 py-2 rounded-lg text-xs font-semibold">
                Enviar
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Navegación Inferior Estilo App Móvil Fija */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-[#0d111a]/95 backdrop-blur-md border-t border-slate-800/90 py-2 px-2 flex items-center justify-around z-40 w-full">
        <button 
          onClick={() => setActiveTab("dashboard")}
          className={`flex flex-col items-center space-y-0.5 text-[10px] font-medium transition-colors ${
            activeTab === "dashboard" ? "text-blue-500" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Dashboard</span>
        </button>

        <button 
          onClick={() => setActiveTab("tickets")}
          className={`flex flex-col items-center space-y-0.5 text-[10px] font-medium transition-colors ${
            activeTab === "tickets" ? "text-blue-500" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <TicketIcon className="w-4 h-4" />
          <span>Tickets</span>
        </button>

        <button 
          onClick={() => setActiveTab("tableros")}
          className={`flex flex-col items-center space-y-0.5 text-[10px] font-medium transition-colors ${
            activeTab === "tableros" ? "text-blue-500" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Kanban className="w-4 h-4" />
          <span>Tableros</span>
        </button>

        <button 
          onClick={() => setActiveTab("ia")}
          className={`flex flex-col items-center space-y-0.5 text-[10px] font-medium transition-colors ${
            activeTab === "ia" ? "text-blue-500" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Bot className="w-4 h-4" />
          <span>Asistente IA</span>
        </button>

        <button 
          onClick={() => setActiveTab("reportes")}
          className={`flex flex-col items-center space-y-0.5 text-[10px] font-medium transition-colors ${
            activeTab === "reportes" ? "text-blue-500" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Reportes</span>
        </button>
      </nav>

    </div>
  );
}