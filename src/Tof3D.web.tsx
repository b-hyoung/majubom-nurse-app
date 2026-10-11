import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { tof3dUrl } from './api';
import { s } from './Tof3D.styles';

// 웹 빌드용 (react-native-webview 미지원) — iframe으로 같은 화면.
export function Tof3D({ base, offline }: { base: string; offline: boolean }) {
  return (
    <View style={s.box}>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <iframe src={tof3dUrl(base)} style={{ border: 0, width: '100%', height: '100%' }} />
      </View>
      <View style={s.tag}><Text style={s.tagText}>ToF 3D</Text></View>
      {offline && <View style={s.off}><Text style={s.offText}>3D 연결 끊김</Text></View>}
    </View>
  );
}
