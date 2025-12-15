import { useEffect, useState } from "react";
import { View, Text, FlatList, RefreshControl, StyleSheet } from "react-native";
import { apiClient } from "../src/api/client";
import { useAuthStore } from "../src/store/auth";

type OrgMetric = { label: string; value: string };
type TeamRisk = { name: string; stressIndex: number };

export default function OrgOverviewScreen() {
  const { token } = useAuthStore();
  const [metrics, setMetrics] = useState<OrgMetric[]>([]);
  const [risks, setRisks] = useState<TeamRisk[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const overview = await apiClient.get("/api/public/v1/metrics/overview", token); // reuse public metrics
      setMetrics([
        { label: "Avg stress index", value: String(overview.data?.averageStressIndex ?? 0) },
        { label: "Participation", value: `${overview.data?.participation ?? 0}%` },
      ]);
      setRisks(overview.data?.topTeamsByStress ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [token]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Org overview</Text>
      <FlatList
        data={metrics}
        keyExtractor={(m) => m.label}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.metricLabel}>{item.label}</Text>
            <Text style={styles.metricValue}>{item.value}</Text>
          </View>
        )}
        ListHeaderComponent={<Text style={styles.subtitle}>Key metrics</Text>}
        ListFooterComponent={
          <View style={{ marginTop: 16 }}>
            <Text style={styles.subtitle}>At risk teams</Text>
            {risks.map((r) => (
              <View key={r.name} style={styles.riskCard}>
                <Text style={styles.metricLabel}>{r.name}</Text>
                <Text style={styles.metricValue}>{r.stressIndex}</Text>
              </View>
            ))}
            {risks.length === 0 && <Text style={styles.empty}>No data yet.</Text>}
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc", padding: 16 },
  title: { fontSize: 20, fontWeight: "700", color: "#0f172a", marginBottom: 8 },
  subtitle: { fontSize: 14, fontWeight: "700", color: "#1f2937", marginVertical: 8 },
  card: { backgroundColor: "white", borderRadius: 14, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: "#e2e8f0" },
  riskCard: { backgroundColor: "white", borderRadius: 14, padding: 12, marginTop: 8, borderWidth: 1, borderColor: "#e2e8f0" },
  metricLabel: { fontSize: 13, color: "#475569" },
  metricValue: { fontSize: 18, fontWeight: "700", color: "#111827" },
  empty: { textAlign: "center", marginTop: 12, color: "#94a3b8" },
});
