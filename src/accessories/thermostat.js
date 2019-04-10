'use strict';

const HomeKitTypes = require('../types/types.js');
const EveTypes = require('../types/eve.js');
const moment = require('moment');

const timeout = ms => new Promise(res => setTimeout(res, ms));

var Service, Characteristic, FakeGatoHistoryService;

class thermostat_Accessory {
  constructor (platform, accessory) {
  
    Service = platform.api.hap.Service;
    Characteristic = platform.api.hap.Characteristic;
    
    HomeKitTypes.registerWith(platform.api.hap);
    EveTypes.registerWith(platform.api.hap);
    FakeGatoHistoryService = require('fakegato-history')(platform.api);

    this.platform = platform;
    this.log = platform.log;
    this.logger = platform.logger;
    this.debug = platform.debug;
    this.api = platform.api;
    this.config = platform.config;
    this.configPath = platform.configPath;
    this.accessories = platform.accessories;
    this.HBpath = platform.HBpath;
    
    this.tado = platform.tado;
    this.tadoHandler = platform.tadoHandler;
    this._refreshConfig = platform._refreshConfig;
    
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
    
    let service = accessory.getService(Service.Thermostat);
    let battery = accessory.getService(Service.BatteryService);
    
    service.getCharacteristic(Characteristic.CurrentHeatingCoolingState)
      .setProps({
        format: Characteristic.Formats.UINT8,
        maxValue: 2,
        minValue: 0,
        validValues: [0,1,2],
        perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
      });

    service.getCharacteristic(Characteristic.TargetHeatingCoolingState)
      .setProps({
        format: Characteristic.Formats.UINT8,
        maxValue: 3,
        minValue: 0,
        validValues: [0,1,2,3],
        perms: [Characteristic.Perms.READ, Characteristic.Perms.WRITE, Characteristic.Perms.NOTIFY]
      })
      .on('set', self.setState.bind(this, accessory, service));
        
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
    
    service.getCharacteristic(Characteristic.TargetTemperature)
      .setProps({
        minValue: accessory.context.minValue,
        maxValue: accessory.context.maxValue,
        minStep: 1,
        unit: Characteristic.Units.CELSIUS
      })
      .on('set', this.setTemp.bind(this, accessory, service));
        
    service.getCharacteristic(Characteristic.TemperatureDisplayUnits)
      .on('set', this.setTempUnit.bind(this, accessory, service));
  
    if (!service.testCharacteristic(Characteristic.HeatValue))service.addCharacteristic(Characteristic.HeatValue);
    service.getCharacteristic(Characteristic.HeatValue)
      .setProps({
        minValue: 0,
        maxValue: 10,
        minStep: 1
      })
      .on('set', this.changeHeatCoolValue.bind(this,accessory,service,'heatValue'))
      .on('get', function(callback){
        callback(null, accessory.context.heatValue);
      });
      
    if (!service.testCharacteristic(Characteristic.CoolValue))service.addCharacteristic(Characteristic.CoolValue);
    service.getCharacteristic(Characteristic.CoolValue)
      .setProps({
        minValue: 0,
        maxValue: 10,
        minStep: 1
      })
      .on('set', this.changeHeatCoolValue.bind(this,accessory,service,'coolValue'))
      .on('get', function(callback){
        callback(null, accessory.context.coolValue);
      });
    
    if(accessory.context.zoneType === 'HEATING'){  
      if (!service.testCharacteristic(Characteristic.HeatingPower))service.addCharacteristic(Characteristic.HeatingPower);
      service.getCharacteristic(Characteristic.HeatingPower)
        .on('change', function(value){
          self.logger.info(accessory.displayName + ': Heating power changed to ' + value.newValue + '%');
        });
    
      service.getCharacteristic(Characteristic.CurrentRelativeHumidity)
        .on('change', function(value){
          self.historyService.addEntry({time: moment().unix(), temp:accessory.context.currentTemp, pressure:0, humidity:value.newValue});
          self.debug(accessory.displayName + ': New entry: ' + accessory.context.currentTemp + ' for temperature and ' + value.newValue + ' for humidity');
        });

      if (!service.testCharacteristic(Characteristic.DelayTimer))service.addCharacteristic(Characteristic.DelayTimer);
      service.getCharacteristic(Characteristic.DelayTimer)
        .setProps({
          minValue: 0,
          maxValue: accessory.context.maxDelay,
          minStep: 1
        })
        .on('set', function(value, callback){
          self.logger.info(accessory.displayName + ': Setting delay to ' + value);
          accessory.context.delay = value;
          callback(null, value);
        })
        .on('get', function(callback){
          callback(null, accessory.context.delay);
        });
        
        
      if (!service.testCharacteristic(Characteristic.DelaySwitch))service.addCharacteristic(Characteristic.DelaySwitch);
      service.getCharacteristic(Characteristic.DelaySwitch)
        .on('set', self.setDelay.bind(this, accessory, service))
        .on('get', function(callback){
          callback(null, accessory.context.delayState);
        });
    }
        
    battery.getCharacteristic(Characteristic.ChargingState)
      .updateValue(2); //Not chargable
      
    this.getState(accessory, service, battery);

  }
  
  async changeHeatCoolValue (accessory, service, type, value, callback){
  
    this.logger.info(accessory.displayName + ': Changing ' + type + ' to ' + value);
  
    try {

      if(type==='heatValue'){
        await this._refreshConfig({'heatValue': value}, accessory, true);
        accessory.context.heatValue = value;
      }
      
      if(type==='coolValue'){
        await this._refreshConfig({'coolValue': value}, accessory, true);
        accessory.context.coolValue = value;  
      }

    }catch(err){

      this.logger.error('An error occured while refreshing config.json');
      this.debug(err);
      
      value = (type==='heatValue') ? accessory.context.heatValue : accessory.context.coolValue;

    } finally {
    
      callback(null, value);
      
    }
  
  }
  
  async getState (accessory, service, battery){
  
    try {
        
      if(this.settedState){
        await timeout(5000);
        this.settedState = false;
      }
    
      let zone = await this.tadoHandler.getZone(accessory.context.zoneID);
      
      let targetTemp, currentState, targetState, batteryLevel, statusLowBattery, device;
      
      if(accessory.context.zoneType === 'HEATING') {
      
        if(zone.activityDataPoints && Object.keys(zone.activityDataPoints).length)
          service.getCharacteristic(Characteristic.HeatingPower).updateValue(zone.activityDataPoints.heatingPower.percentage);
        
        accessory.context.currentTemp = ( accessory.context.unit === 1 )? zone.sensorDataPoints.insideTemperature.fahrenheit : zone.sensorDataPoints.insideTemperature.celsius;
        accessory.context.currentHumidity = zone.sensorDataPoints.humidity.percentage;
       
        if(zone.setting.power === 'OFF') {
       
          targetTemp = ( accessory.context.unit === 1 ) ? zone.sensorDataPoints.insideTemperature.fahrenheit : zone.sensorDataPoints.insideTemperature.celsius;
          currentState = 0;
          targetState = 0;
       
        } else {
       
          targetTemp = ( accessory.context.unit === 1 )? zone.setting.temperature.fahrenheit : zone.setting.temperature.celsius; 
      
          if(zone.overlayType === 'MANUAL'){
      
            if(Math.round(accessory.context.currentTemp) < Math.round(targetTemp)){
     
              currentState = 1;
              targetState = 1;
     
            } else {
 
              currentState = 2;
              targetState = 2;
 
            }
      
          } else {
              
            accessory.context.autoTempValue = accessory.context.unit === 1 ? zone.setting.temperature.fahrenheit : zone.setting.temperature.celsius;
      
            targetState = 3;
            currentState = 0;
      
          }
       
        }
        
      } else { //accessory.context.zoneType === 'HOT_WATER'
    
        // Current Temperature = Target Temperature , no temperature measurement
     
        accessory.context.currentTemp = accessory.context.currentTemp ? accessory.context.currentTemp : 0;
        accessory.context.tarTemp = accessory.context.tarTemp ? accessory.context.tarTemp : 0;
       
        if(zone.setting.power === 'OFF') {
       
          currentState = 0;
          targetState = 0;
       
        } else {
          
          if(zone.setting && zone.setting.temperature){
            accessory.context.currentTemp = ( accessory.context.unit === 1 ) ? zone.setting.temperature.fahrenheit : zone.setting.temperature.celsius; 
            accessory.context.tarTemp = ( accessory.context.unit === 1 )? zone.setting.temperature.fahrenheit : zone.setting.temperature.celsius; 
          }
          
          if(zone.overlayType === 'MANUAL'){
      
            if(Math.round(accessory.context.currentTemp) < Math.round(accessory.context.tarTemp)){
     
              currentState = 1;
              targetState = 1;
     
            } else {
 
              currentState = 2;
              targetState = 2;
 
            }
      
          } else {
              
            accessory.context.autoTempValue = accessory.context.unit === 1 ? zone.setting.temperature.fahrenheit : zone.setting.temperature.celsius;
      
            targetState = 3;
            currentState = 0;
      
          }
       
        }
        
        targetTemp = accessory.context.tarTemp;
        
      }
      
      device = await this.tadoHandler.getDevice(accessory.context.serial);
       
      batteryLevel = device.batteryState === 'NORMAL' ? 100 : 10;
      statusLowBattery = device.batteryState === 'NORMAL' ? 0 : 1;
      
      service.getCharacteristic(Characteristic.CurrentHeatingCoolingState).updateValue(currentState);
      service.getCharacteristic(Characteristic.TargetHeatingCoolingState).updateValue(targetState);
      
      service.getCharacteristic(Characteristic.CurrentTemperature).updateValue(accessory.context.currentTemp);
      service.getCharacteristic(Characteristic.TargetTemperature).updateValue(targetTemp);
      
      if(accessory.context.zoneType === 'HEATING')
        service.getCharacteristic(Characteristic.CurrentRelativeHumidity).updateValue(accessory.context.currentHumidity);
      
      service.getCharacteristic(Characteristic.TemperatureDisplayUnits).updateValue(accessory.context.unit);      
      
      battery.getCharacteristic(Characteristic.BatteryLevel).updateValue(batteryLevel);
      battery.getCharacteristic(Characteristic.StatusLowBattery).updateValue(statusLowBattery);
    
    } catch(err) {
    
      this.debug(accessory.displayName + ': An error occured while getting new state');
      this.debug(err);
    
    } finally {
  
      if(!accessory.context.remove) setTimeout(this.getState.bind(this,accessory,service,battery),accessory.context.polling);
      
    }
  
  }
  
  async setState(accessory,service,state,callback,context){
  
    const self = this;
  
    try {
    
      this.settedState = true;
    
      // from setTemp
      
      if(context && !isNaN(parseInt(context.newState))){
    
        this.logger.info(accessory.displayName + ': ' + (context.newState === 1 ? 'Heat Mode' : 'Cool Mode'));
    
        service.getCharacteristic(Characteristic.CurrentHeatingCoolingState).updateValue((context.newState === 3 ? 0 : context.newState));   
      
        this.settedTemp = true;
      
        setTimeout(function(){self.settedTemp = false;},1000);
      
        state = context.newState;
      
      } else {
    
        let temp;
    
        switch(state){
      
          case 0:
        
            this.logger.info(accessory.displayName + ': Off');
            
            temp = accessory.context.currentTemp;
        
            await this.tado.setZoneOverlay(accessory.context.homeID,accessory.context.zoneID,'off',null,'manual',accessory.context.zoneType);
        
            break;
          
          case 1:
        
            this.logger.info(accessory.displayName + ': Heat Mode');
        
            temp = service.getCharacteristic(Characteristic.CurrentTemperature).value + accessory.context.heatValue;
          
            if(accessory.context.zoneType === 'HOT_WATER'){            
              if(accessory.context.unit === 1){          
                temp = (temp > 149) ? 149 : temp;          
              } else {          
                temp = (temp > 65) ? 65 : temp;          
              }           
            } else {           
              if(accessory.context.unit === 1){          
                temp = (temp > 77) ? 77 : temp;            
              } else {          
                temp = (temp > 25) ? 25 : temp;            
              }            
            }
          
            service.getCharacteristic(Characteristic.TargetTemperature).setValue(temp,undefined,{newState:1});    
        
            break;
          
          case 2:
        
            this.logger.info(accessory.displayName + ': Cool Mode');
        
            temp = service.getCharacteristic(Characteristic.CurrentTemperature).value - accessory.context.coolValue;
          
            if(accessory.context.zoneType === 'HOT_WATER'){
              if(accessory.context.unit === 1){          
                temp = (temp < 86) ? 86 : temp;          
              } else {          
                temp = (temp < 30) ? 30 : temp;           
              }            
            } else {
              if(accessory.context.unit === 1){          
                temp = (temp < 41) ? 41 : temp;            
              } else {          
                temp = (temp < 5) ? 5 : temp;            
              }            
            }
          
            service.getCharacteristic(Characteristic.TargetTemperature).setValue(temp,undefined,{newState:2});
        
            break;
          
          case 3:
        
            this.logger.info(accessory.displayName + ': Auto Mode');
            
            temp = accessory.context.autoTempValue;
        
            await this.tado.setZoneOverlay(accessory.context.homeID,accessory.context.zoneID,'on',null,'auto',accessory.context.zoneType,'delete');
        
            break;
      
        }
  
        setTimeout(function(){
          service.getCharacteristic(Characteristic.CurrentHeatingCoolingState).updateValue((state === 3 ? 0 : state));
          service.getCharacteristic(Characteristic.TargetHeatingCoolingState).updateValue(state);
          service.getCharacteristic(Characteristic.TargetTemperature).updateValue(temp);
        }, 500);
        
      }
    
    } catch(err) {
    
      this.logger.error(accessory.displayName + ': An error occured while setting new state!'); 
      this.debug(err);
    
    } finally {
      
      callback(null, state);
      
    }
    
    
  
  }
  
  async setTemp(accessory,service,value,callback,context){
  
    try {

      let currState, tarState;

      this.logger.info(accessory.displayName + ': Setting new temperature: ' + value);

      await this.tado.setZoneOverlay(accessory.context.homeID,accessory.context.zoneID,'on',value,'manual',accessory.context.zoneType);
  
      if(value < service.getCharacteristic(Characteristic.CurrentTemperature).value){
        currState = 2;
        tarState = 2;
      } else {
        currState = 1;
        tarState = 1;
      }
      
      setTimeout(function(){
        service.getCharacteristic(Characteristic.CurrentHeatingCoolingState).updateValue(currState);
        service.getCharacteristic(Characteristic.TargetTemperature).updateValue(value);  
      },500);
      
      if(context && !context.newState)
        service.getCharacteristic(Characteristic.TargetHeatingCoolingState).setValue(tarState, undefined, {newState:tarState});

    } catch (err){

      this.logger.error(accessory.displayName + ': An error occured while setting new temp!'); 
      this.debug(err);

    } finally {
    
      callback(null, value);
      
    }
    
  }
  
  setDelay(accessory, service, state, callback){
  
    let timer = service.getCharacteristic(Characteristic.DelayTimer).value;
    
    if(timer>0){
      if(state){
        this.logger.info(accessory.displayName + ': Activating delay (' + timer + 's)');
        this.delayTimeOut = setTimeout(function(){
          if(service.getCharacteristic(Characteristic.DelaySwitch).value)
            service.getCharacteristic(Characteristic.DelaySwitch).setValue(false);
        }, accessory.context.delay*1000);
        
      } else {
        clearTimeout(this.delayTimeOut);
        this.logger.info(accessory.displayName + ': Turning off delay');
        service.getCharacteristic(Characteristic.DelaySwitch).updateValue(false);
      }
      
      accessory.context.delayState = state;
      accessory.context.delay = timer;
      
      callback(null, state);
    } else {
      accessory.context.delayState = false;
      accessory.context.delay = 0;
      
      if(this.delayTimeOut)
        clearTimeout(this.delayTimeOut);
      
      setTimeout(function(){
        service.getCharacteristic(Characteristic.DelayTimer).updateValue(accessory.context.delay);
        service.getCharacteristic(Characteristic.DelaySwitch).updateValue(accessory.context.delayState);
      }, 500);
      
      callback(null, false);
    }
  
  }
  
  async setTempUnit(accessory, service, state, callback){
  
    try {
    
      this.logger.info(accessory.displayName + ': Changing temperature unit to ' + (state === 1 ? 'Fahrenheit' : 'Celsius'));
      this.logger.warn('Note: Unfortunately it is currently not possible to change the device properties dynamically. For the changes to take effect homebridge must be restarted!');

      await this._refreshConfig({'unit': (state === 1 ? 'fahrenheit' : 'celsius')}, accessory);

    }catch(err){

      this.logger.error('An error occured while refreshing config.json');
      this.debug(err);

    } finally {
    
      callback(null, state);
      
    }
    
    // Note: Currently, it is not possible to change dynamically the accessory properities 
    // changing i.e. minValu/maxValue will kick the accesory, restart ist required after change!
    
    /*let currentTemp, targetTemp;
  
    if(state === 0){
      
      accessory.context.unit = 0;
      accessory.context.minValue = 5;
      accessory.context.maxValue = 25;
      
      currentTemp = this._convertToCelsius(service.getCharacteristic(Characteristic.CurrentTemperature).value);      
      targetTemp = this._convertToCelsius(service.getCharacteristic(Characteristic.TargetTemperature).value);
      
    } else {
      
      accessory.context.unit = 1;
      accessory.context.minValue = 41;
      accessory.context.maxValue = 77;
      
      currentTemp = this._convertToFahrenheit(service.getCharacteristic(Characteristic.CurrentTemperature).value);      
      targetTemp = this._convertToFahrenheit(service.getCharacteristic(Characteristic.TargetTemperature).value);
      
    }
    
    service.getCharacteristic(Characteristic.CurrentTemperature)
      .updateValue(currentTemp);
    
    service.getCharacteristic(Characteristic.TargetTemperature)
      .setProps({
        format: Characteristic.Formats.FLOAT,
        unit: Characteristic.Units.CELSIUS, // HomeKit only defines Celsius, for Fahrenheit, it requires iOS app to do the conversion.
        maxValue: accessory.context.maxValue,
        minValue: accessory.context.minValue,
        minStep: 1,
        perms: [Characteristic.Perms.READ, Characteristic.Perms.WRITE, Characteristic.Perms.NOTIFY]
      })
      .updateValue(targetTemp);*/
  
  }
  
  // Currently not needed, see 'setTempUnit' note  
  
  /*_convertToCelsius(fahrenheit){
  
    let celsius = ( fahrenheit - 32 ) / 1.8;
    celsius = (celsius < 0) ? fahrenheit : celsius;
    return celsius
  
  }
  
   _convertToFahrenheit(celsius){
  
    let fahrenheit = ( celsius * 1.8 ) + 32;
    fahrenheit = (fahrenheit > 100) ? celsius : fahrenheit;
    return fahrenheit
  
  } */

}

module.exports = thermostat_Accessory;