import React, { useEffect, useRef, useState, useCallback } from 'react';
import 'ol/ol.css';
import OLMap from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import XYZ from 'ol/source/XYZ';
import TileGrid from 'ol/tilegrid/TileGrid';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import CircleGeom from 'ol/geom/Circle';
import { Style, Fill, Stroke, Circle as CircleStyle, Text as OLText } from 'ol/style';
import { fromLonLat, toLonLat, transform, get as getProjection } from 'ol/proj';
import { register } from 'ol/proj/proj4';
import proj4 from 'proj4';
import { copyTextToClipboard } from '../utils/regulatoryPredictor';
import {
  MapPin,
  Layers,
  Crosshair,
  Plus,
  Minus,
  Loader2,
  ExternalLink,
  RefreshCw,
  Satellite,
  Map as MapIcon,
  Radar,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

// Register 국토교통부 국토지리정보원 공식 투영 좌표계 (EPSG:5179 / Korea 2000 Unified CS)
const EPSG_5179_DEF =
  '+proj=tmerc +lat_0=38 +lon_0=127.5 +k=0.9996 +x_0=1000000 +y_0=2000000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs';

if (!proj4.defs('EPSG:5179')) {
  proj4.defs('EPSG:5179', EPSG_5179_DEF);
  register(proj4);
}

const NGII_ORIGIN: [number, number] = [-200000.0, 4000000.0];
const NGII_EXTENT: [number, number, number, number] = [-200000.0, -3015.4524155292, 3803015.45241553, 4000000.0];
const NGII_RESOLUTIONS = [
  2088.96, 1044.48, 522.24, 261.12, 130.56, 65.28, 32.64, 16.32, 8.16, 4.08, 2.04, 1.02, 0.51, 0.255,
];
const NGII_MATRIX_IDS = [
  'L05', 'L06', 'L07', 'L08', 'L09', 'L10', 'L11', 'L12', 'L13', 'L14', 'L15', 'L16', 'L17', 'L18',
];

const ngiiProjection = getProjection('EPSG:5179');
if (ngiiProjection) {
  ngiiProjection.setExtent(NGII_EXTENT);
}

type MapLayerMode = 'base' | 'aerial' | 'hybrid';
type TileEngineMode = 'ngii' | 'vworld' | 'public';

interface MapConfigResponse {
  success: boolean;
  ngiiConfigured: boolean;
  ngiiReachable?: boolean;
  vworldConfigured: boolean;
  vworldReachable?: boolean;
  tileMode: TileEngineMode;
  providerName: string;
}

interface GeocodeCoord {
  lat: number;
  lng: number;
  matchedQuery: string;
  precision: 'exact' | 'road' | 'dong' | 'sigungu' | 'manual';
  source: string;
}

interface NgiiCandidateMapProps {
  address: string;
  jibunAddress?: string;
  buildingName?: string;
  candidateName?: string;
}

const DEFAULT_SEOUL_COORD: GeocodeCoord = {
  lat: 37.5665,
  lng: 126.978,
  matchedQuery: '서울특별시청 (기본 위치)',
  precision: 'sigungu',
  source: '기본 좌표',
};

function expandSidoForClientGeocode(addr: string): string {
  return addr
    .replace(/^서울\s+/, '서울특별시 ')
    .replace(/^부산\s+/, '부산광역시 ')
    .replace(/^대구\s+/, '대구광역시 ')
    .replace(/^인천\s+/, '인천광역시 ')
    .replace(/^광주\s+/, '광주광역시 ')
    .replace(/^대전\s+/, '대전광역시 ')
    .replace(/^울산\s+/, '울산광역시 ')
    .replace(/^세종\s+/, '세종특별자치시 ')
    .replace(/^경기\s+/, '경기도 ')
    .replace(/^강원\s+/, '강원특별자치도 ')
    .replace(/^충북\s+/, '충청북도 ')
    .replace(/^충남\s+/, '충청남도 ')
    .replace(/^전북\s+/, '전북특별자치도 ')
    .replace(/^전남\s+/, '전라남도 ')
    .replace(/^경북\s+/, '경상북도 ')
    .replace(/^경남\s+/, '경상남도 ')
    .replace(/^제주\s+/, '제주특별자치도 ');
}

async function geocodeDirectlyViaArcGis(
  targetAddr: string,
  targetJibun?: string
): Promise<GeocodeCoord | null> {
  const candidates = [
    expandSidoForClientGeocode(targetAddr.split('(')[0].trim()),
    expandSidoForClientGeocode((targetJibun || '').split('(')[0].trim()),
  ].filter(Boolean);

  for (const query of candidates) {
    try {
      const url = `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?SingleLine=${encodeURIComponent(
        query
      )}&countryCode=KOR&outFields=Addr_type,Match_addr&maxLocations=1&f=json`;
      const res = await fetch(url);
      if (!res.ok) continue;
      const json = await res.json();
      const best = json?.candidates?.[0];
      if (
        best?.location &&
        typeof best.location.y === 'number' &&
        typeof best.location.x === 'number' &&
        Number(best.score || 0) >= 85
      ) {
        const t = String(best?.attributes?.Addr_type || '').toLowerCase();
        const precision: GeocodeCoord['precision'] =
          t === 'pointaddress' || t === 'subaddress' || t === 'buildingname' || t === 'poi'
            ? 'exact'
            : t === 'streetaddress' || t === 'streetname'
            ? 'road'
            : t === 'locality' || t === 'neighborhood'
            ? 'dong'
            : 'sigungu';
        return {
          lat: best.location.y,
          lng: best.location.x,
          matchedQuery: best?.attributes?.Match_addr || best.address || query,
          precision,
          source: 'ArcGIS Geocoder',
        };
      }
    } catch {
      // ignore and try next candidate
    }
  }
  return null;
}

function createNgiiLayer(layerName: 'korean_map' | 'satellite_map' | 'hybrid_map', visible: boolean) {
  const tileGrid = new TileGrid({
    origin: NGII_ORIGIN,
    resolutions: NGII_RESOLUTIONS,
    tileSize: 256,
  });

  const source = new XYZ({
    projection: 'EPSG:5179',
    tileGrid,
    tileUrlFunction: (tileCoord) => {
      if (!tileCoord) return '';
      const z = tileCoord[0];
      const x = tileCoord[1];
      const y = tileCoord[2];
      const matrixId = NGII_MATRIX_IDS[z];
      if (!matrixId || x < 0 || y < 0) return '';
      return `/api/map/ngii-tile?layer=${encodeURIComponent(layerName)}&tilematrix=${matrixId}&tilerow=${y}&tilecol=${x}`;
    },
    crossOrigin: 'anonymous',
  });

  return new TileLayer({
    source,
    visible,
  });
}

function createVworldLayer(layerName: 'Base' | 'Satellite' | 'Hybrid', visible: boolean) {
  return new TileLayer({
    source: new XYZ({
      url: `/api/map/vworld-tile?layer=${layerName}&z={z}&y={y}&x={x}`,
      maxZoom: 19,
      crossOrigin: 'anonymous',
    }),
    visible,
  });
}

function createPublicLayers(initialMode: MapLayerMode) {
  const baseLayer = new TileLayer({
    source: new XYZ({
      url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      maxZoom: 19,
      crossOrigin: 'anonymous',
    }),
    visible: initialMode === 'base',
  });

  const aerialLayer = new TileLayer({
    source: new XYZ({
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      maxZoom: 19,
      crossOrigin: 'anonymous',
    }),
    visible: initialMode === 'aerial' || initialMode === 'hybrid',
  });

  const hybridLabelLayer = new TileLayer({
    source: new XYZ({
      url: 'https://{a-d}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}@2x.png',
      maxZoom: 19,
      crossOrigin: 'anonymous',
    }),
    visible: initialMode === 'hybrid',
  });

  return { baseLayer, aerialLayer, hybridLabelLayer };
}

export const NgiiCandidateMap: React.FC<NgiiCandidateMapProps> = ({
  address,
  jibunAddress,
  buildingName,
  candidateName,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<OLMap | null>(null);
  const layersRef = useRef<{
    base: TileLayer<XYZ>;
    aerial: TileLayer<XYZ>;
    hybridOverlay: TileLayer<XYZ>;
    vectorSource: VectorSource;
  } | null>(null);

  const [mapConfig, setMapConfig] = useState<MapConfigResponse | null>(null);
  const [activeTileMode, setActiveTileMode] = useState<TileEngineMode>('public');
  const [layerMode, setLayerMode] = useState<MapLayerMode>('base');
  const [showRadius, setShowRadius] = useState(true);
  const [coord, setCoord] = useState<GeocodeCoord>(DEFAULT_SEOUL_COORD);
  const [geocodedCoord, setGeocodedCoord] = useState<GeocodeCoord>(DEFAULT_SEOUL_COORD);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);
  const [tileWarning, setTileWarning] = useState<string | null>(null);
  const [copiedNotice, setCopiedNotice] = useState(false);

  const coordRef = useRef(coord);
  coordRef.current = coord;
  const showRadiusRef = useRef(showRadius);
  showRadiusRef.current = showRadius;
  const activeTileModeRef = useRef(activeTileMode);
  activeTileModeRef.current = activeTileMode;
  const geocodeReqIdRef = useRef(0);
  const isFirstGeocodeRef = useRef(true);

  const animateViewToCoord = useCallback(
    (target: GeocodeCoord, engineMode: TileEngineMode, duration = 400) => {
      const map = mapInstanceRef.current;
      if (!map) return;
      const center =
        engineMode === 'ngii'
          ? transform([target.lng, target.lat], 'EPSG:4326', 'EPSG:5179')
          : fromLonLat([target.lng, target.lat]);
      const targetZoom =
        engineMode === 'ngii'
          ? target.precision === 'exact'
            ? 12
            : target.precision === 'road'
            ? 11
            : target.precision === 'dong'
            ? 9
            : 7
          : target.precision === 'exact'
          ? 18
          : target.precision === 'road'
          ? 17
          : target.precision === 'dong'
          ? 15
          : 13;

      map.getView().animate({
        center,
        zoom: targetZoom,
        duration,
      });
    },
    []
  );

  // 1. Load server map API configuration (NGII_API_KEY / VWORLD_API_KEY availability & reachability)
  useEffect(() => {
    let active = true;
    fetch('/api/map/config')
      .then((res) => (res.ok ? res.json() : null))
      .then((json: MapConfigResponse | null) => {
        if (!active || !json) return;
        setMapConfig(json);
        setActiveTileMode(json.tileMode || 'public');
      })
      .catch(() => {
        if (!active) return;
        setActiveTileMode('public');
      });
    return () => {
      active = false;
    };
  }, []);

  // Helper: redraw marker pin + optional 30m & 200m metric radius circles
  const drawMarkerAndRings = useCallback(
    (
      targetCoord: GeocodeCoord,
      engineMode: TileEngineMode,
      radiusVisible: boolean,
      labelText?: string
    ) => {
      const refs = layersRef.current;
      if (!refs) return;

      const projCode = engineMode === 'ngii' ? 'EPSG:5179' : 'EPSG:3857';
      const center =
        projCode === 'EPSG:5179'
          ? transform([targetCoord.lng, targetCoord.lat], 'EPSG:4326', 'EPSG:5179')
          : fromLonLat([targetCoord.lng, targetCoord.lat]);

      // In EPSG:3857, meters are distorted by 1 / cos(lat); EPSG:5179 is true metric TM projection
      const meterScale =
        projCode === 'EPSG:5179'
          ? 1
          : 1 / Math.max(0.2, Math.cos((targetCoord.lat * Math.PI) / 180));

      refs.vectorSource.clear();

      if (radiusVisible) {
        const ring200 = new Feature(new CircleGeom(center, 200 * meterScale));
        ring200.setStyle(
          new Style({
            fill: new Fill({ color: 'rgba(245, 158, 11, 0.06)' }),
            stroke: new Stroke({
              color: 'rgba(217, 119, 6, 0.72)',
              width: 1.5,
              lineDash: [6, 5],
            }),
          })
        );

        const ring30 = new Feature(new CircleGeom(center, 30 * meterScale));
        ring30.setStyle(
          new Style({
            fill: new Fill({ color: 'rgba(16, 185, 129, 0.14)' }),
            stroke: new Stroke({
              color: 'rgba(5, 150, 105, 0.9)',
              width: 2,
            }),
          })
        );
        refs.vectorSource.addFeatures([ring200, ring30]);
      }

      const shortLabel = (labelText || '후보지').slice(0, 18);
      const pinFeature = new Feature(new Point(center));
      pinFeature.setStyle([
        new Style({
          image: new CircleStyle({
            radius: 11,
            fill: new Fill({ color: 'rgba(37, 99, 235, 0.22)' }),
          }),
        }),
        new Style({
          image: new CircleStyle({
            radius: 6.5,
            fill: new Fill({ color: '#2563eb' }),
            stroke: new Stroke({ color: '#ffffff', width: 2.5 }),
          }),
          text: new OLText({
            text: shortLabel,
            offsetY: -18,
            font: '700 11px Pretendard, system-ui, sans-serif',
            fill: new Fill({ color: '#0f172a' }),
            backgroundFill: new Fill({ color: 'rgba(255, 255, 255, 0.94)' }),
            backgroundStroke: new Stroke({ color: 'rgba(37, 99, 235, 0.45)', width: 1 }),
            padding: [3, 6, 2, 6],
          }),
        }),
      ]);

      refs.vectorSource.addFeature(pinFeature);
    },
    []
  );

  // 2. Initialize OpenLayers Map whenever activeTileMode changes
  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container) return;

    setTileWarning(null);
    const projCode = activeTileMode === 'ngii' ? 'EPSG:5179' : 'EPSG:3857';
    let base: TileLayer<XYZ>;
    let aerial: TileLayer<XYZ>;
    let hybridOverlay: TileLayer<XYZ>;

    if (activeTileMode === 'ngii') {
      base = createNgiiLayer('korean_map', layerMode === 'base');
      aerial = createNgiiLayer('satellite_map', layerMode === 'aerial' || layerMode === 'hybrid');
      hybridOverlay = createNgiiLayer('hybrid_map', layerMode === 'hybrid');

      let errorCount = 0;
      const handleTileErr = () => {
        errorCount += 1;
        if (errorCount >= 3) {
          setActiveTileMode('public');
          setTileWarning(
            '국토지리정보원 타일 서버 응답이 제한되어 표준 배경·위성지도로 자동 전환되었습니다.'
          );
        }
      };
      base.getSource()?.on('tileloaderror', handleTileErr);
      aerial.getSource()?.on('tileloaderror', handleTileErr);
    } else if (activeTileMode === 'vworld') {
      base = createVworldLayer('Base', layerMode === 'base');
      aerial = createVworldLayer('Satellite', layerMode === 'aerial' || layerMode === 'hybrid');
      hybridOverlay = createVworldLayer('Hybrid', layerMode === 'hybrid');

      let errorCount = 0;
      const handleTileErr = () => {
        errorCount += 1;
        if (errorCount >= 3) {
          setActiveTileMode('public');
          setTileWarning(
            'VWorld 타일 서버 응답이 제한되어 표준 배경·위성지도로 자동 전환되었습니다.'
          );
        }
      };
      base.getSource()?.on('tileloaderror', handleTileErr);
      aerial.getSource()?.on('tileloaderror', handleTileErr);
    } else {
      const pub = createPublicLayers(layerMode);
      base = pub.baseLayer;
      aerial = pub.aerialLayer;
      hybridOverlay = pub.hybridLabelLayer;
    }

    const vectorSource = new VectorSource();
    const vectorLayer = new VectorLayer({
      source: vectorSource,
      zIndex: 10,
    });

    const cur = coordRef.current;
    const initCenter =
      projCode === 'EPSG:5179'
        ? transform([cur.lng, cur.lat], 'EPSG:4326', 'EPSG:5179')
        : fromLonLat([cur.lng, cur.lat]);

    const initZoom =
      projCode === 'EPSG:5179'
        ? cur.precision === 'exact'
          ? 12
          : cur.precision === 'road'
          ? 11
          : 9
        : cur.precision === 'exact'
        ? 18
        : cur.precision === 'road'
        ? 17
        : 15;

    const view =
      projCode === 'EPSG:5179'
        ? new View({
            projection: 'EPSG:5179',
            center: initCenter,
            resolutions: NGII_RESOLUTIONS,
            zoom: initZoom,
            minZoom: 0,
            maxZoom: NGII_RESOLUTIONS.length - 1,
          })
        : new View({
            projection: 'EPSG:3857',
            center: initCenter,
            zoom: initZoom,
            minZoom: 6,
            maxZoom: 19,
          });

    const map = new OLMap({
      target: container,
      layers: [base, aerial, hybridOverlay, vectorLayer],
      view,
      controls: [],
    });

    map.on('singleclick', (evt) => {
      const lonLat =
        projCode === 'EPSG:5179'
          ? transform(evt.coordinate, 'EPSG:5179', 'EPSG:4326')
          : toLonLat(evt.coordinate);
      const nextCoord: GeocodeCoord = {
        lat: Number(lonLat[1].toFixed(6)),
        lng: Number(lonLat[0].toFixed(6)),
        matchedQuery: '지도 클릭으로 수동 지정된 위치',
        precision: 'manual',
        source: '지도 핀 미세조정',
      };
      setCoord(nextCoord);
    });

    mapInstanceRef.current = map;
    layersRef.current = { base, aerial, hybridOverlay, vectorSource };
    drawMarkerAndRings(cur, activeTileMode, showRadiusRef.current, candidateName || buildingName);

    const resizeObserver = new ResizeObserver(() => {
      map.updateSize();
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      map.setTarget(undefined);
      mapInstanceRef.current = null;
      layersRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTileMode]);

  // 3. Toggle visibility between 배경지도 / 영상지도 / 하이브리드 without remounting map
  useEffect(() => {
    const refs = layersRef.current;
    if (!refs) return;
    refs.base.setVisible(layerMode === 'base');
    refs.aerial.setVisible(layerMode === 'aerial' || layerMode === 'hybrid');
    refs.hybridOverlay.setVisible(layerMode === 'hybrid');
  }, [layerMode]);

  // 4. Redraw marker & rings when coord, showRadius, or label changes
  useEffect(() => {
    drawMarkerAndRings(coord, activeTileMode, showRadius, candidateName || buildingName);
  }, [coord, activeTileMode, showRadius, candidateName, buildingName, drawMarkerAndRings]);

  // 5. Geocode address whenever address / jibun / buildingName changes (with direct ArcGIS CORS fallback)
  const runGeocode = useCallback(
    async (targetAddr: string, targetJibun?: string, targetBuilding?: string) => {
      if (!targetAddr.trim() && !(targetJibun || '').trim()) return;
      const reqId = ++geocodeReqIdRef.current;
      setIsGeocoding(true);
      setGeocodeError(null);

      let resolved: GeocodeCoord | null = null;
      let serverErrMsg: string | null = null;

      try {
        const res = await fetch('/api/map/geocode', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            address: targetAddr,
            jibunAddress: targetJibun || '',
            buildingName: targetBuilding || '',
          }),
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success && typeof json.lat === 'number' && typeof json.lng === 'number') {
            resolved = {
              lat: json.lat,
              lng: json.lng,
              matchedQuery: json.matchedQuery || targetAddr,
              precision: json.precision || 'road',
              source: json.source || '좌표 변환',
            };
          } else if (json.error) {
            serverErrMsg = json.error;
          }
        }
      } catch {
        // Fallback to direct browser ArcGIS geocoder below
      }

      if (!resolved) {
        resolved = await geocodeDirectlyViaArcGis(targetAddr, targetJibun);
      }

      if (reqId !== geocodeReqIdRef.current) return;

      if (resolved) {
        setCoord(resolved);
        setGeocodedCoord(resolved);
        setGeocodeError(null);
        animateViewToCoord(resolved, activeTileModeRef.current, 420);
      } else {
        setGeocodeError(
          serverErrMsg || '입력된 주소의 좌표를 찾지 못했습니다. 지도에서 직접 클릭해 위치를 지정해주세요.'
        );
      }
      setIsGeocoding(false);
    },
    [animateViewToCoord]
  );

  useEffect(() => {
    const cleanAddr = (address || '').trim();
    if (!cleanAddr) return;
    const delay = isFirstGeocodeRef.current ? 0 : 350;
    isFirstGeocodeRef.current = false;
    const timer = setTimeout(() => {
      runGeocode(cleanAddr, jibunAddress, buildingName);
    }, delay);
    return () => clearTimeout(timer);
  }, [address, jibunAddress, buildingName, runGeocode]);

  const handleZoom = (delta: number) => {
    const view = mapInstanceRef.current?.getView();
    if (!view) return;
    const currentZoom = view.getZoom() ?? 15;
    view.animate({ zoom: currentZoom + delta, duration: 200 });
  };

  const handleRecenter = (target = coord) => {
    const view = mapInstanceRef.current?.getView();
    if (!view) return;
    const center =
      activeTileMode === 'ngii'
        ? transform([target.lng, target.lat], 'EPSG:4326', 'EPSG:5179')
        : fromLonLat([target.lng, target.lat]);
    view.animate({ center, duration: 300 });
  };

  const handleResetManualPin = () => {
    setCoord(geocodedCoord);
    handleRecenter(geocodedCoord);
  };

  const handleOpenNgiiPortal = () => {
    if (address) {
      copyTextToClipboard(address);
      setCopiedNotice(true);
      setTimeout(() => setCopiedNotice(false), 3000);
    }
  };

  // Compute EPSG:5179 TM metric coordinates for GIS reference readout
  const tmCoords = transform([coord.lng, coord.lat], 'EPSG:4326', 'EPSG:5179');
  const precisionBadge =
    coord.precision === 'exact'
      ? { label: '지번·건물 정밀매칭', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
      : coord.precision === 'manual'
      ? { label: '지도 클릭 수동지정', cls: 'bg-blue-50 text-blue-700 border-blue-200' }
      : coord.precision === 'road'
      ? { label: '도로명 기준 위치', cls: 'bg-sky-50 text-sky-700 border-sky-200' }
      : { label: '행정구역 중심 (클릭해 미세조정)', cls: 'bg-amber-50 text-amber-800 border-amber-200' };

  return (
    <div className="h-full flex flex-col rounded-2xl border border-slate-200 bg-slate-50/70 overflow-hidden shadow-2xs">
      {/* Top Map Header & Layer Switcher */}
      <div className="px-3.5 py-2.5 bg-white border-b border-slate-200 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <MapPin className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <span className="text-xs font-extrabold text-slate-900 truncate">
              후보지 위치 지도 (영상·배경지도)
            </span>
          </div>

          {/* 배경지도 / 영상지도 / 하이브리드 segmented toggle */}
          <div className="inline-flex items-center rounded-lg bg-slate-100 p-0.5 border border-slate-200 text-[11px] font-bold">
            <button
              type="button"
              onClick={() => setLayerMode('base')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                layerMode === 'base'
                  ? 'bg-white text-blue-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MapIcon className="w-3 h-3" />
              배경지도
            </button>
            <button
              type="button"
              onClick={() => setLayerMode('aerial')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                layerMode === 'aerial'
                  ? 'bg-white text-emerald-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Satellite className="w-3 h-3" />
              영상지도
            </button>
            <button
              type="button"
              onClick={() => setLayerMode('hybrid')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                layerMode === 'hybrid'
                  ? 'bg-white text-indigo-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3 h-3" />
              하이브리드
            </button>
          </div>
        </div>

        {/* Sub-row: Precision badge, 30m/200m radius toggle, NGII Portal link */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className={`px-2 py-0.5 rounded border font-bold text-[10px] ${precisionBadge.cls}`}>
              {precisionBadge.label}
            </span>
            {isGeocoding && (
              <span className="inline-flex items-center gap-1 text-blue-600 font-semibold text-[10px]">
                <Loader2 className="w-3 h-3 animate-spin" />
                위치 탐색 중...
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShowRadius((prev) => !prev)}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-bold transition-colors cursor-pointer ${
                showRadius
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-white text-slate-500 border-slate-200 hover:text-slate-700'
              }`}
              title="30m 인근 임대비교 반경 및 200m 교육환경보호구역 참고 반경 표시"
            >
              <Radar className="w-3 h-3" />
              30m·200m 반경
            </button>

            <a
              href="https://map.ngii.go.kr/ms/map/NlipMap.do"
              target="_blank"
              rel="noopener noreferrer"
              referrerPolicy="no-referrer"
              onClick={handleOpenNgiiPortal}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 text-[10px] font-bold transition-colors"
            >
              바로e맵
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
        </div>
      </div>

      {/* Main Interactive Map Canvas */}
      <div className="relative flex-1 min-h-[380px] lg:min-h-[470px] w-full bg-slate-200">
        <div ref={mapContainerRef} className="absolute inset-0 w-full h-full cursor-crosshair" />

        {/* Top-left floating address badge */}
        {address && (
          <div className="absolute top-2.5 left-2.5 right-14 z-10 pointer-events-none">
            <div className="inline-flex items-center gap-1.5 max-w-full px-2.5 py-1.5 rounded-lg bg-white/92 backdrop-blur-xs border border-slate-200/90 shadow-xs text-[11px] text-slate-800">
              <span className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0" />
              <span className="font-bold truncate">{address}</span>
            </div>
          </div>
        )}

        {/* Right Floating Zoom & Pin Controls */}
        <div className="absolute top-2.5 right-2.5 z-10 flex flex-col gap-1.5">
          <div className="flex flex-col rounded-xl bg-white/95 border border-slate-200 shadow-sm overflow-hidden">
            <button
              type="button"
              onClick={() => handleZoom(1)}
              aria-label="지도 확대"
              className="p-2 text-slate-700 hover:bg-slate-100 border-b border-slate-200 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleZoom(-1)}
              aria-label="지도 축소"
              className="p-2 text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => handleRecenter()}
            title="후보지 핀으로 이동"
            aria-label="후보지 핀으로 이동"
            className="p-2 rounded-xl bg-white/95 hover:bg-blue-50 text-blue-700 border border-slate-200 shadow-sm transition-colors cursor-pointer"
          >
            <Crosshair className="w-3.5 h-3.5" />
          </button>

          {coord.precision === 'manual' && (
            <button
              type="button"
              onClick={handleResetManualPin}
              title="주소 검색 좌표로 복원"
              aria-label="주소 검색 좌표로 복원"
              className="p-2 rounded-xl bg-white/95 hover:bg-amber-50 text-amber-700 border border-amber-200 shadow-sm transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Bottom-left Legend for 30m & 200m Radius */}
        {showRadius && (
          <div className="absolute bottom-2.5 left-2.5 z-10 flex items-center gap-2.5 px-2.5 py-1 rounded-lg bg-white/90 backdrop-blur-xs border border-slate-200/90 text-[10px] font-semibold text-slate-700 shadow-2xs pointer-events-none">
            <span className="inline-flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full border-2 border-emerald-600 bg-emerald-500/20" />
              30m 인근 시세
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full border border-dashed border-amber-600 bg-amber-400/15" />
              200m 학교보호구역 참고
            </span>
          </div>
        )}
      </div>

      {/* Map Footer: Coordinates, API Provider Status & Click-to-Adjust Tip */}
      <div className="px-3.5 py-2.5 bg-white border-t border-slate-200 space-y-1.5 text-[11px]">
        {copiedNotice && (
          <div className="flex items-center gap-1 text-emerald-700 font-bold text-[10px]">
            <CheckCircle2 className="w-3 h-3" />
            후보지 주소가 복사되었습니다. 열린 국토정보플랫폼(바로e맵)에 붙여넣어 확인하세요.
          </div>
        )}

        {geocodeError && (
          <div className="flex items-center gap-1 text-amber-700 font-semibold text-[10px]">
            <AlertCircle className="w-3 h-3 flex-shrink-0" />
            <span>{geocodeError}</span>
          </div>
        )}

        {tileWarning && (
          <div className="flex items-center gap-1 text-slate-500 text-[10px]">
            <AlertCircle className="w-3 h-3 flex-shrink-0 text-slate-400" />
            <span>{tileWarning}</span>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-1.5 text-[10px] text-slate-600">
          <span className="font-mono">
            WGS84 {coord.lat.toFixed(5)}, {coord.lng.toFixed(5)} · TM(5179) {Math.round(tmCoords[0]).toLocaleString()},{' '}
            {Math.round(tmCoords[1]).toLocaleString()}
          </span>
          <span className="text-slate-500">지도 클릭 시 핀 위치 미세조정</span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1 border-t border-slate-100 text-[10px]">
          <span className="font-bold text-slate-700">
            {activeTileMode === 'ngii'
              ? '국토교통부 국토지리정보원 영상·배경지도 WMTS 연동 중'
              : activeTileMode === 'vworld'
              ? '국토교통부 VWorld 영상·배경지도 WMTS 연동 중'
              : '배경·영상지도 정상 표시 중'}
          </span>
          {activeTileMode === 'ngii' ? (
            <span className="text-emerald-700 font-bold">EPSG:5179 공식 타일</span>
          ) : activeTileMode === 'vworld' ? (
            <span className="text-emerald-700 font-bold">VWorld 공식 타일</span>
          ) : mapConfig?.ngiiConfigured || mapConfig?.vworldConfigured ? (
            <span className="text-slate-500">
              외부 서버 IP 제한으로 표준 타일 자동 연동 · 바로e맵 원문 확인 가능
            </span>
          ) : (
            <span className="text-slate-400">
              NGII_API_KEY 등록 시 국토지리정보원 WMTS 연동
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
