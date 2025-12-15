import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { apiClient } from "../src/api/client";
import { useAuthStore } from "../src/store/auth";

export default function SignInScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { setToken } = useAuthStore();

  const submit = async () => {
    try {
      const res = await apiClient.post("/auth/mobile/login", { email, password });
      setToken(res.token);
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Could not sign in");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sign in to StressSense</Text>
      <TextInput style={styles.input} placeholder="Work email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      <TextInput style={styles.input} placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />
      <TouchableOpacity style={styles.btn} onPress={submit}>
        <Text style={styles.btnText}>Sign in</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => Alert.alert("SSO", "Open company SSO in browser/webview")}>
        <Text style={styles.link}>Use company SSO</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24, backgroundColor: "#f8fafc" },
  title: { fontSize: 22, fontWeight: "700", color: "#0f172a", marginBottom: 16 },
  input: { backgroundColor: "white", borderRadius: 12, borderColor: "#e2e8f0", borderWidth: 1, padding: 12, marginBottom: 12 },
  btn: { backgroundColor: "#4338ca", borderRadius: 999, padding: 14, alignItems: "center", marginTop: 4 },
  btnText: { color: "white", fontWeight: "700" },
  link: { color: "#4338ca", marginTop: 12, fontWeight: "600" },
});
