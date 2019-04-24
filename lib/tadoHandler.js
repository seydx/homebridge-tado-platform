'use strict';

const debug = require('debug')('TadoPlatform');
const timeout = ms => new Promise(res => setTimeout(res, ms));

class tadoHandler {
  constructor (platform) {

    this.platform = platform;
    this.log = platform.log;
    this.logger = platform.logger;
    this.debug = debug;
    this.api = platform.api;
    this.config = platform.config;
    this.accessories = platform.accessories;
    
    this.tado = platform.tado;
    
    this.dnsError = 0;
    
    this.refreshDevices();
        
    if(this.config.weather || this.config.solarIntensity) 
      this.refreshWeather();

  }
  
  async refreshDevices() {
  
    try {
    
      let zones = [];
      let deviceArray = [];
     
      let homeZones = await this.tado.getZones(this.config.homeID);

      for(const zone of homeZones){
      
        for(const device of zone.devices){
        
          let deviceType = device.deviceType.replace(/[0-9]/g, '');
          
          if(zone.type === 'HOT_WATER'){
          
            let canSetTemperature = await this.tado.getZoneCapabilities(this.config.homeID, zone.id);
          
            if(zone.deviceTypes.length > 1){
            
              if(deviceType === 'BU')
                deviceArray.push({
                  name: zone.name + ' ' + device.serialNo,
                  zoneID: zone.id,
                  zoneName: zone.name,
                  zoneType: zone.type,
                  deviceType: deviceType,
                  serial: device.serialNo + '-' + zone.id,
                  batteryState: device.batteryState ? device.batteryState : 'NORMAL',
                  type: canSetTemperature.canSetTemperature ? 'thermostat' : 'boiler'
                });
            
            } else {
              
              deviceArray.push({
                name: zone.name + ' ' + device.serialNo,
                zoneID: zone.id,
                zoneName: zone.name,
                zoneType: zone.type,
                deviceType: deviceType,
                serial: device.serialNo + '-' + zone.id,
                batteryState: device.batteryState ? device.batteryState : 'NORMAL',
                type: canSetTemperature.canSetTemperature ? 'thermostat' : 'boiler'
              });
            
            }
          
          } else {
            
            if(deviceType !== 'BU')
              deviceArray.push({
                name: zone.name + ' ' + device.serialNo,
                zoneID: zone.id,
                zoneName: zone.name,
                zoneType: zone.type,
                deviceType: deviceType,
                serial: device.serialNo + '-' + zone.id,
                batteryState: device.batteryState ? device.batteryState : 'NORMAL',
                type: 'thermostat'
              });
          
          }
        
        }

        if(this.config.openWindow && zone.type !== 'HOT_WATER')
          deviceArray.push({
            name: zone.name + ' Window',
            id: zone.id,
            window: zone.openWindowDetection,
            enabled: zone.openWindowDetection.enabled,
            serial: zone.name + '-W',
            type: 'contact'
          });
          
        if(this.config.externalSensor && (zone.type === 'HEATING'))
          deviceArray.push({
            name: zone.name + ' Temperature',
            zoneID: zone.id,
            //zoneType: zone.type,
            serial: zone.name + '-TH',
            type: 'temperature humidity'
          });
          
        let object_zone = {
          zoneID: zone.id,
          name: zone.name,
          type: zone.type,
          deviceTypes: zone.deviceTypes
        };
          
        zones.push(object_zone);
      
      }
      
      if(this.config.occupancy || this.config.anyone){
      
        await timeout(1000);
        
        const mobileDevs = [];

        let mobileDevices = await this.tado.getMobileDevices(this.config.homeID);

        for(const device of mobileDevices){

          if(this.config.occupancy)
            deviceArray.push({
              name: device.name,
              gps: device.settings ? device.settings.geoTrackingEnabled : false,
              atHome: (device.location && device.location.atHome) ? true : false,
              serial: device.id,
              type: 'occupancy'
            });
          
          let atHome = (device.location && device.location.atHome) ? true : false; 
          mobileDevs.push(atHome);
        
        }
        
        if(this.config.anyone)
          deviceArray.push({
            name: 'Anyone',
            serial: '1234567890-OS',
            type: 'occupancy',
            atHome: mobileDevs
          });

      }
      
      if(this.config.weather)
        deviceArray.push({
          name: 'Weather',
          serial: '1234567890-W',
          type: 'temperature'
        });
        
      if(this.config.solarIntensity)
        deviceArray.push({
          name: 'Solar Intensity',
          serial: '1234567890-SI',
          type: 'lightbulb'
        });

      if(this.config.centralSwitch)
        deviceArray.push({
          name: 'Central Switch',
          serial: '1234567890-CS',
          type: 'switch'
        });
      
      this.deviceArray = deviceArray;
      
      this.dnsError = 0;
      
      this.refreshZones(zones);
     
    } catch(err) {
    
      this.logger.error('Can not refresh devices!');
    
      if (err.response) {
        if(err.response.status === 500)
          this.dnsError += 1;

        this.debug('Status: ' + err.response.status);
        this.debug('Message: ' + err.response.statusText);

      
      } else if (err.request) {

        this.debug(err.request);
      
      } else {

        this.debug('Error', err.message ? err.message : err);
      
      }
    
      if(this.dnsError >= 5){
        this.logger.error('It seems like Tado\'s servers are down.');
        this.logger.error('Requests to Tado are stopped and will be restarted 5 minutes!');
        
        setTimeout(this.refreshDevices.bind(this),5*60*1000);
          
        return;
      }
      
      setTimeout(this.refreshDevices.bind(this),15000);
     
    }
   
  }  
  
  async refreshZones(zones){
  
    if(zones){
    
      try {

        let zonesArray = [];
        
        for(const i of zones){
        
          await timeout(100);
          
          let state = await this.tado.apiCall(`/api/v2/homes/${this.config.homeID}/zones/${i.zoneID}/state`,'get', {}, {id: i.zoneID, name: i.name});
          
          zonesArray.push(state);
        
        }
        
        this.zonesArray = zonesArray;
        
        setTimeout(this.refreshDevices.bind(this),5000);
    
      } catch(err) {
    
        this.logger.error('Can not refresh zones!');
    
        if (err.response) {
          if(err.response.status === 500)
            this.dnsError += 1;

          this.debug('Status: ' + err.response.status);
          this.debug('Message: ' + err.response.statusText);

        } else if (err.request) {

          this.debug(err.request);
        
        } else {

          this.debug('Error', err.message ? err.message : err);
        
        }
    
        if(this.dnsError >= 5){
          this.logger.error('It seems like Tado\'s servers are down.');
          this.logger.error('Requests to Tado are stopped and will be restarted in 5 minutes!');
        
          setTimeout(this.refreshDevices.bind(this),5*60*1000);
          
          return;
        }
      
        setTimeout(this.refreshDevices.bind(this),15000);
    
      }
    
    }
   
  }
  
  async refreshWeather(){
  
    try {
    
      this.weatherObject = await this.tado.getWeather(this.config.homeID);
      
      this.dnsError = 0;
    
    } catch(err) {
    
      if (err.response) {
        if(err.response.status === 500)
          this.dnsError += 1;

        this.debug('Status: ' + err.response.status);
        this.debug('Message: ' + err.response.statusText);

      } else if (err.request) {
        
        this.debug(err.request);
      
      } else {
        
        this.debug('Error', err.message ? err.message : err);
      
      }
    
      if(this.dnsError >= 5){
       
        this.logger.error('It seems like Tado\'s servers are down.');
        this.logger.error('Requests to Tado are stopped and will be restarted 5 minutes!');
        return;
      
      }
    
    }
    
    setTimeout(this.refreshWeather.bind(this),5*1000*60); //5mins
  
  }
  
  getZone(id){
    return new Promise((resolve,reject) => {
      this._handleZones(() => {

        let error = true;

        for(const i in this.zonesArray){
          if(this.zonesArray[i].id === id){
            error = false;
            resolve(this.zonesArray[i]);
          }
        }

        if(error)                                               
          reject('Can not find zone with ID: ' + id);

      });
    });
  } 
  
  getDevice(serial){
    return new Promise((resolve,reject) => {
      this._handleData(() => {

        let error = true;

        for(const i in this.deviceArray){
          if(this.deviceArray[i].serial === serial){
            error = false;
            resolve(this.deviceArray[i]);
          }
        }

        if(error)
          reject('Can not find device with ID: ' + serial);

      });
    });
  }
  
  getData(){
    return new Promise((resolve) => {
      this._handleData(() => resolve(this.deviceArray));
    });
  }
  
  getWeather(){
    return new Promise((resolve) => {
      this._handleWeather(() => resolve(this.weatherObject));
    });
  }
  
  _handleData(callback){
    (this.deviceArray && this.deviceArray.length)? callback() : setTimeout(this._handleData.bind(this,callback),1000);  
  }
  
  _handleZones(callback){
    (this.zonesArray && this.zonesArray.length)? callback() : setTimeout(this._handleZones.bind(this,callback),1000);  
  }
  
  _handleWeather(callback){
    (this.weatherObject && Object.keys(this.weatherObject).length)? callback() : setTimeout(this._handleWeather.bind(this,callback),1000);  
  }

}

module.exports = tadoHandler;
