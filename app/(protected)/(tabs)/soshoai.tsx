import { Redirect } from 'expo-router';

// Placeholder — the actual SoshoAI screen lives at (protected)/soshoai
// The tab press listener in _layout.tsx handles navigation
export default function SoshoAITab() {
  return <Redirect href="/(protected)/soshoai" />;
}
