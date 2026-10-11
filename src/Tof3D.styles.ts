import { StyleSheet } from 'react-native';

export const s = StyleSheet.create({
  box: { height: 220, marginHorizontal: 16, marginBottom: 8, borderRadius: 16, overflow: 'hidden', backgroundColor: '#0E1420' },
  web: { flex: 1, backgroundColor: 'transparent' },
  tag: { position: 'absolute', top: 10, left: 10, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: 'rgba(24,32,40,.75)' },
  tagText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  off: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(138,148,160,.92)', alignItems: 'center', justifyContent: 'center' },
  offText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
