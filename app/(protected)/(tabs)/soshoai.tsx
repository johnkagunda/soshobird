import { View } from 'react-native';

// Placeholder screen — tab press is intercepted by the listener in _layout.tsx
// which pushes /(protected)/soshoai as a modal. This file must exist for
// Expo Router to register the tab, but it never actually renders.
export default function SoshoAITab() {
  return <View />;
}
