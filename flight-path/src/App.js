import React, { Component } from 'react'
import logo from './logo.svg'
import { Map, View } from 'ol'
import TileLayer from 'ol/layer/Tile'
import { Vector as VectorLayer } from 'ol/layer'
import VectorSource from 'ol/source/Vector'
import OSM from 'ol/source/OSM'
import Feature from 'ol/Feature'
import Point from 'ol/geom/Point'
import { fromLonLat } from 'ol/proj'
import { Typography, Select, FormControl, InputLabel, MenuItem, Button } from '@material-ui/core'
import './App.css'
import { MuiPickersUtilsProvider, KeyboardDatePicker } from '@material-ui/pickers'
import format from'date-fns/format'
import DateFnsUtils from '@date-io/date-fns';

const servername = 'http://34.94.21.176:3000'
class App extends Component {
  // initial state
  state = {
    waypoints: [],
    planes: [],
    selectedPlane: 'null',
    maintenanceDate: new Date()
  }

  map = new Map({
    layers: [
      new TileLayer({
        source: new OSM()
      }),
      this.vectorLayer
    ],
    view: new View({
      center: fromLonLat([-98.5795,38]),
      zoom: 5
    })
  })

  vectorLayer = new VectorLayer({
    source: this.vectorSource,
    renderBuffer: 200
  })

  vectorSource = new VectorSource({
    features: this.state.waypoints
  })

  componentDidMount() {
    this.map.setTarget('map')
    this.fetchData()
    this.map.renderSync()
    this.map.on('click', this.showWeather.bind(this))
  }
  
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

  addFeatures() {
    this.state.waypoints.forEach(waypoint => {
      this.vectorSource.addFeature(new Feature({
        information: waypoint.airport,
        geometry: new Point(fromLonLat(waypoint.lonlat))
      }))
      console.log(this.vectorSource.getFeatures())
      console.log(this.vectorLayer.getSource())
    })
  }

  addPlane(plane, index) {
    return <MenuItem value={index}>{plane.name}</MenuItem>
  }

  handleChange(event) {
    console.log(event.target.name)
    this.setState({
      [event.target.name]: event.target.value,
    })
  }

  showWeather(event) {
    let features = this.map.getFeaturesAtPixel(event.pixel)
  }

  outputMaintenanceRecords(date) {
    return <Typography variant='subtitle2'>{date}</Typography>
  }

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

  render() {
    return (
      <div className="App">
        <div className="left-side">
          <div id="flightPlan">
            <Typography variant="h6">Flight Plan</Typography>
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
