'use strict';

const Logger = require('../helper/logger.js');

const fs = require('fs-extra');
const moment = require('moment');

const timeout = (ms) => new Promise((res) => setTimeout(res, ms));

class ThermostatAccessory {

  constructor (api, accessory, accessories, tado, deviceHandler, FakeGatoHistoryService) {
    
    this.api = api;
    this.accessory = accessory;
    this.accessories = accessories;  
    this.FakeGatoHistoryService = FakeGatoHistoryService;
    
    this.deviceHandler = deviceHandler;
    this.tado = tado;
    
    this.autoDelayTimeout = null;
    
    this.getService();

  }

  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
  // Services
  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//

  async getService () {
    
    let service = this.accessory.getService(this.api.hap.Service.Thermostat);
    let serviceOld = this.accessory.getService(this.api.hap.Service.HeaterCooler);
    
    if(serviceOld){
      Logger.info('Removing HeaterCooler service', this.accessory.displayName);
      this.accessory.removeService(serviceOld);
    }

    if(!service){
      Logger.info('Adding Thermostat service', this.accessory.displayName);
      service = this.accessory.addService(this.api.hap.Service.Thermostat, this.accessory.displayName, this.accessory.context.config.subtype);
    }
    
    let batteryService = this.accessory.getService(this.api.hap.Service.BatteryService);
    
    if(!this.accessory.context.config.noBattery){
      if(!batteryService){
        Logger.info('Adding Battery service', this.accessory.displayName);
        batteryService = this.accessory.addService(this.api.hap.Service.BatteryService);
      }
      batteryService
        .setCharacteristic(this.api.hap.Characteristic.ChargingState, this.api.hap.Characteristic.ChargingState.NOT_CHARGEABLE);          
    } else {
      if(batteryService){
        Logger.info('Removing Battery service', this.accessory.displayName);
        this.accessory.removeService(batteryService);
      }
    }
    
    //Handle AirQuality
    if(this.accessory.context.config.airQuality && this.accessory.context.config.type !== 'HOT_WATER'){
   
      if(!service.testCharacteristic(this.api.hap.Characteristic.AirQuality))
        service.addCharacteristic(this.api.hap.Characteristic.AirQuality);
      
    } else {
      
      if(service.testCharacteristic(this.api.hap.Characteristic.AirQuality))
        service.removeCharacteristic(service.getCharacteristic(this.api.hap.Characteristic.AirQuality));
      
    }
    
    //Handle DelaySwitch
    if(this.accessory.context.config.delaySwitch && this.accessory.context.config.type !== 'HOT_WATER'){
   
      if(!service.testCharacteristic(this.api.hap.Characteristic.DelaySwitch))
        service.addCharacteristic(this.api.hap.Characteristic.DelaySwitch);
        
      if(!service.testCharacteristic(this.api.hap.Characteristic.DelayTimer))
        service.addCharacteristic(this.api.hap.Characteristic.DelayTimer);
   
      if(this.accessory.context.config.autoOffDelay){
        
        service.getCharacteristic(this.api.hap.Characteristic.DelaySwitch)
          .onSet(value => {
            if(value && this.accessory.context.delayTimer){
              this.autoDelayTimeout = setTimeout(() => {
                Logger.info('Timer expired, turning off delay switch', this.accessory.displayName);
                service.getCharacteristic(this.api.hap.Characteristic.DelaySwitch)
                  .updateValue(false);
                this.autoDelayTimeout = null;
              }, this.accessory.context.delayTimer * 1000);
            } else {
              if(this.autoDelayTimeout){
                clearTimeout(this.autoDelayTimeout);
                this.autoDelayTimeout = null;
              }
            }            
          })
          .updateValue(false);
          
      } else {
        
        service.getCharacteristic(this.api.hap.Characteristic.DelaySwitch)
          .onGet(() => {
            return this.accessory.context.delaySwitch || false;
          })
          .onSet(value => {
            this.accessory.context.delaySwitch = value;
          });
      
      }
      
      service.getCharacteristic(this.api.hap.Characteristic.DelayTimer)
        .onGet(() => {
          return this.accessory.context.delayTimer || 0;
        })
        .onSet(value => {
          this.accessory.context.delayTimer = value;
        });
        
   
    } else {
   
      if(service.testCharacteristic(this.api.hap.Characteristic.DelaySwitch))
        service.removeCharacteristic(service.getCharacteristic(this.api.hap.Characteristic.DelaySwitch));
        
      if(service.testCharacteristic(this.api.hap.Characteristic.DelayTimer))
        service.removeCharacteristic(service.getCharacteristic(this.api.hap.Characteristic.DelayTimer));
   
    }
    
    let minValue = this.accessory.context.config.type === 'HOT_WATER'
      ? this.accessory.context.config.temperatureUnit === 'CELSIUS'
        ? 30
        : 86
      : this.accessory.context.config.temperatureUnit === 'CELSIUS'
        ? 5
        : 41;
        
    let maxValue = this.accessory.context.config.type === 'HOT_WATER'
      ? this.accessory.context.config.temperatureUnit === 'CELSIUS'
        ? 65
        : 149
      : this.accessory.context.config.temperatureUnit === 'CELSIUS'
        ? 25
        : 77;

    service.getCharacteristic(this.api.hap.Characteristic.CurrentHeatingCoolingState)
      .setProps({
        maxValue: 2,      
        minValue: 0,        
        validValues: [0, 1, 2]
      });
    
    service.getCharacteristic(this.api.hap.Characteristic.TargetHeatingCoolingState)
      .setProps({
        maxValue: 3,        
        validValues: [0, 1, 3]
      });
      
    service.getCharacteristic(this.api.hap.Characteristic.CurrentTemperature)
      .setProps({
        minValue: -255,
        maxValue: 255
      });
      
    service.getCharacteristic(this.api.hap.Characteristic.TargetTemperature)
      .setProps({
        minValue: minValue,
        maxValue: maxValue,
        minStep: 1
      });
      
    if (!this.accessory.context.config.separateHumidity){
      if(!service.testCharacteristic(this.api.hap.Characteristic.CurrentRelativeHumidity))
        service.addCharacteristic(this.api.hap.Characteristic.CurrentRelativeHumidity);
    } else {
      if(service.testCharacteristic(this.api.hap.Characteristic.CurrentRelativeHumidity))
        service.removeCharacteristic(service.getCharacteristic(this.api.hap.Characteristic.CurrentRelativeHumidity));
    }
    
    if (!service.testCharacteristic(this.api.hap.Characteristic.ValvePosition))
      service.addCharacteristic(this.api.hap.Characteristic.ValvePosition);
    
    this.historyService = new this.FakeGatoHistoryService('thermo', this.accessory, {storage:'fs', path: this.api.user.storagePath(), disableTimer:true}); 
    
    await timeout(250); //wait for historyService to load
    
    service.getCharacteristic(this.api.hap.Characteristic.TemperatureDisplayUnits)
      .onSet(this.changeUnit.bind(this, service));
    
    service.getCharacteristic(this.api.hap.Characteristic.TargetHeatingCoolingState)
      .onSet(value => {
        
        if(this.waitForEndValue){
          clearTimeout(this.waitForEndValue);
          this.waitForEndValue = null;
        }
        
        this.waitForEndValue = setTimeout(() => {
          
          if(value === 3){
          
            if(this.timeoutAuto){
              this.deviceHandler.setStates(this.accessory, this.accessories, 'State', value);
              clearTimeout(this.timeoutAuto);
              this.timeoutAuto = null;
            } else {
              this.deviceHandler.setStates(this.accessory, this.accessories, 'State', value);
            }
          
          } else {
            
            this.deviceHandler.setStates(this.accessory, this.accessories, 'State', value);
          
          }
          
        }, 500);

      });

    service.getCharacteristic(this.api.hap.Characteristic.CurrentTemperature)
      .on('change', this.deviceHandler.changedStates.bind(this, this.accessory, this.historyService, this.accessory.displayName));

    service.getCharacteristic(this.api.hap.Characteristic.TargetTemperature)
      .onSet(value => {
        
        let tempUnit = service.getCharacteristic(this.api.hap.Characteristic.TemperatureDisplayUnits).value;
        
        let cToF = (c) => Math.round((c * 9/5) + 32);
        let fToC = (f) => Math.round((f - 32) * 5/9);
        
        let newValue = tempUnit
          ? value <= 25
            ? cToF(value)
            : value
          : value > 25
            ? fToC(value)
            : value;
        
        service.getCharacteristic(this.api.hap.Characteristic.CurrentTemperature)
          .updateValue(newValue);
      
        this.timeoutAuto = setTimeout(() => {
          
          let targetState = service.getCharacteristic(this.api.hap.Characteristic.TargetHeatingCoolingState).value;
          
          if(targetState)
            this.deviceHandler.setStates(this.accessory, this.accessories, 'Temperature', value);
          
          this.timeoutAuto = null;
              
        }, 600);
        
      })
      .on('change', this.deviceHandler.changedStates.bind(this, this.accessory, this.historyService, this.accessory.displayName));
      
    service.getCharacteristic(this.api.hap.Characteristic.ValvePosition)
      .on('change', this.deviceHandler.changedStates.bind(this, this.accessory, this.historyService, this.accessory.displayName));
    
    this.refreshHistory(service);
    
  }
  
  refreshHistory(service){ 

    let currentState = service.getCharacteristic(this.api.hap.Characteristic.CurrentHeatingCoolingState).value;  
    let targetState = service.getCharacteristic(this.api.hap.Characteristic.TargetHeatingCoolingState).value;  
    let currentTemp = service.getCharacteristic(this.api.hap.Characteristic.CurrentTemperature).value; 
    let targetTemp = service.getCharacteristic(this.api.hap.Characteristic.TargetTemperature).value; 
      
    let valvePos = currentTemp <= targetTemp && currentState !== 0 && targetState !== 0
      ? Math.round(((targetTemp - currentTemp) >= 5 ? 100 : (targetTemp - currentTemp) * 20))
      : 0;
      
    this.historyService.addEntry({
      time: moment().unix(), 
      currentTemp: currentTemp, 
      setTemp: targetTemp, 
      valvePosition: valvePos
    });
    
    setTimeout(() => {
      this.refreshHistory(service);
    }, 10 * 60 * 1000);
    
  }
  
  async changeUnit(service, value){
    
    let charachteristicCurrentTemp = this.api.hap.Characteristic.CurrentTemperature;
    
    if(!value){
          
      //CELSIUS
      this.accessory.context.config.temperatureUnit = 'CELSIUS';
      
      let fToC = (f) => Math.round((f - 32) * 5/9);
      
      let currentVal = service.getCharacteristic(charachteristicCurrentTemp).value;
  
      service.getCharacteristic(charachteristicCurrentTemp)
        .updateValue(fToC(currentVal));
      
    } else {
      
      //FAHRENHEIT
      this.accessory.context.config.temperatureUnit = 'FAHRENHEIT';
      
      let cToF = (c) => Math.round((c * 9/5) + 32);
      
      let currentVal = service.getCharacteristic(charachteristicCurrentTemp).value;

      service.getCharacteristic(charachteristicCurrentTemp)
        .updateValue(cToF(currentVal));
      
    }
    
    try {
      
      const configJSON = await fs.readJson(this.api.user.storagePath() + '/config.json');
        
      for(const i in configJSON.platforms)
        if(configJSON.platforms[i].platform === 'TadoPlatform')
          for(const home in configJSON.platforms[i].homes)
            if(configJSON.platforms[i].homes[home].name === this.accessory.context.config.homeName)
              configJSON.platforms[i].homes[home].temperatureUnit = value
                ? 'FAHRENHEIT'
                : 'CELSIUS';
      
      fs.writeJsonSync(this.api.user.storagePath() + '/config.json', configJSON, { spaces: 4 });
      
      Logger.info('New temperature unit stored in config', this.accessory.displayName);
      
    } catch(err) {
      
      Logger.error('Error storing temperature unit in config!', this.accessory.displayName);
      Logger.error(err);
      
    }
    
    return;
    
  }

}

module.exports = ThermostatAccessory;