import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { tof3dUrl } from './api';
import { s } from './Tof3D.styles';

// 서버 ToF 3D 뷰(embed 모드)를 알람 화면 안 작은 칸으로. 조작 없이 보기만.
export function Tof3D({ base, offline }: { base: string; offline: boolean }) {
  return (
    <View style={s.box}>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <WebView source={{ uri: tof3dUrl(base) }} style={s.web} scrollEnabled={false} originWhitelist={['*']} />
      </View>
      <View style={s.tag}><Text style={s.tagText}>ToF 3D</Text></View>
      {offline && <View style={s.off}><Text style={s.offText}>3D 연결 끊김</Text></View>}
    </View>
  );
}
