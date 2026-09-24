import React, { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';

export default function CallIndexRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the newer in-app voice session
    router.replace('/voice/session');
  }, []);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FAF8F5' }}>
      <ActivityIndicator size="large" color="#7C3AED" />
    </View>
  );
}
