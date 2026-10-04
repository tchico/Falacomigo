import { useWindowDimensions, Animated, StyleSheet, View } from 'react-native';
import { colors } from './theme';
import { useLoop, useReducedMotion } from './motion';
import { placeFor, type Place } from './placeFor';

export { placeFor, type Place };

// Backgrounds for scenes, chosen from the scene's "setting" in the content pack (e.g. "garden-trampoline",
// "ferry-kitchen-evening"): where it is (garden, kitchen, ferry, beach, porto, coimbra, clinic), what's there, and whether it's evening.
// Drawn with plain views and kept calm: slow drifting clouds and waves, nothing that flashes (NFR-09).

/** Sky and ground colours, so the screen's own panels can match the scenery. */
export function paletteFor(p: Place): { sky: string; ground: string; groundEdge: string } {
  if (p.kind === 'garden') return p.evening ? { sky: '#2E3F70', ground: '#5E8F5A', groundEdge: '#4C7A49' } : { sky: colors.sky, ground: colors.grass, groundEdge: '#7FBF6E' };
  if (p.kind === 'beach') return p.evening ? { sky: '#F4B183', ground: '#E3C08A', groundEdge: '#C9A06A' } : { sky: colors.sky, ground: '#F2D48F', groundEdge: '#E0B86A' };
  if (p.kind === 'porto') return p.evening ? { sky: '#3B4A7A', ground: '#8E8778', groundEdge: '#756F62' } : { sky: colors.sky, ground: '#CFC7B8', groundEdge: '#A99F8E' };
  if (p.kind === 'coimbra') return p.evening ? { sky: '#2E3F70', ground: '#7E8B6A', groundEdge: '#66734F' } : { sky: colors.sky, ground: '#B9C99A', groundEdge: '#97AA74' };
  if (p.kind === 'clinic') return { sky: '#E3F1EE', ground: '#D5D9DD', groundEdge: '#B9BEC4' };
  if (p.kind === 'kitchen') return { sky: p.evening ? '#D9C7A8' : '#F6E7CF', ground: '#C99563', groundEdge: '#B07D4D' };
  return { sky: p.evening ? '#9AA7B8' : '#E4ECF2', ground: '#B5804F', groundEdge: '#94643A' };
}

/** How much of the screen, from the bottom, is ground. Screens put their controls on it. */
export const GROUND = 0.34;

export function Scenery({ setting }: { setting?: string }) {
  const place = placeFor(setting);
  const pal = paletteFor(place);
  const { width, height } = useWindowDimensions();
  const horizon = height * (1 - GROUND);
  const reduced = useReducedMotion();
  const drift = useLoop(60_000, !reduced);
  const swell = useLoop(5_000, !reduced);

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: pal.sky }]} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {place.kind === 'garden' && (
        <>
          {place.evening ? (
            <>
              <View style={[styles.moon, { right: width * 0.12, top: height * 0.12 }]} />
              {[[0.08, 0.1], [0.22, 0.2], [0.36, 0.08], [0.58, 0.16], [0.7, 0.06], [0.9, 0.22]].map(([x, y], i) => (
                <View key={i} style={[styles.star, { left: width * x, top: height * y }]} />
              ))}
            </>
          ) : (
            <>
              <View style={[styles.sun, { right: width * 0.1, top: height * 0.1 }]} />
              {[0.12, 0.55].map((x, i) => (
                <Animated.View
                  key={i}
                  style={[styles.cloud, { left: width * x, top: height * (0.12 + i * 0.08) }, { transform: [{ translateX: drift.interpolate({ inputRange: [0, 1], outputRange: [0, (i ? -1 : 1) * 60] }) }] }]}
                >
                  <View style={[styles.puff, { left: 0, top: 14, width: 60, height: 34 }]} />
                  <View style={[styles.puff, { left: 30, top: 0, width: 56, height: 48 }]} />
                  <View style={[styles.puff, { left: 70, top: 16, width: 50, height: 32 }]} />
                </Animated.View>
              ))}
            </>
          )}
          {/* Rolling hills on the horizon. */}
          <View style={[styles.hill, { left: -width * 0.1, top: horizon - 70, width: width * 0.45, height: 160, borderRadius: 140, backgroundColor: pal.groundEdge }]} />
          <View style={[styles.hill, { left: width * 0.62, top: horizon - 90, width: width * 0.5, height: 180, borderRadius: 160, backgroundColor: pal.groundEdge }]} />
          {/* A garden fence. */}
          <View style={[styles.fenceRail, { top: horizon - 34, width }]} />
          {Array.from({ length: Math.ceil(width / 46) }, (_, i) => (
            <View key={i} style={[styles.fencePost, { left: i * 46 + 10, top: horizon - 52 }]} />
          ))}
        </>
      )}

      {place.kind === 'kitchen' && (
        <>
          {/* Window onto the garden, a fridge with Gui's Lisbon postcard, and a strip of azulejo tiles. */}
          <View style={[styles.window, { right: width * 0.08, top: height * 0.1, width: width * 0.22, height: height * 0.3, backgroundColor: place.evening ? '#2E3F70' : colors.sky }]}>
            <View style={[styles.windowGrass, { backgroundColor: place.evening ? '#5E8F5A' : colors.grass }]} />
            <View style={styles.windowBarV} />
            <View style={styles.windowBarH} />
          </View>
          <View style={[styles.fridge, { left: width * 0.03, top: height * 0.16, height: horizon - height * 0.16 }]}>
            <View style={styles.postcard} />
          </View>
          <View style={[styles.tiles, { top: horizon - 40, width }]}>
            {Array.from({ length: Math.ceil(width / 40) }, (_, i) => (
              <View key={i} style={[styles.tile, i % 2 ? { backgroundColor: colors.blue } : null]}>
                <View style={[styles.tileDot, i % 2 ? { backgroundColor: colors.white } : null]} />
              </View>
            ))}
          </View>
        </>
      )}

      {place.kind === 'ferry' && (
        <>
          {/* Portholes with the sea outside. */}
          {[0.1, 0.42, 0.74].map((x, i) => (
            <View key={i} style={[styles.porthole, { left: width * x, top: height * 0.12 }]}>
              <View style={[styles.portSky, { backgroundColor: place.evening ? '#2E3F70' : '#BFE0F2' }]} />
              <Animated.View
                style={[styles.portSea, { backgroundColor: place.evening ? '#1E3A5F' : '#3C8DBC' }, { transform: [{ translateY: swell.interpolate({ inputRange: [0, 1], outputRange: [4, -4] }) }] }]}
              />
              {place.evening && i === 2 ? <View style={styles.portMoon} /> : null}
            </View>
          ))}
          {place.props.has('kitchen') && (
            // Pots and pans hanging from a rail.
            <View style={[styles.potRail, { right: width * 0.015, top: height * 0.3, width: width * 0.14 }]}>
              {[30, 38].map((d, i) => (
                <View key={i} style={{ alignItems: 'center' }}>
                  <View style={styles.potHook} />
                  <View style={[styles.pot, { width: d, height: d * 0.8 }]} />
                </View>
              ))}
            </View>
          )}
        </>
      )}

      {place.kind === 'beach' && (
        <>
          {/* The sun (setting, in the evening), and the sea on the horizon with slow waves. */}
          <View style={[styles.sun, place.evening ? { left: width * 0.62, top: horizon - 140, width: 90, height: 90, borderRadius: 45, backgroundColor: '#F7D06B' } : { right: width * 0.1, top: height * 0.1 }]} />
          <View style={[styles.sea, { top: horizon - 90, width, height: 96, backgroundColor: place.evening ? '#3E6E9C' : '#3C8DBC' }]} />
          {[0, 1, 2].map((row) => (
            <Animated.View
              key={row}
              style={[styles.waveRow, { top: horizon - 70 + row * 24, width: width + 80 }, { transform: [{ translateX: swell.interpolate({ inputRange: [0, 1], outputRange: row % 2 ? [-30, 0] : [0, -30] }) }] }]}
            >
              {Array.from({ length: Math.ceil(width / 80) + 2 }, (_, i) => (
                <View key={i} style={styles.wave} />
              ))}
            </Animated.View>
          ))}
        </>
      )}

      {place.kind === 'porto' && <Porto place={place} width={width} height={height} horizon={horizon} swell={swell} />}
      {place.kind === 'coimbra' && <Coimbra place={place} width={width} height={height} horizon={horizon} swell={swell} />}
      {place.kind === 'clinic' && <Clinic width={width} height={height} horizon={horizon} />}

      {/* The ground, where the controls sit. */}
      <View style={[styles.ground, { top: horizon, backgroundColor: pal.ground, borderColor: pal.groundEdge }]} />

      {place.kind === 'beach' && (
        // A striped beach umbrella stuck in the sand.
        <View style={[styles.umbrella, { right: width * 0.04, top: horizon - 110 }]}>
          <View style={styles.umbrellaTop}>
            {[colors.terracotta, colors.white, colors.terracotta, colors.white].map((c, i) => (
              <View key={i} style={{ flex: 1, backgroundColor: c }} />
            ))}
          </View>
          <View style={styles.umbrellaPole} />
        </View>
      )}

      {place.kind === 'ferry' && (
        <>
          {/* Deck planks. */}
          {Array.from({ length: 4 }, (_, i) => (
            <View key={i} style={[styles.plank, { top: horizon + i * (height * GROUND) / 4, width, backgroundColor: pal.groundEdge }]} />
          ))}
          {place.props.has('dining') && (
            // A table with a cloth.
            <View style={[styles.table, { right: width * 0.02, top: horizon - 60, width: width * 0.15 }]}>
              <View style={styles.tableLegs} />
            </View>
          )}
        </>
      )}
    </View>
  );
}

// Porto's houses, from the river up: ochre, red, yellow, blue and white, with terracotta roofs.
const HOUSES = ['#E8A33D', '#D9534F', '#F2D16B', '#5B8DB8', '#F4EDE1', '#8FB573', '#E07A5F', '#F4EDE1', '#5B8DB8', '#F2D16B', '#D9534F', '#E8A33D'];
const HEIGHTS = [0.9, 0.7, 1, 0.8, 0.95, 0.65, 0.85, 1, 0.75, 0.9, 0.7, 0.8];

/**
 * The Ribeira (Unit 4): tall coloured houses, the Douro and the arch of the Dom Luís bridge. "river" puts a rabelo
 * boat on the water; "street" walks into a narrow street instead, with the houses close up and a blue door.
 */
function Porto({ place, width, height, horizon, swell }: { place: Place; width: number; height: number; horizon: number; swell: Animated.Value }) {
  const street = place.props.has('street');
  const glass = place.evening ? '#F7D06B' : '#BFDDF0';
  const n = street ? 6 : HOUSES.length;
  const w = width / n;
  // Up close, the houses fill most of the sky; across the river they're a band above the water.
  const base = street ? horizon : horizon - 70;
  const tall = street ? horizon - height * 0.08 : height * 0.3;
  return (
    <>
      {/* Up in the sky, clear of the scene's title and the coins. */}
      {place.evening ? <View style={[styles.moon, { left: width * 0.62, top: height * 0.03 }]} /> : <View style={[styles.sun, { left: width * 0.62, top: height * 0.03 }]} />}
      {Array.from({ length: n }, (_, i) => {
        const h = tall * HEIGHTS[(i * 5) % HEIGHTS.length];
        const rows = street ? 4 : 3;
        return (
          <View key={i} style={[styles.house, { left: i * w, top: base - h, width: w + 1, height: h, backgroundColor: HOUSES[(i * 7) % HOUSES.length] }]}>
            <View style={styles.roof} />
            {Array.from({ length: rows }, (_, r) => (
              <View key={r} style={styles.windowRow}>
                {[0, 1].map((c) => (
                  <View key={c} style={[styles.houseWindow, { width: w * 0.22, height: Math.min(36, h / (rows * 2.2)), backgroundColor: glass }]} />
                ))}
              </View>
            ))}
            {street && i === n - 1 ? <View style={[styles.door, { width: w * 0.4, height: Math.min(110, h * 0.25) }]} /> : null}
          </View>
        );
      })}
      {!street && (
        <>
          {/* The Douro, with slow ripples. */}
          <View style={[styles.sea, { top: horizon - 70, width, height: 76, backgroundColor: place.evening ? '#24506A' : '#2F6E8A' }]} />
          {[0, 1].map((row) => (
            <Animated.View
              key={row}
              style={[styles.waveRow, { top: horizon - 50 + row * 26, width: width + 80 }, { transform: [{ translateX: swell.interpolate({ inputRange: [0, 1], outputRange: row % 2 ? [-30, 0] : [0, -30] }) }] }]}
            >
              {Array.from({ length: Math.ceil(width / 80) + 2 }, (_, i) => (
                <View key={i} style={styles.wave} />
              ))}
            </Animated.View>
          ))}
          {/* The iron arch of the bridge, with its road on top. */}
          <View style={[styles.arch, { left: width * 0.5, top: horizon - 70 - height * 0.36, width: width * 0.42, height: height * 0.36 + 20, borderTopLeftRadius: width * 0.21, borderTopRightRadius: width * 0.21 }]} />
          <View style={[styles.deck, { left: width * 0.46, top: horizon - 70 - height * 0.38, width: width * 0.5 }]} />
          {place.props.has('river') && (
            // A rabelo boat with its square sail, bobbing on the river.
            <Animated.View style={[styles.rabelo, { left: width * 0.18, top: horizon - 118 }, { transform: [{ translateY: swell.interpolate({ inputRange: [0, 1], outputRange: [3, -3] }) }] }]}>
              <View style={styles.sail} />
              <View style={styles.mast} />
              <View style={styles.hull} />
            </Animated.View>
          )}
        </>
      )}
    </>
  );
}

/**
 * Coimbra (Unit 5): the old town climbing the hill to the university and its tower, with the Mondego below.
 * In the evening the windows are lit and the moon is out.
 */
function Coimbra({ place, width, height, horizon, swell }: { place: Place; width: number; height: number; horizon: number; swell: Animated.Value }) {
  const glass = place.evening ? '#F7D06B' : '#BFDDF0';
  const wall = place.evening ? '#D9D3C4' : '#FBF8F0';
  const river = horizon - 60;
  // The hill, and the white houses stepping up it towards the tower.
  const hillTop = height * 0.3;
  const houses = 9;
  const w = (width * 0.62) / houses;
  return (
    <>
      {place.evening ? <View style={[styles.moon, { left: width * 0.62, top: height * 0.03 }]} /> : <View style={[styles.sun, { left: width * 0.62, top: height * 0.03 }]} />}
      <View style={[styles.hill, { left: -width * 0.1, top: hillTop + 40, width: width * 0.9, height: height, borderRadius: width * 0.45, backgroundColor: place.evening ? '#5E6F4A' : '#A9BE86' }]} />
      {Array.from({ length: houses }, (_, i) => {
        // Higher up the hill towards the middle, where the university is.
        const rise = Math.sin((i / (houses - 1)) * Math.PI) * height * 0.14;
        const h = 60 + ((i * 37) % 40);
        return (
          <View key={i} style={[styles.house, { left: width * 0.02 + i * w, top: river - h - rise, width: w + 1, height: h + rise, backgroundColor: wall }]}>
            <View style={styles.roof} />
            <View style={styles.windowRow}>
              {[0, 1].map((c) => (
                <View key={c} style={[styles.houseWindow, { width: w * 0.22, height: 16, backgroundColor: glass }]} />
              ))}
            </View>
          </View>
        );
      })}
      {/* The university tower, with its clock, on top of the hill. */}
      <View style={[styles.tower, { left: width * 0.33 - 30, top: river - height * 0.14 - 100 - height * 0.2, height: height * 0.2 + 40, backgroundColor: wall }]}>
        <View style={styles.towerTop} />
        <View style={styles.clock}>
          <View style={styles.clockHand} />
        </View>
      </View>
      {/* The Mondego. */}
      <View style={[styles.sea, { top: river, width, height: 66, backgroundColor: place.evening ? '#24506A' : '#4E8FAE' }]} />
      <Animated.View style={[styles.waveRow, { top: river + 26, width: width + 80 }, { transform: [{ translateX: swell.interpolate({ inputRange: [0, 1], outputRange: [0, -30] }) }] }]}>
        {Array.from({ length: Math.ceil(width / 80) + 2 }, (_, i) => (
          <View key={i} style={styles.wave} />
        ))}
      </Animated.View>
    </>
  );
}

/** The health centre (Unit 5): a calm room with a window, the green cross, an eye chart and the examination bed. */
function Clinic({ width, height, horizon }: { width: number; height: number; horizon: number }) {
  return (
    <>
      <View style={[styles.window, { right: width * 0.06, top: height * 0.1, width: width * 0.2, height: height * 0.28, backgroundColor: colors.sky }]}>
        <View style={[styles.windowGrass, { backgroundColor: '#A9BE86' }]} />
        <View style={styles.windowBarV} />
        <View style={styles.windowBarH} />
      </View>
      <View style={[styles.cross, { left: width * 0.05, top: height * 0.1 }]}>
        <View style={styles.crossV} />
        <View style={styles.crossH} />
      </View>
      {/* An eye chart: rows of marks getting smaller. */}
      <View style={[styles.chart, { left: width * 0.05, top: height * 0.3 }]}>
        {[44, 34, 26, 18, 12].map((w2, i) => (
          <View key={i} style={{ flexDirection: 'row', gap: 4, justifyContent: 'center' }}>
            {Array.from({ length: i + 1 }, (_, j) => (
              <View key={j} style={{ width: w2 / 2, height: w2 / 2.6, backgroundColor: colors.ink, borderRadius: 2 }} />
            ))}
          </View>
        ))}
      </View>
      {/* The examination bed. */}
      <View style={[styles.bed, { right: width * 0.04, top: horizon - 70, width: width * 0.24 }]}>
        <View style={styles.pillow} />
      </View>
    </>
  );
}

/** Gui's trampoline from Scene 1.1, drawn under him. */
export function Trampoline({ width }: { width: number }) {
  return (
    <View style={{ width, height: width * 0.28, alignItems: 'center' }} pointerEvents="none">
      <View style={[styles.trampMat, { width, height: width * 0.16, borderRadius: width }]} />
      <View style={[styles.trampLegs, { width: width * 0.8 }]}>
        <View style={styles.trampLeg} />
        <View style={styles.trampLeg} />
        <View style={styles.trampLeg} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sun: { position: 'absolute', width: 70, height: 70, borderRadius: 35, backgroundColor: colors.sun, borderWidth: 3, borderColor: colors.ink },
  moon: { position: 'absolute', width: 60, height: 60, borderRadius: 30, backgroundColor: '#F4EBC6', borderWidth: 3, borderColor: colors.ink },
  star: { position: 'absolute', width: 5, height: 5, borderRadius: 3, backgroundColor: '#F4EBC6' },
  cloud: { position: 'absolute', width: 120, height: 50 },
  puff: { position: 'absolute', backgroundColor: colors.white, borderRadius: 30 },
  hill: { position: 'absolute', borderWidth: 3, borderColor: colors.ink },
  fenceRail: { position: 'absolute', left: 0, height: 8, backgroundColor: '#E8D3B0', borderTopWidth: 2, borderBottomWidth: 2, borderColor: colors.ink },
  fencePost: { position: 'absolute', width: 14, height: 52, backgroundColor: '#F1E1C4', borderWidth: 2, borderColor: colors.ink, borderTopLeftRadius: 7, borderTopRightRadius: 7 },
  ground: { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopWidth: 3 },
  window: { position: 'absolute', borderWidth: 6, borderColor: colors.white, borderRadius: 8, overflow: 'hidden' },
  windowGrass: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '35%' },
  windowBarV: { position: 'absolute', top: 0, bottom: 0, left: '50%', width: 6, marginLeft: -3, backgroundColor: colors.white },
  windowBarH: { position: 'absolute', left: 0, right: 0, top: '50%', height: 6, marginTop: -3, backgroundColor: colors.white },
  fridge: { position: 'absolute', width: 110, backgroundColor: '#F8F8F6', borderWidth: 3, borderColor: colors.ink, borderTopLeftRadius: 12, borderTopRightRadius: 12, alignItems: 'center', paddingTop: 30 },
  postcard: { width: 50, height: 34, backgroundColor: colors.sun, borderWidth: 2, borderColor: colors.ink, transform: [{ rotate: '-6deg' }] },
  tiles: { position: 'absolute', left: 0, height: 40, flexDirection: 'row', borderTopWidth: 2, borderColor: colors.ink },
  tile: { width: 40, height: 40, backgroundColor: colors.white, borderRightWidth: 1, borderColor: colors.blueTint, alignItems: 'center', justifyContent: 'center' },
  tileDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.blue, transform: [{ rotate: '45deg' }] },
  porthole: { position: 'absolute', width: 96, height: 96, borderRadius: 48, borderWidth: 8, borderColor: '#9AA5B1', overflow: 'hidden', backgroundColor: '#BFE0F2' },
  portSky: { position: 'absolute', left: 0, right: 0, top: 0, height: '55%' },
  portSea: { position: 'absolute', left: -10, right: -10, top: '50%', height: '70%' },
  portMoon: { position: 'absolute', right: 18, top: 12, width: 18, height: 18, borderRadius: 9, backgroundColor: '#F4EBC6' },
  potRail: { position: 'absolute', height: 6, backgroundColor: '#7D8691', borderRadius: 3, flexDirection: 'row', justifyContent: 'space-around', overflow: 'visible' },
  potHook: { width: 3, height: 18, backgroundColor: '#7D8691' },
  pot: { backgroundColor: '#C9612F', borderWidth: 3, borderColor: colors.ink, borderBottomLeftRadius: 14, borderBottomRightRadius: 14 },
  table: { position: 'absolute', height: 26, backgroundColor: colors.white, borderWidth: 3, borderColor: colors.ink, borderRadius: 6, alignItems: 'center' },
  tableLegs: { width: '80%', height: 40, borderLeftWidth: 6, borderRightWidth: 6, borderColor: '#7A5233', marginTop: 20 },
  sea: { position: 'absolute', left: 0, borderTopWidth: 3, borderColor: colors.ink },
  waveRow: { position: 'absolute', left: -40, flexDirection: 'row', gap: 30 },
  wave: { width: 50, height: 10, borderTopWidth: 3, borderColor: 'rgba(255,255,255,0.7)', borderTopLeftRadius: 25, borderTopRightRadius: 25 },
  umbrella: { position: 'absolute', alignItems: 'center' },
  umbrellaTop: { width: 130, height: 50, borderTopLeftRadius: 65, borderTopRightRadius: 65, borderWidth: 3, borderColor: colors.ink, overflow: 'hidden', flexDirection: 'row' },
  umbrellaPole: { width: 6, height: 120, backgroundColor: colors.ink },
  house: { position: 'absolute', borderWidth: 2, borderColor: colors.ink, alignItems: 'center', paddingTop: 14, gap: 10 },
  roof: { position: 'absolute', left: -2, right: -2, top: -8, height: 10, backgroundColor: colors.terracotta, borderWidth: 2, borderColor: colors.ink },
  windowRow: { flexDirection: 'row', gap: 10 },
  houseWindow: { borderWidth: 2, borderColor: colors.white, borderRadius: 3 },
  door: { position: 'absolute', bottom: 0, backgroundColor: colors.blue, borderWidth: 3, borderColor: colors.ink, borderTopLeftRadius: 40, borderTopRightRadius: 40 },
  arch: { position: 'absolute', borderWidth: 10, borderBottomWidth: 0, borderColor: '#4A4F57' },
  deck: { position: 'absolute', height: 12, backgroundColor: '#4A4F57', borderRadius: 3 },
  rabelo: { position: 'absolute', alignItems: 'center' },
  tower: { position: 'absolute', width: 60, borderWidth: 2, borderColor: colors.ink, alignItems: 'center', paddingTop: 22 },
  towerTop: { position: 'absolute', top: -26, width: 36, height: 26, backgroundColor: '#E9E2D3', borderWidth: 2, borderColor: colors.ink, borderTopLeftRadius: 18, borderTopRightRadius: 18 },
  clock: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.white, borderWidth: 2, borderColor: colors.ink, alignItems: 'center' },
  clockHand: { width: 2, height: 12, marginTop: 3, backgroundColor: colors.ink },
  cross: { position: 'absolute', width: 70, height: 70, alignItems: 'center', justifyContent: 'center' },
  crossV: { position: 'absolute', width: 24, height: 70, backgroundColor: '#2E9E5B', borderRadius: 4 },
  crossH: { position: 'absolute', width: 70, height: 24, backgroundColor: '#2E9E5B', borderRadius: 4 },
  chart: { position: 'absolute', width: 90, padding: 8, gap: 8, backgroundColor: colors.white, borderWidth: 3, borderColor: colors.ink, borderRadius: 6 },
  bed: { position: 'absolute', height: 40, backgroundColor: colors.white, borderWidth: 3, borderColor: colors.ink, borderRadius: 8, borderBottomWidth: 10, borderBottomColor: '#8A939C' },
  pillow: { position: 'absolute', left: 8, top: -16, width: 60, height: 22, backgroundColor: '#DCEFF5', borderWidth: 2, borderColor: colors.ink, borderRadius: 10 },
  sail: { width: 54, height: 46, backgroundColor: '#F4EDE1', borderWidth: 3, borderColor: colors.ink },
  mast: { width: 4, height: 12, backgroundColor: colors.ink },
  hull: { width: 120, height: 22, backgroundColor: '#7A4B2A', borderWidth: 3, borderColor: colors.ink, borderBottomLeftRadius: 40, borderBottomRightRadius: 40 },
  plank: { position: 'absolute', left: 0, height: 2 },
  trampMat: { backgroundColor: colors.blue, borderWidth: 4, borderColor: colors.ink },
  trampLegs: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -4 },
  trampLeg: { width: 6, height: 26, backgroundColor: colors.ink, borderRadius: 3 },
});
