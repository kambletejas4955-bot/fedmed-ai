import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, RefreshCw, ShieldCheck, Building2, Database } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
const STORAGE_KEY = "fedmed-auth";

type OverviewPayload = {
  hospitals: Array<{
    hospitalId: string;
    hospitalName: string;
    submissions: number;
    trainingRows: number;
    avgConfidence: number;
    topDisease: string;
  }>;
  trainingStatus: {
    pending_hospitals: string[];
    refresh_count: number;
    submissions_since_refresh?: number;
    last_refresh_at?: string | null;
  };
  recentSubmissions: Array<{
    hospital_name: string;
    predicted_disease: string;
    symptoms: string;
    confidence: string;
    submitted_at: string;
  }>;
};

export default function AdminPanel() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [payload, setPayload] = useState<OverviewPayload | { forbidden: true } | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      const res = await fetch(`${API_BASE_URL}/admin/overview`, {
        headers: { Authorization: `Bearer ${saved.token}` },
      });
      if (res.status === 401) {
        logout();
        navigate("/");
        return;
      }
      if (res.status === 403) {
        setPayload({ forbidden: true });
        return;
      }
      setPayload(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (user?.role !== "admin") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="shadow-card max-w-md">
          <CardContent className="p-8 text-center">
            <ShieldCheck className="mx-auto mb-3 h-10 w-10 text-primary" />
            <h1 className="text-xl font-bold">Admin access only</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Sign in with admin@fedmed.org to view the central control panel.
            </p>
            <Button className="mt-4" onClick={() => navigate("/dashboard")}>Back to Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/95 backdrop-blur">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl gradient-primary flex items-center justify-center text-primary-foreground">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="text-lg font-bold text-foreground">Central Admin Panel</div>
              <div className="text-xs text-muted-foreground">System-wide hospital controls</div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="mr-2 h-4 w-4" />Dashboard
            </Button>
            <Button variant="outline" onClick={loadData}>
              <RefreshCw className="mr-2 h-4 w-4" />Refresh
            </Button>
          </div>
        </div>
      </header>
      <main className="container mx-auto max-w-6xl px-4 py-8 space-y-6">
        <div className="rounded-3xl gradient-hero p-6 text-primary-foreground shadow-elevated">
          <h1 className="text-3xl font-bold">Central Server Oversight</h1>
          <p className="mt-2 text-primary-foreground/75">
            Monitor hospital contributions, global submissions, and refresh health from one unified admin console.
          </p>
        </div>
        {loading || !payload ? (
          <Card className="shadow-card">
            <CardContent className="py-12 text-center text-muted-foreground">Loading admin data…</CardContent>
          </Card>
        ) : "forbidden" in payload ? (
          <Card className="shadow-card">
            <CardContent className="py-12 text-center">Forbidden</CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="shadow-card"><CardContent className="p-5"><p className="text-xs uppercase tracking-wide text-muted-foreground">Hospitals</p><p className="mt-2 text-2xl font-bold">{payload.hospitals.length}</p><p className="mt-1 text-sm text-muted-foreground">Connected institutions</p></CardContent></Card>
              <Card className="shadow-card"><CardContent className="p-5"><p className="text-xs uppercase tracking-wide text-muted-foreground">Refresh Count</p><p className="mt-2 text-2xl font-bold">{payload.trainingStatus.refresh_count}</p><p className="mt-1 text-sm text-muted-foreground">Global retraining events</p></CardContent></Card>
              <Card className="shadow-card"><CardContent className="p-5"><p className="text-xs uppercase tracking-wide text-muted-foreground">Pending Hospitals</p><p className="mt-2 text-2xl font-bold">{payload.trainingStatus.pending_hospitals.length}</p><p className="mt-1 text-sm text-muted-foreground">Awaiting new submissions before refresh</p></CardContent></Card>
            </div>
            <Card className="shadow-card">
              <CardHeader><CardTitle>Hospital Summary</CardTitle></CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-3">
                {payload.hospitals.map((row) => (
                  <div key={row.hospitalId} className="rounded-2xl bg-muted p-5">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground"><Building2 className="h-4 w-4" />{row.hospitalName}</div>
                    <div className="mt-3 space-y-2 text-sm">
                      <div className="flex justify-between"><span>Submissions</span><span className="font-semibold">{row.submissions}</span></div>
                      <div className="flex justify-between"><span>Training rows</span><span className="font-semibold">{row.trainingRows}</span></div>
                      <div className="flex justify-between"><span>Avg confidence</span><span className="font-semibold">{row.avgConfidence}%</span></div>
                    </div>
                    <div className="mt-4"><Badge variant="outline">Top disease: {row.topDisease}</Badge></div>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card className="shadow-card">
              <CardHeader><CardTitle>Recent Central Submissions</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {payload.recentSubmissions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No submissions yet.</p>
                ) : payload.recentSubmissions.map((row, idx) => (
                  <div key={idx} className="rounded-2xl bg-muted p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-foreground">{row.predicted_disease}</p>
                        <p className="text-sm text-muted-foreground">{row.hospital_name} · {row.symptoms}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{row.confidence}%</p>
                        <p className="text-xs text-muted-foreground">{new Date(row.submitted_at).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card className="shadow-card border-primary/15 bg-primary/5">
              <CardContent className="p-5 flex items-start gap-3">
                <Database className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium text-foreground">Central CSV logging is active</p>
                  <p className="text-sm text-muted-foreground">Every hospital submission is written to the main server log and reflected in these admin metrics.</p>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
