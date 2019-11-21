/*
 * lh@metgs.com
 */
import 'ol/ol.css';
import '@/assets/css/islandSovereignty.css';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import WMTS from 'ol/source/WMTS';
import WMTSTileGrid from 'ol/tilegrid/WMTS';
import XYZ from 'ol/source/XYZ';
import GeoJSON from 'ol/format/GeoJSON';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Overlay from 'ol/Overlay';
import { fromLonLat, get, transformExtent } from 'ol/proj';
import { getTopLeft } from 'ol/extent';
import { Stroke, Style, Icon, Text } from 'ol/style';
import { defaults as defaultControls } from 'ol/control';
import { defaults as defaultInteractions } from 'ol/interaction';
import islands from '@/assets/js/island';


/**
  const map = new MMap('map', {
    center: [125.1, 29.26],
    extent: [115.0354, 26.1082, 130.5545, 32.5516],
    zoom: 7,
    minZoom: 2,
    maxZoom: 9
  });
  map.addLayer(layer);
*/

export default class MMap {

  constructor(el, viewConfig) {
    this.showPrefecture = viewConfig.zoom >= 7;
    this.initMap(el, viewConfig);
    this.renderBaseLayer();
    this.renderCityNameLayer();
    this.renderZJPrefectureLayer();
    this.onChangeResolution();
    this.renderIslands();
  }

  // 地图初始化
  initMap(el, viewConfig) {
    const { center, extent } = viewConfig;
    Object.assign(viewConfig, {
      center: fromLonLat(center),
      extent: transformExtent(extent, 'EPSG:4326', 'EPSG:3857'),
    });
    this.map = new Map({
      target: el,
      controls: defaultControls({zoom: false}), // hide zoom button
      view: new View(viewConfig),
      interactions: defaultInteractions({
        doubleClickZoom: false,
      }),
    });
  }

  // 地图切片
  renderBaseLayer(url = 'http://www.zjocean.org.cn/tiles/{z}/{x}/{y}.png') {
    const baseLayer =  new TileLayer({
      clickable: true,
      source: new XYZ({
        url,
      })
    });
    this.map.addLayer(baseLayer);
  }

  // 省会城市名字图层
  renderCityNameLayer(url = 'http://www.zjocean.org.cn/json/cityname.json') {
    function seStyle(feature) {
      const name = feature.get('NAME');
      return new Style({
              text: new Text({
                text: name,
                offsetY: 12,
                stroke: new Stroke({
                  color: '#fff',
                  width: 2,
                }),
                font: '10px Microsoft Yahei'
              }),
              image: new Icon({
                src: '/images/map/shenghui.png',
                scale: 0.5
              })
            });
    }
    this.cityNameLayer = new VectorLayer({
      source: new VectorSource({
        url,
        format: new GeoJSON(),
      }),
      style: seStyle,
      zIndex: 999,
    });
    this.map.addLayer(this.cityNameLayer);
  }

  // 浙江省地级市名字图层
  renderZJPrefectureLayer(url = 'http://www.zjocean.org.cn/json/zjprefecture.json') {
    function setStyle(feature) {
      const name = feature.get('name');
      return new Style({
              text: new Text({
                text: name,
                offsetY: -12,
                stroke: new Stroke({
                  color: '#fff',
                  width: 2,
                }),
                font: '10px Microsoft Yahei'
              }),
              image: new Icon({
                src: '/images/map/dijishi.png',
                scale: 0.5,
                offsetY: -1,
              })
            });
    }
    this.prefectureLayer = new VectorLayer({
      source: new VectorSource({
        url,
        format: new GeoJSON(),
      }),
      style: setStyle,
      zIndex: 999,
      visible: this.showPrefecture
    });
    this.map.addLayer(this.prefectureLayer);
  }

  // 主权岛屿
  renderIslands() {
    for (let i = 0; i < islands.length; i++) {
      const island = islands[i];
      const {id, showName, map } = island;
      const coordinate = map.split(',').reverse().map(v => parseFloat(v, 10));
      const dom = document.createElement('div');
      dom.innerHTML = `
        <img src="/images/map/sovereignty.png">
        <div class="name">${showName}</div>
      `;
      dom.setAttribute('id', id);
      dom.setAttribute('class', 'island-sovereignty');
      const popup = new Overlay({
        element: dom,
      });
      popup.setPosition(fromLonLat(coordinate));
      this.map.addOverlay(popup);
    }
  }

  // 近海预报渔场名字图层
  renderNearSeaNameLayer() {
    const json = {
      'type': 'FeatureCollection',
      'crs': {
        'type': 'name',
        'properties': {
          'name': 'CRS:84'
        }
      },
      'features': [
        {
          'type': 'Feature',
          'geometry': {
            'type': 'Point',
            'coordinates': [
              121.5, 30.6
            ]
          },
          'properties': {
            'NAME': '杭州湾海域',
          }
        }, {
          'type': 'Feature',
          'geometry': {
            'type': 'Point',
            'coordinates': [
              123, 27.7
            ]
          },
          'properties': {
            'NAME': '浙南海域',
          }
        }, {
          'type': 'Feature',
          'geometry': {
            'type': 'Point',
            'coordinates': [
              123.5, 30.3
            ]
          },
          'properties': {
            'NAME': '浙北海域',
          }
        }, {
          'type': 'Feature',
          'geometry': {
            'type': 'Point',
            'coordinates': [
              123.4, 28.6
            ]
          },
          'properties': {
            'NAME': '浙中海域',
          }
        }
      ]
    };

    function setStyle(feature) {
      const name = feature.get('NAME');
      return new Style({
              text: new Text({
                text: name,
                font: '14px Microsoft Yahei',
                offsetY: 12,
                stroke: new Stroke({
                  color: '#fff',
                  width: 2,
                })
              })
            });
    }
    const layer = new VectorLayer({
      source: new VectorSource({
        features: new GeoJSON().readFeatures(json, {
          featureProjection: 'EPSG:3857'
        })
      }),
      zIndex: 4,
      style: setStyle
    });
    this.map.addLayer(layer);
  }

  // 处理地图缩放事件
  onChangeResolution() {
    this.map.getView().on('change:resolution', () => {
      const zoom = this.map.getView().getZoom();
      if (zoom % 1 === 0) {
        if (zoom < 7) {
          this.prefectureLayer.setVisible(false);
        } else {
          this.prefectureLayer.setVisible(true);
        }
        if (zoom < 5) {
          this.cityNameLayer.setVisible(false);
        } else {
          this.cityNameLayer.setVisible(true);
        }
      }
    })
  }

  // 处理地图缩放事件
  handleChangeResolution(func) {
    this.map.getView().on('change:resolution', func);
  }

  // 处理鼠标移动事件
  handlePointerMove(func) {
    this.map.on('pointermove', func);
  }

  // 处理鼠标点击事件
  handleMapClick(func) {
    this.map.on('click', func);
  }

  // 增加VectorLayer
  addLayer(layer) {
    this.map.addLayer(layer);
  }

  // 增加Overlay
  addOverlay(overlay) {
    this.map.addOverlay(overlay);
  }

  // 返回view
  getView() {
    return this.map.getView();
  }
}
