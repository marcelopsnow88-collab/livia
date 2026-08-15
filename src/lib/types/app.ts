import type { Database } from "../supabase/types";

export interface Availability {
  id: string;
  empresaId: string;
  data: string;
  horaInicio: string;
  horaFim: string;
  status: "disponivel" | "indisponivel";
}

export interface AvailabilityForm {
  data: string;
  horaInicio: string;
  horaFim: string;
  status: "disponivel" | "indisponivel";
}

export interface ClienteAdmin {
  id: string;
  empresa: string;
  responsavel: string;
  plano: "Essencial" | "Profissional" | "Enterprise";
  status: "ativo" | "teste" | "suspenso";
  diasTeste: number | null;
  consumo: number;
}

export interface ConversaInbox {
  id: string;
  nome: string;
  empresa: string;
  ultimaMensagem: string;
  tempo: string;
  status: "ia" | "humano" | "aguardando" | "finalizada";
  naoLidas: number;
  avatar: string;
}

export interface Mensagem {
  tipo: "cliente" | "ia" | "sistema";
  texto: string;
  hora?: string;
}

export interface WhatsAppConnectionSummary {
  id: string;
  empresa: string;
  phoneNumber: string | null;
  status: "conectado" | "erro" | "configurando" | "desconectado";
}

export interface PlanUsageItem {
  label: string;
  used: number;
  limit: number;
}

type AvailabilityRow = Database["public"]["Tables"]["availabilities"]["Row"];
type OrganizationRow = Database["public"]["Tables"]["organizations"]["Row"];

export function mapAvailability(row: AvailabilityRow): Availability {
  return {
    id: row.id,
    empresaId: row.organization_id,
    data: row.data,
    horaInicio: row.hora_inicio.slice(0, 5),
    horaFim: row.hora_fim.slice(0, 5),
    status: row.status,
  };
}

export function mapOrganization(row: OrganizationRow): ClienteAdmin {
  return {
    id: row.id,
    empresa: row.name,
    responsavel: row.responsible_name,
    plano: row.plan as ClienteAdmin["plano"],
    status: row.status as ClienteAdmin["status"],
    diasTeste: row.trial_days_left,
    consumo: row.consumption_pct,
  };
}

export function formatRelativeTime(iso: string | null): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function buildAvailabilityResponse(
  availabilities: Availability[],
  empresaId: string
): string {
  const disponiveis = availabilities
    .filter((a) => a.empresaId === empresaId && a.status === "disponivel")
    .sort((a, b) => (a.data + a.horaInicio).localeCompare(b.data + b.horaInicio));

  if (disponiveis.length === 0) {
    return "No momento não encontrei horários disponíveis em nossa agenda. Em breve novos horários serão abertos. Posso te ajudar com algo mais?";
  }

  const porData = disponiveis.reduce<Record<string, Availability[]>>((acc, a) => {
    if (!acc[a.data]) acc[a.data] = [];
    acc[a.data].push(a);
    return acc;
  }, {});

  const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const formatDate = (iso: string) => {
    const [y, m, d] = iso.split("-");
    const dt = new Date(Number(y), Number(m) - 1, Number(d));
    return `${days[dt.getDay()]}, ${d}/${m}/${y}`;
  };

  return Object.keys(porData)
    .sort()
    .map(
      (d) =>
        `📅 ${formatDate(d)}\n` +
        porData[d].map((a) => `  • ${a.horaInicio} – ${a.horaFim} ✅`).join("\n")
    )
    .join("\n\n") + "\n\nQual horário você prefere?";
}
