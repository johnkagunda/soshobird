import { Stack } from 'expo-router';

export default function AuthUtilLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#000' } }}>
      <Stack.Screen name="callback" />
      <Stack.Screen name="reset-password" />
    </Stack>
  );
}
