import { useContext } from 'react';
import { HeaderShownContext } from '@react-navigation/elements';
import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';

// SafeAreaView edges for a screen. A visible stack header already covers the
// status bar and the tab bar already covers the home indicator - insetting
// again left an empty band under the header and above the tab bar.
export function useScreenEdges() {
  const headerShown = useContext(HeaderShownContext);
  const tabBarHeight = useContext(BottomTabBarHeightContext);
  const edges = ['left', 'right'];
  if (!headerShown) edges.push('top');
  if (tabBarHeight === undefined) edges.push('bottom');
  return edges;
}
