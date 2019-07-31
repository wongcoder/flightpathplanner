import 'ol/ol.css'
import './App.css'

import React, { Component } from 'react'

import TileLayer from 'ol/layer/Tile'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import OSM from 'ol/source/OSM'
import Feature from 'ol/Feature'
import Point from 'ol/geom/Point'
import { Map, View } from 'ol'
import { fromLonLat } from 'ol/proj'
import {Circle as CircleStyle, Icon, Style, Fill, Stroke} from 'ol/style.js';

import { Typography, Select, FormControl, InputLabel, MenuItem, Button } from '@material-ui/core'
import { MuiPickersUtilsProvider, KeyboardDatePicker } from '@material-ui/pickers'
import format from'date-fns/format'
import DateFnsUtils from '@date-io/date-fns';
import { toStringHDMS } from 'ol/coordinate';

const servername = 'http://34.94.21.176:3000'     // Global const for servername.

class App extends Component {
  // initial state
  state = {
    waypoints: [],
    planes: [],
    selectedPlane: 'null',
    maintenanceDate: new Date(),
    selectedAirport: 'null',
    currentWeather: 'null'
  }

  vectorSource = new VectorSource({
    features: [],
    wrapX: false
  })

  vectorLayer = new VectorLayer({
    source: this.vectorSource,
  })
  

  map = new Map({
    layers: [
      new TileLayer({
        source: new OSM()
      }),
      this.vectorLayer,
    ],
    view: new View({
      center: fromLonLat([-98.5795,38]),
      zoom: 5
    })
  })

  // Default React Lifecycle function (refer in React documentation)
  componentDidMount() {
    this.map.setTarget('map')
    this.map.on('click', this.showWeather.bind(this))
    this.map.renderSync()
    this.fetchData()
  }
  
  // Gets all data from backend in one go (asynchronous). Read about promises if confused.
  fetchData() {
    fetch(`${servername}/getallplanes`)
    .then(res => res.json())
    .then(data => {
      console.log(data)
      this.setState({planes: data})
    })
    fetch(`${servername}/getallcoords`)
    .then(res => res.json())
    .then(data => {
      this.setState({waypoints: data}, () => this.addFeatures())
    })
  }

  // Helper function to add features into openlayers.
  addFeatures() {
    this.state.waypoints.forEach(waypoint => {
      let longitude = parseFloat(waypoint.lonlat[0])
      let latitude = parseFloat(waypoint.lonlat[1])
      this.vectorLayer.getSource().addFeature(new Feature({
        geometry: new Point(fromLonLat([longitude,latitude])),
        information: waypoint.airport,
      }))
    })
  }

  // Adds a <MenuItem> object. Helper function called by map().
  addPlane(plane, index) {
    return <MenuItem value={index}>{plane.name}</MenuItem>
  }

  // Handles change. Read up on event listeners. Looks for event target (based on id), 
  // then sets value based on new value.
  handleChange(event) {
    console.log(event.target.name)
    this.setState({
      [event.target.name]: event.target.value,
    })
  }

  // Fetch request to get weather
  getWeather(lonlat) {
    console.log(`${servername}/getweatherbycity/${lonlat[0]}/${lonlat[1]}`)
    fetch(`${servername}/getweatherbycity/${lonlat[0]}/${lonlat[1]}`)
    .then(res => {
      console.log(res)
      return res.json()
    })
    .then(data => {
      console.log(data)
      this.setState({currentWeather: data})
    })
  }

  // Event listener that waits for an 'onClick' event from OpenLayers.
  showWeather(event) {
    let features = this.map.getFeaturesAtPixel(event.pixel)
    if(!features) return 
    let properties = features[0].getProperties()
    console.log(properties)
    this.setState({selectedAirport: properties.information})
    this.state.waypoints.forEach(waypoint => {
      if(waypoint.airport === properties.information) {
        this.getWeather.bind(this)
        this.getWeather(waypoint.lonlat)
      }
    })
  }

  // Helper function called by map to output maintenance records in typography.
  outputMaintenanceRecords(date) {
    return <Typography variant='subtitle2'>{date}</Typography>
  }

  // Handler for onClick event from 'submit maintenance' button.
  submitMaintenance() {
    if(this.state.selectedPlane =='null' ) {
      alert('Select a plane in Aircraft Info FIRST.')
      return
    }
    const data = {
      name: this.state.planes[this.state.selectedPlane].name,
      date: format(this.state.maintenanceDate, 'MMMM d yyyy') 
    }

    fetch(`${servername}/updateplane`, {
      method: 'POST',
      body: JSON.stringify(data),
      headers: {
        'Content-Type': 'application/json'
      },
    }).then(()=>this.fetchData())
  }

  // React Lifecycle method. Read up on React if confused.
  render() {
    return (
      <div className="App">
        <div className="left-side">
          <div id="flightPlan">
            <Typography variant="h6">Flight Plan</Typography>
            <Typography variant="body1">Airport:</Typography>
            <Typography variant='subtitle2'>{(this.state.selectedAirport != 'null') }</Typography>
            <Typography variant='body1'>Current Weather:</Typography>
            <Typography variant='subtitle2'>{(this.state.currentWeather != 'null') ? this.state.currentWeather.description : 'No airport selected.'}</Typography>
            <Typography variant='body1'>Wind Speed:</Typography>
            <Typography variant='subtitle2'>{(this.state.currentWeather != 'null') ? this.state.currentWeather['wind-speed'] : 'No airport selected.'}</Typography>
            <Typography variant='body1'>Wind Degrees:</Typography>
            <Typography variant='subtitle2'>{(this.state.currentWeather != 'null') ? this.state.currentWeather['wind-degrees']: 'No airport selected.'}</Typography>
          </div>
          <div id="AircraftInfo">
            <Typography variant="h6">Aircraft Info</Typography>
            <Typography variant="body1">Basic Aircraft Information</Typography>
            <FormControl>
              <InputLabel htmlFor='plane'>Plane</InputLabel>  
              <Select
                value={this.state.selectedPlane}
                onChange={this.handleChange.bind(this)}
                inputProps={{
                  name: 'selectedPlane',
                  id: 'plane'
                }}
                >
                  {this.state.planes.map((plane, index) => this.addPlane(plane, index))}
                </Select> 
            </FormControl>

            <Typography variant="subtitle1" >Tail: </Typography>
            <Typography variant="subtitle2">{ (this.state.selectedPlane !== 'null') ? this.state.planes[this.state.selectedPlane].tail : 'Select a plane.' } </Typography>
            <Typography variant="body1">Maintenance Records:</Typography>
            {(this.state.selectedPlane != 'null') ? this.state.planes[this.state.selectedPlane].date.map(date => this.outputMaintenanceRecords(date)) : <Typography variant='subtitle2'>Select a plane.</Typography>}
            <Typography variant='subtitle1'>Condition:</Typography>
            <Typography variant='subtitle2'>{ (this.state.selectedPlane !== 'null') ? this.state.planes[this.state.selectedPlane].condition : 'Select a plane.' } </Typography>
            <div className='maintenance'>
              <Typography variant='body1'>Add Maintenance Record</Typography>
              <MuiPickersUtilsProvider utils={DateFnsUtils}>
                <KeyboardDatePicker
                  id="maintenanceDate"
                  margin="normal"
                  label="Maintenance Date"
                  value={this.state.maintenanceDate}
                  onChange={(date)=>this.setState({maintenanceDate: date})}
                  KeyboardButtonProps={{
                    'aria-label': 'change date',
                  }}
                />
              </MuiPickersUtilsProvider>

              <Button variant="contained" color="primary" onClick={() => this.submitMaintenance()}>SUBMIT MAINTENANCE</Button>
            </div>
          </div>
        </div>
        <div id="map" className="right-side"></div>
      </div>
    )
  }
}

export default App

// Written by Matthew Wong 
// github.com/wongcoder