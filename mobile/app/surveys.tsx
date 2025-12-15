import { useEffect, useState } from "react";
import { View, Text, FlatList, RefreshControl, StyleSheet } from "react-native";
import { apiClient } from "../src/api/client";
import { useAuthStore } from "../src/store/auth";

type Survey = { id: string; name: string; status: string; participation: number };

export default function SurveysScreen() {
  const { token } = useAuthStore();
  const [items, setItems] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await apiClient.get("/api/mobile/v1/my-surveys", token);
      setItems(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [token]);

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.meta}>
              {item.status} · Participation {item.participation}%
            </Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No surveys right now.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc", padding: 16 },
  card: { backgroundColor: "white", borderRadius: 16, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: "#e2e8f0" },
  name: { fontSize: 16, fontWeight: "700", color: "#0f172a" },
  meta: { fontSize: 12, color: "#475569", marginTop: 4 },
  empty: { textAlign: "center", marginTop: 40, color: "#94a3b8" },
});
