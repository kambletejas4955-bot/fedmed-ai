import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Clock3, FileSearch, Building2, Brain, Search, RefreshCw } from "lucide-react";

type HistoryRow = {
  id: string;
  predicted_disease: string;
  confidence: number;
  contributing_hospitals: number;
  model_version: string;
  savedCsvPaths?: { hospital_csv?: string; central_server_csv?: string };
  created_at: string;
  hospital_id?: string;
  hospital_name?: string;
  patient: {
    age: number;
    sex: string;
    symptoms: string[];
    clinicalReports?: { name: string; size: number; type: string }[];
    labReports?: { name: string; size: number; type: string }[];
  };
};

const HISTORY_STORAGE_KEY = "fedmed-diagnosis-history";

export default function History() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const loadHistory = () => {
    setLoading(true);
    try {
      const stored = JSON.parse(localStorage.getItem(HISTORY_STORAGE_KEY) || "[]") as HistoryRow[];
      const filtered = user ? stored.filter((row) => !row.hospital_id || row.hospital_id === user.hospitalId) : stored;
      setRows(filtered);
    } catch (error) {
      console.error("History load error:", error);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const filteredRows = useMemo(() => {
    const q = search.toLowerCase();
    return rows.filter((row) =>
      row.predicted_disease?.toLowerCase().includes(q) ||
      row.patient?.sex?.toLowerCase().includes(q) ||
      (row.patient?.symptoms || []).some((symptom) => symptom.toLowerCase().includes(q))
    );
  }, [rows, search]);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white/90 backdrop-blur">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-400 text-white">
              <Brain className="h-5 w-5" />
            </div>
            <div>
              <div className="text-lg font-bold text-slate-900">FedMed AI</div>
              <div className="text-xs text-slate-500">Diagnosis History</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Dashboard
            </Button>
            <Button variant="outline" onClick={loadHistory}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-6xl px-4 py-8 space-y-6">
        <div className="rounded-3xl bg-gradient-to-r from-sky-500 to-cyan-400 p-6 text-white shadow-lg">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-3xl font-bold">Hospital Diagnosis History</h1>
              <p className="mt-2 text-white/90">View saved diagnosis results for your hospital session.</p>
            </div>

            <div className="grid grid-cols-2 gap-3 md:w-[360px]">
              <div className="rounded-2xl bg-white/15 p-4 backdrop-blur">
                <div className="text-sm text-white/80">Hospital</div>
                <div className="mt-1 font-semibold">{user?.hospitalName || user?.email || "Current Hospital"}</div>
              </div>
              <div className="rounded-2xl bg-white/15 p-4 backdrop-blur">
                <div className="text-sm text-white/80">Saved Results</div>
                <div className="mt-1 text-2xl font-bold">{rows.length}</div>
              </div>
            </div>
          </div>
        </div>

        <Card className="rounded-3xl border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-900">
              <Search className="h-5 w-5 text-sky-500" /> Search History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by disease, gender, or symptom"
                className="h-11 rounded-2xl pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <Card className="rounded-3xl border-0 shadow-sm">
            <CardContent className="py-10 text-center text-slate-500">Loading history...</CardContent>
          </Card>
        ) : filteredRows.length === 0 ? (
          <Card className="rounded-3xl border-0 shadow-sm">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <FileSearch className="mb-3 h-10 w-10 text-slate-300" />
              <div className="text-lg font-semibold text-slate-900">No history found</div>
              <div className="mt-1 text-sm text-slate-500">Run a diagnosis first, then it will appear here.</div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredRows.map((row) => (
              <Card key={row.id} className="rounded-3xl border-0 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <Badge className="rounded-full bg-sky-100 text-sky-700 hover:bg-sky-100">{row.predicted_disease}</Badge>
                        <Badge variant="outline" className="rounded-full">{row.confidence ?? 0}% confidence</Badge>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="rounded-2xl bg-slate-50 p-4">
                          <div className="text-xs text-slate-500">Age / Gender</div>
                          <div className="mt-1 font-semibold text-slate-900">{row.patient?.age ?? "-"} / {row.patient?.sex ?? "-"}</div>
                        </div>
                        <div className="rounded-2xl bg-slate-50 p-4">
                          <div className="flex items-center gap-2 text-xs text-slate-500"><Building2 className="h-3.5 w-3.5" /> Contributing Hospitals</div>
                          <div className="mt-1 font-semibold text-slate-900">{row.contributing_hospitals ?? "-"}</div>
                        </div>
                        <div className="rounded-2xl bg-slate-50 p-4">
                          <div className="flex items-center gap-2 text-xs text-slate-500"><Clock3 className="h-3.5 w-3.5" /> Saved At</div>
                          <div className="mt-1 font-semibold text-slate-900">{new Date(row.created_at).toLocaleString()}</div>
                        </div>
                        <div className="rounded-2xl bg-slate-50 p-4">
                          <div className="text-xs text-slate-500">Model Version</div>
                          <div className="mt-1 font-semibold text-slate-900">{row.model_version || "v1"}</div>
                        </div>
                      </div>

                      <div>
                        <div className="mb-2 text-sm font-medium text-slate-700">Symptoms</div>
                        <div className="flex flex-wrap gap-2">
                          {(row.patient?.symptoms || []).map((symptom, index) => (
                            <Badge key={`${row.id}-${index}`} variant="secondary" className="rounded-full">{symptom}</Badge>
                          ))}
                        </div>
                      </div>

                      {row.savedCsvPaths && (
                        <div className="grid gap-3 md:grid-cols-2">
                          <div className="rounded-2xl bg-slate-50 p-4">
                            <div className="mb-2 text-sm font-medium text-slate-700">Hospital CSV Storage</div>
                            <div className="text-sm text-slate-600 break-all">{row.savedCsvPaths.hospital_csv || "Hospital CSV"}</div>
                          </div>
                          <div className="rounded-2xl bg-slate-50 p-4">
                            <div className="mb-2 text-sm font-medium text-slate-700">Central Server CSV Storage</div>
                            <div className="text-sm text-slate-600 break-all">{row.savedCsvPaths.central_server_csv || "Main server CSV"}</div>
                          </div>
                        </div>
                      )}

                      {((row.patient?.clinicalReports || []).length > 0 || (row.patient?.labReports || []).length > 0) && (
                        <div className="grid gap-3 md:grid-cols-2">
                          <div>
                            <div className="mb-2 text-sm font-medium text-slate-700">Clinical PDFs</div>
                            <div className="space-y-2">
                              {(row.patient?.clinicalReports || []).length === 0 ? (
                                <div className="text-sm text-slate-500">No clinical PDFs</div>
                              ) : (
                                (row.patient?.clinicalReports || []).map((file, index) => (
                                  <div key={`${row.id}-c-${index}`} className="rounded-2xl bg-slate-50 px-3 py-2 text-sm text-slate-700">{file.name}</div>
                                ))
                              )}
                            </div>
                          </div>
                          <div>
                            <div className="mb-2 text-sm font-medium text-slate-700">Lab PDFs</div>
                            <div className="space-y-2">
                              {(row.patient?.labReports || []).length === 0 ? (
                                <div className="text-sm text-slate-500">No lab PDFs</div>
                              ) : (
                                (row.patient?.labReports || []).map((file, index) => (
                                  <div key={`${row.id}-l-${index}`} className="rounded-2xl bg-slate-50 px-3 py-2 text-sm text-slate-700">{file.name}</div>
                                ))
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
