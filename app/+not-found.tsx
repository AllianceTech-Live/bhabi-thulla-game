import { router, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { AppButton, Screen, Title } from '@/src/components/ui/AppButton';
import { COLORS } from '@/src/constants/theme';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Oops' }} />
      <Screen onBack={() => router.replace('/')}>
        <Title>Screen not found</Title>
        <Text style={styles.note}>That page is not in this game.</Text>
        <AppButton title="Home" onPress={() => router.replace('/')} />
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  note: {
    color: COLORS.muted,
    textAlign: 'center',
    marginVertical: 16,
  },
});
