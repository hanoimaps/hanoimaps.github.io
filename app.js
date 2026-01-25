import {
  STREETS_STYLE,
  SATELLITE_HYBRID_STYLE,
  StyleSwitcherControl,
  modifyBaseStyle,
  setupKeyboardControls,
} from "./shared.js";

// --- 1. CONSTANTS ---
const GEOJSON_PATH = "bio_streets.geojson";
let streetData = null;
let isStreetViewActive = false;
let selectedStreetId = null;

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
    year: "1883",
    title: "1883",
    extent: [11779301.44, 2392377.131, 11786559.633, 2399077.081],
  },
  {
    year: "1885",
    title: "1885",
    extent: [11779497.477, 2391753.406, 11786836.372, 2398597.242],
  },
  {
    year: "1888",
    title: "1888",
    extent: [11775842.282, 2386097.022, 11791062.073, 2405541.345],
  },
  {
    year: "1890",
    title: "1890",
    extent: [11777601.14, 2390271.32, 11788168.039, 2401139.759],
  },
  {
    year: "1891c",
    title: "1891",
    extent: [11776457.163, 2391658.082, 11785818.686, 2402941.453],
  },
  {
    year: "1893",
    title: "1893",
    extent: [11768016.394, 2384318.98, 11794430.751, 2405557.329],
  },
  {
    year: "1894b",
    title: "1894.1",
    extent: [11780171.681, 2391299.117, 11785653.583, 2398626.383],
  },
  {
    year: "1894c",
    title: "1894.2",
    extent: [11780904.327, 2395056.309, 11783225.328, 2397268.279],
  },
  {
    year: "1898",
    title: "1898",
    extent: [11780100.496, 2392091.677, 11786756.393, 2398938.164],
  },
  {
    year: "1900",
    title: "1900",
    extent: [11779952.507, 2392115.856, 11787104.242, 2399424.383],
  },
  {
    year: "1902",
    title: "1902",
    extent: [11777706.53, 2391655.41, 11787781.469, 2399432.445],
  },
  {
    year: "1911",
    title: "1911",
    extent: [11778238.808, 2392035.464, 11787379.276, 2399887.42],
  },
  {
    year: "1915",
    title: "1915",
    extent: [11780652.274, 2393262.148, 11784956.909, 2398033.926],
  },
  {
    year: "1920",
    title: "1920",
    extent: [11774584.27, 2389781.221, 11789425.716, 2400728.659],
  },
  {
    year: "1922",
    title: "1922",
    extent: [11778906.998, 2391001.899, 11785944.292, 2398168.549],
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
    year: "1928",
    title: "1928",
    extent: [11774363.462, 2389218.518, 11790038.078, 2401344.132],
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
    title: "1932.1",
    extent: [11779787.67009, 2391236.908184, 11786395.079343, 2398500.538078],
  },
  {
    year: "1932b",
    title: "1932.2",
    extent: [11779658.451, 2390156.164, 11785887.337, 2399513.857],
  },
  {
    year: "1935",
    title: "1935",
    extent: [11758101.232, 2376738.152, 11802936.911, 2412851.734],
  },
  {
    year: "1936",
    title: "1936.1",
    extent: [11779646.327, 2390099.977, 11785979.312, 2399506.4],
  },
  {
    year: "1936b",
    title: "1936.2",
    extent: [11778478.637, 2390930.456, 11786627.724, 2398878.772],
  },
  {
    year: "1942a",
    title: "1942",
    extent: [11778407.93035, 2391208.420221, 11786963.948359, 2398505.336837],
  },
  {
    year: "1950",
    title: "1950",
    extent: [11780145.949, 2391828.882, 11785261.533, 2399180.788],
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
  {
    year: "1968",
    title: "1968",
    extent: [11776833.551, 2386957.026, 11791978.082, 2398934.007],
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
  attributionControl: false,
});

map.keyboard.disable(); // for keyboard interaction

// --- 2. MAP LOAD ---
map.on("load", () => {
  // Create street view button
  const topRightControls = document.getElementById("top-right-controls");
  const streetBtn = document.createElement("button");
  streetBtn.id = "street-view-btn";
  streetBtn.title = "Toggle Street View";
  streetBtn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="style-switcher-icon">
      <path d="M4 3h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1h-5l-3 3-3-3H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" stroke-linecap="round"/>
      <rect x="7" y="7" width="10" height="2" fill="black" stroke="none"/>
      <rect x="7" y="11" width="6" height="2" fill="black" stroke="none"/>
    </svg>
  `;
  topRightControls.insertBefore(streetBtn, topRightControls.firstChild);

  setupMapLayers();

  if (mapData.length > 0) {
    map.fitBounds(transformExtent(mapData[0].extent), {
      padding: 50,
      duration: 0,
    });
  }

  map.addControl(new maplibregl.NavigationControl(), "top-left");
  map.addControl(
    new maplibregl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,
    }),
    "top-left",
  );
  const styleSwitcher = new StyleSwitcherControl({
    streets: STREETS_STYLE,
    satellite: SATELLITE_HYBRID_STYLE,
  });
  map.addControl(styleSwitcher, "top-left");
  map.addControl(
    new maplibregl.AttributionControl({
      customAttribution:
        '<a href="https://threads.com/@tomeyinhanoi" target="_blank" style="text-decoration: underline">By Tomey</a> | <a href="/info" target="_blank"  style="text-decoration: underline">Sources</a>',
      compact: true,
    }),
    "bottom-left",
  );

  setupKeyboardControls(map, layerSelect, opacitySlider, styleSwitcher);

  // Fetch Street Data and setup interactions
  fetch(GEOJSON_PATH)
    .then((res) => res.json())
    .then((data) => {
      streetData = data;
      setupStreetLayers();
    });

  streetBtn.addEventListener("click", () => {
    isStreetViewActive = !isStreetViewActive;
    streetBtn.classList.toggle("active", isStreetViewActive);

    if (map.getLayer("streets-line")) {
      const visibility = isStreetViewActive ? "visible" : "none";
      map.setLayoutProperty("streets-line", "visibility", visibility);
      if (map.getLayer("streets-line-hit-area")) {
        map.setLayoutProperty(
          "streets-line-hit-area",
          "visibility",
          visibility,
        );
      }
    } else {
      setupStreetLayers();
    }

    if (!isStreetViewActive) {
      if (window.currentPopup) {
        window.currentPopup.remove();
        window.currentPopup = null;
      }
      if (selectedStreetId !== null && map.getSource("osm-streets")) {
        map.setFeatureState(
          { source: "osm-streets", id: selectedStreetId },
          { selected: false },
        );
        selectedStreetId = null;
      }
    }
  });

  // Change cursor to pointer on hover
  map.on("mouseenter", "streets-line-hit-area", () => {
    map.getCanvas().style.cursor = "pointer";
  });

  // Change it back when leaving
  map.on("mouseleave", "streets-line-hit-area", () => {
    map.getCanvas().style.cursor = "";
  });

  // Handle outside clicks to clear selection
  map.on("click", (e) => {
    const features = map.queryRenderedFeatures(e.point, {
      layers: ["streets-line-hit-area"],
    });

    if (!features.length) {
      if (selectedStreetId !== null && map.getSource("osm-streets")) {
        map.setFeatureState(
          { source: "osm-streets", id: selectedStreetId },
          { selected: false },
        );
        selectedStreetId = null;
      }
      if (window.currentPopup) {
        window.currentPopup.remove();
        window.currentPopup = null;
      }
    }
  });

  map.on("click", "streets-line-hit-area", (e) => {
    if (e.features.length > 0) {
      const feature = e.features[0];
      const newId = feature.id;
      map.flyTo({
        center: e.lngLat,
        zoom: map.getZoom(),
        duration: 900,
        curve: 1.42,
        essential: true,
        offset: [0, 120],
      });

      // Reset previous selection
      if (selectedStreetId !== null) {
        if (map.getSource("osm-streets")) {
          map.setFeatureState(
            { source: "osm-streets", id: selectedStreetId },
            { selected: false },
          );
        }
      }

      // Set new selection
      selectedStreetId = newId;
      map.setFeatureState(
        { source: "osm-streets", id: selectedStreetId },
        { selected: true },
      );

      // Show popup
      if (window.currentPopup) window.currentPopup.remove();
      window.currentPopup = new maplibregl.Popup()
        .setLngLat(e.lngLat)
        .setHTML(
          `<div style="padding: 8px; border-radius: 8px; background-color: white;">
                  <div style="font-size:17px;font-weight:600;margin-bottom:8px">${
                    feature.properties.french_name || "Unknown"
                  }</div>
                  ${
                    feature.properties.french_name
                      ? `<div style="color:#666;font-size:13px;margin-bottom:4px">${feature.properties.name}</div>`
                      : ""
                  }
                  ${
                    feature.properties.description
                      ? `<div style="color:#0066cc;font-size:13px;margin-top:4px;padding-top:4px;border-top:1px solid #ddd">${feature.properties.description}</div>`
                      : ""
                  }
                </div>`,
        )
        .addTo(map);
    }
  });
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
        tiles: [
          `https://pub-3bf64388e8f74a8a97c18eb8dc6ff165.r2.dev/maps-tiles/${data.year}/{z}/{x}/{y}.png`,
        ],
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
        firstSymbolId,
      );
    }
  });

  modifyBaseStyle(map);
  setupStreetLayers();
}

function setupStreetLayers() {
  if (!streetData) return;

  if (!map.getSource("osm-streets")) {
    map.addSource("osm-streets", { type: "geojson", data: streetData });
  }

  const filterConfig = ["to-boolean", ["get", "description"]];

  // 1. Add Invisible Hit Area Layer (Wider)
  if (!map.getLayer("streets-line-hit-area")) {
    map.addLayer({
      id: "streets-line-hit-area",
      type: "line",
      source: "osm-streets",
      layout: {
        visibility: isStreetViewActive ? "visible" : "none",
        "line-cap": "round",
        "line-join": "round",
      },
      filter: filterConfig,
      paint: {
        "line-color": "#000000", // Color doesn't matter, opacity is 0
        "line-width": 25, // Fixed 25px hit area
        "line-opacity": 0,
      },
    });
  }

  // 2. Add Visible Street Line Layer
  if (!map.getLayer("streets-line")) {
    map.addLayer({
      id: "streets-line",
      type: "line",
      source: "osm-streets",
      layout: {
        visibility: isStreetViewActive ? "visible" : "none",
        "line-cap": "round",
        "line-join": "round",
      },
      filter: filterConfig,
      paint: {
        "line-color": [
          "case",
          ["boolean", ["feature-state", "selected"], false],
          "#292991ff",
          "#4d94ff",
        ],
        "line-width": [
          "interpolate",
          ["linear"],
          ["zoom"],
          12,
          ["case", ["boolean", ["feature-state", "selected"], false], 6, 2],
          16,
          ["case", ["boolean", ["feature-state", "selected"], false], 12, 6],
        ],
        "line-opacity": 0.8,
      },
    });
  }

  // Restore selection state if it exists
  if (selectedStreetId !== null && map.getSource("osm-streets")) {
    map.setFeatureState(
      { source: "osm-streets", id: selectedStreetId },
      { selected: true },
    );
  }
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

  const newVisibility = opacity >= 0.85 ? "none" : "visible";
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
