import { useEffect, useState } from "react";
import { View, Text, FlatList, RefreshControl, StyleSheet } from "react-native";
import { apiClient } from "../api/client";
import { useAuthStore } from "../store/auth";

type Point = { label: string; value: number };

export default function TeamStressScreen({ teamId }: { teamId: string }) {
  const { token } = useAuthStore();
  const [points, setPoints] = useState<Point[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!token) return;
    setLoading(true);
    try {
      // reuse overview metrics as placeholder trend
      const res = await apiClient.get("/api/public/v1/metrics/overview", token);
      const now = new Date();
      setPoints(
        Array.from({ length: 5 }).map((_, idx) => ({
          label: `P-${5 - idx}`,
          value: (res.data?.averageStressIndex ?? 0) + idx * 2,
        }))
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [token]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Team stress trend</Text>
      <FlatList
        data={points}
        keyExtractor={(p) => p.label}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.metricLabel}>{item.label}</Text>
            <Text style={styles.metricValue}>{item.value}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No data yet.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc", padding: 16 },
  title: { fontSize: 18, fontWeight: "700", color: "#0f172a", marginBottom: 8 },
  card: { backgroundColor: "white", borderRadius: 14, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: "#e2e8f0" },
  metricLabel: { fontSize: 13, color: "#475569" },
  metricValue: { fontSize: 18, fontWeight: "700", color: "#111827" },
  empty: { textAlign: "center", marginTop: 12, color: "#94a3b8" },
});
