'use strict';

const EveTypes = require('../types/eve.js');
const moment = require('moment');

var Service, Characteristic, FakeGatoHistoryService;

class weather_Accessory {
  constructor (platform, accessory) {
  
    Service = platform.api.hap.Service;
    Characteristic = platform.api.hap.Characteristic;
    
    if(accessory.context.type === 'temperature'){
      EveTypes.registerWith(platform.api.hap);
      FakeGatoHistoryService = require('fakegato-history')(platform.api);
    }
    
    this.platform = platform;
    this.log = platform.log;
    this.logger = platform.logger;
    this.debug = platform.debug;
    this.api = platform.api;
    this.config = platform.config;
    this.accessories = platform.accessories;
    this.HBpath = platform.HBpath;
    
    this.tado = platform.tado;   
    this.tadoHandler = platform.tadoHandler;
    
    this.getService(accessory);

  }

  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
  // Services
  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//

  getService (accessory) {
  
    const self = this;

    accessory.on('identify', function(paired, callback) {
      self.logger.info(accessory.displayName + ': Identify!!!');
      callback();
    });
    
    let service;
    
    switch(accessory.context.type){
    
      case 'temperature':
      
        this.historyService = new FakeGatoHistoryService('weather', accessory, {storage:'fs',path:self.HBpath, disableTimer: false, disableRepeatLastData:false});
      
        service = accessory.getService(Service.TemperatureSensor);
        
        service.getCharacteristic(Characteristic.CurrentTemperature)
          .setProps({
            minValue: -100,
            maxValue: 100,
            minStep: 0.01,
            unit: Characteristic.Units.CELSIUS
          })
          .on('change', function(value){
            self.historyService.addEntry({time: moment().unix(), temp:value.newValue, pressure:0, humidity:0});
            self.debug(accessory.displayName + ': New entry: ' + value.newValue + ' for temperature');
          });
      
        break;

      case 'lightbulb':
      
        service = accessory.getService(Service.Lightbulb);
        
        service.getCharacteristic(Characteristic.On)
          .on('set', function(state, callback) {
            self.logger.warn('Can not change lightbulb state. Not supported!');
            callback(null, state ? false : true);
          });
        
        if (!service.testCharacteristic(Characteristic.Brightness)) {
          service.addCharacteristic(Characteristic.Brightness);
        }
        
        service.getCharacteristic(Characteristic.Brightness)
          .setProps({
            maxValue: 100,
            minValue: 0,
            minStep: 0.01
          })
          .on('set', function(value, callback) {
            self.logger.warn('Can not change lightbulb brightness. Not supported!');
            callback(null, value);
          });
      
        break;
        
      default:
        //
    
    }

    this.getState(accessory, service);

  }
  
  async getState (accessory, service){ 
  
    try {
    
      let device = await this.tadoHandler.getWeather();
      let state, brightness; 
  
      switch(accessory.context.type){
    
        case 'temperature':
          
          state = ( accessory.context.unit === 1 ) ? device.outsideTemperature.fahrenheit : device.outsideTemperature.celsius;
        
          service.getCharacteristic(Characteristic.CurrentTemperature).updateValue(state); 
      
          break;

        case 'lightbulb':
        
          state = (device.solarIntensity.percentage > 0) ? true : false;
          brightness = device.solarIntensity.percentage; 
        
          service.getCharacteristic(Characteristic.On).updateValue(state); 
          service.getCharacteristic(Characteristic.Brightness).updateValue(brightness); 
              
          break;
        
        default:
          //
    
      }
     
    } catch(err) {
    
      this.logger.error(accessory.displayName + ': An error occured while getting new state');
      this.debug(err);
    
    } finally {
  
      if(!accessory.context.remove) setTimeout(this.getState.bind(this,accessory,service),accessory.context.polling);
  
    }
  
  }

}

module.exports = weather_Accessory;