import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, Tooltip, XAxis, YAxis, LineChart, Line } from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, RefreshCw, Cpu, TimerReset, Building2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
const STORAGE_KEY = "fedmed-auth";

export default function TrainingDashboard() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [payload, setPayload] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      const res = await fetch(`${API_BASE_URL}/training/status`, { headers: { Authorization: `Bearer ${saved.token}` } });
      if (res.status === 401) { logout(); navigate('/'); return; }
      setPayload(await res.json());
    } finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const status = payload?.status;
  const history = payload?.history || [];
  const hospitalMetrics = Object.entries(status?.hospital_metrics || {}).map(([hospitalId, row]: any) => ({ hospitalId, ...row }));

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/95 backdrop-blur"><div className="container mx-auto flex items-center justify-between px-4 py-3"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-2xl gradient-primary flex items-center justify-center text-primary-foreground"><Cpu className="h-5 w-5" /></div><div><div className="text-lg font-bold text-foreground">Training Dashboard</div><div className="text-xs text-muted-foreground">Automatic federated refresh monitor</div></div></div><div className="flex gap-2"><Button variant="outline" onClick={() => navigate('/dashboard')}><ArrowLeft className="mr-2 h-4 w-4" />Dashboard</Button><Button variant="outline" onClick={loadData}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button></div></div></header>
      <main className="container mx-auto max-w-6xl px-4 py-8 space-y-6">
        <div className="rounded-3xl gradient-hero p-6 text-primary-foreground shadow-elevated"><h1 className="text-3xl font-bold">Federated Refresh Lifecycle</h1><p className="mt-2 text-primary-foreground/75">When all hospitals contribute new cases, the platform retrains local models and refreshes the shared global model automatically.</p></div>
        {loading || !payload ? <Card className="shadow-card"><CardContent className="py-12 text-center text-muted-foreground">Loading training status…</CardContent></Card> : <>
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="shadow-card"><CardContent className="p-5"><p className="text-xs uppercase tracking-wide text-muted-foreground">Pending Hospitals</p><p className="mt-2 text-2xl font-bold">{status.pending_hospitals?.length || 0}</p><p className="mt-1 text-sm text-muted-foreground">{status.pending_hospitals?.join(', ') || 'None'}</p></CardContent></Card>
            <Card className="shadow-card"><CardContent className="p-5"><p className="text-xs uppercase tracking-wide text-muted-foreground">Refresh Count</p><p className="mt-2 text-2xl font-bold">{status.refresh_count}</p><p className="mt-1 text-sm text-muted-foreground">Completed model refresh rounds</p></CardContent></Card>
            <Card className="shadow-card"><CardContent className="p-5"><p className="text-xs uppercase tracking-wide text-muted-foreground">Global Accuracy</p><p className="mt-2 text-2xl font-bold">{status.global_metrics?.accuracy || 0}%</p><p className="mt-1 text-sm text-muted-foreground">Current shared model score</p></CardContent></Card>
            <Card className="shadow-card"><CardContent className="p-5"><p className="text-xs uppercase tracking-wide text-muted-foreground">Last Refresh</p><p className="mt-2 text-base font-bold">{status.last_refresh_at ? new Date(status.last_refresh_at).toLocaleString() : 'Not yet'}</p><p className="mt-1 text-sm text-muted-foreground">Triggered by {status.last_refresh_triggered_by || '—'}</p></CardContent></Card>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="shadow-card"><CardHeader><CardTitle>Hospital Model Metrics</CardTitle></CardHeader><CardContent className="h-[320px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={hospitalMetrics}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="hospitalName" tick={{ fontSize: 12 }} /><YAxis /><Tooltip /><Bar dataKey="accuracy" fill="#0ea5e9" radius={[8,8,0,0]} /></BarChart></ResponsiveContainer></CardContent></Card>
            <Card className="shadow-card"><CardHeader><CardTitle>Refresh Trend</CardTitle></CardHeader><CardContent className="h-[320px]"><ResponsiveContainer width="100%" height="100%"><LineChart data={history}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="round" /><YAxis /><Tooltip /><Line type="monotone" dataKey="accuracy" stroke="#14b8a6" strokeWidth={3} dot={{ r: 4 }} /><Line type="monotone" dataKey="f1" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4 }} /></LineChart></ResponsiveContainer></CardContent></Card>
          </div>
          <Card className="shadow-card"><CardHeader><CardTitle>Per-Hospital Snapshot</CardTitle></CardHeader><CardContent className="grid gap-4 md:grid-cols-3">{hospitalMetrics.map((row: any) => <div key={row.hospitalId} className="rounded-2xl bg-muted p-5"><div className="flex items-center gap-2 text-sm text-muted-foreground"><Building2 className="h-4 w-4" />{row.hospitalName}</div><div className="mt-3 grid gap-2 text-sm"><div className="flex justify-between"><span>Samples</span><span className="font-semibold">{row.samples}</span></div><div className="flex justify-between"><span>Accuracy</span><span className="font-semibold">{row.accuracy}%</span></div><div className="flex justify-between"><span>F1</span><span className="font-semibold">{row.f1}%</span></div></div></div>)}</CardContent></Card>
        </>}
      </main>
    </div>
  );
}
