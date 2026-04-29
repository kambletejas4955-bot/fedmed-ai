import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Legend } from "recharts";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, BarChart3, BrainCircuit, RefreshCw } from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
const STORAGE_KEY = "fedmed-auth";
const COLORS = ["#0ea5e9", "#22c55e", "#f59e0b", "#8b5cf6", "#ef4444", "#14b8a6"];

type AnalyticsPayload = {
  summary: {
    totalSubmissions: number;
    totalRefreshes: number;
    pendingHospitals: number;
    topDisease: string;
  };
  diseaseDistribution: { name: string; value: number }[];
  datasetSizes: { hospitalId: string; rows: number; submissions: number; avgConfidence: number }[];
  refreshTrend: { round: number; participants: number; timestamp: string }[];
  recentSubmissions: { hospitalName: string; predictedDisease: string; confidence: number; submittedAt: string; symptoms: string }[];
};

export default function Analytics() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [loading, setLoading] = useState(true);

  const token = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}").token as string | undefined;
    } catch {
      return undefined;
    }
  }, []);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/analytics/overview`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.status === 401) {
        logout();
        navigate("/");
        return;
      }
      const payload = await response.json();
      setData(payload);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white/90 backdrop-blur">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-400 text-white">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <div className="text-lg font-bold text-slate-900">Analytics Dashboard</div>
              <div className="text-xs text-slate-500">Live federated diagnosis metrics</div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate(user?.role === "admin" ? "/admin" : "/dashboard")}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            <Button variant="outline" onClick={loadAnalytics}>
              <RefreshCw className="mr-2 h-4 w-4" /> Refresh
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-6xl px-4 py-8 space-y-6">
        <div className="rounded-3xl bg-gradient-to-r from-sky-500 to-cyan-400 p-6 text-white shadow-lg">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold">Live Analytics</h1>
              <p className="mt-2 text-white/90">Track disease mix, hospital dataset growth, and retraining activity in real time.</p>
            </div>
            <Badge className="w-fit rounded-full bg-white/20 text-white hover:bg-white/20">
              <BrainCircuit className="mr-2 h-4 w-4" /> {user?.role === "admin" ? "Admin-wide view" : user?.hospitalName}
            </Badge>
          </div>
        </div>

        {loading || !data ? (
          <Card><CardContent className="py-12 text-center text-slate-500">Loading live charts...</CardContent></Card>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-4">
              <Card><CardContent className="p-5"><p className="text-xs uppercase text-slate-500">Submissions</p><p className="mt-2 text-2xl font-bold">{data.summary.totalSubmissions}</p></CardContent></Card>
              <Card><CardContent className="p-5"><p className="text-xs uppercase text-slate-500">Refreshes</p><p className="mt-2 text-2xl font-bold">{data.summary.totalRefreshes}</p></CardContent></Card>
              <Card><CardContent className="p-5"><p className="text-xs uppercase text-slate-500">Pending Hospitals</p><p className="mt-2 text-2xl font-bold">{data.summary.pendingHospitals}</p></CardContent></Card>
              <Card><CardContent className="p-5"><p className="text-xs uppercase text-slate-500">Top Disease</p><p className="mt-2 text-xl font-bold">{data.summary.topDisease}</p></CardContent></Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="shadow-sm"><CardHeader><CardTitle>Disease Distribution</CardTitle></CardHeader><CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={data.diseaseDistribution} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} paddingAngle={3}>
                      {data.diseaseDistribution.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent></Card>

              <Card className="shadow-sm"><CardHeader><CardTitle>Dataset Size by Hospital</CardTitle></CardHeader><CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.datasetSizes}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hospitalId" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="rows" name="Training Rows" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="submissions" name="New Submissions" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent></Card>
            </div>

            <Card className="shadow-sm"><CardHeader><CardTitle>Federated Refresh Trend</CardTitle></CardHeader><CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.refreshTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="round" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="participants" name="Participant Samples" stroke="#0ea5e9" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent></Card>

            <Card className="shadow-sm"><CardHeader><CardTitle>Recent Live Submissions</CardTitle></CardHeader><CardContent className="space-y-3">
              {data.recentSubmissions.map((row, idx) => (
                <div key={idx} className="rounded-2xl bg-slate-50 p-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-slate-900">{row.predictedDisease}</p>
                    <p className="text-sm text-slate-500">{row.hospitalName} · {row.symptoms}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-900">{row.confidence}%</p>
                    <p className="text-xs text-slate-500">{row.submittedAt ? new Date(row.submittedAt).toLocaleString() : "-"}</p>
                  </div>
                </div>
              ))}
            </CardContent></Card>
          </>
        )}
      </main>
    </div>
  );
}
