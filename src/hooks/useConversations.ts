import { useCallback, useEffect, useState } from "react";
import type { ConversaInbox, Mensagem } from "../lib/types/app";
import {
  fetchConversations,
  fetchMessages,
  assumeConversation,
  fetchConversationMeta,
} from "../services/conversation.service";

export function useConversations(organizationId: string) {
  const [conversations, setConversations] = useState<ConversaInbox[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setConversations(await fetchConversations(organizationId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar conversas.");
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { conversations, loading, error, refetch };
}

export function useConversationMessages(conversationId: string | null) {
  const [messages, setMessages] = useState<Mensagem[]>([]);
  const [meta, setMeta] = useState<{
    ai_intent: string | null;
    ai_sentiment: string | null;
    ai_opportunity: string | null;
    responsible: string | null;
    status: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      setMeta(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      fetchMessages(conversationId),
      fetchConversationMeta(conversationId),
    ])
      .then(([msgs, conversationMeta]) => {
        if (cancelled) return;
        setMessages(msgs);
        setMeta(conversationMeta);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Erro ao carregar mensagens.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [conversationId]);

  const assume = useCallback(async () => {
    if (!conversationId) return;
    await assumeConversation(conversationId);
    setMeta((prev) => (prev ? { ...prev, status: "humano", responsible: "Atendente humano" } : prev));
  }, [conversationId]);

  return { messages, meta, loading, error, assume };
}
