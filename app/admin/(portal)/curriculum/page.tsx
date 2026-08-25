"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, BookOpen, ChevronRight } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { useAdminAuth } from "@/lib/admin/AdminAuthContext";
import type { Curriculum } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export default function AdminCurriculumListPage() {
  const { authedFetch } = useAdminAuth();

  const [loading, setLoading] = useState(true);
  const [curricula, setCurricula] = useState<Curriculum[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await authedFetch("/api/admin/curricula");
    if (res.ok) {
      const data = await res.json();
      setCurricula(data.curricula);
    }
    setLoading(false);
  }, [authedFetch]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Container className="max-w-5xl">
      <PageHeader title="Curriculum" subtitle="Teaching plans instructors deliver from." />

      <div className="mt-6">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-ink-700" aria-hidden="true" />
          </div>
        ) : curricula.length === 0 ? (
          <EmptyState icon={BookOpen} message="No curricula yet." />
        ) : (
          <div className="space-y-3">
            {curricula.map((curriculum) => (
              <Link
                key={curriculum.id}
                href={`/admin/curriculum/${curriculum.id}`}
                className="flex items-center justify-between rounded-xl2 border border-ink-900/10 bg-white p-5 hover:border-signal-500/40 hover:shadow-sm"
              >
                <div>
                  <p className="font-medium text-ink-900">{curriculum.name}</p>
                  <p className="mt-1 text-xs text-ink-700">{curriculum.description}</p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-ink-700/50" aria-hidden="true" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </Container>
  );
}
