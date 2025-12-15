import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "StressSense" }} />
      <Stack.Screen name="signin" options={{ title: "Sign in" }} />
      <Stack.Screen name="surveys" options={{ title: "My surveys" }} />
      <Stack.Screen name="teams" options={{ title: "My teams" }} />
    </Stack>
  );
}
