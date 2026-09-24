/** Privacy Policy copy for web + App Store listings. */
export const PRIVACY_POLICY = {
  title: 'Privacy Policy',
  effectiveDate: 'September 24, 2026',
  intro:
    'Bhabi Thulla (“we”, “us”, or “the App”) is a free social card game. This policy explains what information we collect, how we use it, and the choices you have. We do not sell your data and we do not run real-money gambling.',
  sections: [
    {
      heading: '1. Who this applies to',
      body: 'This policy covers the Bhabi Thulla website, the iOS app, and related online multiplayer services. By using the App, you agree to this policy.',
    },
    {
      heading: '2. Information we collect',
      body: 'Display name: the nickname you choose for play and online rooms. Game activity: room codes, match state, and moves needed to run multiplayer games. Device basics: technical details such as app version and platform so we can fix bugs and keep the service reliable. We do not ask for your real name, payment card, or government ID to play.',
    },
    {
      heading: '3. How we use information',
      body: 'We use this information to run games, show your name at the table, connect you to rooms you join, improve stability, and respond to support requests. We do not use your data for targeted advertising based on sensitive categories, and we do not sell personal information.',
    },
    {
      heading: '4. Online play & storage',
      body: 'Online rooms are powered by our cloud backend (currently Supabase). Game state for active rooms is stored so players can sync turns. Temporary or abandoned rooms may be cleaned up automatically. Offline games stay on your device.',
    },
    {
      heading: '5. Local settings',
      body: 'Preferences such as sound, music, haptics, and your display name may be saved on your device (for example via local storage or secure storage) so the App remembers your choices.',
    },
    {
      heading: '6. Third-party services',
      body: 'We may use trusted providers for hosting, databases, and app distribution (including Apple App Store). Those providers process data only as needed to deliver their service under their own policies. If we add analytics or ads later, we will update this policy before they go live.',
    },
    {
      heading: '7. Children',
      body: 'Bhabi Thulla is a casual card game with no real-money betting. If you are a parent or guardian and believe a child has provided information we should remove, contact us and we will help.',
    },
    {
      heading: '8. Data retention',
      body: 'We keep online game data only as long as needed to operate matches and secure the service. You can clear local settings by uninstalling the app or clearing site data in your browser.',
    },
    {
      heading: '9. Your choices',
      body: 'You can change your display name in Settings, leave online rooms at any time, play fully offline, or stop using the App. For account or data questions related to online play, contact us using the details below.',
    },
    {
      heading: '10. International users',
      body: 'The App is available worldwide. Your information may be processed in countries where we or our service providers operate. We take reasonable steps to protect it wherever it is handled.',
    },
    {
      heading: '11. Changes',
      body: 'We may update this policy as the App evolves. We will post the new effective date here. Continued use after changes means you accept the updated policy.',
    },
    {
      heading: '12. Contact',
      body: 'Questions about privacy: pakricemarkit@gmail.com (Bhabi Thulla / Pakrice). For App Store listing issues, use the contact listed on the product page.',
    },
  ],
} as const;
