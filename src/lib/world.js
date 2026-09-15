/**
 * A world landmask, as lon/lat polygons.
 *
 * Traced off a standard equirectangular world map and kept to the detail a
 * dot screen can actually resolve. The silhouette features that make a globe
 * recognisable are the ones worth spending vertices on: Florida and the Gulf,
 * Baja and the Californian coast, the Horn of Africa, the Indian peninsula,
 * Indochina, Kamchatka, Scandinavia.
 *
 * Inland seas matter more than coastline detail at this resolution. Without
 * the Mediterranean, Europe and Africa fuse into one mass and the whole thing
 * stops reading as Earth; the Black Sea, the Caspian and Hudson Bay do the
 * same job at smaller scale. They are subtracted rather than drawn around,
 * which keeps the outlines simple.
 *
 * Longitude runs -180..180, latitude -90..90.
 */
const LAND = [
  // North America
  [[-168, 65], [-164, 68], [-156, 71], [-145, 70], [-134, 69], [-125, 70],
   [-115, 73], [-101, 70], [-95, 68], [-85, 70], [-80, 73], [-70, 70],
   [-64, 60], [-55, 52], [-53, 47], [-61, 46], [-67, 45], [-70, 42],
   [-74, 39], [-76, 35], [-81, 31], [-80, 25], [-83, 28], [-85, 30],
   [-90, 29], [-94, 29], [-97, 26], [-97, 21], [-91, 19], [-87, 21],
   [-88, 17], [-83, 9], [-78, 8], [-84, 13], [-92, 15], [-96, 16],
   [-105, 20], [-110, 23], [-114, 28], [-117, 32], [-122, 37], [-124, 43],
   [-124, 48], [-131, 54], [-140, 59], [-148, 60], [-158, 57], [-165, 60],
   [-168, 65]],
  // Greenland
  [[-45, 83], [-30, 82], [-22, 77], [-21, 70], [-31, 65], [-42, 60],
   [-50, 61], [-55, 66], [-60, 72], [-55, 79], [-45, 83]],
  // South America
  [[-81, 8], [-76, 11], [-71, 12], [-60, 11], [-52, 5], [-50, 0], [-44, -2],
   [-38, -5], [-35, -8], [-38, -13], [-39, -18], [-48, -25], [-53, -34],
   [-58, -38], [-62, -40], [-65, -45], [-69, -52], [-74, -53], [-75, -46],
   [-73, -37], [-71, -30], [-70, -23], [-71, -18], [-77, -12], [-81, -6],
   [-80, -2], [-78, 1], [-77, 7], [-81, 8]],
  // Africa and Arabia
  [[-17, 15], [-16, 21], [-13, 28], [-6, 36], [10, 37], [20, 33], [25, 32],
   [32, 31], [35, 28], [38, 22], [43, 12], [48, 12], [51, 11], [48, 5],
   [42, -1], [41, -10], [40, -16], [35, -24], [31, -30], [25, -34],
   [18, -35], [14, -23], [12, -17], [9, -1], [3, 6], [-8, 5], [-13, 9],
   [-17, 15]],
  // Europe
  [[-10, 36], [-9, 43], [-2, 43], [-1, 46], [-4, 48], [0, 50], [4, 53],
   [8, 55], [7, 58], [5, 61.5], [11, 65], [16, 68], [21, 70], [28, 71],
   [35, 69], [44, 67], [52, 63], [58, 58], [58, 52], [52, 48], [45, 45],
   [38, 45], [30, 46], [26, 44], [20, 42], [14, 45], [8, 44],
   [3, 42], [-2, 37], [-10, 36]],
  [[10, 45], [14, 45], [17, 41], [18, 40], [16, 38], [12, 42], [10, 45]], // Italy
  [[20, 40], [24, 41], [26, 38], [22, 37], [20, 40]],             // Greece
  // Asia
  [[45, 55], [50, 58], [60, 66], [70, 72], [80, 74], [90, 76], [100, 77],
   [110, 76], [120, 73], [130, 71], [140, 68], [150, 60], [160, 58],
   [165, 62], [172, 66], [178, 65], [170, 60], [162, 58], [155, 52],
   [145, 45], [140, 42], [135, 38], [130, 35], [126, 38], [122, 31],
   [118, 24], [110, 21], [106, 10], [100, 4], [98, 8], [95, 16], [92, 21],
   [88, 22], [87, 21], [83, 16], [81, 14], [79, 10], [76, 9], [73, 16],
   [70, 23], [65, 25],
   [60, 25], [57, 30], [52, 28], [48, 30], [45, 38], [45, 55]],
  // Australia
  [[113, -22], [114, -26], [116, -34], [122, -34], [129, -32], [134, -33],
   [138, -35], [141, -38], [147, -38], [150, -37], [153, -28], [146, -19],
   [143, -11], [136, -12], [130, -12], [126, -14], [121, -20], [113, -22]],
  [[144, -41], [148, -41], [148, -43], [145, -43], [144, -41]],   // Tasmania
  [[166, -46], [174, -41], [178, -37], [173, -34], [168, -44], [166, -46]], // NZ
  [[43, -12], [50, -16], [47, -25], [43, -21], [43, -12]],        // Madagascar
  // Japan
  [[130, 31], [136, 35], [141, 41], [146, 44], [142, 39], [137, 34],
   [132, 33], [130, 31]],
  // British Isles
  [[-6, 50], [-3, 55], [-3, 58], [0, 58], [1, 53], [-5, 50], [-6, 50]],
  [[-10, 52], [-6, 55], [-6, 52], [-10, 52]],                     // Ireland
  [[-24, 64], [-14, 66], [-14, 63], [-22, 63], [-24, 64]],        // Iceland
  // Indonesia and neighbours
  [[95, 5], [106, -6], [104, -6], [95, 2], [95, 5]],              // Sumatra
  [[105, -6], [115, -8], [114, -8], [105, -7], [105, -6]],        // Java
  [[109, 2], [117, 4], [119, -3], [110, -3], [109, 2]],           // Borneo
  [[119, 1], [125, 1], [125, -5], [120, -5], [119, 1]],           // Sulawesi
  [[131, -1], [141, -3], [150, -8], [141, -9], [132, -5], [131, -1]], // New Guinea
  [[120, 18], [122, 18], [126, 7], [121, 6], [120, 18]],          // Philippines
  [[120, 25], [122, 25], [121, 22], [120, 25]],                   // Taiwan
  [[80, 9], [82, 9], [81, 6], [80, 9]],                           // Sri Lanka
  [[-85, 20], [-74, 20], [-74, 18], [-85, 19], [-85, 20]],        // Cuba
  [[-74, 20], [-68, 19], [-68, 17], [-74, 18], [-74, 20]],        // Hispaniola
  [[10, 78], [30, 80], [28, 76], [12, 76], [10, 78]],             // Svalbard
  [[52, 77], [68, 76], [60, 70], [54, 71], [52, 77]],             // Novaya Zemlya
];

/**
 * Subtracted after the fact. The Mediterranean is the important one: without
 * it Europe and Africa read as a single continent and the globe stops looking
 * like Earth at all.
 */
const WATER = [
  [[-6, 36], [0, 38], [8, 41], [16, 41], [20, 39], [27, 41], [36, 37],
   [35, 31], [22, 31], [11, 33], [0, 34], [-6, 36]],              // Mediterranean
  [[28, 47], [41, 46], [41, 41], [28, 41], [28, 47]],             // Black Sea
  [[47, 47], [54, 47], [54, 37], [48, 38], [47, 47]],             // Caspian
  [[33, 29], [36, 29], [44, 12], [41, 12], [33, 29]],             // Red Sea
  [[48, 30], [57, 25], [56, 23], [47, 29], [48, 30]],             // Persian Gulf
  [[-95, 63], [-78, 63], [-77, 55], [-82, 51], [-94, 57], [-95, 63]], // Hudson Bay
  [[-92, 49], [-76, 45], [-76, 43], [-83, 41], [-92, 46], [-92, 49]], // Great Lakes
  [[-10, 46], [-1, 48], [-1, 43], [-10, 44], [-10, 46]],          // Biscay
];

/** Ray casting in lon/lat. No polygon here straddles the antimeridian. */
function inPoly(lon, lat, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1];
    const xj = poly[j][0], yj = poly[j][1];
    if ((yi > lat) !== (yj > lat)
      && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Is this longitude and latitude over land? */
export function isLand(lon, lat) {
  // Antarctica, with a wobble so the ice edge is a coast rather than a ruled
  // line of latitude.
  if (lat < -66 + Math.sin(lon * 0.0524) * 4.5) return true;
  let hit = false;
  for (let i = 0; i < LAND.length; i++) {
    if (inPoly(lon, lat, LAND[i])) { hit = true; break; }
  }
  if (!hit) return false;
  for (let i = 0; i < WATER.length; i++) {
    if (inPoly(lon, lat, WATER[i])) return false;
  }
  return true;
}
