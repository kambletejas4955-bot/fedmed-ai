import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, BarChart, Bar } from "recharts";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, RefreshCw, ActivitySquare } from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
const STORAGE_KEY = "fedmed-auth";

type TrainingPayload = {
  status: { pending_hospitals: string[]; submissions_since_refresh: number; last_refresh_at: string | null; refresh_count: number };
  trend: { round: number; accuracy: number; f1: number; timestamp: string }[];
  globalMetrics: { accuracy: number; f1: number; lastRefreshAt: string | null };
  perHospital: { hospitalId: string; localAccuracy: number; localF1: number; samples: number }[];
};

export default function Training() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [data, setData] = useState<TrainingPayload | null>(null);
  const [loading, setLoading] = useState(true);

  const token = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}").token as string | undefined;
    } catch {
      return undefined;
    }
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/training/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.status === 401) {
        logout();
        navigate("/");
        return;
      }
      setData(await response.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white/90 backdrop-blur">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-400 text-white">
              <ActivitySquare className="h-5 w-5" />
            </div>
            <div>
              <div className="text-lg font-bold text-slate-900">Training Dashboard</div>
              <div className="text-xs text-slate-500">Automatic federated refresh tracking</div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate(user?.role === "admin" ? "/admin" : "/dashboard")}><ArrowLeft className="mr-2 h-4 w-4" />Back</Button>
            <Button variant="outline" onClick={loadDashboard}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-6xl px-4 py-8 space-y-6">
        <div className="rounded-3xl bg-gradient-to-r from-sky-500 to-cyan-400 p-6 text-white shadow-lg">
          <h1 className="text-3xl font-bold">Federated Training Health</h1>
          <p className="mt-2 text-white/90">See pending hospitals, automatic refresh timing, and local-vs-global model trends.</p>
        </div>

        {loading || !data ? (
          <Card><CardContent className="py-12 text-center text-slate-500">Loading training data...</CardContent></Card>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-4">
              <Card><CardContent className="p-5"><p className="text-xs uppercase text-slate-500">Global Accuracy</p><p className="mt-2 text-2xl font-bold">{data.globalMetrics.accuracy}%</p></CardContent></Card>
              <Card><CardContent className="p-5"><p className="text-xs uppercase text-slate-500">Global F1</p><p className="mt-2 text-2xl font-bold">{data.globalMetrics.f1}%</p></CardContent></Card>
              <Card><CardContent className="p-5"><p className="text-xs uppercase text-slate-500">Refresh Count</p><p className="mt-2 text-2xl font-bold">{data.status.refresh_count}</p></CardContent></Card>
              <Card><CardContent className="p-5"><p className="text-xs uppercase text-slate-500">Pending Hospitals</p><p className="mt-2 text-2xl font-bold">{data.status.pending_hospitals.length}</p></CardContent></Card>
            </div>

            <div className="flex flex-wrap gap-2">
              {data.status.pending_hospitals.length === 0 ? (
                <Badge className="rounded-full bg-emerald-100 text-emerald-700 hover:bg-emerald-100">No pending hospitals</Badge>
              ) : (
                data.status.pending_hospitals.map((item) => (
                  <Badge key={item} variant="outline" className="rounded-full">Pending: {item}</Badge>
                ))
              )}
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card><CardHeader><CardTitle>Global Trend</CardTitle></CardHeader><CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.trend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="round" />
                    <YAxis domain={[60, 100]} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="accuracy" stroke="#0ea5e9" strokeWidth={3} />
                    <Line type="monotone" dataKey="f1" stroke="#22c55e" strokeWidth={3} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent></Card>

              <Card><CardHeader><CardTitle>Per-Hospital Local Metrics</CardTitle></CardHeader><CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.perHospital}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hospitalId" />
                    <YAxis domain={[50, 100]} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="localAccuracy" fill="#0ea5e9" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="localF1" fill="#22c55e" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent></Card>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
