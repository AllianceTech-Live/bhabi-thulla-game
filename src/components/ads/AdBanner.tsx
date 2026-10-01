import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { AD_UNITS, adsSupported, canShowAd, initAds } from '@/src/services/ads';

type AdBannerProps = {
  isActiveTurn?: boolean;
};

/**
 * Android-only AdMob banner. Renders nothing on iOS / web.
 */
export function AdBanner({ isActiveTurn = false }: AdBannerProps) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!adsSupported() || !canShowAd('home_banner', isActiveTurn)) {
      setReady(false);
      return;
    }
    let cancelled = false;
    void initAds().then((ok) => {
      if (!cancelled) setReady(ok);
    });
    return () => {
      cancelled = true;
    };
  }, [isActiveTurn]);

  if (Platform.OS !== 'android' || !ready) return null;

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { BannerAd, BannerAdSize } = require('react-native-google-mobile-ads') as typeof import('react-native-google-mobile-ads');

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <BannerAd
        unitId={AD_UNITS.banner}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: true,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
});
