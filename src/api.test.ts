import { tof3dUrl } from './api';

test('3D 뷰어 embed 주소', () => {
  expect(tof3dUrl('http://192.168.6.10:5001')).toBe('http://192.168.6.10:5001/tof/3d?embed=1');
});
