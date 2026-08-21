"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, BookOpen, ChevronRight } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { AdminNav } from "@/components/admin/AdminNav";
import { EmptyState } from "@/components/ui/EmptyState";
import { createClient } from "@/lib/supabase/client";
import type { Curriculum } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export default function AdminCurriculumListPage() {
  const router = useRouter();
  const supabase = createClient();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [curricula, setCurricula] = useState<Curriculum[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.replace("/admin");
        return;
      }
      setAccessToken(data.session.access_token);
      setCheckingAuth(false);
    });
  }, [router, supabase]);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/curricula", { headers: { Authorization: `Bearer ${accessToken}` } });
    if (res.status === 401) {
      router.replace("/admin");
      return;
    }
    if (res.ok) {
      const data = await res.json();
      setCurricula(data.curricula);
    }
    setLoading(false);
  }, [accessToken, router]);

  useEffect(() => {
    if (!checkingAuth && accessToken) load();
  }, [checkingAuth, accessToken, load]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace("/admin");
  }

  if (checkingAuth) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-paper-50">
        <Loader2 className="h-6 w-6 animate-spin text-ink-900" aria-hidden="true" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-paper-50 py-10 text-ink-900">
      <Container className="max-w-4xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-semibold">Curriculum</h1>
            <p className="text-sm text-ink-700">Teaching plans instructors deliver from.</p>
          </div>
          <AdminNav current="/admin/curriculum" onSignOut={handleSignOut} />
        </div>

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
    </main>
  );
}
