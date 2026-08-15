import { useState, useEffect } from "react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import {
  MessageSquare, Bot, Zap, Users, BarChart2, Settings, Shield,
  ChevronDown, Check, Star, ArrowRight, Menu, X, Bell, Search,
  Phone, Clock, TrendingUp, AlertCircle, CheckCircle2, RefreshCw,
  Database, Globe, Link, FileText, Send, Mic, Paperclip, MoreVertical,
  LogIn, Play, Inbox, Home, BookOpen, CreditCard, UserCheck, Layout,
  Activity, Wifi, WifiOff, PlusCircle, Filter, Download, Upload,
  HelpCircle, ChevronUp, Eye, EyeOff, Calendar, Pencil, Trash2,
  CalendarClock, CalendarCheck, LogOut, Plus, Loader2,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useAvailabilities } from "../hooks/useAvailabilities";
import { useOrganizations } from "../hooks/useOrganizations";
import { useConversations, useConversationMessages } from "../hooks/useConversations";
import type { Availability, AvailabilityForm, ClienteAdmin, PlanUsageItem } from "../lib/types/app";
import { buildAvailabilityResponse } from "../lib/types/app";
import { DEFAULT_ORGANIZATION_ID, LUCAS_CONVERSATION_ID } from "../lib/constants";
import { fetchPlanUsage, fetchWhatsAppConnections, fetchWhatsAppStats } from "../services/whatsapp.service";
import { createCheckoutSession, fetchSubscription, type SubscriptionSummary, createBillingPortalSession, fetchStripeConfig } from "../services/stripe.service";
import { PLANS } from "../../lib/plans";
import type { PlanTier } from "../../lib/plans";
import { AppError } from "../lib/errors";

// ─── Types ─────────────────────────────────────────────────────────────────

type View = "landing" | "client" | "admin" | "onboarding";

// ─── Colors ────────────────────────────────────────────────────────────────
const C = {
  green: "#25D366",
  greenDark: "#128C7E",
  greenSoft: "#DCF8E7",
  blue: "#5B8DEF",
  lilac: "#9B8AFB",
  coral: "#FF9F8A",
  bg: "#F7FAF8",
  bgAlt: "#EFF5F2",
  card: "#FFFFFF",
  border: "#D4E8DC",
  text: "#20332B",
  muted: "#5A7A68",
  amber: "#F59E0B",
  red: "#EF4444",
};

// ─── Static marketing content (não são dados de negócio persistidos) ─────────

const conversasDia = [
  { dia: "Seg", total: 142, ia: 118, humano: 24 },
  { dia: "Ter", total: 189, ia: 155, humano: 34 },
  { dia: "Qua", total: 211, ia: 174, humano: 37 },
  { dia: "Qui", total: 178, ia: 146, humano: 32 },
  { dia: "Sex", total: 245, ia: 203, humano: 42 },
  { dia: "Sáb", total: 98, ia: 89, humano: 9 },
  { dia: "Dom", total: 67, ia: 62, humano: 5 },
];
const receitaMensal = [
  { mes: "Jan", valor: 48200 }, { mes: "Fev", valor: 52100 },
  { mes: "Mar", valor: 61400 }, { mes: "Abr", valor: 58900 },
  { mes: "Mai", valor: 71200 }, { mes: "Jun", valor: 78500 },
  { mes: "Jul", valor: 84300 },
];
const segmentos = [
  { nome: "Clínicas", valor: 28, cor: C.green },
  { nome: "E-commerce", valor: 22, cor: C.blue },
  { nome: "Imobiliárias", valor: 18, cor: C.lilac },
  { nome: "Restaurantes", valor: 14, cor: C.coral },
  { nome: "Outros", valor: 18, cor: "#B8D9C8" },
];
const faqItems = [
  { q: "O que é a LivIA?", a: "A LivIA é uma plataforma de atendimento automatizado para WhatsApp. Ela usa inteligência artificial para responder dúvidas, qualificar contatos, realizar agendamentos e encaminhar conversas para sua equipe humana." },
  { q: "Preciso trocar meu número de WhatsApp?", a: "Não. Você conecta seu número existente do WhatsApp Business à plataforma. O processo é guiado e não interrompe seu atendimento atual." },
  { q: "A LivIA substitui completamente meus atendentes?", a: "Não necessariamente. A LivIA trabalha de forma híbrida — a IA resolve as solicitações mais frequentes, enquanto sua equipe foca nos atendimentos que precisam de atenção humana." },
  { q: "Como a inteligência artificial aprende sobre minha empresa?", a: "Você alimenta a base de conhecimento com documentos, perguntas frequentes, produtos, políticas e horários. A IA usa essas informações para responder com precisão." },
  { q: "Posso assumir uma conversa iniciada pela IA?", a: "Sim. Em qualquer momento, um atendente pode assumir a conversa com um clique. A IA passa o contexto completo e sai discretamente." },
  { q: "Como funciona o teste gratuito?", a: "Você tem 7 dias para explorar todos os recursos, incluindo conexão com WhatsApp, configuração de agentes e acompanhamento de conversas. Um onboarding guiado ajuda desde o primeiro acesso." },
  { q: "Existem cobranças adicionais do WhatsApp?", a: "Sim. O WhatsApp Business cobra pelo uso de mensagens ativas (templates). Conversas iniciadas pelo cliente são gratuitas dentro da janela de 24 horas." },
  { q: "A LivIA atende diferentes unidades?", a: "Sim. O plano Enterprise suporta múltiplas unidades com agentes, números e equipes separados, gerenciados em uma única conta." },
];
// clientesAdmin, conversasInbox e mensagensConversa → Supabase (organizations, conversations, messages)

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  const [y, m, d] = iso.split("-");
  const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const dt = new Date(Number(y), Number(m) - 1, Number(d));
  return `${days[dt.getDay()]}, ${d}/${m}/${y}`;
}

// genId() removido — IDs gerados pelo Supabase (UUID)

// ─── Shared Components ──────────────────────────────────────────────────────

function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const s = { sm: "text-xl", md: "text-2xl", lg: "text-4xl" };
  return (
    <span className={`font-bold tracking-tight ${s[size]}`} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <span style={{ color: C.text }}>Liv</span>
      <span style={{ background: `linear-gradient(135deg, ${C.green}, ${C.lilac})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>IA</span>
    </span>
  );
}

type BadgeColor = "green" | "blue" | "lilac" | "amber" | "red" | "gray" | "teal";
function Badge({ children, color = "green" }: { children: React.ReactNode; color?: BadgeColor }) {
  const map: Record<BadgeColor, React.CSSProperties> = {
    green:  { background: "#DCF8E7", color: "#128C7E", border: "1px solid #B2DBBF" },
    blue:   { background: "#EAF0FD", color: "#3B6DD4", border: "1px solid #C0D3F8" },
    lilac:  { background: "#F0EEFF", color: "#6B52E0", border: "1px solid #D4CDFF" },
    amber:  { background: "#FEF3C7", color: "#B45309", border: "1px solid #FDE68A" },
    red:    { background: "#FEE2E2", color: "#DC2626", border: "1px solid #FCA5A5" },
    gray:   { background: "#F0F5F2", color: "#5A7A68", border: "1px solid #D4E8DC" },
    teal:   { background: "#DCF8E7", color: "#128C7E", border: "1px solid #B2DBBF" },
  };
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold" style={map[color]}>
      {children}
    </span>
  );
}

function GradientButton({ children, onClick, size = "md", full = false, disabled = false }: { children: React.ReactNode; onClick?: () => void; size?: "sm" | "md" | "lg"; full?: boolean; disabled?: boolean }) {
  const s = { sm: "px-4 py-2.5 text-sm", md: "px-6 py-3 text-sm", lg: "px-8 py-4 text-base" };
  return (
    <button onClick={onClick} disabled={disabled} className={`${s[size]} ${full ? "w-full" : ""} rounded-2xl font-semibold text-white transition-opacity duration-150 active:opacity-80 shadow-md disabled:opacity-50 disabled:cursor-not-allowed`}
      style={{ background: `linear-gradient(135deg, ${C.green}, ${C.blue})` }}>
      {children}
    </button>
  );
}

function OutlineButton({ children, onClick, size = "md", full = false, disabled = false }: { children: React.ReactNode; onClick?: () => void; size?: "sm" | "md" | "lg"; full?: boolean; disabled?: boolean }) {
  const s = { sm: "px-4 py-2.5 text-sm", md: "px-6 py-3 text-sm", lg: "px-8 py-4 text-base" };
  return (
    <button onClick={onClick} disabled={disabled} className={`${s[size]} ${full ? "w-full" : ""} rounded-2xl font-semibold border-2 transition-opacity duration-150 active:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed`}
      style={{ borderColor: C.green, color: C.greenDark, backgroundColor: "transparent" }}>
      {children}
    </button>
  );
}

function MetricCard({ label, value, sub, trend, icon: Icon, color = "green" }: { label: string; value: string; sub?: string; trend?: string; icon: React.ElementType; color?: "green" | "blue" | "lilac" | "amber" | "red" }) {
  const colors = { green: C.green, blue: C.blue, lilac: C.lilac, amber: C.amber, red: C.red };
  const bgs = { green: "#DCF8E7", blue: "#EAF0FD", lilac: "#F0EEFF", amber: "#FEF3C7", red: "#FEE2E2" };
  return (
    <div className="bg-white border rounded-2xl p-5 flex flex-col gap-3 shadow-sm" style={{ borderColor: C.border }}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: C.muted }}>{label}</span>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: bgs[color] }}>
          <Icon size={16} style={{ color: colors[color] }} />
        </div>
      </div>
      <div>
        <div className="text-2xl font-bold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: C.text }}>{value}</div>
        {sub && <div className="text-xs mt-0.5" style={{ color: C.muted }}>{sub}</div>}
      </div>
      {trend && (
        <div className="flex items-center gap-1 text-xs font-semibold" style={{ color: C.greenDark }}>
          <TrendingUp size={12} />{trend}
        </div>
      )}
    </div>
  );
}

const tooltipStyle = { backgroundColor: "#FFFFFF", border: `1px solid ${C.border}`, borderRadius: 12, fontSize: 12, color: C.text };

// ─── PRD 01 — Admin Login ────────────────────────────────────────────────────

function AdminLoginView({ onLogin, setView }: { onLogin: () => void; setView: (v: View) => void }) {
  const { signIn, isConfigured } = useAuth();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleEntrar() {
    if (!email.trim()) { setErro("Informe o e-mail."); return; }
    if (!senha.trim()) { setErro("Informe a senha."); return; }
    if (!isConfigured) { setErro("Supabase não configurado. Verifique as variáveis de ambiente."); return; }
    setLoading(true);
    setErro("");
    try {
      await signIn(email.trim(), senha);
      onLogin();
    } catch (e) {
      setErro(e instanceof AppError ? e.message : "Usuário ou senha incorretos. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5 py-12" style={{ backgroundColor: C.bg, fontFamily: "'Inter', sans-serif" }}>
      <button onClick={() => setView("landing")} className="self-start mb-8 flex items-center gap-2 text-sm" style={{ color: C.muted }}>
        <ArrowRight size={14} style={{ transform: "rotate(180deg)" }} />Voltar para o site
      </button>

      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Logo size="lg" />
          <div className="mt-3">
            <Badge color="lilac">Área administrativa</Badge>
          </div>
          <p className="text-sm mt-3" style={{ color: C.muted }}>Acesso restrito. Informe suas credenciais.</p>
        </div>

        <div className="bg-white border rounded-3xl p-7 shadow-sm" style={{ borderColor: C.border }}>
          {erro && (
            <div className="flex items-start gap-2 rounded-xl p-3 mb-5 text-sm" style={{ backgroundColor: "#FEE2E2", color: "#DC2626", border: "1px solid #FCA5A5" }}>
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
              {erro}
            </div>
          )}

          <div className="mb-4">
            <label className="text-xs font-bold uppercase tracking-wide block mb-2" style={{ color: C.muted }}>E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setErro(""); }}
              placeholder="admin@livia.app"
              className="w-full rounded-2xl px-4 py-3.5 text-sm border outline-none"
              style={{ backgroundColor: C.bgAlt, borderColor: C.border, color: C.text, minHeight: 52 }}
              onKeyDown={(e) => e.key === "Enter" && handleEntrar()}
              autoComplete="username"
            />
          </div>

          <div className="mb-6">
            <label className="text-xs font-bold uppercase tracking-wide block mb-2" style={{ color: C.muted }}>Senha</label>
            <div className="relative">
              <input
                type={mostrarSenha ? "text" : "password"}
                value={senha}
                onChange={(e) => { setSenha(e.target.value); setErro(""); }}
                placeholder="••••••"
                className="w-full rounded-2xl px-4 py-3.5 text-sm border outline-none pr-12"
                style={{ backgroundColor: C.bgAlt, borderColor: C.border, color: C.text, minHeight: 52 }}
                onKeyDown={(e) => e.key === "Enter" && handleEntrar()}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setMostrarSenha(!mostrarSenha)}
                className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center"
                style={{ color: C.muted, width: 44, height: 44 }}
              >
                {mostrarSenha ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            onClick={handleEntrar}
            disabled={loading}
            className="w-full rounded-2xl py-4 font-semibold text-white text-sm active:opacity-80 shadow-md"
            style={{ background: loading ? C.border : `linear-gradient(135deg, ${C.green}, ${C.blue})`, minHeight: 52 }}
          >
            {loading ? "Verificando..." : "Entrar"}
          </button>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: C.muted }}>
          Use uma conta admin criada no Supabase Auth com role <span className="font-mono font-semibold" style={{ color: C.greenDark }}>admin</span>
        </p>
      </div>
    </div>
  );
}

// ─── PRD 02 — Agenda do Cliente ──────────────────────────────────────────────

const emptyForm: AvailabilityForm = { data: "", horaInicio: "", horaFim: "", status: "disponivel" };

function AgendaPage({
  availabilities,
  organizations,
  empresaId,
  loading,
  error,
  saving,
  onAdd,
  onUpdate,
  onRemove,
}: {
  availabilities: Availability[];
  organizations: ClienteAdmin[];
  empresaId: string;
  loading: boolean;
  error: string | null;
  saving: boolean;
  onAdd: (form: AvailabilityForm) => Promise<void>;
  onUpdate: (id: string, form: AvailabilityForm) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
}) {
  const [sheet, setSheet] = useState<"closed" | "add" | "edit">("closed");
  const [form, setForm] = useState<AvailabilityForm>(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [formErro, setFormErro] = useState("");
  const [feedback, setFeedback] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const minhas = availabilities
    .filter((a) => a.empresaId === empresaId)
    .sort((a, b) => (a.data + a.horaInicio).localeCompare(b.data + b.horaInicio));

  const porData = minhas.reduce<Record<string, Availability[]>>((acc, a) => {
    if (!acc[a.data]) acc[a.data] = [];
    acc[a.data].push(a);
    return acc;
  }, {});
  const datas = Object.keys(porData).sort();

  function openAdd() {
    setForm(emptyForm);
    setFormErro("");
    setSheet("add");
  }

  function openEdit(a: Availability) {
    setForm({ data: a.data, horaInicio: a.horaInicio, horaFim: a.horaFim, status: a.status });
    setEditId(a.id);
    setFormErro("");
    setSheet("edit");
  }

  function validateForm(): boolean {
    if (!form.data) { setFormErro("Informe a data."); return false; }
    if (!form.horaInicio) { setFormErro("Informe o horário inicial."); return false; }
    if (!form.horaFim) { setFormErro("Informe o horário final."); return false; }
    if (form.horaFim <= form.horaInicio) { setFormErro("O horário final deve ser posterior ao inicial."); return false; }
    const duplicate = availabilities.find(
      (a) =>
        a.empresaId === empresaId &&
        a.data === form.data &&
        a.horaInicio === form.horaInicio &&
        a.horaFim === form.horaFim &&
        a.id !== editId
    );
    if (duplicate) { setFormErro("Já existe uma disponibilidade com essa data e horário."); return false; }
    return true;
  }

  function handleSave() {
    if (!validateForm()) return;
    const action = sheet === "add"
      ? onAdd(form)
      : editId
        ? onUpdate(editId, form)
        : Promise.resolve();
    action
      .then(() => {
        showFeedback(sheet === "add" ? "Disponibilidade adicionada." : "Disponibilidade atualizada.");
        setSheet("closed");
      })
      .catch((e) => {
        setFormErro(e instanceof AppError ? e.message : "Erro ao salvar.");
      });
  }

  function handleDelete(id: string) {
    onRemove(id)
      .then(() => {
        setDeleteConfirm(null);
        showFeedback("Disponibilidade removida.");
      })
      .catch((e) => {
        setFormErro(e instanceof AppError ? e.message : "Erro ao remover.");
      });
  }

  function showFeedback(msg: string) {
    setFeedback(msg);
    setTimeout(() => setFeedback(""), 2500);
  }

  return (
    <div className="relative" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-bold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: C.text }}>Agenda de disponibilidade</h2>
          <p className="text-xs mt-0.5" style={{ color: C.muted }}>
            {organizations.find((c) => c.id === empresaId)?.empresa ?? "Empresa"} — consultada pela IA durante o atendimento
          </p>
        </div>
        <button
          onClick={openAdd}
          disabled={saving}
          className="flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm disabled:opacity-50"
          style={{ background: `linear-gradient(135deg, ${C.green}, ${C.blue})`, minHeight: 44 }}
        >
          <Plus size={14} />Adicionar
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl px-4 py-3 mb-4 text-sm font-medium" style={{ backgroundColor: "#FEE2E2", color: "#DC2626", border: "1px solid #FCA5A5" }}>
          <AlertCircle size={15} />{error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 gap-2" style={{ color: C.muted }}>
          <Loader2 size={20} className="animate-spin" /> Carregando agenda...
        </div>
      ) : (
        <>
      {feedback && (
        <div className="flex items-center gap-2 rounded-xl px-4 py-3 mb-4 text-sm font-medium" style={{ backgroundColor: C.greenSoft, color: C.greenDark, border: `1px solid #B2DBBF` }}>
          <CheckCircle2 size={15} />{feedback}
        </div>
      )}

      {datas.length === 0 && (
        <div className="rounded-3xl border flex flex-col items-center justify-center py-16 px-6 text-center" style={{ borderColor: C.border, backgroundColor: C.card }}>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ backgroundColor: C.greenSoft }}>
            <CalendarClock size={28} style={{ color: C.green }} />
          </div>
          <p className="font-bold mb-1" style={{ color: C.text }}>Nenhuma disponibilidade cadastrada</p>
          <p className="text-sm mb-6" style={{ color: C.muted }}>Adicione datas e horários para que a IA possa informar seus clientes no WhatsApp.</p>
          <button
            onClick={openAdd}
            className="rounded-2xl px-6 py-3 text-sm font-semibold text-white shadow-sm"
            style={{ background: `linear-gradient(135deg, ${C.green}, ${C.blue})`, minHeight: 44 }}
          >
            Adicionar primeira disponibilidade
          </button>
        </div>
      )}

      <div className="space-y-6 max-w-lg">
        {datas.map((data) => (
          <div key={data}>
            <div className="flex items-center gap-2 mb-3">
              <Calendar size={13} style={{ color: C.greenDark }} />
              <span className="text-xs font-bold uppercase tracking-wide" style={{ color: C.greenDark }}>{formatDate(data)}</span>
            </div>
            <div className="space-y-2">
              {porData[data].map((a) => (
                <div key={a.id} className="bg-white border rounded-2xl px-4 py-3 flex items-center justify-between shadow-sm" style={{ borderColor: C.border }}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: a.status === "disponivel" ? C.greenSoft : "#FEE2E2" }}>
                      <Clock size={15} style={{ color: a.status === "disponivel" ? C.greenDark : C.red }} />
                    </div>
                    <div>
                      <div className="text-sm font-semibold" style={{ color: C.text }}>{a.horaInicio} – {a.horaFim}</div>
                      <Badge color={a.status === "disponivel" ? "green" : "red"}>
                        {a.status === "disponivel" ? "Disponível" : "Indisponível"}
                      </Badge>
                    </div>
                  </div>
                  {deleteConfirm === a.id ? (
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleDelete(a.id)} className="rounded-xl px-3 py-2 text-xs font-bold text-white" style={{ backgroundColor: C.red, minHeight: 36 }}>Remover</button>
                      <button onClick={() => setDeleteConfirm(null)} className="rounded-xl px-3 py-2 text-xs font-semibold border" style={{ borderColor: C.border, color: C.muted, minHeight: 36 }}>Cancelar</button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(a)} className="flex items-center justify-center border rounded-xl" style={{ borderColor: C.border, color: C.muted, minWidth: 44, minHeight: 44, width: 44, height: 44 }}>
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => setDeleteConfirm(a.id)} className="flex items-center justify-center border rounded-xl" style={{ borderColor: "#FCA5A5", color: C.red, minWidth: 44, minHeight: 44, width: 44, height: 44 }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {datas.length > 0 && (
        <div className="max-w-lg mt-6 rounded-2xl p-4 flex items-start gap-3 border" style={{ backgroundColor: "#EAF0FD", borderColor: "#C0D3F8" }}>
          <Bot size={16} style={{ color: C.blue, flexShrink: 0, marginTop: 2 }} />
          <p className="text-xs leading-relaxed" style={{ color: "#3B6DD4" }}>
            A IA consulta esta agenda em tempo real durante as conversas no WhatsApp e informa apenas os horários com status <strong>Disponível</strong>.
          </p>
        </div>
      )}
        </>
      )}

      {/* Bottom sheet */}
      {sheet !== "closed" && (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end"
          style={{ backgroundColor: "rgba(32,51,43,0.4)" }}
          onClick={(e) => e.target === e.currentTarget && setSheet("closed")}
        >
          <div className="rounded-t-3xl p-6 shadow-2xl" style={{ backgroundColor: C.card, maxHeight: "90vh", overflowY: "auto" }}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-lg" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: C.text }}>
                {sheet === "add" ? "Nova disponibilidade" : "Editar disponibilidade"}
              </h3>
              <button onClick={() => setSheet("closed")} className="flex items-center justify-center border rounded-xl" style={{ borderColor: C.border, color: C.muted, width: 44, height: 44 }}>
                <X size={16} />
              </button>
            </div>

            {formErro && (
              <div className="flex items-center gap-2 rounded-xl p-3 mb-4 text-sm" style={{ backgroundColor: "#FEE2E2", color: "#DC2626", border: "1px solid #FCA5A5" }}>
                <AlertCircle size={14} style={{ flexShrink: 0 }} />{formErro}
              </div>
            )}

            <div className="mb-4">
              <label className="text-xs font-bold uppercase tracking-wide block mb-2" style={{ color: C.muted }}>Data</label>
              <input
                type="date"
                value={form.data}
                onChange={(e) => { setForm({ ...form, data: e.target.value }); setFormErro(""); }}
                className="w-full rounded-2xl px-4 py-3.5 text-sm border outline-none"
                style={{ backgroundColor: C.bgAlt, borderColor: C.border, color: C.text, minHeight: 52 }}
              />
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wide block mb-2" style={{ color: C.muted }}>Horário inicial</label>
                <input
                  type="time"
                  value={form.horaInicio}
                  onChange={(e) => { setForm({ ...form, horaInicio: e.target.value }); setFormErro(""); }}
                  className="w-full rounded-2xl px-4 py-3.5 text-sm border outline-none"
                  style={{ backgroundColor: C.bgAlt, borderColor: C.border, color: C.text, minHeight: 52 }}
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wide block mb-2" style={{ color: C.muted }}>Horário final</label>
                <input
                  type="time"
                  value={form.horaFim}
                  onChange={(e) => { setForm({ ...form, horaFim: e.target.value }); setFormErro(""); }}
                  className="w-full rounded-2xl px-4 py-3.5 text-sm border outline-none"
                  style={{ backgroundColor: C.bgAlt, borderColor: C.border, color: C.text, minHeight: 52 }}
                />
              </div>
            </div>

            <div className="mb-6">
              <label className="text-xs font-bold uppercase tracking-wide block mb-2" style={{ color: C.muted }}>Status</label>
              <div className="grid grid-cols-2 gap-3">
                {(["disponivel", "indisponivel"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setForm({ ...form, status: s })}
                    className="rounded-2xl py-3.5 text-sm font-semibold border"
                    style={
                      form.status === s
                        ? s === "disponivel"
                          ? { backgroundColor: C.greenSoft, borderColor: C.green, color: C.greenDark }
                          : { backgroundColor: "#FEE2E2", borderColor: C.red, color: "#DC2626" }
                        : { backgroundColor: C.bgAlt, borderColor: C.border, color: C.muted }
                    }
                  >
                    {s === "disponivel" ? "Disponível" : "Indisponível"}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleSave}
              className="w-full rounded-2xl py-4 text-sm font-semibold text-white shadow-md"
              style={{ background: `linear-gradient(135deg, ${C.green}, ${C.blue})`, minHeight: 52 }}
            >
              {sheet === "add" ? "Adicionar disponibilidade" : "Salvar alterações"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── PRD 03 — WhatsApp Availability Chat ────────────────────────────────────

function WhatsAppAvailabilityChat({ availabilities, empresaId }: { availabilities: Availability[]; empresaId: string }) {
  const disponiveis = availabilities
    .filter((a) => a.empresaId === empresaId && a.status === "disponivel")
    .sort((a, b) => (a.data + a.horaInicio).localeCompare(b.data + b.horaInicio));

  const porData = disponiveis.reduce<Record<string, Availability[]>>((acc, a) => {
    if (!acc[a.data]) acc[a.data] = [];
    acc[a.data].push(a);
    return acc;
  }, {});
  const datasDisp = Object.keys(porData).sort();

  const respostaIA = datasDisp.length === 0
    ? "No momento não encontrei horários disponíveis em nossa agenda. Em breve novos horários serão abertos. Posso te ajudar com algo mais?"
    : datasDisp.map((d) =>
        `📅 ${formatDate(d)}\n` + porData[d].map((a) => `  • ${a.horaInicio} – ${a.horaFim} ✅`).join("\n")
      ).join("\n\n") + "\n\nQual horário você prefere?";

  const msgs = [
    { tipo: "cliente", texto: "Olá! Quais horários estão disponíveis para consulta?", hora: "09:15" },
    { tipo: "sistema", texto: `IA consultou a agenda — ${disponiveis.length} horário(s) encontrado(s)` },
    { tipo: "ia", texto: respostaIA, hora: "09:15" },
    { tipo: "cliente", texto: "Perfeito, obrigado!", hora: "09:16" },
    { tipo: "ia", texto: "Sempre que precisar! 😊 Quando quiser confirmar, é só me chamar.", hora: "09:16" },
  ];

  return (
    <div className="w-full max-w-sm mx-auto rounded-3xl overflow-hidden border shadow-xl" style={{ backgroundColor: C.card, borderColor: C.border }}>
      <div className="flex items-center gap-3 px-4 py-3" style={{ backgroundColor: "#075E54" }}>
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0" style={{ backgroundColor: C.green }}>L</div>
        <div>
          <div className="text-sm font-semibold text-white">LivIA — Clínica Bem Estar</div>
          <div className="flex items-center gap-1.5 text-xs" style={{ color: "#9DCEA6" }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#9DCEA6" }} />IA ativa
          </div>
        </div>
      </div>
      <div className="p-4 space-y-3 text-xs" style={{ backgroundColor: "#E5DDD5", minHeight: 280 }}>
        {msgs.map((m, i) => {
          if (m.tipo === "sistema") {
            return (
              <div key={i} className="flex justify-center">
                <span className="rounded-full px-3 py-1 text-[10px] font-semibold flex items-center gap-1" style={{ backgroundColor: C.greenSoft, color: C.greenDark }}>
                  <Bot size={10} />{m.texto}
                </span>
              </div>
            );
          }
          return (
            <div key={i} className={`flex ${m.tipo === "cliente" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[82%] rounded-2xl px-3 py-2 shadow-sm whitespace-pre-wrap leading-relaxed ${m.tipo === "cliente" ? "rounded-tr-sm" : "rounded-tl-sm"}`}
                style={{ backgroundColor: m.tipo === "cliente" ? C.greenSoft : "#FFFFFF", color: C.text }}>
                {m.tipo === "ia" && (
                  <div className="flex items-center gap-1 mb-1 font-semibold" style={{ fontSize: 10, color: C.greenDark }}>
                    <Bot size={10} />LivIA
                  </div>
                )}
                {m.texto}
                <div className="text-[9px] mt-1 text-right" style={{ color: C.muted }}>{m.hora}</div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="px-4 py-3 flex items-center gap-2 border-t" style={{ borderColor: C.border, backgroundColor: C.card }}>
        <input className="flex-1 rounded-xl px-3 py-2 text-xs border" style={{ backgroundColor: C.bgAlt, borderColor: C.border, color: C.text }} placeholder="Mensagem..." readOnly />
        <button className="w-9 h-9 rounded-xl flex items-center justify-center text-white" style={{ backgroundColor: C.green }}><Send size={14} /></button>
      </div>
    </div>
  );
}

// ─── Landing: Header ────────────────────────────────────────────────────────

function Header({ setView }: { setView: (v: View) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b" style={{ backgroundColor: "rgba(247,250,248,0.92)", borderColor: C.border, backdropFilter: "blur(16px)" }}>
      <div className="max-w-[1240px] mx-auto px-6 h-16 flex items-center justify-between">
        <Logo />
        <nav className="hidden lg:flex items-center gap-6 text-sm" style={{ color: C.muted }}>
          {["Soluções", "Recursos", "Como funciona", "Planos", "Segurança", "FAQ"].map((item) => (
            <a key={item} href={`#${item.toLowerCase().replace(/ /g, "-")}`} className="text-sm" style={{ color: C.muted }}>{item}</a>
          ))}
        </nav>
        <div className="hidden lg:flex items-center gap-3">
          <button onClick={() => setView("client")} className="text-sm px-3 py-2 rounded-xl" style={{ color: C.muted }}>Entrar</button>
          <OutlineButton onClick={() => setView("admin")} size="sm">Demonstração</OutlineButton>
          <GradientButton onClick={() => setView("onboarding")} size="sm">Testar grátis por 7 dias</GradientButton>
        </div>
        <button className="lg:hidden" onClick={() => setOpen(!open)} style={{ color: C.text }}>{open ? <X size={22} /> : <Menu size={22} />}</button>
      </div>
      {open && (
        <div className="lg:hidden border-t px-6 py-4 flex flex-col gap-3" style={{ backgroundColor: C.card, borderColor: C.border }}>
          {["Soluções", "Recursos", "Como funciona", "Planos", "Segurança", "FAQ"].map((item) => (
            <a key={item} href="#" className="text-sm py-1" style={{ color: C.muted }} onClick={() => setOpen(false)}>{item}</a>
          ))}
          <div className="flex flex-col gap-2 pt-2 border-t" style={{ borderColor: C.border }}>
            <OutlineButton onClick={() => setView("admin")} size="sm" full>Demonstração</OutlineButton>
            <GradientButton onClick={() => setView("onboarding")} size="sm" full>Testar grátis por 7 dias</GradientButton>
          </div>
        </div>
      )}
    </header>
  );
}

function HeroSection({ setView }: { setView: (v: View) => void }) {
  return (
    <section className="pt-32 pb-24 px-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full pointer-events-none opacity-20" style={{ background: `radial-gradient(ellipse, ${C.greenSoft}, transparent 70%)`, filter: "blur(60px)" }} />
      <div className="max-w-[1240px] mx-auto grid lg:grid-cols-2 gap-16 items-center relative">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold mb-8 border" style={{ backgroundColor: C.greenSoft, color: C.greenDark, borderColor: "#B2DBBF" }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: C.green }} />
            IA ativa 24 horas por dia
          </div>
          <h1 className="text-4xl lg:text-6xl font-bold leading-[1.1] mb-6" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: C.text }}>
            Sua empresa atendendo no{" "}
            <span style={{ background: `linear-gradient(135deg, ${C.green}, ${C.blue})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>WhatsApp</span>
            , mesmo quando ninguém está online.
          </h1>
          <p className="text-lg leading-relaxed mb-8 max-w-lg" style={{ color: C.muted }}>
            A LivIA usa inteligência artificial para responder dúvidas, qualificar contatos, realizar agendamentos e encaminhar conversas para sua equipe.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 mb-8">
            <GradientButton onClick={() => setView("onboarding")} size="lg">Testar grátis por 7 dias</GradientButton>
            <OutlineButton size="lg">
              <span className="flex items-center gap-2"><Play size={16} />Agendar demonstração</span>
            </OutlineButton>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {["Integração com WhatsApp Business", "Atendimento automatizado 24h", "Transferência para atendentes humanos", "Configuração sem código"].map((b) => (
              <div key={b} className="flex items-center gap-2 text-sm" style={{ color: C.muted }}>
                <Check size={14} style={{ color: C.green, flexShrink: 0 }} />{b}
              </div>
            ))}
          </div>
        </div>
        <div className="relative flex justify-center">
          <div className="w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl border" style={{ backgroundColor: C.card, borderColor: C.border }}>
            <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ backgroundColor: "#075E54", borderColor: "transparent" }}>
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white" style={{ backgroundColor: C.green }}>L</div>
              <div>
                <div className="text-sm font-semibold text-white">LivIA — Clínica Bem Estar</div>
                <div className="flex items-center gap-1.5 text-xs" style={{ color: "#9DCEA6" }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#9DCEA6" }} />IA ativa
                </div>
              </div>
            </div>
            <div className="p-4 space-y-3 text-sm" style={{ backgroundColor: "#E5DDD5" }}>
              {[
                { tipo: "cliente", texto: "Olá! Gostaria de agendar uma consulta.", hora: "14:02" },
                { tipo: "ia", texto: "Olá! Claro, terei o prazer em ajudar. Qual especialidade você precisa?", hora: "14:02", badge: "IA identificou: Agendamento" },
                { tipo: "cliente", texto: "Dermatologia, por favor.", hora: "14:03" },
                { tipo: "ia", texto: "Temos horários na terça às 9h ou quinta às 10h com a Dra. Fernanda. Qual prefere?", hora: "14:03", badge: "Contato qualificado ✓" },
                { tipo: "cliente", texto: "Terça às 9h!", hora: "14:04" },
                { tipo: "ia", texto: "✅ Agendamento confirmado! Você receberá a confirmação por e-mail.", hora: "14:04" },
              ].map((m, i) => (
                <div key={i}>
                  {m.badge && (
                    <div className="flex justify-center mb-1">
                      <span className="text-[10px] rounded-full px-2 py-0.5 font-medium" style={{ backgroundColor: C.greenSoft, color: C.greenDark }}>{m.badge}</span>
                    </div>
                  )}
                  <div className={`flex ${m.tipo === "cliente" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[82%] rounded-2xl px-3 py-2 text-xs leading-relaxed shadow-sm ${m.tipo === "cliente" ? "rounded-tr-sm" : "rounded-tl-sm"}`}
                      style={{ backgroundColor: m.tipo === "cliente" ? C.greenSoft : "#FFFFFF", color: C.text }}>
                      {m.tipo === "ia" && (
                        <div className="flex items-center gap-1 mb-1 text-[10px] font-semibold" style={{ color: C.greenDark }}>
                          <Bot size={10} />LivIA
                        </div>
                      )}
                      {m.texto}
                      <div className="text-[10px] mt-1 text-right" style={{ color: C.muted }}>{m.hora}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-4 pb-4 pt-3 grid grid-cols-2 gap-2" style={{ backgroundColor: C.card }}>
              {[{ label: "Tempo de resposta", value: "< 2s", color: C.green }, { label: "Conversa qualificada", value: "100%", color: C.blue }].map((ind) => (
                <div key={ind.label} className="rounded-xl p-2.5 text-center border" style={{ backgroundColor: C.bgAlt, borderColor: C.border }}>
                  <div className="text-sm font-bold" style={{ color: ind.color }}>{ind.value}</div>
                  <div className="text-[10px] mt-0.5" style={{ color: C.muted }}>{ind.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function TrustBar() {
  const logos = ["Clínica Bem Estar", "ImobTech", "AutoCenter Plus", "TechLearn", "Sabor & Arte", "Academia Forte", "TurExplore", "FinancePro"];
  const stats = [
    { value: "24/7", label: "Atendimento contínuo" },
    { value: "< 2s", label: "Tempo de resposta" },
    { value: "-70%", label: "Tarefas repetitivas" },
    { value: "+3x", label: "Oportunidades qualificadas" },
  ];
  return (
    <section className="py-16 border-y" style={{ borderColor: C.border, backgroundColor: C.bgAlt }}>
      <div className="max-w-[1240px] mx-auto px-6">
        <p className="text-center text-sm mb-8" style={{ color: C.muted }}>Empresas de diferentes segmentos já automatizam seus atendimentos <span className="italic text-xs">(exemplos ilustrativos)</span></p>
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {logos.map((logo) => (
            <div key={logo} className="px-4 py-2 rounded-xl border text-xs font-medium" style={{ backgroundColor: C.card, borderColor: C.border, color: C.muted }}>{logo}</div>
          ))}
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-3xl font-bold mb-1" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", background: `linear-gradient(135deg, ${C.green}, ${C.blue})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{s.value}</div>
              <div className="text-sm" style={{ color: C.muted }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProblemasSection() {
  const items = [
    { prob: "Mensagens acumuladas", sol: "Respostas automáticas e personalizadas" },
    { prob: "Equipe respondendo perguntas repetidas", sol: "Base de conhecimento treinável" },
    { prob: "Leads perdidos fora do horário comercial", sol: "Atendimento contínuo 24 horas" },
    { prob: "Falta de organização entre atendentes", sol: "Caixa de entrada centralizada e encaminhamento inteligente" },
  ];
  return (
    <section className="py-24 px-6">
      <div className="max-w-[1240px] mx-auto">
        <h2 className="text-3xl lg:text-4xl font-bold text-center mb-16" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: C.text }}>Seus clientes não deveriam esperar para ser atendidos.</h2>
        <div className="grid lg:grid-cols-2 gap-4">
          {items.map((p, i) => (
            <div key={i} className="bg-white border rounded-2xl p-6 grid grid-cols-[1fr_auto_1fr] gap-4 items-center shadow-sm" style={{ borderColor: C.border }}>
              <div>
                <div className="flex items-center gap-1.5 text-xs font-semibold mb-2" style={{ color: C.red }}><AlertCircle size={12} />Problema</div>
                <p className="text-sm font-medium" style={{ color: C.text }}>{p.prob}</p>
              </div>
              <ArrowRight size={20} style={{ color: C.green }} />
              <div>
                <div className="flex items-center gap-1.5 text-xs font-semibold mb-2" style={{ color: C.greenDark }}><CheckCircle2 size={12} />Solução</div>
                <p className="text-sm font-medium" style={{ color: C.text }}>{p.sol}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ComoFuncionaSection({ setView }: { setView: (v: View) => void }) {
  const etapas = [
    { num: "01", titulo: "Conecte seu WhatsApp", desc: "Use um onboarding guiado para conectar a conta comercial e o número da empresa." },
    { num: "02", titulo: "Ensine a LivIA", desc: "Adicione informações, documentos, perguntas frequentes, produtos e horários." },
    { num: "03", titulo: "Defina as automações", desc: "Configure objetivos, regras, encaminhamentos e agenda de disponibilidade." },
    { num: "04", titulo: "Acompanhe os resultados", desc: "Visualize conversas, desempenho da IA e oportunidades em tempo real." },
  ];
  return (
    <section className="py-24 px-6" style={{ backgroundColor: C.bgAlt }}>
      <div className="max-w-[1240px] mx-auto">
        <h2 className="text-3xl lg:text-4xl font-bold text-center mb-16" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: C.text }}>Como funciona</h2>
        <div className="grid lg:grid-cols-4 gap-6 mb-12">
          {etapas.map((e, i) => (
            <div key={i} className="bg-white border rounded-2xl p-6 shadow-sm" style={{ borderColor: C.border }}>
              <div className="text-4xl font-bold mb-4 opacity-60" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", background: `linear-gradient(135deg, ${C.green}, ${C.blue})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{e.num}</div>
              <h3 className="font-bold mb-2" style={{ color: C.text }}>{e.titulo}</h3>
              <p className="text-sm leading-relaxed" style={{ color: C.muted }}>{e.desc}</p>
            </div>
          ))}
        </div>
        <div className="text-center"><GradientButton onClick={() => setView("onboarding")} size="lg">Criar minha LivIA</GradientButton></div>
      </div>
    </section>
  );
}

function RecursosSection() {
  const recursos = [
    { icon: Bot, titulo: "Agentes de IA", desc: "Crie agentes especializados por setor, unidade, produto ou objetivo.", color: C.green },
    { icon: Inbox, titulo: "Caixa de entrada compartilhada", desc: "Centralize as conversas e distribua atendimentos entre os membros da equipe.", color: C.blue },
    { icon: UserCheck, titulo: "Atendimento híbrido", desc: "A IA atende primeiro e transfere a conversa para uma pessoa quando necessário.", color: C.lilac },
    { icon: BookOpen, titulo: "Base de conhecimento", desc: "Treine a IA com documentos, páginas e perguntas frequentes da empresa.", color: C.coral },
    { icon: CalendarCheck, titulo: "Agenda de disponibilidade", desc: "Configure horários disponíveis para que a IA informe seus clientes no WhatsApp.", color: C.greenDark },
    { icon: Users, titulo: "Qualificação de contatos", desc: "Colete nome, interesse, localização, orçamento e outras informações importantes.", color: C.green },
    { icon: FileText, titulo: "Templates do WhatsApp", desc: "Organize modelos de mensagens e acompanhe seus estados de aprovação.", color: C.blue },
    { icon: BarChart2, titulo: "Relatórios", desc: "Analise volume de mensagens, tempo de resposta e satisfação.", color: C.lilac },
    { icon: Link, titulo: "Integrações", desc: "Conecte CRM, agenda, e-commerce e sistemas internos por API ou webhook.", color: C.coral },
  ];
  return (
    <section id="recursos" className="py-24 px-6">
      <div className="max-w-[1240px] mx-auto">
        <h2 className="text-3xl lg:text-4xl font-bold text-center mb-4" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: C.text }}>Tudo que você precisa para atender melhor</h2>
        <p className="text-center mb-16 max-w-xl mx-auto" style={{ color: C.muted }}>Uma plataforma completa para automatizar, organizar e escalar seu atendimento no WhatsApp.</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {recursos.map((r, i) => (
            <div key={i} className="bg-white border rounded-2xl p-6 shadow-sm" style={{ borderColor: C.border }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: `${r.color}18` }}>
                <r.icon size={18} style={{ color: r.color }} />
              </div>
              <h3 className="font-bold mb-2" style={{ color: C.text }}>{r.titulo}</h3>
              <p className="text-sm leading-relaxed" style={{ color: C.muted }}>{r.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function DemoSection({ setView, availabilities }: { setView: (v: View) => void; availabilities: Availability[] }) {
  const [tab, setTab] = useState<"conversas" | "agenda" | "relatorios">("conversas");
  const { conversations } = useConversations(DEFAULT_ORGANIZATION_ID);
  const firstConv = conversations[0];
  const { messages: demoMessages } = useConversationMessages(firstConv?.id ?? null);
  return (
    <section className="py-24 px-6" style={{ backgroundColor: C.bgAlt }}>
      <div className="max-w-[1240px] mx-auto">
        <h2 className="text-3xl lg:text-4xl font-bold text-center mb-4" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: C.text }}>Veja a plataforma em ação</h2>
        <p className="text-center mb-12 max-w-xl mx-auto" style={{ color: C.muted }}>Explore as principais áreas da LivIA e entenda como sua equipe vai trabalhar.</p>
        <div className="flex justify-center gap-2 mb-8 flex-wrap">
          {(["conversas", "agenda", "relatorios"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold"
              style={tab === t ? { background: `linear-gradient(135deg, ${C.green}, ${C.blue})`, color: "white" } : { color: C.muted, border: `1px solid ${C.border}`, backgroundColor: C.card }}>
              {t === "conversas" ? "Conversas" : t === "agenda" ? "Agenda × IA" : "Relatórios"}
            </button>
          ))}
        </div>
        <div className="bg-white border rounded-3xl overflow-hidden shadow-sm" style={{ borderColor: C.border }}>
          {tab === "conversas" && (
            <div className="grid lg:grid-cols-[260px_1fr_220px]">
              <div className="border-r p-3 space-y-1" style={{ borderColor: C.border, backgroundColor: C.bgAlt }}>
                <div className="relative mb-2">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: C.muted }} />
                  <input className="w-full rounded-xl pl-8 pr-3 py-2 text-xs border" style={{ backgroundColor: C.card, borderColor: C.border, color: C.text }} placeholder="Buscar..." readOnly />
                </div>
                {conversations.map((c) => (
                  <div key={c.id} className="rounded-xl p-3 cursor-pointer"
                    style={c.id === firstConv?.id ? { backgroundColor: C.greenSoft, border: `1px solid #B2DBBF` } : {}}>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0" style={{ backgroundColor: C.greenDark }}>{c.avatar}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold truncate" style={{ color: C.text }}>{c.nome}</span>
                          <span className="text-[10px]" style={{ color: C.muted }}>{c.tempo}</span>
                        </div>
                        <p className="text-[10px] truncate" style={{ color: C.muted }}>{c.ultimaMensagem}</p>
                      </div>
                    </div>
                    <Badge color={c.status === "ia" ? "green" : c.status === "humano" ? "blue" : c.status === "aguardando" ? "amber" : "gray"}>
                      {c.status === "ia" ? "IA" : c.status === "humano" ? "Humano" : c.status === "aguardando" ? "Aguardando" : "Finalizada"}
                    </Badge>
                  </div>
                ))}
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-3 px-5 py-4 border-b" style={{ borderColor: C.border }}>
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: C.greenDark }}>AR</div>
                  <div>
                    <div className="font-semibold text-sm" style={{ color: C.text }}>Ana Rodrigues</div>
                    <Badge color="green"><Bot size={10} />IA atendendo</Badge>
                  </div>
                  <div className="ml-auto"><GradientButton size="sm">Assumir atendimento</GradientButton></div>
                </div>
                <div className="flex-1 p-4 space-y-3 overflow-auto" style={{ maxHeight: 320, backgroundColor: "#E5DDD5" }}>
                  {demoMessages.map((m, i) => (
                    <div key={i} className={`flex ${m.tipo === "cliente" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[72%] rounded-2xl px-3 py-2.5 text-xs shadow-sm ${m.tipo === "cliente" ? "rounded-tr-sm" : "rounded-tl-sm"}`}
                        style={{ backgroundColor: m.tipo === "cliente" ? C.greenSoft : "#FFFFFF", color: C.text }}>
                        {m.tipo === "ia" && <div className="flex items-center gap-1 text-xs font-semibold mb-1" style={{ color: C.greenDark }}><Bot size={11} />LivIA</div>}
                        {m.texto}
                        <span className="block text-[10px] text-right mt-0.5" style={{ color: C.muted }}>{m.hora}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="px-4 py-3 border-t flex items-center gap-2" style={{ borderColor: C.border }}>
                  <input className="flex-1 rounded-xl px-4 py-2.5 text-sm border" style={{ backgroundColor: C.bgAlt, borderColor: C.border, color: C.text }} placeholder="Digite sua mensagem..." readOnly />
                  <button className="w-10 h-10 rounded-xl flex items-center justify-center text-white" style={{ backgroundColor: C.green }}><Send size={16} /></button>
                </div>
              </div>
              <div className="border-l p-4 space-y-4" style={{ borderColor: C.border, backgroundColor: C.bgAlt }}>
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold text-white mx-auto mb-2" style={{ backgroundColor: C.greenDark }}>AR</div>
                  <div className="font-semibold text-sm" style={{ color: C.text }}>Ana Rodrigues</div>
                  <div className="text-xs" style={{ color: C.muted }}>Clínica Bem Estar</div>
                </div>
                <div className="space-y-2 text-xs border-t pt-3" style={{ borderColor: C.border }}>
                  {[{ label: "Intenção", value: "Agendamento" }, { label: "Sentimento", value: "Positivo" }, { label: "Oportunidade", value: "Alta" }, { label: "Responsável", value: "IA — LivIA" }].map((f) => (
                    <div key={f.label} className="flex justify-between">
                      <span style={{ color: C.muted }}>{f.label}</span>
                      <span className="font-semibold" style={{ color: C.text }}>{f.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          {tab === "agenda" && (
            <div className="p-8">
              <div className="grid lg:grid-cols-2 gap-10 items-start">
                <div>
                  <h3 className="font-bold text-lg mb-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: C.text }}>Agenda de disponibilidade</h3>
                  <p className="text-sm mb-6" style={{ color: C.muted }}>Configure os horários disponíveis. A IA consulta esses dados em tempo real durante as conversas no WhatsApp.</p>
                  <div className="space-y-2">
                    {availabilities.filter((a) => a.empresaId === DEFAULT_ORGANIZATION_ID).slice(0, 4).map((a) => (
                      <div key={a.id} className="flex items-center justify-between border rounded-xl px-4 py-3" style={{ backgroundColor: C.bgAlt, borderColor: C.border }}>
                        <div className="flex items-center gap-3">
                          <Calendar size={13} style={{ color: C.greenDark }} />
                          <span className="text-sm font-medium" style={{ color: C.text }}>{formatDate(a.data)} — {a.horaInicio}–{a.horaFim}</span>
                        </div>
                        <Badge color={a.status === "disponivel" ? "green" : "red"}>
                          {a.status === "disponivel" ? "Disponível" : "Indisponível"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: C.text }}>IA consultando a agenda</h3>
                  <p className="text-sm mb-6" style={{ color: C.muted }}>Quando o cliente pergunta sobre disponibilidade, a IA busca automaticamente os horários cadastrados.</p>
                  <WhatsAppAvailabilityChat availabilities={availabilities} empresaId={DEFAULT_ORGANIZATION_ID} />
                </div>
              </div>
            </div>
          )}
          {tab === "relatorios" && (
            <div className="p-6">
              <div className="grid grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
                {[{ label: "Conversas", value: "1.247", color: C.green }, { label: "Resolvidas IA", value: "83%", color: C.blue }, { label: "Transferências", value: "17%", color: C.amber }, { label: "Tempo médio", value: "1m 42s", color: C.greenDark }, { label: "Qualificados", value: "312", color: C.lilac }, { label: "Satisfação", value: "4.8★", color: C.coral }].map((m) => (
                  <div key={m.label} className="rounded-2xl p-3 text-center border" style={{ backgroundColor: C.bgAlt, borderColor: C.border }}>
                    <div className="text-lg font-bold" style={{ color: m.color }}>{m.value}</div>
                    <div className="text-[10px] mt-0.5" style={{ color: C.muted }}>{m.label}</div>
                  </div>
                ))}
              </div>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={conversasDia}>
                    <defs>
                      <linearGradient id="gDemoRel1" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={C.green} stopOpacity={0.3} />
                        <stop offset="100%" stopColor={C.green} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                    <XAxis dataKey="dia" tick={{ fill: C.muted, fontSize: 11 }} />
                    <YAxis tick={{ fill: C.muted, fontSize: 11 }} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Area type="monotone" dataKey="ia" name="IA" stroke={C.green} fill="url(#gDemoRel1)" strokeWidth={2} />
                    <Area type="monotone" dataKey="humano" name="Humano" stroke={C.blue} fill="transparent" strokeWidth={2} strokeDasharray="4 2" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
        <div className="text-center mt-8">
          <GradientButton onClick={() => setView("client")} size="lg">Explorar a plataforma completa</GradientButton>
        </div>
      </div>
    </section>
  );
}

function SegmentosSection() {
  const segs = [
    { icon: "🏥", nome: "Clínicas e Consultórios", desc: "Agendamentos, confirmações e informações sobre procedimentos automatizados.", color: C.green },
    { icon: "🏠", nome: "Imobiliárias", desc: "Qualificação de interessados, busca de imóveis e agendamento de visitas.", color: C.blue },
    { icon: "🛒", nome: "E-commerce", desc: "Status de pedidos, recomendações e suporte a trocas e devoluções.", color: C.lilac },
    { icon: "🍽️", nome: "Restaurantes", desc: "Cardápio digital, reservas e pedidos pelo WhatsApp com agilidade.", color: C.coral },
    { icon: "🎓", nome: "Educação", desc: "Informações sobre cursos, matrículas e suporte ao aluno 24 horas.", color: C.amber },
    { icon: "🔧", nome: "Prestadores de Serviços", desc: "Triagem, orçamentos e agendamento de visitas técnicas automatizados.", color: C.greenDark },
  ];
  return (
    <section id="soluções" className="py-24 px-6">
      <div className="max-w-[1240px] mx-auto">
        <h2 className="text-3xl lg:text-4xl font-bold text-center mb-4" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: C.text }}>Uma solução para cada segmento</h2>
        <p className="text-center mb-16 max-w-xl mx-auto" style={{ color: C.muted }}>A LivIA se adapta ao vocabulário, fluxo e objetivos do seu negócio.</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {segs.map((s, i) => (
            <div key={i} className="bg-white border rounded-2xl p-6 shadow-sm" style={{ borderColor: C.border }}>
              <div className="text-3xl mb-3">{s.icon}</div>
              <h3 className="font-bold mb-2" style={{ color: C.text }}>{s.nome}</h3>
              <p className="text-sm leading-relaxed" style={{ color: C.muted }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PlanosSection({ setView }: { setView: (v: View) => void }) {
  const [anual, setAnual] = useState(false);
  const planos = [
    { nome: "Essencial", desc: "Pequenos negócios", preco: anual ? 197 : 247, destaque: false, recursos: ["1 número de WhatsApp", "Até 3 usuários", "1 agente de IA", "Caixa de entrada compartilhada", "Agenda de disponibilidade", "Base de conhecimento", "Automações básicas", "Relatórios essenciais", "Suporte por chat"], cta: "Começar teste grátis" },
    { nome: "Profissional", desc: "Empresas em crescimento", preco: anual ? 397 : 497, destaque: true, recursos: ["Até 2 números de WhatsApp", "Até 10 usuários", "Até 3 agentes de IA", "Automações avançadas", "Integrações por webhook", "Segmentação de contatos", "Relatórios avançados", "Gestão de equipes e filas", "Suporte prioritário"], cta: "Testar por 7 dias" },
    { nome: "Enterprise", desc: "Operações de alto volume", preco: null, destaque: false, recursos: ["Números e usuários personalizados", "Agentes de IA personalizados", "Múltiplas unidades", "API completa", "Integrações customizadas", "SSO e controles avançados", "Relatórios personalizados", "Gerente de sucesso", "SLA personalizado"], cta: "Falar com especialista" },
  ];
  return (
    <section id="planos" className="py-24 px-6" style={{ backgroundColor: C.bgAlt }}>
      <div className="max-w-[1240px] mx-auto">
        <h2 className="text-3xl lg:text-4xl font-bold text-center mb-10" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: C.text }}>Planos para cada etapa do crescimento</h2>
        <div className="flex items-center justify-center gap-3 mb-12">
          <span className="text-sm" style={{ color: !anual ? C.text : C.muted }}>Mensal</span>
          <button onClick={() => setAnual(!anual)} className="w-12 h-6 rounded-full relative" style={{ backgroundColor: anual ? C.green : C.border }}>
            <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${anual ? "left-7" : "left-1"}`} />
          </button>
          <span className="text-sm" style={{ color: anual ? C.text : C.muted }}>
            Anual <span className="text-[10px] rounded-full px-2 py-0.5 font-semibold ml-1" style={{ backgroundColor: C.greenSoft, color: C.greenDark }}>-20%</span>
          </span>
        </div>
        <div className="grid lg:grid-cols-3 gap-6">
          {planos.map((p, i) => (
            <div key={i} className={`rounded-2xl border p-7 relative flex flex-col ${p.destaque ? "shadow-xl" : "bg-white shadow-sm"}`}
              style={p.destaque ? { borderColor: C.green, background: `linear-gradient(160deg, ${C.greenSoft} 0%, white 40%)` } : { borderColor: C.border, backgroundColor: C.card }}>
              {p.destaque && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow" style={{ background: `linear-gradient(135deg, ${C.green}, ${C.blue})` }}>Mais escolhido</div>
              )}
              <div className="mb-6">
                <h3 className="font-bold text-xl mb-1" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: C.text }}>{p.nome}</h3>
                <p className="text-sm" style={{ color: C.muted }}>{p.desc}</p>
              </div>
              <div className="mb-6">
                {p.preco ? (
                  <div><span className="text-4xl font-bold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: C.text }}>R$ {p.preco}</span><span className="text-sm" style={{ color: C.muted }}>/mês</span></div>
                ) : (
                  <div className="text-2xl font-bold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: C.text }}>Sob consulta</div>
                )}
              </div>
              <ul className="space-y-2.5 mb-8 flex-1">
                {p.recursos.map((r) => (
                  <li key={r} className="flex items-start gap-2 text-sm" style={{ color: C.muted }}>
                    <Check size={14} style={{ color: C.green, flexShrink: 0, marginTop: 2 }} />{r}
                  </li>
                ))}
              </ul>
              {p.destaque ? (
                <GradientButton onClick={() => setView("onboarding")} full>{p.cta}</GradientButton>
              ) : (
                <OutlineButton onClick={() => setView("onboarding")} full>{p.cta}</OutlineButton>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SegurancaSection() {
  const itens = [
    { icon: Shield, titulo: "Conexão oficial com o WhatsApp Business" },
    { icon: RefreshCw, titulo: "Criptografia de dados em trânsito e em repouso" },
    { icon: Users, titulo: "Controle de permissões por função" },
    { icon: FileText, titulo: "Registro de atividades e auditoria" },
    { icon: Database, titulo: "Backups automáticos e políticas de retenção" },
    { icon: Globe, titulo: "Ferramentas para apoiar conformidade com a LGPD" },
  ];
  return (
    <section id="segurança" className="py-24 px-6">
      <div className="max-w-[1240px] mx-auto">
        <h2 className="text-3xl lg:text-4xl font-bold text-center mb-16" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: C.text }}>Segurança e privacidade</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {itens.map((it, i) => (
            <div key={i} className="flex items-start gap-4 bg-white border rounded-2xl p-5 shadow-sm" style={{ borderColor: C.border }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: C.greenSoft }}>
                <it.icon size={16} style={{ color: C.greenDark }} />
              </div>
              <span className="text-sm font-medium leading-relaxed" style={{ color: C.text }}>{it.titulo}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TestemunhosSection() {
  const tests = [
    { avatar: "RL", nome: "Roberto Lima", cargo: "Gerente de Operações", empresa: "Clínica Bem Estar", texto: "A LivIA transformou nosso atendimento. Agendamentos que levavam 10 minutos são confirmados em segundos.", resultado: "+40% em agendamentos" },
    { avatar: "FS", nome: "Fernanda Souza", cargo: "Diretora Comercial", empresa: "ImobTech", texto: "Antes perdíamos contatos fora do horário comercial. Com a LivIA, cada mensagem recebe resposta imediata.", resultado: "Leads qualificados 3x mais" },
    { avatar: "MO", nome: "Marcos Oliveira", cargo: "Proprietário", empresa: "Sabor & Arte", texto: "Implementamos em um fim de semana. Agora o WhatsApp virou nosso maior canal de reservas.", resultado: "80% das reservas pelo WhatsApp" },
  ];
  return (
    <section className="py-24 px-6" style={{ backgroundColor: C.bgAlt }}>
      <div className="max-w-[1240px] mx-auto">
        <h2 className="text-3xl lg:text-4xl font-bold text-center mb-4" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: C.text }}>O que nossos clientes dizem</h2>
        <p className="text-center text-xs mb-16 italic" style={{ color: C.muted }}>Depoimentos fictícios — referência de conteúdo para o produto</p>
        <div className="grid lg:grid-cols-3 gap-6">
          {tests.map((t, i) => (
            <div key={i} className="bg-white border rounded-2xl p-6 flex flex-col gap-4 shadow-sm" style={{ borderColor: C.border }}>
              <div className="flex gap-0.5">
                {[1,2,3,4,5].map((s) => <Star key={s} size={14} style={{ color: C.amber, fill: C.amber }} />)}
              </div>
              <p className="text-sm leading-relaxed flex-1" style={{ color: C.muted }}>"{t.texto}"</p>
              <div className="text-xs font-bold px-3 py-1.5 rounded-lg border" style={{ color: C.greenDark, backgroundColor: C.greenSoft, borderColor: "#B2DBBF" }}>{t.resultado}</div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: C.greenDark }}>{t.avatar}</div>
                <div>
                  <div className="font-semibold text-sm" style={{ color: C.text }}>{t.nome}</div>
                  <div className="text-xs" style={{ color: C.muted }}>{t.cargo} · {t.empresa}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQSection() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="py-24 px-6">
      <div className="max-w-[800px] mx-auto">
        <h2 className="text-3xl lg:text-4xl font-bold text-center mb-16" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: C.text }}>Perguntas frequentes</h2>
        <div className="space-y-3">
          {faqItems.map((item, i) => (
            <div key={i} className="bg-white border rounded-2xl overflow-hidden shadow-sm" style={{ borderColor: open === i ? C.green : C.border }}>
              <button className="w-full flex items-center justify-between px-6 py-5 text-left" onClick={() => setOpen(open === i ? null : i)}>
                <span className="font-semibold text-sm pr-4" style={{ color: C.text }}>{item.q}</span>
                {open === i ? <ChevronUp size={16} style={{ color: C.green, flexShrink: 0 }} /> : <ChevronDown size={16} style={{ color: C.muted, flexShrink: 0 }} />}
              </button>
              {open === i && <div className="px-6 pb-5 text-sm leading-relaxed" style={{ color: C.muted }}>{item.a}</div>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTAFinalSection({ setView }: { setView: (v: View) => void }) {
  return (
    <section className="py-24 px-6">
      <div className="max-w-[1240px] mx-auto">
        <div className="rounded-3xl p-12 text-center" style={{ background: `linear-gradient(135deg, ${C.greenSoft} 0%, #EAF0FD 100%)`, border: `1px solid ${C.border}` }}>
          <h2 className="text-3xl lg:text-5xl font-bold mb-6" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: C.text }}>
            Transforme seu WhatsApp no canal de atendimento mais{" "}
            <span style={{ background: `linear-gradient(135deg, ${C.green}, ${C.blue})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>inteligente</span>{" "}
            da sua empresa.
          </h2>
          <p className="mb-10 max-w-xl mx-auto" style={{ color: C.muted }}>Comece o teste gratuito hoje e veja a LivIA atendendo seus clientes em poucos minutos.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <GradientButton onClick={() => setView("onboarding")} size="lg">Testar grátis por 7 dias</GradientButton>
            <OutlineButton size="lg">Agendar demonstração</OutlineButton>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  const cols = [
    { titulo: "Produto", links: ["Recursos", "Integrações", "Planos", "Segurança", "Atualizações"] },
    { titulo: "Soluções", links: ["Atendimento", "Vendas", "Agendamentos", "Suporte", "Segmentos"] },
    { titulo: "Empresa", links: ["Sobre", "Contato", "Parceiros", "Trabalhe conosco"] },
    { titulo: "Suporte", links: ["Central de ajuda", "Status do sistema", "Documentação", "API"] },
    { titulo: "Legal", links: ["Privacidade", "Termos", "Cookies", "LGPD"] },
  ];
  return (
    <footer className="border-t py-16 px-6" style={{ borderColor: C.border, backgroundColor: C.bgAlt }}>
      <div className="max-w-[1240px] mx-auto">
        <div className="grid sm:grid-cols-2 lg:grid-cols-6 gap-8 mb-12">
          <div className="lg:col-span-1">
            <Logo />
            <p className="text-sm mt-3 leading-relaxed" style={{ color: C.muted }}>Atendimento inteligente no WhatsApp, disponível 24 horas.</p>
          </div>
          {cols.map((col) => (
            <div key={col.titulo}>
              <h4 className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: C.text }}>{col.titulo}</h4>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link}><a href="#" className="text-sm" style={{ color: C.muted }}>{link}</a></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t pt-6 text-center text-xs" style={{ borderColor: C.border, color: C.muted }}>
          © 2025 LivIA. Todos os direitos reservados.
        </div>
      </div>
    </footer>
  );
}

function LandingPage({ setView, availabilities }: { setView: (v: View) => void; availabilities: Availability[] }) {
  return (
    <div className="min-h-screen" style={{ fontFamily: "'Inter', sans-serif", backgroundColor: C.bg }}>
      <Header setView={setView} />
      <HeroSection setView={setView} />
      <TrustBar />
      <ProblemasSection />
      <ComoFuncionaSection setView={setView} />
      <RecursosSection />
      <DemoSection setView={setView} availabilities={availabilities} />
      <SegmentosSection />
      <PlanosSection setView={setView} />
      <CTAFinalSection setView={setView} />
      <SegurancaSection />
      <TestemunhosSection />
      <FAQSection />
      <Footer />
    </div>
  );
}

// ─── Onboarding ─────────────────────────────────────────────────────────────

function OnboardingView({ setView }: { setView: (v: View) => void }) {
  const [etapa, setEtapa] = useState(1);
  const total = 6;
  const etapas = ["Conta", "Empresa", "Objetivo", "WhatsApp", "Configuração", "Teste"];
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ backgroundColor: C.bg, fontFamily: "'Inter', sans-serif" }}>
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <Logo size="lg" />
          <p className="text-sm mt-2" style={{ color: C.muted }}>Configure seu atendimento inteligente em poucos passos</p>
        </div>
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            {etapas.map((e, i) => (
              <div key={i} className="flex flex-col items-center gap-1 flex-1">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                  style={i + 1 < etapa ? { backgroundColor: C.green, color: "white" } : i + 1 === etapa ? { border: `2px solid ${C.green}`, color: C.green, backgroundColor: "white" } : { border: `1px solid ${C.border}`, color: C.muted, backgroundColor: "white" }}>
                  {i + 1 < etapa ? <Check size={12} /> : i + 1}
                </div>
                <span className="text-[9px] hidden sm:block" style={{ color: i + 1 === etapa ? C.greenDark : C.muted }}>{e}</span>
              </div>
            ))}
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: C.border }}>
            <div className="h-full rounded-full" style={{ width: `${((etapa - 1) / (total - 1)) * 100}%`, background: `linear-gradient(90deg, ${C.green}, ${C.blue})` }} />
          </div>
        </div>
        <div className="bg-white border rounded-3xl p-8 shadow-sm" style={{ borderColor: C.border }}>
          {etapa === 1 && (
            <div className="space-y-5">
              <h2 className="text-xl font-bold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: C.text }}>Crie sua conta</h2>
              {[{ label: "Nome completo", type: "text", placeholder: "Maria Silva" }, { label: "E-mail", type: "email", placeholder: "maria@empresa.com.br" }, { label: "Senha", type: "password", placeholder: "Mínimo 8 caracteres" }].map((f) => (
                <div key={f.label}>
                  <label className="text-xs font-bold uppercase tracking-wide block mb-1.5" style={{ color: C.muted }}>{f.label}</label>
                  <input type={f.type} placeholder={f.placeholder} className="w-full rounded-xl px-4 py-3 text-sm border outline-none" style={{ backgroundColor: C.bgAlt, borderColor: C.border, color: C.text }} />
                </div>
              ))}
            </div>
          )}
          {etapa === 2 && (
            <div className="space-y-5">
              <h2 className="text-xl font-bold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: C.text }}>Dados da empresa</h2>
              {[{ label: "Nome da empresa", placeholder: "Clínica Bem Estar" }, { label: "Site", placeholder: "www.clinicabemestar.com.br" }].map((f) => (
                <div key={f.label}>
                  <label className="text-xs font-bold uppercase tracking-wide block mb-1.5" style={{ color: C.muted }}>{f.label}</label>
                  <input placeholder={f.placeholder} className="w-full rounded-xl px-4 py-3 text-sm border outline-none" style={{ backgroundColor: C.bgAlt, borderColor: C.border, color: C.text }} />
                </div>
              ))}
            </div>
          )}
          {etapa === 3 && (
            <div className="space-y-5">
              <h2 className="text-xl font-bold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: C.text }}>Qual é o seu principal objetivo?</h2>
              <div className="grid grid-cols-2 gap-3">
                {[{ icon: MessageSquare, label: "Atendimento" }, { icon: TrendingUp, label: "Qualificação de leads" }, { icon: Clock, label: "Agendamentos" }, { icon: UserCheck, label: "Suporte técnico" }, { icon: Zap, label: "Vendas diretas" }, { icon: Users, label: "Outro objetivo" }].map((obj, i) => (
                  <label key={i} className="flex items-center gap-3 rounded-xl p-4 cursor-pointer border" style={{ borderColor: C.border, backgroundColor: C.bgAlt }}>
                    <input type="radio" name="objetivo" className="hidden" />
                    <obj.icon size={16} style={{ color: C.green }} />
                    <span className="text-sm font-medium" style={{ color: C.text }}>{obj.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          {etapa === 4 && (
            <div className="space-y-5">
              <h2 className="text-xl font-bold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: C.text }}>Conecte seu WhatsApp</h2>
              <div className="rounded-2xl p-5 text-center border" style={{ backgroundColor: C.greenSoft, borderColor: "#B2DBBF" }}>
                <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: C.green }}>
                  <Phone size={20} className="text-white" />
                </div>
                <p className="text-sm font-semibold mb-4" style={{ color: C.text }}>Escaneie o QR Code para conectar</p>
                <div className="w-32 h-32 mx-auto bg-white rounded-xl flex items-center justify-center border" style={{ borderColor: C.border }}>
                  <div className="grid grid-cols-5 gap-1">
                    {Array.from({ length: 25 }, (_, i) => (
                      <div key={i} className="w-2 h-2 rounded-sm" style={{ backgroundColor: i % 3 === 0 ? C.text : "transparent" }} />
                    ))}
                  </div>
                </div>
                <p className="text-[10px] mt-3" style={{ color: C.muted }}>QR Code simulado</p>
              </div>
            </div>
          )}
          {etapa === 5 && (
            <div className="space-y-5">
              <h2 className="text-xl font-bold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: C.text }}>Configure seu agente de IA</h2>
              <div>
                <label className="text-xs font-bold uppercase tracking-wide block mb-1.5" style={{ color: C.muted }}>Nome do agente</label>
                <input placeholder="Ex: Sofia, Atendimento, LivIA" className="w-full rounded-xl px-4 py-3 text-sm border outline-none" style={{ backgroundColor: C.bgAlt, borderColor: C.border, color: C.text }} />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wide block mb-1.5" style={{ color: C.muted }}>Tom de voz</label>
                <div className="grid grid-cols-3 gap-2">
                  {["Formal", "Amigável", "Descontraído"].map((t) => (
                    <label key={t} className="flex items-center justify-center py-2.5 border rounded-xl cursor-pointer text-sm" style={{ borderColor: C.border, color: C.text }}>
                      <input type="radio" name="tom" className="hidden" />{t}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wide block mb-1.5" style={{ color: C.muted }}>Mensagem de apresentação</label>
                <textarea rows={3} className="w-full rounded-xl px-4 py-3 text-sm border outline-none resize-none" placeholder="Olá! Sou a LivIA, assistente virtual. Como posso te ajudar hoje?" style={{ backgroundColor: C.bgAlt, borderColor: C.border, color: C.text }} />
              </div>
            </div>
          )}
          {etapa === 6 && (
            <div className="space-y-5">
              <h2 className="text-xl font-bold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: C.text }}>Teste seu agente</h2>
              <div className="border rounded-2xl overflow-hidden" style={{ borderColor: C.border }}>
                <div className="flex items-center gap-2 px-4 py-3 text-xs font-semibold" style={{ backgroundColor: "#075E54", color: "white" }}>
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: C.green }} />Simulador de conversa
                </div>
                <div className="p-4 min-h-28" style={{ backgroundColor: "#E5DDD5" }}>
                  <div className="flex justify-start">
                    <div className="bg-white rounded-2xl rounded-tl-sm px-3 py-2 text-xs max-w-[80%] shadow-sm" style={{ color: C.text }}>
                      <div className="flex items-center gap-1 font-semibold mb-1" style={{ fontSize: 10, color: C.greenDark }}><Bot size={10} />Seu agente</div>
                      Olá! Sou a LivIA, assistente virtual. Como posso te ajudar hoje?
                    </div>
                  </div>
                </div>
                <div className="px-4 pb-4 pt-3 flex gap-2" style={{ backgroundColor: C.card }}>
                  <input className="flex-1 rounded-xl px-3 py-2.5 text-xs border" style={{ backgroundColor: C.bgAlt, borderColor: C.border, color: C.text }} placeholder="Teste uma mensagem..." readOnly />
                  <button className="px-4 py-2.5 rounded-xl text-xs font-bold text-white" style={{ backgroundColor: C.green }}>Enviar</button>
                </div>
              </div>
              <div className="rounded-2xl p-4 border" style={{ backgroundColor: C.greenSoft, borderColor: "#B2DBBF" }}>
                <div className="flex items-center gap-2 font-semibold text-sm mb-2" style={{ color: C.greenDark }}>
                  <CheckCircle2 size={16} />Tudo pronto!
                </div>
                <p className="text-xs" style={{ color: C.muted }}>Seu agente está configurado. Clique em "Ativar atendimento" para começar.</p>
              </div>
            </div>
          )}
          <div className="flex items-center justify-between mt-8">
            <button onClick={() => etapa > 1 ? setEtapa(etapa - 1) : setView("landing")} className="text-sm font-medium" style={{ color: C.muted }}>
              ← {etapa > 1 ? "Voltar" : "Ir para home"}
            </button>
            {etapa < total ? (
              <GradientButton onClick={() => setEtapa(etapa + 1)}>Continuar</GradientButton>
            ) : (
              <GradientButton onClick={() => setView("client")}>Ativar atendimento</GradientButton>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Client View ─────────────────────────────────────────────────────────────

type ClientPage = "inicio" | "conversas" | "contatos" | "agentes" | "automacoes" | "relatorios" | "plano";

function ClientSidebar({ page, setPage, setView }: { page: ClientPage; setPage: (p: ClientPage) => void; setView: (v: View) => void }) {
  const items: { id: ClientPage; icon: React.ElementType; label: string }[] = [
    { id: "inicio", icon: Home, label: "Início" },
    { id: "conversas", icon: Inbox, label: "Conversas" },
    { id: "contatos", icon: Users, label: "Contatos" },
    { id: "agentes", icon: Bot, label: "Agentes de IA" },
    { id: "automacoes", icon: Zap, label: "Automações" },
    { id: "relatorios", icon: BarChart2, label: "Relatórios" },
    { id: "plano", icon: CreditCard, label: "Plano e uso" },
  ];
  return (
    <aside className="w-60 flex-shrink-0 border-r flex flex-col" style={{ backgroundColor: C.bgAlt, borderColor: C.border }}>
      <div className="px-5 py-4 border-b" style={{ borderColor: C.border }}>
        <Logo />
        <div className="flex items-center gap-2 mt-3">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: C.green }} />
          <span className="text-xs" style={{ color: C.muted }}>Clínica Bem Estar</span>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {items.map((item) => (
          <button key={item.id} onClick={() => setPage(item.id)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all min-h-[44px]"
            style={page === item.id ? { backgroundColor: C.greenSoft, color: C.greenDark, border: `1px solid #B2DBBF`, fontWeight: 600 } : { color: C.muted }}>
            <item.icon size={16} />{item.label}
          </button>
        ))}
      </nav>
      <div className="px-3 py-4 border-t space-y-1" style={{ borderColor: C.border }}>
        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm min-h-[44px]" style={{ color: C.muted }}><Settings size={16} />Configurações</button>
        <button onClick={() => setView("landing")} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm min-h-[44px]" style={{ color: C.muted }}><LogIn size={16} />Ir para home</button>
      </div>
    </aside>
  );
}

function ClientDashboardHome({ onChoosePlan }: { onChoosePlan: () => void }) {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl p-4 flex items-center gap-4 border" style={{ background: `linear-gradient(135deg, ${C.greenSoft}, #EAF0FD)`, borderColor: "#B2DBBF" }}>
        <div className="flex-1">
          <p className="text-sm font-bold" style={{ color: C.text }}>Você está no período de teste gratuito</p>
          <p className="text-xs mt-0.5" style={{ color: C.muted }}>Restam 5 dias. Escolha um plano para continuar.</p>
        </div>
        <GradientButton size="sm" onClick={onChoosePlan}>Escolher plano</GradientButton>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Conversas hoje" value="47" sub="vs 38 ontem" trend="+23%" icon={MessageSquare} color="green" />
        <MetricCard label="Resolvidas pela IA" value="83%" sub="39 de 47" trend="+5pp" icon={Bot} color="blue" />
        <MetricCard label="Transferências" value="8" sub="17% do total" icon={UserCheck} color="amber" />
        <MetricCard label="Contatos qualificados" value="12" sub="esta semana" trend="+4" icon={Users} color="green" />
      </div>
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white border rounded-2xl p-5 shadow-sm" style={{ borderColor: C.border }}>
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-bold text-sm" style={{ color: C.text }}>Conversas por dia</h3>
            <Badge color="green">Últimos 7 dias</Badge>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={conversasDia}>
                <defs>
                  <linearGradient id="gClientDash1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.green} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={C.green} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gClientDash2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.blue} stopOpacity={0.2} />
                    <stop offset="100%" stopColor={C.blue} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                <XAxis dataKey="dia" tick={{ fill: C.muted, fontSize: 11 }} />
                <YAxis tick={{ fill: C.muted, fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="ia" name="IA" stroke={C.green} fill="url(#gClientDash1)" strokeWidth={2} />
                <Area type="monotone" dataKey="humano" name="Humano" stroke={C.blue} fill="url(#gClientDash2)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white border rounded-2xl p-5 shadow-sm" style={{ borderColor: C.border }}>
          <h3 className="font-bold text-sm mb-5" style={{ color: C.text }}>Checklist de onboarding</h3>
          <div className="space-y-3">
            {[{ label: "Conta criada", ok: true }, { label: "WhatsApp conectado", ok: true }, { label: "Agente configurado", ok: true }, { label: "Base de conhecimento", ok: false }, { label: "Automações ativas", ok: false }, { label: "Plano escolhido", ok: false }].map((item) => (
              <div key={item.label} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: item.ok ? C.green : "white", border: item.ok ? "none" : `2px solid ${C.border}` }}>
                  {item.ok && <Check size={11} className="text-white" />}
                </div>
                <span className="text-sm" style={{ color: item.ok ? C.text : C.muted }}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ClientInboxPage({ availabilities, organizationId }: { availabilities: Availability[]; organizationId: string }) {
  const { conversations, loading: convLoading, error: convError } = useConversations(organizationId);
  const [selected, setSelected] = useState<string | null>(null);
  const { messages, meta, loading: msgLoading, error: msgError, assume } = useConversationMessages(selected);

  useEffect(() => {
    if (conversations.length && !selected) {
      setSelected(conversations[0].id);
    }
  }, [conversations, selected]);

  const conv = conversations.find((c) => c.id === selected);

  const disponiveis = availabilities
    .filter((a) => a.empresaId === organizationId && a.status === "disponivel")
    .sort((a, b) => (a.data + a.horaInicio).localeCompare(b.data + b.horaInicio));

  const respostaDisp = buildAvailabilityResponse(availabilities, organizationId);

  const mensagensLucas = selected === LUCAS_CONVERSATION_ID ? [
    { tipo: "cliente" as const, texto: "Olá! Quais horários estão disponíveis para consulta?", hora: "09:15" },
    { tipo: "sistema" as const, texto: `IA consultou a agenda — ${disponiveis.length} horário(s) disponível(is)` },
    { tipo: "ia" as const, texto: respostaDisp, hora: "09:15" },
    { tipo: "cliente" as const, texto: "Terça às 9h seria perfeito!", hora: "09:16" },
    { tipo: "ia" as const, texto: "Ótimo! Registrei seu interesse no horário de terça-feira às 9h. Nossa equipe entrará em contato para confirmar. 😊", hora: "09:16" },
  ] : null;

  const displayMessages = selected === LUCAS_CONVERSATION_ID && mensagensLucas
    ? mensagensLucas
    : messages;

  if (convLoading) {
    return (
      <div className="flex flex-1 items-center justify-center gap-2" style={{ color: C.muted }}>
        <Loader2 size={20} className="animate-spin" /> Carregando conversas...
      </div>
    );
  }

  if (convError) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="text-center text-sm" style={{ color: C.red }}>{convError}</div>
      </div>
    );
  }

  if (!conversations.length || !conv) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="text-center">
          <Inbox size={32} style={{ color: C.muted, margin: "0 auto 12px" }} />
          <p className="font-bold" style={{ color: C.text }}>Nenhuma conversa</p>
          <p className="text-sm mt-1" style={{ color: C.muted }}>As conversas do WhatsApp aparecerão aqui.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 overflow-hidden" style={{ height: "calc(100vh - 57px)" }}>
      <div className="w-72 flex-shrink-0 border-r flex flex-col" style={{ borderColor: C.border, backgroundColor: C.bgAlt }}>
        <div className="p-3 border-b" style={{ borderColor: C.border }}>
          <div className="relative mb-2">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: C.muted }} />
            <input className="w-full rounded-xl pl-8 pr-3 py-2 text-xs border" style={{ backgroundColor: C.card, borderColor: C.border, color: C.text }} placeholder="Buscar..." readOnly />
          </div>
          <div className="flex gap-1.5">
            {["Todos", "IA", "Humano"].map((f) => (
              <button key={f} className="text-[10px] px-2.5 py-1.5 rounded-full border font-semibold min-h-[28px]"
                style={f === "Todos" ? { borderColor: C.green, backgroundColor: C.greenSoft, color: C.greenDark } : { borderColor: C.border, color: C.muted, backgroundColor: "white" }}>
                {f}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-auto p-2 space-y-1">
          {conversations.map((c) => (
            <button key={c.id} onClick={() => setSelected(c.id)} className="w-full rounded-xl p-3 text-left min-h-[44px]"
              style={c.id === selected ? { backgroundColor: C.greenSoft, border: `1px solid #B2DBBF` } : { backgroundColor: "transparent" }}>
              <div className="flex items-start gap-2">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ backgroundColor: C.greenDark }}>{c.avatar}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-0.5">
                    <span className="text-xs font-semibold truncate" style={{ color: C.text }}>{c.nome}</span>
                    <span className="text-[9px] flex-shrink-0 ml-1" style={{ color: C.muted }}>{c.tempo}</span>
                  </div>
                  <p className="text-[10px] truncate" style={{ color: C.muted }}>{c.ultimaMensagem}</p>
                  <div className="mt-1.5 flex items-center justify-between">
                    <Badge color={c.status === "ia" ? "green" : c.status === "humano" ? "blue" : c.status === "aguardando" ? "amber" : "gray"}>
                      {c.status === "ia" ? "IA" : c.status === "humano" ? "Humano" : c.status === "aguardando" ? "Aguardando" : "Finalizada"}
                    </Badge>
                    {c.naoLidas > 0 && <span className="text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center" style={{ backgroundColor: C.green }}>{c.naoLidas}</span>}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 flex flex-col" style={{ backgroundColor: C.card }}>
        <div className="flex items-center gap-3 px-5 py-3 border-b flex-shrink-0" style={{ borderColor: C.border }}>
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: C.greenDark }}>{conv.avatar}</div>
          <div>
            <div className="font-semibold text-sm" style={{ color: C.text }}>{conv.nome}</div>
            <div className="text-xs" style={{ color: C.muted }}>{conv.empresa}</div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Badge color={conv.status === "ia" ? "green" : conv.status === "humano" ? "blue" : conv.status === "aguardando" ? "amber" : "gray"}>
              {conv.status === "ia" ? <><Bot size={10} />IA atendendo</> : conv.status === "humano" ? "Atendente humano" : "Aguardando"}
            </Badge>
            {conv.status === "ia" && <GradientButton size="sm" onClick={() => assume()}>Assumir</GradientButton>}
          </div>
        </div>
        <div className="flex-1 overflow-auto p-5 space-y-3" style={{ backgroundColor: "#E5DDD5" }}>
          {msgLoading ? (
            <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin" style={{ color: C.muted }} /></div>
          ) : msgError ? (
            <div className="text-center text-sm py-8" style={{ color: C.red }}>{msgError}</div>
          ) : displayMessages.map((m, i) => {
            if (m.tipo === "sistema") {
              return (
                <div key={i} className="flex justify-center">
                  <span className="rounded-full px-3 py-1 text-[10px] font-semibold flex items-center gap-1" style={{ backgroundColor: C.greenSoft, color: C.greenDark }}>
                    <Bot size={10} />{m.texto}
                  </span>
                </div>
              );
            }
            return (
              <div key={i} className={`flex ${m.tipo === "cliente" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[70%] rounded-2xl px-4 py-3 text-sm shadow-sm whitespace-pre-wrap leading-relaxed ${m.tipo === "cliente" ? "rounded-tr-sm" : "rounded-tl-sm"}`}
                  style={{ backgroundColor: m.tipo === "cliente" ? C.greenSoft : "#FFFFFF", color: C.text }}>
                  {m.tipo === "ia" && <div className="flex items-center gap-1 text-xs font-semibold mb-1" style={{ color: C.greenDark }}><Bot size={12} />LivIA</div>}
                  <p>{m.texto}</p>
                  <span className="block text-[10px] text-right mt-1" style={{ color: C.muted }}>{m.hora}</span>
                </div>
              </div>
            );
          })}
        </div>
        <div className="px-5 py-4 border-t flex items-center gap-2" style={{ borderColor: C.border, backgroundColor: C.card }}>
          <button className="flex items-center justify-center rounded-xl border min-h-[44px] min-w-[44px]" style={{ borderColor: C.border, color: C.muted, width: 44, height: 44 }}><Paperclip size={16} /></button>
          <input className="flex-1 rounded-xl px-4 py-2.5 text-sm border" style={{ backgroundColor: C.bgAlt, borderColor: C.border, color: C.text }} placeholder="Digite sua mensagem..." />
          <button className="flex items-center justify-center rounded-xl text-white min-h-[44px] min-w-[44px]" style={{ backgroundColor: C.green, width: 44, height: 44 }}><Send size={16} /></button>
        </div>
      </div>
      <div className="w-64 flex-shrink-0 border-l p-4 overflow-auto space-y-4" style={{ borderColor: C.border, backgroundColor: C.bgAlt }}>
        <div className="text-center">
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold text-white mx-auto mb-2" style={{ backgroundColor: C.greenDark }}>{conv.avatar}</div>
          <div className="font-semibold text-sm" style={{ color: C.text }}>{conv.nome}</div>
          <div className="text-xs" style={{ color: C.muted }}>{conv.empresa}</div>
        </div>
        <div className="space-y-2 text-xs border-t pt-4" style={{ borderColor: C.border }}>
          {[{ label: "Intenção", value: meta?.ai_intent ?? (selected === LUCAS_CONVERSATION_ID ? "Disponibilidade" : "Agendamento") }, { label: "Sentimento", value: meta?.ai_sentiment ?? "Positivo" }, { label: "Oportunidade", value: meta?.ai_opportunity ?? "Alta" }, { label: "Responsável", value: meta?.responsible ?? "IA — LivIA" }].map((f) => (
            <div key={f.label} className="flex justify-between">
              <span style={{ color: C.muted }}>{f.label}</span>
              <span className="font-semibold" style={{ color: C.text }}>{f.value}</span>
            </div>
          ))}
        </div>
        {selected === LUCAS_CONVERSATION_ID && (
          <div className="border-t pt-4" style={{ borderColor: C.border }}>
            <div className="text-xs font-semibold mb-2" style={{ color: C.muted }}>Agenda consultada</div>
            <div className="rounded-xl p-3 text-xs leading-relaxed" style={{ backgroundColor: C.greenSoft, color: C.greenDark }}>
              {disponiveis.length} horário(s) disponível(is) encontrado(s) e apresentado(s) ao cliente.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ClientRelatoriosPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: C.text }}>Relatórios</h2>
        <div className="flex gap-2">
          <OutlineButton size="sm"><span className="flex items-center gap-1"><Filter size={13} />Filtros</span></OutlineButton>
          <OutlineButton size="sm"><span className="flex items-center gap-1"><Download size={13} />Exportar CSV</span></OutlineButton>
        </div>
      </div>
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
        {[{ label: "Total conversas", value: "1.247", color: C.green }, { label: "Resolvidas pela IA", value: "83%", color: C.blue }, { label: "Transferências", value: "17%", color: C.amber }, { label: "Tempo médio", value: "1m 42s", color: C.greenDark }, { label: "Qualificados", value: "312", color: C.lilac }, { label: "Satisfação", value: "4.8★", color: C.coral }].map((m) => (
          <div key={m.label} className="bg-white border rounded-2xl p-4 text-center shadow-sm" style={{ borderColor: C.border }}>
            <div className="text-xl font-bold" style={{ color: m.color }}>{m.value}</div>
            <div className="text-[10px] mt-0.5" style={{ color: C.muted }}>{m.label}</div>
          </div>
        ))}
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-white border rounded-2xl p-5 shadow-sm" style={{ borderColor: C.border }}>
          <h3 className="font-bold text-sm mb-4" style={{ color: C.text }}>Volume de conversas</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={conversasDia}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                <XAxis dataKey="dia" tick={{ fill: C.muted, fontSize: 11 }} />
                <YAxis tick={{ fill: C.muted, fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="ia" name="IA" fill={C.green} radius={[4, 4, 0, 0]} />
                <Bar dataKey="humano" name="Humano" fill={C.blue} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white border rounded-2xl p-5 shadow-sm" style={{ borderColor: C.border }}>
          <h3 className="font-bold text-sm mb-4" style={{ color: C.text }}>Distribuição por horário</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={[{ h: "8h", v: 12 }, { h: "10h", v: 28 }, { h: "12h", v: 45 }, { h: "14h", v: 62 }, { h: "16h", v: 48 }, { h: "18h", v: 35 }, { h: "20h", v: 22 }, { h: "22h", v: 8 }]}>
                <defs>
                  <linearGradient id="gRelHor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.lilac} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={C.lilac} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                <XAxis dataKey="h" tick={{ fill: C.muted, fontSize: 11 }} />
                <YAxis tick={{ fill: C.muted, fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="v" name="Conversas" stroke={C.lilac} fill="url(#gRelHor)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

function PlanCheckoutModal({
  organizationId,
  open,
  onClose,
}: {
  organizationId: string;
  open: boolean;
  onClose: () => void;
}) {
  const [interval, setInterval] = useState<"month" | "year">("month");
  const [loadingPlan, setLoadingPlan] = useState<PlanTier | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stripeReady, setStripeReady] = useState<boolean | null>(null);

  useEffect(() => {
    if (!open) return;
    fetchStripeConfig()
      .then((cfg) => setStripeReady(cfg.configured && cfg.pricesReady))
      .catch(() => setStripeReady(false));
  }, [open]);

  if (!open) return null;

  const handleCheckout = async (plan: Exclude<PlanTier, "Enterprise">) => {
    setLoadingPlan(plan);
    setError(null);
    try {
      const url = await createCheckoutSession({ organizationId, plan, interval });
      window.location.href = url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao iniciar checkout.");
      setLoadingPlan(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.45)" }}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 border" style={{ borderColor: C.border }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: C.text }}>Escolher plano</h3>
          <button onClick={onClose} className="p-1 rounded-lg" style={{ color: C.muted }}><X size={18} /></button>
        </div>

        <div className="flex gap-2 mb-5 p-1 rounded-xl" style={{ backgroundColor: C.bgAlt }}>
          <button
            onClick={() => setInterval("month")}
            className="flex-1 py-2 text-sm rounded-lg font-semibold transition-all"
            style={interval === "month" ? { backgroundColor: C.card, color: C.text, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" } : { color: C.muted }}
          >
            Mensal
          </button>
          <button
            onClick={() => setInterval("year")}
            className="flex-1 py-2 text-sm rounded-lg font-semibold transition-all"
            style={interval === "year" ? { backgroundColor: C.card, color: C.text, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" } : { color: C.muted }}
          >
            Anual (-20%)
          </button>
        </div>

        {stripeReady === false && (
          <div className="text-sm mb-4 p-3 rounded-xl border" style={{ color: C.amber, backgroundColor: "#FFFBEB", borderColor: "#FDE68A" }}>
            Stripe não configurado. Defina STRIPE_SECRET_KEY e os price IDs no .env.local, depois rode <code className="text-xs">npm run stripe:setup</code>.
          </div>
        )}

        {error && <div className="text-sm mb-4" style={{ color: C.red }}>{error}</div>}

        <div className="space-y-3">
          {(Object.values(PLANS) as typeof PLANS[keyof typeof PLANS][]).map((plan) => {
            const price = interval === "year" ? plan.yearlyPriceBrl : plan.monthlyPriceBrl;
            const isLoading = loadingPlan === plan.tier;
            return (
              <div key={plan.tier} className="border rounded-xl p-4 flex items-center justify-between gap-4" style={{ borderColor: C.border }}>
                <div>
                  <p className="font-bold text-sm" style={{ color: C.text }}>{plan.label}</p>
                  <p className="text-xs mt-0.5" style={{ color: C.muted }}>
                    {plan.limits.usuarios} usuários · {plan.limits.numeros_whatsapp} WhatsApp · {plan.limits.conversas} conversas/mês
                  </p>
                  <p className="text-lg font-bold mt-1" style={{ color: C.greenDark }}>
                    R$ {price}<span className="text-xs font-normal" style={{ color: C.muted }}>/{interval === "year" ? "mês (anual)" : "mês"}</span>
                  </p>
                </div>
                <GradientButton size="sm" onClick={() => void handleCheckout(plan.tier as Exclude<PlanTier, "Enterprise">)} disabled={Boolean(loadingPlan)}>
                  {isLoading ? <Loader2 size={14} className="animate-spin" /> : "Assinar"}
                </GradientButton>
              </div>
            );
          })}
        </div>

        <p className="text-xs mt-4 text-center" style={{ color: C.muted }}>
          Pagamento seguro via Stripe. Enterprise: entre em contato com vendas.
        </p>
      </div>
    </div>
  );
}

function ClientPlanoPage({ organizationId, checkoutNotice }: { organizationId: string; checkoutNotice?: "success" | "cancel" | null }) {
  const [usage, setUsage] = useState<PlanUsageItem[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  const reload = () => {
    Promise.all([
      fetchPlanUsage(organizationId),
      fetchSubscription(organizationId),
    ])
      .then(([usageData, subData]) => {
        setUsage(usageData);
        setSubscription(subData);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Erro ao carregar plano."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    reload();
  }, [organizationId]);

  useEffect(() => {
    if (checkoutNotice === "success") reload();
  }, [checkoutNotice, organizationId]);

  const handlePortal = async () => {
    setPortalLoading(true);
    setError(null);
    try {
      const url = await createBillingPortalSession(organizationId);
      window.location.href = url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao abrir portal.");
      setPortalLoading(false);
    }
  };

  const colors = [C.green, C.blue, C.greenDark, C.lilac];
  const isActive = subscription?.status === "active" || subscription?.status === "trialing";
  const planLabel = subscription?.plan ?? "Profissional";

  return (
    <div className="space-y-6 max-w-2xl">
      <PlanCheckoutModal organizationId={organizationId} open={checkoutOpen} onClose={() => setCheckoutOpen(false)} />
      <h2 className="text-xl font-bold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: C.text }}>Plano e consumo</h2>
      {checkoutNotice === "success" && (
        <div className="text-sm p-3 rounded-xl border flex items-center gap-2" style={{ color: C.greenDark, backgroundColor: C.greenSoft, borderColor: "#B2DBBF" }}>
          <CheckCircle2 size={16} /> Pagamento confirmado! Sua assinatura será atualizada em instantes.
        </div>
      )}
      {checkoutNotice === "cancel" && (
        <div className="text-sm p-3 rounded-xl border" style={{ color: C.muted, backgroundColor: C.bgAlt, borderColor: C.border }}>
          Checkout cancelado. Você pode escolher um plano quando quiser.
        </div>
      )}
      {error && <div className="text-sm" style={{ color: C.red }}>{error}</div>}
      {loading ? (
        <div className="flex items-center gap-2 py-8" style={{ color: C.muted }}><Loader2 size={18} className="animate-spin" /> Carregando...</div>
      ) : (
      <>
      <div className="rounded-2xl p-6 border" style={{ background: `linear-gradient(135deg, ${C.greenSoft}, #EAF0FD)`, borderColor: "#B2DBBF" }}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <Badge color={isActive ? "green" : "amber"}>{isActive ? "Assinatura ativa" : "Período de teste"}</Badge>
            <h3 className="text-2xl font-bold mt-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: C.text }}>Plano {planLabel}</h3>
            {subscription?.currentPeriodEnd && (
              <p className="text-xs mt-1" style={{ color: C.muted }}>
                Renova em {new Date(subscription.currentPeriodEnd).toLocaleDateString("pt-BR")}
              </p>
            )}
          </div>
          {!isActive && (
            <GradientButton onClick={() => setCheckoutOpen(true)}>Escolher plano</GradientButton>
          )}
          {isActive && (
            <OutlineButton onClick={() => void handlePortal()} disabled={portalLoading}>
              {portalLoading ? <Loader2 size={14} className="animate-spin" /> : "Gerenciar assinatura"}
            </OutlineButton>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: C.border }}>
            <div className="h-full rounded-full" style={{ width: isActive ? "100%" : "71%", background: `linear-gradient(90deg, ${C.green}, ${C.blue})` }} />
          </div>
          <span className="text-xs" style={{ color: C.muted }}>{isActive ? "Ativo" : "5 dias restantes"}</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {usage.map((item, i) => {
          const pct = Math.round((item.used / item.limit) * 100);
          const barColor = pct > 80 ? C.red : pct > 60 ? C.amber : colors[i % colors.length];
          return (
          <div key={item.label} className="bg-white border rounded-2xl p-5 shadow-sm" style={{ borderColor: C.border }}>
            <div className="flex justify-between mb-2">
              <span className="text-sm font-semibold" style={{ color: C.text }}>{item.label}</span>
              <span className="text-xs" style={{ color: C.muted }}>{item.used}/{item.limit}</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: C.border }}>
              <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: barColor }} />
            </div>
            <div className="text-xs mt-1.5" style={{ color: C.muted }}>{pct}% utilizado</div>
          </div>
        );})}
      </div>
      </>
      )}
    </div>
  );
}

function ClientView({ setView, availabilities, organizationId, initialPage = "inicio", checkoutNotice = null }: { setView: (v: View) => void; availabilities: Availability[]; organizationId: string; initialPage?: ClientPage; checkoutNotice?: "success" | "cancel" | null }) {
  const [page, setPage] = useState<ClientPage>(initialPage);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const pageTitle: Record<ClientPage, string> = { inicio: "Início", conversas: "Conversas", contatos: "Contatos", agentes: "Agentes de IA", automacoes: "Automações", relatorios: "Relatórios", plano: "Plano e uso" };
  return (
    <div className="flex h-screen overflow-hidden" style={{ fontFamily: "'Inter', sans-serif", backgroundColor: C.bg }}>
      <PlanCheckoutModal organizationId={organizationId} open={checkoutOpen} onClose={() => setCheckoutOpen(false)} />
      <ClientSidebar page={page} setPage={setPage} setView={setView} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center gap-4 px-6 py-3.5 border-b flex-shrink-0" style={{ borderColor: C.border, backgroundColor: C.card }}>
          <h1 className="font-bold text-lg" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: C.text }}>{pageTitle[page]}</h1>
          <div className="ml-auto flex items-center gap-3">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: C.muted }} />
              <input className="rounded-xl pl-8 pr-3 py-2 text-sm border w-48" style={{ backgroundColor: C.bgAlt, borderColor: C.border, color: C.text }} placeholder="Buscar..." readOnly />
            </div>
            <button className="relative flex items-center justify-center rounded-xl border min-h-[44px] min-w-[44px]" style={{ borderColor: C.border, color: C.muted, width: 44, height: 44 }}>
              <Bell size={16} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full" style={{ backgroundColor: C.red }} />
            </button>
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white cursor-pointer" style={{ backgroundColor: C.greenDark }}>RL</div>
          </div>
        </div>
        {page === "conversas" ? (
          <ClientInboxPage availabilities={availabilities} organizationId={organizationId} />
        ) : (
          <div className="flex-1 overflow-auto p-6">
            {page === "inicio" && <ClientDashboardHome onChoosePlan={() => setCheckoutOpen(true)} />}
            {page === "relatorios" && <ClientRelatoriosPage />}
            {page === "plano" && <ClientPlanoPage organizationId={organizationId} checkoutNotice={checkoutNotice} />}
            {(page === "contatos" || page === "agentes" || page === "automacoes") && (
              <div className="flex items-center justify-center h-64" style={{ color: C.muted }}>
                <div className="text-center">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: C.greenSoft }}>
                    {page === "contatos" ? <Users size={28} style={{ color: C.green }} /> : page === "agentes" ? <Bot size={28} style={{ color: C.green }} /> : <Zap size={28} style={{ color: C.green }} />}
                  </div>
                  <p className="font-bold mb-1" style={{ color: C.text }}>{pageTitle[page]}</p>
                  <p className="text-sm">Área disponível na versão completa</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Admin View ──────────────────────────────────────────────────────────────

type AdminPage = "overview" | "clientes" | "agenda" | "whatsapp" | "ia" | "suporte";

function AdminView({
  setView,
  onLogout,
  availabilities,
  organizations,
  orgLoading,
  orgError,
  agendaLoading,
  agendaError,
  agendaSaving,
  onAgendaAdd,
  onAgendaUpdate,
  onAgendaRemove,
}: {
  setView: (v: View) => void;
  onLogout: () => void;
  availabilities: Availability[];
  organizations: ClienteAdmin[];
  orgLoading: boolean;
  orgError: string | null;
  agendaLoading: boolean;
  agendaError: string | null;
  agendaSaving: boolean;
  onAgendaAdd: (orgId: string, form: AvailabilityForm) => Promise<void>;
  onAgendaUpdate: (id: string, orgId: string, form: AvailabilityForm) => Promise<void>;
  onAgendaRemove: (id: string, orgId: string) => Promise<void>;
}) {
  const [page, setPage] = useState<AdminPage>("overview");
  const [agendaClienteId, setAgendaClienteId] = useState(DEFAULT_ORGANIZATION_ID);
  const [waStats, setWaStats] = useState({ conectados: 0, comErro: 0, configurando: 0, total: 0 });
  const [waConnections, setWaConnections] = useState<{ id: string; empresa: string; phoneNumber: string | null; status: string }[]>([]);

  useEffect(() => {
    if (organizations.length && !organizations.find((o) => o.id === agendaClienteId)) {
      setAgendaClienteId(organizations[0].id);
    }
  }, [organizations, agendaClienteId]);

  useEffect(() => {
    if (page === "whatsapp") {
      fetchWhatsAppStats().then(setWaStats).catch(() => {});
      fetchWhatsAppConnections().then(setWaConnections).catch(() => {});
    }
  }, [page]);

  const adminMenu: { id: AdminPage; icon: React.ElementType; label: string }[] = [
    { id: "overview", icon: Layout, label: "Visão geral" },
    { id: "clientes", icon: Users, label: "Clientes" },
    { id: "agenda", icon: CalendarCheck, label: "Agenda" },
    { id: "whatsapp", icon: Phone, label: "Conexões WhatsApp" },
    { id: "ia", icon: Bot, label: "Inteligência Artificial" },
    { id: "suporte", icon: HelpCircle, label: "Suporte" },
  ];

  return (
    <div className="flex h-screen overflow-hidden" style={{ fontFamily: "'Inter', sans-serif", backgroundColor: C.bg }}>
      <aside className="w-60 flex-shrink-0 border-r flex flex-col" style={{ backgroundColor: C.bgAlt, borderColor: C.border }}>
        <div className="px-5 py-4 border-b" style={{ borderColor: C.border }}>
          <Logo />
          <div className="mt-2"><Badge color="lilac">Administração</Badge></div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {adminMenu.map((item) => (
            <button key={item.id} onClick={() => setPage(item.id)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all min-h-[44px]"
              style={page === item.id ? { backgroundColor: "#F0EEFF", color: "#6B52E0", border: "1px solid #D4CDFF", fontWeight: 600 } : { color: C.muted }}>
              <item.icon size={16} />{item.label}
            </button>
          ))}
        </nav>
        <div className="px-3 py-4 border-t space-y-1" style={{ borderColor: C.border }}>
          <button onClick={() => setView("landing")} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm min-h-[44px]" style={{ color: C.muted }}>
            <LogIn size={16} />Ir para home
          </button>
          <button onClick={onLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm min-h-[44px]" style={{ color: C.red }}>
            <LogOut size={16} />Sair
          </button>
        </div>
      </aside>
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center gap-4 px-6 py-3.5 border-b flex-shrink-0" style={{ borderColor: C.border, backgroundColor: C.card }}>
          <h1 className="font-bold text-lg" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: C.text }}>{adminMenu.find((m) => m.id === page)?.label}</h1>
          <div className="ml-auto flex items-center gap-3">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: C.muted }} />
              <input className="rounded-xl pl-8 pr-3 py-2 text-sm border w-52" style={{ backgroundColor: C.bgAlt, borderColor: C.border, color: C.text }} placeholder="Busca global..." readOnly />
            </div>
            <button className="relative flex items-center justify-center rounded-xl border" style={{ borderColor: C.border, color: C.muted, width: 44, height: 44 }}>
              <Bell size={16} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full" style={{ backgroundColor: C.red }} />
            </button>
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: `linear-gradient(135deg, ${C.lilac}, ${C.blue})` }}>AD</div>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-6 space-y-6">

          {page === "overview" && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard label="Clientes ativos" value="248" trend="+12 este mês" icon={Users} color="green" />
                <MetricCard label="Testes em andamento" value="34" sub="Conversão: 68%" icon={Activity} color="blue" />
                <MetricCard label="Receita recorrente" value="R$ 84.300" trend="+8,2% MoM" icon={TrendingUp} color="green" />
                <MetricCard label="Incidentes ativos" value="2" sub="1 crítico" icon={AlertCircle} color="red" />
              </div>
              <div className="grid lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 bg-white border rounded-2xl p-5 shadow-sm" style={{ borderColor: C.border }}>
                  <h3 className="font-bold text-sm mb-5" style={{ color: C.text }}>Receita recorrente mensal</h3>
                  <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={receitaMensal}>
                        <defs>
                          <linearGradient id="gAdminMRR" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={C.green} stopOpacity={0.3} />
                            <stop offset="100%" stopColor={C.green} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                        <XAxis dataKey="mes" tick={{ fill: C.muted, fontSize: 11 }} />
                        <YAxis tick={{ fill: C.muted, fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                        <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => `R$ ${v.toLocaleString("pt-BR")}`} />
                        <Area type="monotone" dataKey="valor" name="MRR" stroke={C.green} fill="url(#gAdminMRR)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="bg-white border rounded-2xl p-5 shadow-sm" style={{ borderColor: C.border }}>
                  <h3 className="font-bold text-sm mb-5" style={{ color: C.text }}>Clientes por segmento</h3>
                  <div className="h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={segmentos} innerRadius={45} outerRadius={65} dataKey="valor" paddingAngle={3}>
                          {segmentos.map((entry, index) => <Cell key={`cell-admin-${index}`} fill={entry.cor} />)}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-1.5 mt-2">
                    {segmentos.map((s) => (
                      <div key={s.nome} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.cor }} />
                          <span style={{ color: C.muted }}>{s.nome}</span>
                        </div>
                        <span className="font-semibold" style={{ color: C.text }}>{s.valor}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {page === "clientes" && (
            <div className="bg-white border rounded-2xl overflow-hidden shadow-sm" style={{ borderColor: C.border }}>
              <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: C.border }}>
                <h3 className="font-bold" style={{ color: C.text }}>Gestão de clientes</h3>
                <div className="flex gap-2">
                  <OutlineButton size="sm"><span className="flex items-center gap-1"><Filter size={13} />Filtros</span></OutlineButton>
                  <OutlineButton size="sm"><span className="flex items-center gap-1"><Upload size={13} />Exportar</span></OutlineButton>
                </div>
              </div>
              {orgLoading ? (
                <div className="flex items-center justify-center py-16 gap-2" style={{ color: C.muted }}><Loader2 size={18} className="animate-spin" /> Carregando clientes...</div>
              ) : orgError ? (
                <div className="p-6 text-sm" style={{ color: C.red }}>{orgError}</div>
              ) : organizations.length === 0 ? (
                <div className="p-6 text-center text-sm" style={{ color: C.muted }}>Nenhum cliente cadastrado.</div>
              ) : (
              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b" style={{ borderColor: C.border, backgroundColor: C.bgAlt }}>
                      {["Empresa", "Responsável", "Plano", "Status", "Dias de teste", "Consumo", "Agenda", "Ações"].map((h) => (
                        <th key={h} className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wide" style={{ color: C.muted }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {organizations.map((c) => (
                      <tr key={c.id} className="border-b" style={{ borderColor: C.border }}>
                        <td className="px-5 py-4 font-semibold" style={{ color: C.text }}>{c.empresa}</td>
                        <td className="px-5 py-4" style={{ color: C.muted }}>{c.responsavel}</td>
                        <td className="px-5 py-4"><Badge color={c.plano === "Enterprise" ? "lilac" : c.plano === "Profissional" ? "blue" : "gray"}>{c.plano}</Badge></td>
                        <td className="px-5 py-4"><Badge color={c.status === "ativo" ? "green" : c.status === "teste" ? "amber" : "red"}>{c.status === "ativo" ? "Ativo" : c.status === "teste" ? "Em teste" : "Suspenso"}</Badge></td>
                        <td className="px-5 py-4" style={{ color: C.muted }}>{c.diasTeste !== null ? `${c.diasTeste} dias` : "—"}</td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-2 rounded-full overflow-hidden" style={{ backgroundColor: C.border }}>
                              <div className="h-full rounded-full" style={{ width: `${c.consumo}%`, backgroundColor: c.consumo > 80 ? C.red : c.consumo > 60 ? C.amber : C.green }} />
                            </div>
                            <span className="text-xs" style={{ color: C.muted }}>{c.consumo}%</span>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <button
                            onClick={() => { setAgendaClienteId(c.id); setPage("agenda"); }}
                            className="text-xs font-semibold flex items-center gap-1 px-2.5 py-1.5 rounded-lg border"
                            style={{ borderColor: "#B2DBBF", color: C.greenDark, backgroundColor: C.greenSoft, minHeight: 32 }}
                          >
                            <CalendarCheck size={12} />Ver agenda
                          </button>
                        </td>
                        <td className="px-5 py-4"><button style={{ color: C.muted }}><MoreVertical size={16} /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              )}
            </div>
          )}

          {page === "agenda" && (
            <div>
              <div className="flex items-center gap-3 mb-6 p-4 bg-white border rounded-2xl shadow-sm" style={{ borderColor: C.border }}>
                <CalendarCheck size={16} style={{ color: C.green }} />
                <span className="text-sm font-semibold" style={{ color: C.text }}>Empresa:</span>
                <select
                  value={agendaClienteId}
                  onChange={(e) => setAgendaClienteId(e.target.value)}
                  className="rounded-xl px-3 py-2 text-sm border outline-none"
                  style={{ backgroundColor: C.bgAlt, borderColor: C.border, color: C.text }}
                >
                  {organizations.map((c) => (
                    <option key={c.id} value={c.id}>{c.empresa}</option>
                  ))}
                </select>
              </div>
              <AgendaPage
                availabilities={availabilities}
                organizations={organizations}
                empresaId={agendaClienteId}
                loading={agendaLoading}
                error={agendaError}
                saving={agendaSaving}
                onAdd={(form) => onAgendaAdd(agendaClienteId, form)}
                onUpdate={(id, form) => onAgendaUpdate(id, agendaClienteId, form)}
                onRemove={(id) => onAgendaRemove(id, agendaClienteId)}
              />
            </div>
          )}

          {page === "whatsapp" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[{ label: "Conectados", value: String(waStats.conectados), color: C.green, icon: Wifi }, { label: "Com erro", value: String(waStats.comErro), color: C.red, icon: WifiOff }, { label: "Configurando", value: String(waStats.configurando), color: C.amber, icon: RefreshCw }, { label: "Total", value: String(waStats.total), color: C.blue, icon: Phone }].map((m) => (
                  <div key={m.label} className="bg-white border rounded-2xl p-5 shadow-sm" style={{ borderColor: C.border }}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold" style={{ color: C.muted }}>{m.label}</span>
                      <m.icon size={16} style={{ color: m.color }} />
                    </div>
                    <div className="text-2xl font-bold" style={{ color: m.color }}>{m.value}</div>
                  </div>
                ))}
              </div>
              <div className="bg-white border rounded-2xl overflow-hidden shadow-sm" style={{ borderColor: C.border }}>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b" style={{ borderColor: C.border, backgroundColor: C.bgAlt }}>
                      {["Número", "Cliente", "Estado", "", ""].map((h) => (
                        <th key={h} className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wide" style={{ color: C.muted }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {waConnections.length === 0 ? (
                      <tr><td colSpan={5} className="px-5 py-8 text-center text-sm" style={{ color: C.muted }}>Nenhuma conexão cadastrada.</td></tr>
                    ) : waConnections.map((row) => (
                      <tr key={row.id} className="border-b" style={{ borderColor: C.border }}>
                        <td className="px-5 py-4 font-mono text-xs" style={{ color: C.text }}>{row.phoneNumber ?? "—"}</td>
                        <td className="px-5 py-4" style={{ color: C.muted }}>{row.empresa}</td>
                        <td className="px-5 py-4"><Badge color={row.status === "conectado" ? "green" : row.status === "erro" ? "red" : "gray"}>{row.status}</Badge></td>
                        <td className="px-5 py-4" colSpan={2}><button style={{ color: C.muted }}><MoreVertical size={16} /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {(page === "ia" || page === "suporte") && (
            <div className="flex items-center justify-center h-64" style={{ color: C.muted }}>
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: C.greenSoft }}>
                  {page === "ia" ? <Bot size={28} style={{ color: C.green }} /> : <HelpCircle size={28} style={{ color: C.green }} />}
                </div>
                <p className="font-bold mb-1" style={{ color: C.text }}>{page === "ia" ? "Monitoramento de IA" : "Central de Suporte"}</p>
                <p className="text-sm">Área disponível na versão completa</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── App Root ────────────────────────────────────────────────────────────────

export default function App() {
  const { session, signOut, activeOrganizationId, isConfigured } = useAuth();
  const [view, setView] = useState<View>("landing");
  const [clientPage, setClientPage] = useState<ClientPage>("inicio");
  const [checkoutNotice, setCheckoutNotice] = useState<"success" | "cancel" | null>(null);
  const [agendaSaving, setAgendaSaving] = useState(false);
  const { organizations, loading: orgLoading, error: orgError } = useOrganizations();
  const {
    availabilities,
    loading: agendaLoading,
    error: agendaError,
    add: agendaAdd,
    update: agendaUpdate,
    remove: agendaRemove,
  } = useAvailabilities();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get("view");
    const pageParam = params.get("page");
    const checkout = params.get("checkout");

    if (viewParam === "client") setView("client");
    if (pageParam === "plano" || pageParam === "inicio" || pageParam === "conversas") {
      setClientPage(pageParam as ClientPage);
    }
    if (checkout === "success" || checkout === "cancel") {
      setCheckoutNotice(checkout);
    }

    if (viewParam || pageParam || checkout) {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const adminLoggedIn = session?.role === "admin";

  async function handleAgendaAdd(orgId: string, form: AvailabilityForm) {
    setAgendaSaving(true);
    try {
      await agendaAdd(orgId, form);
    } finally {
      setAgendaSaving(false);
    }
  }

  async function handleAgendaUpdate(id: string, orgId: string, form: AvailabilityForm) {
    setAgendaSaving(true);
    try {
      await agendaUpdate(id, orgId, form);
    } finally {
      setAgendaSaving(false);
    }
  }

  async function handleAgendaRemove(id: string, orgId: string) {
    setAgendaSaving(true);
    try {
      await agendaRemove(id, orgId);
    } finally {
      setAgendaSaving(false);
    }
  }

  if (view === "onboarding") return <OnboardingView setView={setView} />;
  if (view === "client") {
    return (
      <ClientView
        setView={setView}
        availabilities={availabilities}
        organizationId={activeOrganizationId}
        initialPage={clientPage}
        checkoutNotice={checkoutNotice}
      />
    );
  }
  if (view === "admin") {
    if (!adminLoggedIn) {
      return <AdminLoginView onLogin={() => setView("admin")} setView={setView} />;
    }
    return (
      <AdminView
        setView={setView}
        onLogout={async () => { await signOut(); setView("landing"); }}
        availabilities={availabilities}
        organizations={organizations}
        orgLoading={orgLoading}
        orgError={orgError}
        agendaLoading={agendaLoading}
        agendaError={agendaError}
        agendaSaving={agendaSaving}
        onAgendaAdd={handleAgendaAdd}
        onAgendaUpdate={handleAgendaUpdate}
        onAgendaRemove={handleAgendaRemove}
      />
    );
  }
  return (
    <>
      {!isConfigured && (
        <div className="text-center text-xs py-2 px-4" style={{ backgroundColor: "#FEF3C7", color: "#B45309" }}>
          Supabase não configurado — configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY para dados reais.
        </div>
      )}
      <LandingPage setView={setView} availabilities={availabilities} />
    </>
  );
}
