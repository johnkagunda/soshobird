import '../globals.css';

import { Slot } from 'expo-router';
import { ThemeProvider, DarkTheme } from '@react-navigation/native';
import { AuthProvider } from '@/providers/AuthProvider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import NotificationsProvider from '@/providers/NotificationsProvider';
import { View, Platform, StyleSheet } from 'react-native';
import { RootSiblingParent } from 'react-native-root-siblings';
import { NotificationBannerProvider } from '@/components/NotificationBanner';

const queryClient = new QueryClient();

const myTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: 'white',
    card: '#101010',
    background: '#101010',
  },
};

export default function RootLayout() {
  return (
    <RootSiblingParent>
      <ThemeProvider value={myTheme}>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <NotificationBannerProvider>
              <NotificationsProvider>
                {Platform.OS === 'web' ? (
                  <View style={styles.webOuter}>
                    <View style={styles.webInner}>
                      <Slot />
                    </View>
                  </View>
                ) : (
                  <Slot />
                )}
              </NotificationsProvider>
            </NotificationBannerProvider>
          </AuthProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </RootSiblingParent>
  );
}

const styles = StyleSheet.create({
  webOuter: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
  },
  webInner: {
    flex: 1,
    width: '100%',
    maxWidth: 430,       // iPhone 14 Pro Max width
    backgroundColor: '#0f0f0f',
    // Subtle shadow so it looks lifted from the background
    shadowColor: '#f97316',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 40,
  },
});