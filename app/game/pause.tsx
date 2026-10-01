import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import {
  AppButton,
  Screen,
  Title,
} from '@/src/components/ui/AppButton';
import { COLORS } from '@/src/constants/theme';
import { navigateAfterQuit } from '@/src/services/quitGame';

export default function PauseScreen() {
  return (
    <Screen>
      <Title>Paused</Title>
      <Text style={styles.note}>Take a breath. No stakes. No pressure.</Text>
      <View style={styles.actions}>
        <AppButton title="Resume" onPress={() => router.back()} />
        <AppButton
          title="How to Play"
          variant="secondary"
          onPress={() => router.push('/rules')}
        />
        <AppButton
          title="Quit game"
          variant="secondary"
          onPress={() => navigateAfterQuit('/')}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  note: {
    color: COLORS.muted,
    textAlign: 'center',
    marginVertical: 24,
  },
  actions: { marginTop: 8 },
});
