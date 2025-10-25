import {
  STREETS_STYLE,
  SATELLITE_HYBRID_STYLE,
  StyleSwitcherControl,
  modifyBaseStyle,
} from "./shared.js";

// --- 1. CONSTANTS ---
const mapData = [
  {
    year: "1831",
    title: "1831",
    extent: [11777192.517, 2392251.323, 11785501.995, 2398586.042],
  },
  {
    year: "1873",
    title: "1873",
    extent: [11778588.863, 2391034.561, 11786438.652, 2399428.351],
  },
  {
    year: "1885",
    title: "1885",
    extent: [11779497.477, 2391753.406, 11786836.372, 2398597.242],
  },
  {
    year: "1891b",
    title: "1891",
    extent: [11778560.336252, 2392587.212477, 11784755.133579, 2397546.240792],
  },
  {
    year: "1894",
    title: "1894",
    extent: [11779981.310497, 2391348.205003, 11785722.827001, 2398582.38102],
  },
  {
    year: "1911",
    title: "1911",
    extent: [11778238.808, 2392035.464, 11787379.276, 2399887.42],
  },
  {
    year: "1920",
    title: "1920",
    extent: [11774584.27, 2389781.221, 11789425.716, 2400728.659],
  },
  {
    year: "1925",
    title: "1925",
    extent: [11775410.663, 2390787.549, 11789285.709, 2400980.824],
  },
  {
    year: "1926",
    title: "1926",
    extent: [11781193.523914, 2394570.994076, 11784797.946318, 2397374.208348],
  },
  {
    year: "1929",
    title: "1929",
    extent: [11776835.274703, 2391277.184008, 11786703.296099, 2398630.593322],
  },
  {
    year: "1930",
    title: "1930",
    extent: [11780273.832504, 2391782.534119, 11785154.944323, 2398620.242014],
  },
  {
    year: "1932",
    title: "1932",
    extent: [11779787.67009, 2391236.908184, 11786395.079343, 2398500.538078],
  },
  {
    year: "1936",
    title: "1936",
    extent: [11779646.327, 2390099.977, 11785979.312, 2399506.4],
  },
  {
    year: "1942a",
    title: "1942",
    extent: [11778407.93035, 2391208.420221, 11786963.948359, 2398505.336837],
  },
  {
    year: "1951",
    title: "1951",
    extent: [11777080.729, 2389012.259, 11789107.024, 2399217.479],
  },
  {
    year: "1952",
    title: "1952",
    extent: [11780196.139688, 2392283.311738, 11785605.082601, 2399324.539199],
  },
];
const minZoomLevel = 12;

const layerSelect = document.getElementById("layer-select");
const opacitySlider = document.getElementById("opacity-slider");

let symbolLayerIds = [];

// --- 1. MAP INIT ---
const map = new maplibregl.Map({
  container: "map",
  style: STREETS_STYLE,
  center: [105.8542, 21.0285],
  zoom: minZoomLevel,
  maxBounds: [
    [105.5, 20.7],
    [106.1, 21.5],
  ],
  attributionControl: { compact: true },
});
// --- 2. MAP LOAD ---
map.on("load", () => {
  setupMapLayers();

  if (mapData.length > 0) {
    map.fitBounds(transformExtent(mapData[0].extent), {
      padding: 50,
      duration: 0,
    });
  }

  map.addControl(
    new maplibregl.NavigationControl({ showCompass: true }),
    "top-left"
  );
  map.addControl(
    new maplibregl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,
    }),
    "top-left"
  );
  map.addControl(
    new StyleSwitcherControl({
      streets: STREETS_STYLE,
      satellite: SATELLITE_HYBRID_STYLE,
    }),
    "top-left"
  );
  map.addControl(
    new maplibregl.AttributionControl({
      customAttribution:
        '<a href="https://threads.com/@tomeyinhanoi" target="_blank" style="text-decoration: underline">By Tomey</a> | <a href="/info" target="_blank"  style="text-decoration: underline">Sources</a>',
      compact: true,
    }),
    "bottom-left"
  );

  const compass = document.querySelector(".maplibregl-ctrl-compass");
  compass.style.display = "none";
  const toggle = () => {
    compass.style.display = Math.abs(map.getBearing()) > 0.1 ? "block" : "none";
  };
  ["rotate", "moveend"].forEach((e) => map.on(e, toggle));
  toggle();
});

map.on("styledata", () => {
  setTimeout(() => {
    setupMapLayers(); // Re-add styles after setStyle() completes.
    applyLayerVisibility();
    changeOpacity();
  }, 50);
});

layerSelect.addEventListener("change", changeHistoricLayer);
opacitySlider.addEventListener("input", changeOpacity);

// Utils
function setupMapLayers() {
  const firstSymbolId = map
    .getStyle()
    .layers.find((l) => l.type === "symbol")?.id;

  symbolLayerIds = map
    .getStyle()
    .layers.filter((layer) => layer.type === "symbol")
    .map((layer) => layer.id);

  mapData.forEach((data, index) => {
    const layerId = `historic-${data.year}`;

    // Add source if it doesn't exist
    if (!map.getSource(layerId)) {
      map.addSource(layerId, {
        type: "raster",
        tiles: [`/maps-tiles/${data.year}/{z}/{x}/{y}.png`],
        scheme: "tms",
        tileSize: 256,
        minzoom: minZoomLevel,
        bounds: transformExtent(data.extent),
      });
    }

    // Add layer if it doesn't exist
    if (!map.getLayer(layerId)) {
      map.addLayer(
        {
          id: layerId,
          type: "raster",
          source: layerId,
          paint: {
            "raster-opacity": parseFloat(opacitySlider.value),
          },
          layout: {
            visibility: index === 0 ? "visible" : "none",
          },
        },
        firstSymbolId
      );
    }
  });

  modifyBaseStyle(map);
}

function applyLayerVisibility() {
  const selectedYear = layerSelect.value;
  mapData.forEach((data) => {
    const layerId = `historic-${data.year}`;
    const visibility = data.year === selectedYear ? "visible" : "none";
    if (map.getLayer(layerId)) {
      map.setLayoutProperty(layerId, "visibility", visibility);
    }
  });
}

function changeHistoricLayer() {
  const selectedYear = layerSelect.value;

  mapData.forEach((data) => {
    const layerId = `historic-${data.year}`;
    const visibility = data.year === selectedYear ? "visible" : "none";
    if (map.getLayer(layerId)) {
      map.setLayoutProperty(layerId, "visibility", visibility);
    }
  });

  const selectedMap = mapData.find((data) => data.year === selectedYear);
  if (selectedMap) {
    map.fitBounds(transformExtent(selectedMap.extent), {
      padding: 50,
    });
  }
}

function changeOpacity() {
  const opacity = parseFloat(opacitySlider.value);
  mapData.forEach((data) => {
    const layerId = `historic-${data.year}`;
    if (map.getLayer(layerId)) {
      map.setPaintProperty(layerId, "raster-opacity", opacity);
    }
  });

  const newVisibility = opacity >= 0.7 ? "none" : "visible";
  symbolLayerIds.forEach((id) => {
    if (map.getLayer(id)) {
      map.setLayoutProperty(id, "visibility", newVisibility);
    }
  });
}

function transformExtent(extent) {
  const R = 20037508.34;
  const lon1 = (extent[0] / R) * 180;
  const lat1 =
    (180 / Math.PI) *
    (2 * Math.atan(Math.exp((extent[1] / R) * Math.PI)) - Math.PI / 2);
  const lon2 = (extent[2] / R) * 180;
  const lat2 =
    (180 / Math.PI) *
    (2 * Math.atan(Math.exp((extent[3] / R) * Math.PI)) - Math.PI / 2);
  return [lon1, lat1, lon2, lat2];
}

// Add years to dropdown
mapData.forEach((data) => {
  const option = document.createElement("option");
  option.value = data.year;
  option.textContent = data.title;
  layerSelect.appendChild(option);
});
