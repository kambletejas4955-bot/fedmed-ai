import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  BarChart3,
  Building2,
  ClipboardList,
  Dna,
  FileText,
  FlaskConical,
  HeartPulse,
  Info,
  Shield,
  Stethoscope,
  Upload,
  UserRound,
  X,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
const STORAGE_KEY = "fedmed-auth";

const symptomGroups = [
  { title: "Constitutional", items: ["Fever", "Fatigue", "Weight loss", "Night sweats"] },
  { title: "Neurological", items: ["Tremor", "Difficulty walking", "Seizures", "Cognitive changes", "Muscle weakness"] },
  { title: "Hepatic / Metabolic", items: ["Jaundice", "Abdominal pain", "Hepatomegaly", "Splenomegaly"] },
  { title: "Musculoskeletal / Skin", items: ["Bone pain", "Joint pain", "Skin bruising", "Skin rash"] },
];

type Errors = { age?: string; sex?: string; symptoms?: string; bilirubin?: string; alt?: string; ast?: string; ferritin?: string; pdfs?: string };

function SectionHeader({ icon: Icon, title, subtitle }: { icon: React.ElementType; title: string; subtitle?: string }) {
  return (
    <div className="mb-5 flex items-start gap-3">
      <div className="mt-0.5 rounded-2xl bg-sky-100 p-2 text-sky-600"><Icon className="h-5 w-5" /></div>
      <div><h2 className="text-lg font-bold text-slate-900">{title}</h2>{subtitle ? <p className="text-sm text-slate-500">{subtitle}</p> : null}</div>
    </div>
  );
}

function RangeHint({ text }: { text: string }) {
  return <p className="mt-1 flex items-center gap-1 text-xs text-slate-500"><Info className="h-3.5 w-3.5" />{text}</p>;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [patientCode] = useState(`PT-${Date.now().toString().slice(-6)}`);
  const [age, setAge] = useState("");
  const [sex, setSex] = useState("");
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [otherSymptom, setOtherSymptom] = useState("");
  const [symptomDuration, setSymptomDuration] = useState("");
  const [familyHistory, setFamilyHistory] = useState(false);
  const [consanguinity, setConsanguinity] = useState(false);
  const [geneticMarkerScore, setGeneticMarkerScore] = useState("");
  const [bilirubin, setBilirubin] = useState("");
  const [alt, setAlt] = useState("");
  const [ast, setAst] = useState("");
  const [ferritin, setFerritin] = useState("");
  const [hemoglobin, setHemoglobin] = useState("");
  const [wbc, setWbc] = useState("");
  const [platelets, setPlatelets] = useState("");
  const [clinicalNotes, setClinicalNotes] = useState("");
  const [clinicalPdf, setClinicalPdf] = useState<File | null>(null);
  const [labPdf, setLabPdf] = useState<File | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);

  const hospitalName = user?.hospitalName || user?.email || "Current Hospital";

  const abnormalLabsCount = useMemo(() => {
    let count = 0;
    if (Number(bilirubin || 0) > 1.2) count += 1;
    if (Number(alt || 0) > 56) count += 1;
    if (Number(ast || 0) > 40) count += 1;
    if (Number(ferritin || 0) > 300) count += 1;
    return count;
  }, [bilirubin, alt, ast, ferritin]);

  const validate = () => {
    const nextErrors: Errors = {};
    const ageNum = Number(age);
    if (!age) nextErrors.age = "Age is required";
    else if (Number.isNaN(ageNum) || ageNum < 0 || ageNum > 120) nextErrors.age = "Age must be between 0 and 120";
    if (!sex) nextErrors.sex = "Sex is required";
    if (symptoms.length === 0) nextErrors.symptoms = "Select at least one symptom";
    if (!bilirubin || Number(bilirubin) < 0) nextErrors.bilirubin = "Bilirubin is required and must be valid";
    if (!alt || Number(alt) < 0) nextErrors.alt = "ALT is required and must be valid";
    if (!ast || Number(ast) < 0) nextErrors.ast = "AST is required and must be valid";
    if (!ferritin || Number(ferritin) < 0) nextErrors.ferritin = "Ferritin is required and must be valid";
    const tooLarge = (clinicalPdf && clinicalPdf.size > 5 * 1024 * 1024) || (labPdf && labPdf.size > 5 * 1024 * 1024);
    const badType = (clinicalPdf && clinicalPdf.type !== "application/pdf") || (labPdf && labPdf.type !== "application/pdf");
    if (tooLarge) nextErrors.pdfs = "PDF size must be under 5 MB";
    if (badType) nextErrors.pdfs = "Only PDF files are allowed";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const toggleSymptom = (item: string) => setSymptoms((prev) => prev.includes(item) ? prev.filter((s) => s !== item) : [...prev, item]);
  const addOtherSymptom = () => { const cleaned = otherSymptom.trim(); if (!cleaned) return; if (!symptoms.includes(cleaned)) setSymptoms((prev) => [...prev, cleaned]); setOtherSymptom(""); };
  const removeSymptom = (item: string) => setSymptoms((prev) => prev.filter((s) => s !== item));
  const handlePdfChange = (e: React.ChangeEvent<HTMLInputElement>, type: "clinical" | "lab") => { const file = e.target.files?.[0] || null; if (type === "clinical") setClinicalPdf(file); else setLabPdf(file); };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const payload = {
        patient_code: patientCode,
        hospital_id: user?.hospitalId || "unknown_hospital",
        age: Number(age),
        sex,
        symptoms,
        symptom_duration: symptomDuration,
        family_history: familyHistory,
        consanguinity,
        genetic_marker_score: geneticMarkerScore ? Number(geneticMarkerScore) : null,
        bilirubin: Number(bilirubin),
        alt: Number(alt),
        ast: Number(ast),
        ferritin: Number(ferritin),
        hemoglobin: hemoglobin ? Number(hemoglobin) : null,
        wbc: wbc ? Number(wbc) : null,
        platelets: platelets ? Number(platelets) : null,
        clinical_notes: clinicalNotes,
        attached_reports: { clinical_pdf_name: clinicalPdf?.name || null, lab_pdf_name: labPdf?.name || null },
      };
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      const res = await fetch(`${API_BASE_URL}/frontend/diagnose`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(saved?.token ? { Authorization: `Bearer ${saved.token}` } : {}) },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`Diagnosis failed: ${res.status}`);
      const result = await res.json();
      navigate("/results", { state: { result, patient: payload } });
    } catch (err) {
      console.error("Diagnosis failed:", err);
      alert("Diagnosis request failed. Check backend and try again.");
    } finally { setSubmitting(false); }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white/90 backdrop-blur">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-400 text-white"><Activity className="h-5 w-5" /></div><div><div className="text-lg font-bold text-slate-900">FedMed AI</div><div className="text-xs text-slate-500">Federated Rare Disease Intake</div></div></div>
          <div className="flex items-center gap-3"><Badge className="rounded-full bg-sky-100 text-sky-700 hover:bg-sky-100"><Building2 className="mr-1 h-3.5 w-3.5" />{hospitalName}</Badge><Button variant="outline" onClick={() => navigate("/analytics")}><BarChart3 className="mr-2 h-4 w-4" />Analytics</Button><Button variant="outline" onClick={() => navigate("/history")}>History</Button><Button variant="outline" onClick={logout}>Logout</Button></div>
        </div>
      </header>
      <main className="container mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 rounded-3xl bg-gradient-to-r from-sky-500 to-cyan-400 p-6 text-white shadow-lg"><div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between"><div><h1 className="text-3xl font-bold">Patient Diagnosis Intake</h1><p className="mt-2 max-w-2xl text-white/90">Enter clinically meaningful data for rare-disease screening. Patient data stays hospital-scoped while model learning is coordinated through federated updates.</p></div><div className="grid grid-cols-2 gap-3 md:w-[380px]"><div className="rounded-2xl bg-white/15 p-4 backdrop-blur"><div className="text-sm text-white/80">Patient Code</div><div className="mt-1 font-bold">{patientCode}</div></div><div className="rounded-2xl bg-white/15 p-4 backdrop-blur"><div className="text-sm text-white/80">Selected Symptoms</div><div className="mt-1 text-2xl font-bold">{symptoms.length}</div></div><div className="rounded-2xl bg-white/15 p-4 backdrop-blur"><div className="text-sm text-white/80">Abnormal Labs</div><div className="mt-1 text-2xl font-bold">{abnormalLabsCount}</div></div><div className="rounded-2xl bg-white/15 p-4 backdrop-blur"><div className="text-sm text-white/80">Privacy Mode</div><div className="mt-1 font-bold">Hospital-Isolated</div></div></div></div></div>
        <div className="grid gap-6 xl:grid-cols-[1.2fr_380px]"><div className="space-y-6">
          <Card className="rounded-3xl border-0 shadow-sm"><CardContent className="p-6"><SectionHeader icon={UserRound} title="Patient Information" subtitle="Basic demographic and hospital-linked case details" /><div className="grid gap-5 md:grid-cols-3"><div><Label>Patient Code</Label><Input value={patientCode} disabled className="mt-2 rounded-2xl" /></div><div><Label>Age</Label><Input value={age} onChange={(e) => setAge(e.target.value)} placeholder="e.g. 23" type="number" className="mt-2 rounded-2xl" />{errors.age ? <p className="mt-1 text-xs text-red-500">{errors.age}</p> : null}</div><div><Label>Sex</Label><select value={sex} onChange={(e) => setSex(e.target.value)} className="mt-2 h-10 w-full rounded-2xl border border-input bg-background px-3 text-sm"><option value="">Select sex</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option></select>{errors.sex ? <p className="mt-1 text-xs text-red-500">{errors.sex}</p> : null}</div></div></CardContent></Card>
          <Card className="rounded-3xl border-0 shadow-sm"><CardContent className="p-6"><SectionHeader icon={Stethoscope} title="Symptoms" subtitle="Select structured symptoms relevant to rare-disease screening" /><div className="space-y-5">{symptomGroups.map((group) => <div key={group.title}><p className="mb-3 text-sm font-semibold text-slate-700">{group.title}</p><div className="flex flex-wrap gap-2">{group.items.map((item) => { const active = symptoms.includes(item); return <button type="button" key={item} onClick={() => toggleSymptom(item)} className={`rounded-full border px-4 py-2 text-sm transition ${active ? "border-sky-500 bg-sky-50 text-sky-700" : "border-slate-300 bg-white text-slate-800 hover:border-slate-400"}`}>{item}</button>; })}</div></div>)}<div className="rounded-2xl bg-slate-50 p-4"><Label>Other Symptom</Label><div className="mt-2 flex gap-2"><Input value={otherSymptom} onChange={(e) => setOtherSymptom(e.target.value)} placeholder="Type another symptom" className="rounded-2xl" /><Button type="button" variant="outline" onClick={addOtherSymptom}>Add</Button></div></div><div><Label>Symptom Duration</Label><Input value={symptomDuration} onChange={(e) => setSymptomDuration(e.target.value)} placeholder="e.g. 2 weeks / 3 months" className="mt-2 rounded-2xl" /></div><div><p className="mb-2 text-sm font-medium text-slate-700">Selected Symptoms</p><div className="flex min-h-12 flex-wrap gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-3">{symptoms.length === 0 ? <p className="text-sm text-slate-500">No symptoms selected yet</p> : symptoms.map((item) => <Badge key={item} variant="secondary" className="rounded-full px-3 py-1">{item}<button type="button" onClick={() => removeSymptom(item)} className="ml-2"><X className="h-3 w-3" /></button></Badge>)}</div>{errors.symptoms ? <p className="mt-1 text-xs text-red-500">{errors.symptoms}</p> : null}</div></div></CardContent></Card>
          <Card className="rounded-3xl border-0 shadow-sm"><CardContent className="p-6"><SectionHeader icon={FlaskConical} title="Lab Results" subtitle="Enter clinically relevant numeric values with units" /><div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">{[["Bilirubin", bilirubin, setBilirubin, "mg/dL", "Typical range: 0.1–1.2 mg/dL", errors.bilirubin], ["ALT", alt, setAlt, "U/L", "Typical range: 7–56 U/L", errors.alt], ["AST", ast, setAst, "U/L", "Typical range: 10–40 U/L", errors.ast], ["Ferritin", ferritin, setFerritin, "ng/mL", "Typical range: Male 24–336 ng/mL, Female 11–307 ng/mL", errors.ferritin], ["Hemoglobin", hemoglobin, setHemoglobin, "g/dL", "", undefined], ["WBC Count", wbc, setWbc, "10^9/L", "", undefined], ["Platelets", platelets, setPlatelets, "10^9/L", "", undefined]].map(([label, value, setter, placeholder, hint, err]) => <div key={label as string}><Label>{label as string}</Label><Input type="number" value={value as string} onChange={(e) => (setter as React.Dispatch<React.SetStateAction<string>>)(e.target.value)} placeholder={placeholder as string} className="mt-2 rounded-2xl" />{hint ? <RangeHint text={hint as string} /> : null}{err ? <p className="mt-1 text-xs text-red-500">{err as string}</p> : null}</div>)}</div></CardContent></Card>
          <Card className="rounded-3xl border-0 shadow-sm"><CardContent className="p-6"><SectionHeader icon={Dna} title="Family / Genetic Information" subtitle="Capture hereditary risk factors relevant to rare diseases" /><div className="grid gap-5 md:grid-cols-2"><label className="flex items-center justify-between rounded-2xl border p-4"><div><p className="font-medium text-slate-900">Family History</p><p className="text-sm text-slate-500">Known similar disease history in family</p></div><input type="checkbox" checked={familyHistory} onChange={(e) => setFamilyHistory(e.target.checked)} className="h-5 w-5" /></label><label className="flex items-center justify-between rounded-2xl border p-4"><div><p className="font-medium text-slate-900">Consanguinity</p><p className="text-sm text-slate-500">Relevant for recessive rare-disease patterns</p></div><input type="checkbox" checked={consanguinity} onChange={(e) => setConsanguinity(e.target.checked)} className="h-5 w-5" /></label><div><Label>Genetic Marker Score</Label><Input type="number" value={geneticMarkerScore} onChange={(e) => setGeneticMarkerScore(e.target.value)} placeholder="Optional score" className="mt-2 rounded-2xl" /></div></div></CardContent></Card>
          <Card className="rounded-3xl border-0 shadow-sm"><CardContent className="p-6"><SectionHeader icon={ClipboardList} title="Clinical Notes & Reports" subtitle="Short notes and supporting PDF documents" /><div className="grid gap-6 lg:grid-cols-2"><div><Label>Clinical Notes</Label><textarea value={clinicalNotes} onChange={(e) => setClinicalNotes(e.target.value.slice(0, 300))} placeholder="Short doctor summary, key observations, or clinical suspicion..." className="mt-2 min-h-[140px] w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm" /><p className="mt-1 text-xs text-slate-500">{clinicalNotes.length}/300 characters</p><div className="mt-4 rounded-2xl border border-dashed p-4"><Label>Upload Clinical Report PDF</Label><div className="mt-2 flex items-center gap-3"><Input type="file" accept=".pdf,application/pdf" onChange={(e) => handlePdfChange(e, "clinical")} className="rounded-2xl" /><Upload className="h-4 w-4 text-slate-400" /></div>{clinicalPdf ? <p className="mt-2 text-sm text-slate-700">Selected: {clinicalPdf.name}</p> : null}</div></div><div><div className="rounded-2xl border border-dashed p-4"><Label>Upload Lab Report PDF</Label><div className="mt-2 flex items-center gap-3"><Input type="file" accept=".pdf,application/pdf" onChange={(e) => handlePdfChange(e, "lab")} className="rounded-2xl" /><Upload className="h-4 w-4 text-slate-400" /></div>{labPdf ? <p className="mt-2 text-sm text-slate-700">Selected: {labPdf.name}</p> : null}</div><div className="mt-4 rounded-2xl bg-sky-50 p-4 text-sm text-slate-700"><div className="mb-2 flex items-center gap-2 font-medium text-slate-900"><Shield className="h-4 w-4 text-sky-600" />Privacy-Preserving Submission</div><p>Uploaded reports are referenced for workflow. Federated learning should share model updates, not raw patient identity data.</p></div>{errors.pdfs ? <p className="mt-2 text-xs text-red-500">{errors.pdfs}</p> : null}</div></div></CardContent></Card>
        </div><div className="space-y-6"><Card className="rounded-3xl border-0 shadow-sm"><CardHeader><CardTitle className="flex items-center gap-2"><HeartPulse className="h-5 w-5 text-sky-600" />Case Summary</CardTitle></CardHeader><CardContent className="space-y-4"><div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Hospital</p><p className="mt-1 font-semibold text-slate-900">{hospitalName}</p></div><div className="grid grid-cols-2 gap-3"><div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Age / Sex</p><p className="mt-1 font-semibold text-slate-900">{age || "-"} / {sex || "-"}</p></div><div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Symptoms</p><p className="mt-1 font-semibold text-slate-900">{symptoms.length}</p></div><div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Abnormal Labs</p><p className="mt-1 font-semibold text-slate-900">{abnormalLabsCount}</p></div><div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Reports</p><p className="mt-1 font-semibold text-slate-900">{(clinicalPdf ? 1 : 0) + (labPdf ? 1 : 0)}</p></div></div><div className="rounded-2xl border border-sky-100 bg-sky-50 p-4"><div className="mb-2 flex items-center gap-2 text-slate-900"><AlertCircle className="h-4 w-4 text-sky-600" />Readiness Check</div><ul className="space-y-2 text-sm text-slate-700"><li>• Demographics: {age && sex ? "Ready" : "Incomplete"}</li><li>• Symptoms: {symptoms.length > 0 ? "Ready" : "Select at least one"}</li><li>• Key labs: {bilirubin && alt && ast && ferritin ? "Ready" : "Incomplete"}</li></ul></div><Button onClick={handleSubmit} disabled={submitting} className="h-12 w-full rounded-2xl bg-gradient-to-r from-sky-500 to-cyan-400 text-white">{submitting ? "Running diagnosis..." : <>Run Federated Diagnosis<ArrowRight className="ml-2 h-4 w-4" /></>}</Button><div className="rounded-2xl bg-slate-50 p-4 text-xs text-slate-500"><div className="mb-1 flex items-center gap-2 font-medium text-slate-700"><FileText className="h-4 w-4" />Submission Notes</div>Structured features are the primary model inputs. Notes and PDF attachments support clinical workflow.</div></CardContent></Card></div></div>
      </main>
    </div>
  );
}
