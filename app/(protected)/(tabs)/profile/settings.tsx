import {
  View,
  Text,
  Pressable,
  ScrollView,
  Modal,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState } from 'react';

const ORANGE = '#f97316';

// Cross-platform info modal — replaces Alert.alert which breaks on web
function InfoModal({
  visible,
  title,
  message,
  onClose,
}: {
  visible: boolean;
  title: string;
  message: string;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}
        onPress={onClose}
      >
        <Pressable
          style={{ backgroundColor: '#1a1a1a', borderRadius: 20, padding: 24, width: '100%', maxWidth: 320, gap: 12 }}
          onPress={(e) => e.stopPropagation()}
        >
          <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700', textAlign: 'center' }}>{title}</Text>
          <Text style={{ color: '#9ca3af', fontSize: 14, textAlign: 'center', lineHeight: 20 }}>{message}</Text>
          <Pressable
            onPress={onClose}
            style={{ marginTop: 8, backgroundColor: ORANGE, borderRadius: 100, paddingVertical: 12, alignItems: 'center' }}
          >
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>OK</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

type SettingItem = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  onPress: () => void;
  showChevron?: boolean;
};

type SettingSection = {
  title: string;
  items: SettingItem[];
};

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [infoModal, setInfoModal] = useState<{ title: string; message: string } | null>(null);

  const confirmLogout = async () => {
    setIsLoggingOut(true);
    await supabase.auth.signOut();
    setIsLoggingOut(false);
    setShowLogoutModal(false);
    try { router.replace('/(auth)/login'); } catch (_) {}
  };

  const showInfo = (title: string, message: string) =>
    setInfoModal({ title, message });

  const sections: SettingSection[] = [
    {
      title: 'Account',
      items: [
        {
          icon: 'lock-closed-outline',
          label: 'Privacy',
          color: '#e5e5e5',
          onPress: () => showInfo(
            'Privacy',
            'Your data is stored securely with Supabase. You can delete your account at any time.'
          ),
        },
        {
          icon: 'help-circle-outline',
          label: 'Help & Support',
          color: '#e5e5e5',
          onPress: () => showInfo(
            'Help & Support',
            'Need help? Email us at support@soshobird.app'
          ),
        },
      ],
    },
    {
      title: 'About',
      items: [
        {
          icon: 'information-circle-outline',
          label: 'About SoshoBird',
          color: '#e5e5e5',
          onPress: () => showInfo(
            'SoshoBird',
            'Version 1.0.0\n\nSoshoBird is a social media app built with React Native (Expo) and Supabase.'
          ),
        },
      ],
    },
    {
      title: '',
      items: [
        {
          icon: 'log-out-outline',
          label: 'Log out',
          color: '#ef4444',
          onPress: () => setShowLogoutModal(true),
          showChevron: false,
        },
      ],
    },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: '#0f0f0f' }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      >
        {sections.map((section, sIdx) => (
          <View key={sIdx}>
            {section.title ? (
              <Text style={{
                color: '#6b7280',
                fontSize: 13,
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                paddingHorizontal: 20,
                paddingTop: 24,
                paddingBottom: 8,
              }}>
                {section.title}
              </Text>
            ) : (
              <View style={{ height: 16 }} />
            )}

            {section.items.map((item, iIdx) => (
              <Pressable
                key={iIdx}
                onPress={item.onPress}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 14,
                  paddingHorizontal: 20,
                  paddingVertical: 15,
                  backgroundColor: pressed ? '#222222' : '#1a1a1a',
                  borderBottomWidth: 1,
                  borderBottomColor: '#2a2a2a',
                })}
              >
                <Ionicons name={item.icon} size={22} color={item.color} />
                <Text style={{ color: item.color, fontSize: 16, flex: 1 }}>{item.label}</Text>
                {item.showChevron !== false && (
                  <Ionicons name="chevron-forward" size={18} color="#6b7280" />
                )}
              </Pressable>
            ))}
          </View>
        ))}

        <Text style={{ color: '#3f3f3f', fontSize: 12, textAlign: 'center', marginTop: 32 }}>
          SoshoBird v1.0.0
        </Text>
      </ScrollView>

      {/* Info modal */}
      {infoModal && (
        <InfoModal
          visible
          title={infoModal.title}
          message={infoModal.message}
          onClose={() => setInfoModal(null)}
        />
      )}

      {/* Logout confirmation modal */}
      <Modal
        visible={showLogoutModal}
        transparent
        animationType="fade"
        onRequestClose={() => !isLoggingOut && setShowLogoutModal(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}
          onPress={() => !isLoggingOut && setShowLogoutModal(false)}
        >
          <Pressable
            style={{ backgroundColor: '#1a1a1a', borderRadius: 20, padding: 24, width: '100%', maxWidth: 320, gap: 16 }}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold', textAlign: 'center' }}>Log out?</Text>
            <Text style={{ color: '#9ca3af', fontSize: 14, textAlign: 'center' }}>
              Are you sure you want to log out?
            </Text>

            {isLoggingOut && <ActivityIndicator color={ORANGE} />}

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
              <Pressable
                style={{ flex: 1, paddingVertical: 12, borderRadius: 100, borderWidth: 1, borderColor: '#2a2a2a', alignItems: 'center' }}
                disabled={isLoggingOut}
                onPress={() => setShowLogoutModal(false)}
              >
                <Text style={{ color: '#fff', fontWeight: '600' }}>Cancel</Text>
              </Pressable>
              <Pressable
                style={{ flex: 1, paddingVertical: 12, borderRadius: 100, backgroundColor: '#ef4444', alignItems: 'center' }}
                disabled={isLoggingOut}
                onPress={confirmLogout}
              >
                <Text style={{ color: '#fff', fontWeight: '600' }}>Log out</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
