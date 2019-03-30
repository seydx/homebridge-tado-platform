'use strict';

const EveTypes = require('../types/eve.js');
const moment = require('moment');

var Service, Characteristic, FakeGatoHistoryService;

class sensor_Accessory {
  constructor (platform, accessory) {
  
    Service = platform.api.hap.Service;
    Characteristic = platform.api.hap.Characteristic;
    
    EveTypes.registerWith(platform.api.hap);
    FakeGatoHistoryService = require('fakegato-history')(platform.api);

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
    
    this.historyService = new FakeGatoHistoryService('weather', accessory, {storage:'fs',path:self.HBpath, disableTimer: false, disableRepeatLastData:false});
   
    let service = accessory.getService(Service.TemperatureSensor);
    
    if (!service.testCharacteristic(Characteristic.CurrentRelativeHumidity))service.addCharacteristic(Characteristic.CurrentRelativeHumidity);
    service.getCharacteristic(Characteristic.CurrentRelativeHumidity)
      .on('change', function(value){
        self.historyService.addEntry({time: moment().unix(), temp:accessory.context.currentTemp, pressure:0, humidity:value.newValue});
        self.debug(accessory.displayName + ': New entry: ' + accessory.context.currentTemp + ' for temperature and ' + value.newValue + ' for humidity');
      });

    service.getCharacteristic(Characteristic.CurrentTemperature)
      .setProps({
        minValue: -100,
        maxValue: 100,
        minStep: 0.01,
        unit: Characteristic.Units.CELSIUS
      })
      .on('change', function(value){
        self.historyService.addEntry({time: moment().unix(), temp:value.newValue, pressure:0, humidity:accessory.context.currentHumidity});
        self.debug(accessory.displayName + ': New entry: ' + value.newValue + ' for temperature and ' + accessory.context.currentHumidity + ' for humidity');
      });

    this.getState(accessory, service);

  }
  
  async getState (accessory, service){ 
  
    try {
    
      let zone = await this.tadoHandler.getZone(accessory.context.zoneID);
        
      accessory.context.currentTemp = ( accessory.context.unit === 1 )? zone.sensorDataPoints.insideTemperature.fahrenheit : zone.sensorDataPoints.insideTemperature.celsius;
        
      accessory.context.currentHumidity = zone.sensorDataPoints.humidity.percentage;
      service.getCharacteristic(Characteristic.CurrentRelativeHumidity).updateValue(accessory.context.currentHumidity);
      service.getCharacteristic(Characteristic.CurrentTemperature).updateValue(accessory.context.currentTemp);
    
    } catch(err) {
    
      this.debug(accessory.displayName + ': An error occured while getting new state');
      this.debug(err);
    
    } finally {
  
      if(!accessory.context.remove) setTimeout(this.getState.bind(this,accessory,service),accessory.context.polling);
  
    }
  
  }

}

module.exports = sensor_Accessory;