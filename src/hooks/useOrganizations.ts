import { useCallback, useEffect, useState } from "react";
import type { ClienteAdmin } from "../lib/types/app";
import { fetchOrganizations } from "../services/organization.service";

export function useOrganizations() {
  const [organizations, setOrganizations] = useState<ClienteAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setOrganizations(await fetchOrganizations());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar clientes.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { organizations, loading, error, refetch };
}
