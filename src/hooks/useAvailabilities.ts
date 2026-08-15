import { useCallback, useEffect, useState } from "react";
import type { Availability } from "../lib/types/app";
import {
  fetchAllAvailabilities,
  fetchAvailabilities,
  createAvailability,
  updateAvailability,
  deleteAvailability,
} from "../services/availability.service";
import type { AvailabilityForm } from "../lib/types/app";

interface UseAvailabilitiesResult {
  availabilities: Availability[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  add: (organizationId: string, form: AvailabilityForm) => Promise<void>;
  update: (id: string, organizationId: string, form: AvailabilityForm) => Promise<void>;
  remove: (id: string, organizationId: string) => Promise<void>;
}

export function useAvailabilities(organizationId?: string): UseAvailabilitiesResult {
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = organizationId
        ? await fetchAvailabilities(organizationId)
        : await fetchAllAvailabilities();
      setAvailabilities(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar agenda.");
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const add = useCallback(
    async (orgId: string, form: AvailabilityForm) => {
      const created = await createAvailability(orgId, form, availabilities);
      setAvailabilities((prev) => [...prev, created]);
    },
    [availabilities]
  );

  const update = useCallback(
    async (id: string, orgId: string, form: AvailabilityForm) => {
      const updated = await updateAvailability(id, orgId, form, availabilities);
      setAvailabilities((prev) => prev.map((a) => (a.id === id ? updated : a)));
    },
    [availabilities]
  );

  const remove = useCallback(async (id: string, orgId: string) => {
    await deleteAvailability(id, orgId);
    setAvailabilities((prev) => prev.filter((a) => a.id !== id));
  }, []);

  return { availabilities, loading, error, refetch, add, update, remove };
}
