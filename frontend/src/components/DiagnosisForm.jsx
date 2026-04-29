import React, { useState } from "react";

const DiagnosisForm = () => {
  const [features, setFeatures] = useState(Array(20).fill(0));
  const [diagnosis, setDiagnosis] = useState("");
  const [confidence, setConfidence] = useState(null);
  const [loading, setLoading] = useState(false);

  // Handle input change
  const handleChange = (index, value) => {
    const updated = [...features];
    updated[index] = parseFloat(value) || 0;
    setFeatures(updated);
  };

  // Call backend
  const predictDisease = async () => {
    setLoading(true);

    try {
      const res = await fetch("http://localhost:8000/predict", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ features }),
      });

      const data = await res.json();

      setDiagnosis(data.disease);
      setConfidence(data.confidence);
    } catch (err) {
      console.error(err);
      alert("Error connecting to backend");
    }

    setLoading(false);
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>🧠 Rare Disease Diagnosis</h1>

      <p style={styles.subtitle}>
        Enter patient symptom values (0–1 range)
      </p>

      {/* Input Grid */}
      <div style={styles.grid}>
        {features.map((value, index) => (
          <input
            key={index}
            type="number"
            step="0.1"
            min="0"
            max="1"
            value={value}
            onChange={(e) => handleChange(index, e.target.value)}
            style={styles.input}
            placeholder={`F${index + 1}`}
          />
        ))}
      </div>

      {/* Button */}
      <button onClick={predictDisease} style={styles.button}>
        {loading ? "Analyzing..." : "Predict Disease"}
      </button>

      {/* Result */}
      {diagnosis && (
        <div style={styles.result}>
          <h2>🧾 Diagnosis Result</h2>

          <p>
            <strong>Disease:</strong> {diagnosis}
          </p>

          <p>
            <strong>Confidence:</strong> {confidence}%
          </p>
        </div>
      )}
    </div>
  );
};

export default DiagnosisForm;

// 🎨 Simple styles
const styles = {
  container: {
    padding: "30px",
    maxWidth: "800px",
    margin: "auto",
    color: "#fff",
    textAlign: "center",
  },
  title: {
    fontSize: "28px",
    marginBottom: "10px",
  },
  subtitle: {
    marginBottom: "20px",
    color: "#ccc",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(5, 1fr)",
    gap: "10px",
    marginBottom: "20px",
  },
  input: {
    padding: "8px",
    borderRadius: "6px",
    border: "1px solid #444",
    background: "#222",
    color: "#fff",
  },
  button: {
    padding: "12px 20px",
    background: "#4CAF50",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "16px",
  },
  result: {
    marginTop: "20px",
    padding: "20px",
    background: "#111",
    borderRadius: "10px",
  },
};