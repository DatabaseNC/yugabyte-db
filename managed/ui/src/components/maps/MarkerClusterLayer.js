// Copyright (c) YugaByte, Inc.

import Leaflet from 'leaflet';
import { Media } from 'react-bootstrap';
import { Link } from 'react-router';
import { MapLayer } from 'react-leaflet';
require('leaflet.markercluster');
import 'leaflet.markercluster/dist/MarkerCluster.css';
import { isValidArray, isValidObject, sortByLengthOfArrayProperty } from '../../utils/ObjectUtils';
import React, { Component } from 'react';
import './stylesheets/MarkerClusterLayer.scss'
import ReactDOMServer from 'react-dom/server';
import {DescriptionList} from '../common/descriptors';

class MarkerDetail extends Component {
  render() {
    const {markerDetail} = this.props;
    if (!isValidObject(markerDetail)) {
      return <span/>;
    }

    var markerListItems = [{"name": "provider","data": markerDetail.provider.name},
                           {"name": "region", "data": markerDetail.name}];
    if (isValidArray(markerDetail.universes)) {
      var universeDetailItem = markerDetail.universes.map(function(universeItem, universeIdx){
        return {"name": universeItem.name}
      })
      markerListItems.push({"name": "universes", "data": universeDetailItem})
    }

    let universeCount = 0;
    let markerDetailUniverseLinks = null;
    if (isValidArray(markerDetail.universes)) {
      universeCount = markerDetail.universes.length;
      if (universeCount) {
        markerDetailUniverseLinks = markerDetail.universes.map(function(universe, index) {
          return <Link key={index} to={"/universes/" + universe.universeUUID}>{universe.name}</Link>;
        })
      }
    }

    return (
      <Media className="marker-detail">
        <Media.Left>
          {universeCount ?
            <div className="marker-cluster-small">{markerDetail.universes.length}</div> :
            <div className="marker-cluster-small marker-cluster-outline">&nbsp;</div>
          }
        </Media.Left>
        <Media.Body>
          {universeCount ? <div className="marker-universe-names">{markerDetailUniverseLinks}</div> : ''}
          <div className="marker-region-name">{markerDetail.name}</div>
          <div className="marker-provider-name">{markerDetail.provider.name}</div>
        </Media.Body>
      </Media>
    );
  }
}

export default class MarkerClusterLayer extends MapLayer {
  componentWillMount() {
    super.componentWillMount();
    this.leafletElement = Leaflet.markerClusterGroup({
      zoomToBoundsOnClick: false,
      spiderfyOnMaxZoom: false,
      singleMarkerMode: true,
      disableClusteringAtZoom: 3,
      maxClusterRadius: 20,

      iconCreateFunction: function (cluster) {
        let markers = cluster.getAllChildMarkers();
        let universeCount = 0;
        markers.forEach(function (marker) {
          if (marker.ybData.universes) {
            universeCount += marker.ybData.universes.length;
          }
        });
        let clusterIconData = universeCount ?
          {className: 'marker-cluster-small', html: universeCount.toString()} :
          {className: 'marker-cluster-small marker-cluster-outline', html: '&nbsp;'}
        return new Leaflet.DivIcon(clusterIconData);
      },
    });
  }

  componentWillReceiveProps(nextProps) {
    var self = this;
    this.leafletElement.clearLayers();
    const {newMarkerData} = this.props;
    if (newMarkerData.length > 0) {
      let newMarkers = [];
      sortByLengthOfArrayProperty(newMarkerData, 'universes').forEach((obj) => {
        var popupDetail = ReactDOMServer.renderToString(<MarkerDetail markerDetail={obj}/>);
        var latLng = Leaflet.latLng(obj.latitude, obj.longitude);
        let leafletMarker = new Leaflet.Marker(latLng)
          .bindPopup(popupDetail, {maxHeight: 100, maxWidth: 300, minWidth: 100});
        leafletMarker.ybData = obj;
        newMarkers.push(leafletMarker);
      });

      this.leafletElement.addLayers(newMarkers);
    }
    self.leafletElement.on('clusterclick', function(a) {
      var clusterMarker = "";
      a.layer.getAllChildMarkers().forEach(function(markerItem, markerIndex) {
        clusterMarker += `${ReactDOMServer.renderToString(<MarkerDetail markerDetail={markerItem._popup._source.ybData}/>)}`;
      });
      var marker = a.layer.getAllChildMarkers()[0];
      var cluster = a.target.getVisibleParent(marker);
      cluster.bindPopup(clusterMarker, {minWidth: 100}).openPopup();
    });
  }

  shouldComponentUpdate() {
    return false;
  }

  render() {
    return null;
  }
}
