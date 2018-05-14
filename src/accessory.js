'use strict';

const HomeKitTypes = require('./types.js');
const moment = require('moment');
const https = require('https');

var Accessory, Service, Characteristic, UUIDGen, PlatformAccessory, FakeGatoHistoryService;

const pluginName = 'homebridge-tado-platform';
const platformName = 'TadoPlatform';

class TADO {
  constructor (platform, parameter, publish) {

    FakeGatoHistoryService = require('fakegato-history')(platform.api);

    // HB
    PlatformAccessory = platform.api.platformAccessory;
    Accessory = platform.api.hap.Accessory;
    Service = platform.api.hap.Service;
    Characteristic = platform.api.hap.Characteristic;
    UUIDGen = platform.api.hap.uuid;
    HomeKitTypes.registerWith(platform.api.hap);

    this.platform = platform;
    this.log = platform.log;
    this.api = platform.api;
    this.config = platform.config;
    this.accessories = platform.accessories;
    this.HBpath = platform.api.user.storagePath()+'/accessories';

    // STORAGE
    this.storage = require('node-persist');
    this.storage.initSync({
      dir: platform.api.user.persistPath()
    });
    
    this.types = {
      radiatorThermostat: 1,
      central: 2,
      occupancy: 3,
      weather: 4,
      boilerThermostat: 5,
      remoteThermostat: 6,
      externalSensor: 7,
      onePerRoom: 8,
      windowSensor: 9
    };

    // Error count
    this.error = {
      thermostats: 0,
      central: 0,
      occupancy: 0,
      weather: 0,
      openweather: 0,
      externalSensor: 0,
      windowSensor: 0,
      boiler: 0
    };
    
    //Sleep function
    this.sleep = function(time) {
      return new Promise((resolve) => setTimeout(resolve, time));
    };

    // Init req promise
    this.getContent = function(url) {
      return new Promise((resolve, reject) => {
        const lib = url.startsWith('https') ? require('https') : require('http');
        const request = lib.get(url, (response) => {
          if (response.statusCode < 200 || response.statusCode > 299) {
            reject(new Error('Failed to load data, status code: ' + response.statusCode));
          }
          const body = [];
          response.on('data', (chunk) => body.push(chunk));
          response.on('end', () => resolve(body.join('')));
        });
        request.on('error', (err) => reject(err));
      });
    };
    
    if (publish) {
      this.addAccessory(this.config, parameter);
    } else {
      const accessory = parameter;
      this.getService(accessory, accessory.context.type);
    }
  }
  
  /********************************************************************************************************************************************************/
  /********************************************************************************************************************************************************/
  /********************************************************************* ADD ACCESSORY ********************************************************************/
  /********************************************************************************************************************************************************/
  /********************************************************************************************************************************************************/

  addAccessory (config, parameter) {
    const self = this;
    var accessory, name, deviceType, accessoryType;

    switch (parameter.type) {
      case 1: //case 6 == case 1
        name = parameter.name;
        deviceType = Accessory.Categories.THERMOSTAT;
        accessoryType = Service.Thermostat;
        break;
      case 2:
        name = parameter.name;
        deviceType = Accessory.Categories.SWITCH;
        accessoryType = Service.Switch;
        break;
      case 3:
        name = parameter.name;
        deviceType = Accessory.Categories.SENSOR;
        accessoryType = Service.MotionSensor;
        break;
      case 4:
        name = parameter.name;
        deviceType = Accessory.Categories.SENSOR;
        accessoryType = Service.TemperatureSensor;
        break;
      case 5:
        name = parameter.name;
        deviceType = Accessory.Categories.THERMOSTAT;
        accessoryType = Service.Thermostat;
        break;
      case 7:
        name = parameter.name;
        deviceType = Accessory.Categories.SENSOR;
        accessoryType = Service.TemperatureSensor;
        break;
      case 9:
        name = parameter.name;
        deviceType = Accessory.Categories.SENSOR;
        accessoryType = Service.ContactSensor;
        break;
    }

    this.log('Publishing new accessory: ' + name);

    accessory = this.accessories[name];
    const uuid = UUIDGen.generate(name);

    accessory = new PlatformAccessory(name, uuid, deviceType);
    accessory.addService(accessoryType, name);
    if(parameter.type==self.types.radiatorThermostat||parameter.type==self.types.boilerThermostat)accessory.addService(Service.BatteryService);

    // Setting reachable to true
    accessory.reachable = true;
    accessory.context = {};
    
    //Base
    accessory.context.homeID = parameter.homeID;
    accessory.context.tempUnit = parameter.tempUnit;
    accessory.context.username = parameter.username;
    accessory.context.password = parameter.password;
    accessory.context.url = parameter.url;
    accessory.context.tempUnit == 'CELSIUS' ? accessory.context.tempUnitState = 0 : accessory.context.tempUnitState = 1;
    
    //Accessory Information
    accessory.context.shortSerialNo = parameter.shortSerialNo;
    accessory.context.type = parameter.type;
    accessory.context.model = parameter.model;
    
    switch (parameter.type) {
      case 1:
        accessory.context.extraType = parameter.extraType;
        accessory.context.zoneID = parameter.zoneID;
        accessory.context.heatValue = 5;
        accessory.context.coolValue = 5;
        accessory.context.delayTimer = 0;
        accessory.context.delayState = false;
        accessory.context.oldRoom = undefined;
        accessory.context.room = parameter.room;
        if(accessory.context.tempUnit == 'CELSIUS'){
          accessory.context.minValue = 5;
          accessory.context.maxValue = 25;
        } else {
          accessory.context.minValue = 41;
          accessory.context.maxValue = 71;
        }
        accessory.context.batteryState = parameter.batteryState;
        if(accessory.context.batteryState == 'NORMAL'){
          accessory.context.batteryLevel = 100;
          accessory.context.batteryStatus = 0;
        } else {
          accessory.context.batteryLevel = 10;
          accessory.context.batteryStatus = 1;
        }
        accessory.context.lastCurrentTemp = 0;
        accessory.context.lastTargetTemp = accessory.context.minValue;
        accessory.context.lastHumidity = 0;
        accessory.context.lastCurrentState = 0;
        accessory.context.lastTargetState = 0;
        break;
      case 2:
        accessory.context.lastMainState = false;
        accessory.context.lastDummyState = false;
        accessory.context.lastAutos = 0;
        accessory.context.lastManuals = 0;
        accessory.context.lastOffs = 0;
        accessory.context.maxThermostats = 0;
        break;
      case 3:
        accessory.context.atHome = parameter.atHome;
        accessory.context.lastState = 0;
        accessory.context.lastActivation = 0;
        break;
      case 4:
        accessory.context.lastWeatherTemperature = 0.00;
        accessory.context.lastWeatherHumidity = 0.00;
        accessory.context.lastWeatherPressure = 0;
        accessory.context.lastWeatherState = '';
        accessory.context.lastWeatherSunset = '';
        accessory.context.lastWeatherSunrise = '';
        accessory.context.activate = parameter.activate;
        accessory.context.key = parameter.key;
        accessory.context.location = parameter.location;
        accessory.context.tempUnit == 'CELSIUS' ? 
          accessory.context.weatherUrl = 'http://api.openweathermap.org/data/2.5/weather?q=' + accessory.context.location + '&appid=' + accessory.context.key + '&units=metric' :
          accessory.context.weatherUrl = 'http://api.openweathermap.org/data/2.5/weather?q=' + accessory.context.location + '&appid=' + accessory.context.key + '&units=imperial';
        break;
      case 5:
        accessory.context.extraType = parameter.extraType;
        accessory.context.zoneID = parameter.zoneID;
        accessory.context.heatValue = 5;
        accessory.context.coolValue = 5;
        accessory.context.oldRoom = undefined;
        accessory.context.room = parameter.room;
        if(accessory.context.tempUnit == 'CELSIUS'){
          accessory.context.minValue = 30;
          accessory.context.maxValue = 65;
        } else {
          accessory.context.minValue = 86;
          accessory.context.maxValue = 149;
        }
        accessory.context.batteryState = parameter.batteryState;
        if(accessory.context.batteryState == 'NORMAL'){
          accessory.context.batteryLevel = 100;
          accessory.context.batteryStatus = 0;
        } else {
          accessory.context.batteryLevel = 10;
          accessory.context.batteryStatus = 1;
        }
        accessory.context.lastCurrentTemp = 0;
        accessory.context.lastTargetTemp = accessory.context.minValue;
        accessory.context.lastCurrentState = 0;
        accessory.context.lastTargetState = 0;
        break;
      case 7:
        accessory.context.lastRoomTemperature = 0.00;
        accessory.context.lastRoomHumidity = 0.00;
        accessory.context.zoneID = parameter.zoneID;
        accessory.context.room = parameter.room;
        break;
      case 9:
        accessory.context.zoneID = parameter.zoneID;
        accessory.context.windowState = 0;
        accessory.context.windowDuration = 0;
        accessory.context.oldState = undefined;
        accessory.context.room = parameter.room;
        break;
    }
    
    accessory.getService(Service.AccessoryInformation)
      .setCharacteristic(Characteristic.Name, parameter.name)
      .setCharacteristic(Characteristic.Identify, parameter.name)
      .setCharacteristic(Characteristic.Manufacturer, 'SeydX')
      .setCharacteristic(Characteristic.Model, parameter.model)
      .setCharacteristic(Characteristic.SerialNumber, parameter.shortSerialNo)
      .setCharacteristic(Characteristic.FirmwareRevision, require('../package.json').version);
      
    //FakeGato
    if(parameter.logging){
      accessory.context.logging = parameter.logging;
      accessory.context.loggingType = parameter.loggingType; 
      accessory.context.loggingTimer = parameter.loggingTimer;
      accessory.context.loggingOptions = {storage:'fs',path:self.HBpath, disableTimer: accessory.context.loggingTimer};
      accessory.context.loggingService = new FakeGatoHistoryService(accessory.context.loggingType,accessory,accessory.context.loggingOptions);
      accessory.context.loggingService.subtype = parameter.shortSerialNo;
    }

    // Publish
    this.platform.api.registerPlatformAccessories(pluginName, platformName, [accessory]);

    // Cache
    this.accessories[name] = accessory;

    // Get services
    this.getService(accessory, parameter.type);
  }
  
  /********************************************************************************************************************************************************/
  /********************************************************************************************************************************************************/
  /********************************************************************* SERVICES *************************************************************************/
  /********************************************************************************************************************************************************/
  /********************************************************************************************************************************************************/

  getService (accessory, type) {
    const self = this;

    accessory.on('identify', function (paired, callback) {
      self.log(accessory.displayName + ': Identify!!!');
      callback();
    });
    
    var service, battery;

    switch (type) {
      case 1: { // thermostats
      
        service = accessory.getService(Service.Thermostat);
        battery = accessory.getService(Service.BatteryService);

        if (!service.testCharacteristic(Characteristic.HeatValue))service.addCharacteristic(Characteristic.HeatValue);
        service.getCharacteristic(Characteristic.HeatValue)
          .setProps({
            minValue: 0,
            maxValue: 10,
            minStep: 1
          })
          .updateValue(accessory.context.heatValue);
          
        if (!service.testCharacteristic(Characteristic.CoolValue))service.addCharacteristic(Characteristic.CoolValue);
        service.getCharacteristic(Characteristic.CoolValue)
          .setProps({
            minValue: 0,
            maxValue: 10,
            minStep: 1
          })
          .updateValue(accessory.context.coolValue);
          
        if (!service.testCharacteristic(Characteristic.DelayTimer))service.addCharacteristic(Characteristic.DelayTimer);
        service.getCharacteristic(Characteristic.DelayTimer)
          .setProps({
            minValue: 0,
            maxValue: 600,
            minStep: 1
          })
          .updateValue(accessory.context.delayTimer);
          
        if (!service.testCharacteristic(Characteristic.DelaySwitch))service.addCharacteristic(Characteristic.DelaySwitch);
        service.getCharacteristic(Characteristic.DelaySwitch)
          .on('set', self.setDelay.bind(this, accessory, service))
          .updateValue(accessory.context.delayState);

        service.getCharacteristic(Characteristic.CurrentHeatingCoolingState)
          .updateValue(accessory.context.lastCurrentState);
            
        service.getCharacteristic(Characteristic.TargetHeatingCoolingState)
          .updateValue(accessory.context.lastTargetState)
          .on('set', self.setThermostatState.bind(this, accessory, service));
            
        service.getCharacteristic(Characteristic.CurrentTemperature)
          .setProps({
            minValue: -100,
            maxValue: 100,
            minStep: 0.01
          })
          .updateValue(accessory.context.lastCurrentTemp);
            
        service.getCharacteristic(Characteristic.TargetTemperature)
          .setProps({
            minValue: accessory.context.minValue,
            maxValue: accessory.context.maxValue,
            minStep: 1
          })
          .updateValue(accessory.context.lastTargetTemp)
          .on('set', self.setThermostatTemp.bind(this, accessory, service));
            
        service.getCharacteristic(Characteristic.TemperatureDisplayUnits)
          .on('set', self.setTempUnit.bind(this, accessory, service))
          .updateValue(accessory.context.tempUnitState); // 0 = C ; 1 = F
            
        service.getCharacteristic(Characteristic.CurrentRelativeHumidity)
          .updateValue(accessory.context.lastHumidity);
            
        battery.getCharacteristic(Characteristic.ChargingState)
          .updateValue(2); //Not chargable

        battery.getCharacteristic(Characteristic.BatteryLevel)
          .updateValue(accessory.context.batteryLevel);

        battery.getCharacteristic(Characteristic.StatusLowBattery)
          .updateValue(accessory.context.batteryStatus);
            
        self.getThermoSettings(accessory, service, battery);
        self.getThermoStates(accessory, service, battery);
        break;
      }
      case 2: { //central switch
        service = accessory.getService(Service.Switch);

        if (!service.testCharacteristic(Characteristic.DummySwitch))service.addCharacteristic(Characteristic.DummySwitch);
        service.getCharacteristic(Characteristic.DummySwitch)
          .updateValue(accessory.context.lastDummyState);
          
        if (!service.testCharacteristic(Characteristic.ManualThermostats))service.addCharacteristic(Characteristic.ManualThermostats);
        service.getCharacteristic(Characteristic.ManualThermostats)
          .setProps({
            minValue: 0,
            maxValue: accessory.context.maxThermostats,
            minStep: 1
          })
          .updateValue(accessory.context.lastAutos);
          
        if (!service.testCharacteristic(Characteristic.OfflineThermostats))service.addCharacteristic(Characteristic.OfflineThermostats);
        service.getCharacteristic(Characteristic.OfflineThermostats)
          .setProps({
            minValue: 0,
            maxValue: accessory.context.maxThermostats,
            minStep: 1
          })
          .updateValue(accessory.context.lastManuals);
          
        if (!service.testCharacteristic(Characteristic.AutoThermostats))service.addCharacteristic(Characteristic.AutoThermostats);
        service.getCharacteristic(Characteristic.AutoThermostats)
          .setProps({
            minValue: 0,
            maxValue: accessory.context.maxThermostats,
            minStep: 1
          })
          .updateValue(accessory.context.lastOffs);

        service.getCharacteristic(Characteristic.On)
          .updateValue(accessory.context.lastMainState)
          .on('set', self.setCentralSwitch.bind(this, accessory, service));
          
        self.getCentralSwitch(accessory, service);
        break;
      }
      case 3: { //occupancy/motion
        service = accessory.getService(Service.MotionSensor);
        
        service.getCharacteristic(Characteristic.MotionDetected)
          .updateValue(accessory.context.atHome);
          
        if (!service.testCharacteristic(Characteristic.EveMotionLastActivation))service.addCharacteristic(Characteristic.EveMotionLastActivation);
        service.getCharacteristic(Characteristic.EveMotionLastActivation)
          .updateValue(accessory.context.lastActivation); 
        
        self.getMotionLastActivation(accessory, service);
        self.getMotionDetected(accessory, service);        
        break;
      }
      case 4: { //weather
        service = accessory.getService(Service.TemperatureSensor);
        
        service.getCharacteristic(Characteristic.CurrentTemperature)
          .setProps({
            minValue: -100,
            maxValue: 100,
            minStep: 0.01
          })
          .updateValue(accessory.context.lastWeatherTemperature);
          
        self.getWeather(accessory, service);
        
        if(self.config.extendedWeatherActive&&self.config.extendedWeatherKey&&self.config.extendedWeatherLocation){	        
          //Refresh context
          accessory.context.activate = self.config.extendedWeatherActive;
          accessory.context.key = self.config.extendedWeatherKey;
          accessory.context.location = self.config.extendedWeatherLocation;
          accessory.context.tempUnit == 'CELSIUS' ? 
            accessory.context.weatherUrl = 'http://api.openweathermap.org/data/2.5/weather?q=' + accessory.context.location + '&appid=' + accessory.context.key + '&units=metric' :
            accessory.context.weatherUrl = 'http://api.openweathermap.org/data/2.5/weather?q=' + accessory.context.location + '&appid=' + accessory.context.key + '&units=imperial';
          
          if (!service.testCharacteristic(Characteristic.CurrentRelativeHumidity))service.addCharacteristic(Characteristic.CurrentRelativeHumidity);
          service.getCharacteristic(Characteristic.CurrentRelativeHumidity)
            .updateValue(accessory.context.lastWeatherHumidity);
                      
          if (!service.testCharacteristic(Characteristic.AirPressure))service.addCharacteristic(Characteristic.AirPressure);
          service.getCharacteristic(Characteristic.AirPressure)
            .updateValue(accessory.context.lastWeatherPressure); 
          
          if (!service.testCharacteristic(Characteristic.WeatherState))service.addCharacteristic(Characteristic.WeatherState);
          service.getCharacteristic(Characteristic.WeatherState)
            .updateValue(accessory.context.lastWeatherState); 
           
          if (!service.testCharacteristic(Characteristic.Sunrise))service.addCharacteristic(Characteristic.Sunrise);
          service.getCharacteristic(Characteristic.Sunrise)
            .updateValue(accessory.context.lastWeatherSunrise); 
          
          if (!service.testCharacteristic(Characteristic.Sunset))service.addCharacteristic(Characteristic.Sunset);
          service.getCharacteristic(Characteristic.Sunset)
            .updateValue(accessory.context.lastWeatherSunset); 
          
          self.getOpenWeather(accessory, service);     
        } else {
          if(service.testCharacteristic(Characteristic.CurrentRelativeHumidity))service.removeCharacteristic(service.getCharacteristic(Characteristic.CurrentRelativeHumidity));          
          if(service.testCharacteristic(Characteristic.AirPressure))service.removeCharacteristic(service.getCharacteristic(Characteristic.AirPressure));          
          if(service.testCharacteristic(Characteristic.WeatherState))service.removeCharacteristic(service.getCharacteristic(Characteristic.WeatherState));           
          if(service.testCharacteristic(Characteristic.Sunrise))service.removeCharacteristic(service.getCharacteristic(Characteristic.Sunrise));         
          if(service.testCharacteristic(Characteristic.Sunset))service.removeCharacteristic(service.getCharacteristic(Characteristic.Sunset));
        }
        break;
      }
      case 5: { // boiler
      
        service = accessory.getService(Service.Thermostat);
        battery = accessory.getService(Service.BatteryService);

        if (!service.testCharacteristic(Characteristic.HeatValue))service.addCharacteristic(Characteristic.HeatValue);
        service.getCharacteristic(Characteristic.HeatValue)
          .setProps({
            minValue: 0,
            maxValue: 20,
            minStep: 1
          })
          .updateValue(accessory.context.heatValue);
          
        if (!service.testCharacteristic(Characteristic.CoolValue))service.addCharacteristic(Characteristic.CoolValue);
        service.getCharacteristic(Characteristic.CoolValue)
          .setProps({
            minValue: 0,
            maxValue: 20,
            minStep: 1
          })
          .updateValue(accessory.context.coolValue);

        service.getCharacteristic(Characteristic.CurrentHeatingCoolingState)
          .updateValue(accessory.context.lastCurrentState);
            
        service.getCharacteristic(Characteristic.TargetHeatingCoolingState)
          .updateValue(accessory.context.lastTargetState)
          .on('set', self.setBoilerState.bind(this, accessory, service));
            
        service.getCharacteristic(Characteristic.CurrentTemperature)
          .setProps({
            minValue: -100,
            maxValue: 100,
            minStep: 0.01
          })
          .updateValue(accessory.context.lastCurrentTemp);
            
        service.getCharacteristic(Characteristic.TargetTemperature)
          .setProps({
            minValue: accessory.context.minValue,
            maxValue: accessory.context.maxValue,
            minStep: 1
          })
          .updateValue(accessory.context.lastTargetTemp)
          .on('set', self.setBoilerTemp.bind(this, accessory, service));
            
        service.getCharacteristic(Characteristic.TemperatureDisplayUnits)
          .on('set', self.setTempUnit.bind(this, accessory, service))
          .updateValue(accessory.context.tempUnitState); // 0 = C ; 1 = F
            
        battery.getCharacteristic(Characteristic.ChargingState)
          .updateValue(2); //Not chargable

        battery.getCharacteristic(Characteristic.BatteryLevel)
          .updateValue(accessory.context.batteryLevel);

        battery.getCharacteristic(Characteristic.StatusLowBattery)
          .updateValue(accessory.context.batteryStatus);
            
        self.getBoilerSettings(accessory, service, battery);
        self.getBoilerStates(accessory, service, battery);
        break;
      }
      case 7: { //RoomTempSensor
        service = accessory.getService(Service.TemperatureSensor);
        
        if (!service.testCharacteristic(Characteristic.CurrentRelativeHumidity))service.addCharacteristic(Characteristic.CurrentRelativeHumidity);
        service.getCharacteristic(Characteristic.CurrentRelativeHumidity)
          .setProps({
            minValue: 0,
            maxValue: 100,
            minStep: 0.01
          })
          .updateValue(accessory.context.lastRoomHumidity);
        
        service.getCharacteristic(Characteristic.CurrentTemperature)
          .setProps({
            minValue: -100,
            maxValue: 100,
            minStep: 0.01
          })
          .updateValue(accessory.context.lastRoomTemperature);
          
        self.getRoomTemperature(accessory, service);      
        break;
      }
      case 9: { //WindowSensor
        service = accessory.getService(Service.ContactSensor);
        
        service.getCharacteristic(Characteristic.ContactSensorState)
          .updateValue(accessory.context.windowState);
          
        self.getWindowState(accessory, service);      
        break;
      }
    } setTimeout(function(){self.getHistory(accessory, service, type);},5000); //Wait for FakeGato
  }
  
  /********************************************************************************************************************************************************/
  /********************************************************************************************************************************************************/
  /************************************************************************* HISTORY **********************************************************************/
  /********************************************************************************************************************************************************/
  /********************************************************************************************************************************************************/
  
  getHistory(accessory, service, type){
    const self = this;
    if(accessory.context.logging){
      var historyTimer;
      const totallength = accessory.context.loggingService.history.length - 1;    
      const latestTime = accessory.context.loggingService.history[totallength].time;
      const timeDif = moment().unix()-latestTime;
      switch(type){
        case 1:{ //THERMOSTAT
          historyTimer = 60 * 1000; //1min
          if(accessory.context.lastCurrentTemp != accessory.context.loggingService.history[totallength].temp || timeDif > 900){
            if(accessory.context.lastCurrentTemp != accessory.context.loggingService.history[totallength].temp) self.log(accessory.displayName + ': Temperature changed to ' + accessory.context.lastCurrentTemp);
            accessory.context.loggingService.addEntry({
              time: moment().unix(),
              temp: accessory.context.lastCurrentTemp,
              pressure: 0,
              humidity: accessory.context.lastHumidity
            });
          }
          break;
        }
        case 3:{ //OCCUPANCY
          historyTimer = 1000; //1sec
          var newState = accessory.context.atHome ? 1:0;
          if(accessory.displayName == self.config.name + ' Anyone'){
            if(newState != accessory.context.lastState){
              //if(newState == 0) self.log('Nobody at home!');
              accessory.context.lastState = newState;
              accessory.context.loggingService.addEntry({
                time: moment().unix(),
                status: accessory.context.lastState
              });
            }
          } else {
            if(newState != accessory.context.lastState){
              newState == 1 ? self.log('Welcome at home ' + accessory.displayName) : self.log('Bye Bye ' + accessory.displayName);
              accessory.context.lastState = newState;
              accessory.context.loggingService.addEntry({
                time: moment().unix(),
                status: accessory.context.lastState
              });
            }   
          }
          break;
        }
        case 4:{ //WEATHER
          historyTimer = 60 * 1000; //1min
          if(accessory.context.lastWeatherTemperature != accessory.context.loggingService.history[totallength].temp || timeDif > 900){
            if(accessory.context.lastWeatherTemperature != accessory.context.loggingService.history[totallength].temp)self.log(accessory.displayName + ': Temperature changed to ' + accessory.context.lastWeatherTemperature);
            accessory.context.loggingService.addEntry({
              time: moment().unix(),
              temp: accessory.context.lastWeatherTemperature,
              pressure: accessory.context.lastWeatherPressure,
              humidity: accessory.context.lastWeatherHumidity
            });
          }
          break;
        }
        case 7:{ //RoomTempSensor
          historyTimer = 60 * 1000; //1min
          if(accessory.context.lastRoomTemperature != accessory.context.loggingService.history[totallength].temp || timeDif > 900){
            if(accessory.context.lastRoomTemperature != accessory.context.loggingService.history[totallength].temp)self.log(accessory.displayName + ': Temperature changed to ' + accessory.context.lastRoomTemperature);
            accessory.context.loggingService.addEntry({
              time: moment().unix(),
              temp: accessory.context.lastRoomTemperature,
              pressure: 0,
              humidity: accessory.context.lastRoomHumidity
            });
          }
          break;
        }
      }
      setTimeout(function(){
        self.getHistory(accessory, service, type);
      }, historyTimer);
    }
  }
  
  /********************************************************************************************************************************************************/
  /********************************************************************************************************************************************************/
  /********************************************************************* THERMOSTATS **********************************************************************/
  /********************************************************************************************************************************************************/
  /********************************************************************************************************************************************************/
  
  getThermoSettings(accessory, service, battery){
    const self = this;
    if(service.getCharacteristic(Characteristic.HeatValue).value != accessory.context.heatValue){
      accessory.context.heatValue = service.getCharacteristic(Characteristic.HeatValue).value;
      self.log(accessory.displayName + ': Heat Value changed to ' + accessory.context.heatValue);
    }
    if(service.getCharacteristic(Characteristic.CoolValue).value != accessory.context.coolValue){
      accessory.context.coolValue = service.getCharacteristic(Characteristic.CoolValue).value;
      self.log(accessory.displayName + ': Cool Value changed to ' + accessory.context.coolValue);
    }
    if(service.getCharacteristic(Characteristic.DelayTimer).value != accessory.context.delayTimer){
      accessory.context.delayTimer = service.getCharacteristic(Characteristic.DelayTimer).value;
      self.log(accessory.displayName + ': Delay Timer changed to ' + accessory.context.delayTimer + ' seconds');
    }
    battery.getCharacteristic(Characteristic.BatteryLevel).updateValue(accessory.context.batteryLevel);
    battery.getCharacteristic(Characteristic.StatusLowBattery).updateValue(accessory.context.batteryStatus);
    if(accessory.context.room != accessory.context.oldRoom){
      if(accessory.context.oldRoom != undefined)self.log(accessory.displayName + ': Room changed to ' + accessory.context.room);
      accessory.context.oldRoom = accessory.context.room;
    }
    setTimeout(function(){
      self.getThermoSettings(accessory, service, battery);
    }, 1000);
  }
  
  getThermoStates(accessory, service, battery){
    const self = this;
    const a = accessory.context;
    self.getContent(a.url + 'homes/' + a.homeID + '/zones/' + a.zoneID + '/state?username=' + a.username + '&password=' + a.password)
      .then((data) => {
        const response = JSON.parse(data);
        if(response.setting.power == 'OFF'){
          accessory.context.lastCurrentState = 0;  
          accessory.context.lastTargetState = 0;  
          accessory.context.tempUnitState == 0 ?
            accessory.context.lastTargetTemp = Math.round(response.sensorDataPoints.insideTemperature.celsius) :
            accessory.context.lastTargetTemp = Math.round(response.sensorDataPoints.insideTemperature.fahrenheit);
        } else {
          accessory.context.tempUnitState == 0 ?
            accessory.context.lastTargetTemp = Math.round(response.setting.temperature.celsius) :
            accessory.context.lastTargetTemp = Math.round(response.setting.temperature.fahrenheit);
            
          if(response.overlayType == 'MANUAL'){
            if(Math.round(response.sensorDataPoints.insideTemperature.celsius) < Math.round(response.setting.temperature.celsius)){
              accessory.context.lastCurrentState = 1;
              accessory.context.lastTargetState = 1;
            }else{
              accessory.context.lastCurrentState = 2;
              accessory.context.lastTargetState = 2;
            }
          } else {
            accessory.context.lastTargetState = 3;
            accessory.context.targetAutoTemp = response.setting.temperature.celsius; //new context
          }
        }
        accessory.context.tempUnitState == 0 ?
          accessory.context.lastCurrentTemp = response.sensorDataPoints.insideTemperature.celsius :
          accessory.context.lastCurrentTemp = response.sensorDataPoints.insideTemperature.fahrenheit;
        accessory.context.lastHumidity = response.sensorDataPoints.humidity.percentage;
        self.error.thermostats = 0;
        service.getCharacteristic(Characteristic.CurrentHeatingCoolingState).updateValue(accessory.context.lastCurrentState);
        service.getCharacteristic(Characteristic.TargetHeatingCoolingState).updateValue(accessory.context.lastTargetState);
        service.getCharacteristic(Characteristic.TargetTemperature).updateValue(accessory.context.lastTargetTemp);
        service.getCharacteristic(Characteristic.CurrentTemperature).updateValue(accessory.context.lastCurrentTemp);
        service.getCharacteristic(Characteristic.CurrentRelativeHumidity).updateValue(accessory.context.lastHumidity);
        setTimeout(function(){
          self.getThermoStates(accessory, service, battery);
        }, self.config.polling);
      })
      .catch((err) => {
        for(const i in self.accessories){
          if(self.accessories[i].context.type==self.types.radiatorThermostat||self.accessories[i].context.type==self.types.remoteThermostat){
            if(self.accessories[i].displayName==accessory.displayName){
              if(self.error.thermostats > 5){
                self.error.thermostats = 0;
                self.log(accessory.displayName + ': An error occured by getting thermostat state, trying again...');
                self.log(err);
                setTimeout(function(){
                  self.getThermoStates(accessory, service, battery);
                }, 30000);
              } else {
                self.error.thermostats += 1;
                setTimeout(function(){
                  self.getThermoStates(accessory, service, battery);
                }, 15000);
              }
              service.getCharacteristic(Characteristic.CurrentHeatingCoolingState).updateValue(accessory.context.lastCurrentState);
              service.getCharacteristic(Characteristic.TargetHeatingCoolingState).updateValue(accessory.context.lastTargetState);
              service.getCharacteristic(Characteristic.TargetTemperature).updateValue(accessory.context.lastTargetTemp);
              service.getCharacteristic(Characteristic.CurrentTemperature).updateValue(accessory.context.lastCurrentTemp);
              service.getCharacteristic(Characteristic.CurrentRelativeHumidity).updateValue(accessory.context.lastHumidity);
            }
          }
        }
      });
  }
  
  setDelay(accessory, service, state, callback){
    const self = this;
    const timer = service.getCharacteristic(Characteristic.DelayTimer).value;
    if(timer>0){
      if(state){
        self.log('Activating delay (' + timer + 's) for ' + accessory.displayName);
        self.sleep(accessory.context.delayTimer*1000).then(() => {
          service.getCharacteristic(Characteristic.DelaySwitch).setValue(false);
        });
      } else {
        self.log('Turning off delay for ' + accessory.displayName);
      }
      accessory.context.delayState = state;
      accessory.context.delayTimer = timer;
      callback(null, state);
    } else {
      setTimeout(function(){
        accessory.context.delayState = false;
        accessory.context.delayTimer = 0;
        service.getCharacteristic(Characteristic.DelayTimer).updateValue(accessory.context.delayTimer);
        service.getCharacteristic(Characteristic.DelaySwitch).updateValue(accessory.context.delayState);
      }, 500);
      callback(null, false);
    }
  }
  
  setTempUnit(accessory, service, state, callback){
    const self = this;
    if(state == 0){
      self.log('Temperature Unit: Celsius');
      accessory.context.tempUnitState = 0;
    } else {
      self.log('Temperature Unit: Fahrenheit');
      accessory.context.tempUnitState = 1;
    }
    callback(null, state);
  }
  
  setThermostatState(accessory, service, state, callback){
    const self = this;
    switch(state){
      case 0: {//off
        let options = {
          host: 'my.tado.com',
          path: '/api/v2/homes/' + accessory.context.homeID + '/zones/' + accessory.context.zoneID + '/overlay?username=' + accessory.context.username + '&password=' + accessory.context.password,
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          }
        };
        let post_data = JSON.stringify({
          'setting': {
            'type': 'HEATING',
            'power': 'OFF'
          },
          'termination': {
            'type': 'MANUAL'
          }
        });
        let req = https.request(options, function(res) {
          self.log(accessory.displayName + ': Switched to OFF (' + res.statusCode + ')');
        });
        req.on('error', function(err) {
          self.log(accessory.displayName + ': An error occured by setting OFF state!');
          self.log(err);
        });
        req.write(post_data);
        req.end();
        accessory.context.lastCurrentState = 0;
        accessory.context.lastTargetTemp = service.getCharacteristic(Characteristic.CurrentTemperature).value;
        service.getCharacteristic(Characteristic.CurrentHeatingCoolingState).updateValue(accessory.context.lastCurrentState);
        service.getCharacteristic(Characteristic.TargetTemperature).updateValue(accessory.context.lastTargetTemp);
        callback();
        break;
      }
      case 1: {//heat
        let options = {
          host: 'my.tado.com',
          path: '/api/v2/homes/' + accessory.context.homeID + '/zones/' + accessory.context.zoneID + '/overlay?username=' + accessory.context.username + '&password=' + accessory.context.password,
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          }
        };
        accessory.context.lastTargetTemp = service.getCharacteristic(Characteristic.CurrentTemperature).value + accessory.context.heatValue;
        if (accessory.context.tempUnit == 'CELSIUS') {
          if (accessory.context.lastTargetTemp > 25) {
            accessory.context.lastTargetTemp = 25;
          }
        } else {
          if (accessory.context.lastTargetTemp > 77) {
            accessory.context.lastTargetTemp = 77;
          }
        }
        let post_data = JSON.stringify({
          'setting': {
            'type': 'HEATING',
            'power': 'ON',
            'temperature': {
              'celsius': accessory.context.lastTargetTemp
            }
          },
          'termination': {
            'type': 'MANUAL'
          }
        });
        let req = https.request(options, function(res) {
          self.log(accessory.displayName + ': Switched to HEAT (' + res.statusCode + ')');
        });
        req.on('error', function(err) {
          self.log(accessory.displayName + ': An error occured by setting HEAT state!');
          self.log(err);
        });
        req.write(post_data);
        req.end();
        accessory.context.lastCurrentState = 1;
        service.getCharacteristic(Characteristic.CurrentHeatingCoolingState).updateValue(accessory.context.lastCurrentState);
        service.getCharacteristic(Characteristic.TargetTemperature).updateValue(accessory.context.lastTargetTemp);
        callback();
        break;
      }
      case 2: {//cool
        let options = {
          host: 'my.tado.com',
          path: '/api/v2/homes/' + accessory.context.homeID + '/zones/' + accessory.context.zoneID + '/overlay?username=' + accessory.context.username + '&password=' + accessory.context.password,
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          }
        };
        accessory.context.lastTargetTemp = service.getCharacteristic(Characteristic.CurrentTemperature).value - accessory.context.heatValue;
        if (accessory.context.tempUnit == 'CELSIUS') {
          if (accessory.context.lastTargetTemp < 5) {
            accessory.context.lastTargetTemp = 5;
          }
        } else {
          if (accessory.context.lastTargetTemp < 41) {
            accessory.context.lastTargetTemp = 41;
          }
        }
        let post_data = JSON.stringify({
          'setting': {
            'type': 'HEATING',
            'power': 'ON',
            'temperature': {
              'celsius': accessory.context.lastTargetTemp
            }
          },
          'termination': {
            'type': 'MANUAL'
          }
        });
        let req = https.request(options, function(res) {
          self.log(accessory.displayName + ': Switched to COOL (' + res.statusCode + ')');
        });
        req.on('error', function(err) {
          self.log(accessory.displayName + ': An error occured by setting COOL state!');
          self.log(err);
        });
        req.write(post_data);
        req.end();
        accessory.context.lastCurrentState = 2;
        service.getCharacteristic(Characteristic.CurrentHeatingCoolingState).updateValue(accessory.context.lastCurrentState);
        service.getCharacteristic(Characteristic.TargetTemperature).updateValue(accessory.context.lastTargetTemp);
        callback();
        break;
      }
      case 3: {//auto
        let options = {
          host: 'my.tado.com',
          path: '/api/v2/homes/' + accessory.context.homeID + '/zones/' + accessory.context.zoneID + '/overlay?username=' + accessory.context.username + '&password=' + accessory.context.password,
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json'
          }
        };
        let req = https.request(options, function(res) {
          self.log(accessory.displayName + ': Switched to AUTO (' + res.statusCode + ')');
        });
        req.on('error', function(err) {
          self.log(accessory.displayName + ': An error occured by setting new temperature!');
          self.log(err);
        });
        req.end();
        accessory.context.lastCurrentState = 0;
        accessory.context.lastTargetState = 3;
        accessory.context.lastTargetTemp = accessory.context.targetAutoTemp;
        service.getCharacteristic(Characteristic.CurrentHeatingCoolingState).updateValue(accessory.context.lastCurrentState);
        service.getCharacteristic(Characteristic.TargetHeatingCoolingState).updateValue(accessory.context.lastTargetState);
        service.getCharacteristic(Characteristic.TargetTemperature).updateValue(accessory.context.lastTargetTemp);
        callback();
        break;
      }
    }
  }
  
  setThermostatTemp(accessory, service, value, callback){
    const self = this;
    if(service.getCharacteristic(Characteristic.TargetHeatingCoolingState).value == 0 || service.getCharacteristic(Characteristic.TargetHeatingCoolingState).value == 3){
      if(value != accessory.context.targetAutoTemp){
        self.log(accessory.displayName + ': Cant set new temperature, thermostat is not in MANUAL mode!');
        accessory.context.lastTargetTemp = accessory.context.targetAutoTemp;
        setTimeout(function(){service.getCharacteristic(Characteristic.TargetTemperature).updateValue(accessory.context.lastTargetTemp);},300);
      }
    } else {
      accessory.context.lastTargetTemp = value;
      let options = {
        host: 'my.tado.com',
        path: '/api/v2/homes/' + accessory.context.homeID + '/zones/' + accessory.context.zoneID + '/overlay?username=' + accessory.context.username + '&password=' + accessory.context.password,
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        }
      };
      let post_data = JSON.stringify({
        'setting': {
          'type': 'HEATING',
          'power': 'ON',
          'temperature': {
            'celsius': accessory.context.lastTargetTemp
          }
        },
        'termination': {
          'type': 'MANUAL'
        }
      });
      let req =  https.request(options, function(res) {
        self.log(accessory.displayName + ': ' + accessory.context.lastTargetTemp + '(' + res.statusCode + ')');
      });
      req.on('error', function(err) {
        self.log(accessory.displayName + ': An error occured by setting new temperature!');
        self.log(err);
      });
      req.write(post_data);
      req.end();
      if(accessory.context.lastTargetTemp > service.getCharacteristic(Characteristic.CurrentTemperature).value){
        accessory.context.lastCurrentState = 1;
        accessory.context.lastTargetState = 1;
        service.getCharacteristic(Characteristic.CurrentHeatingCoolingState).updateValue(accessory.context.lastCurrentState);
        service.getCharacteristic(Characteristic.TargetHeatingCoolingState).updateValue(accessory.context.lastTargetState);
      } else {
        accessory.context.lastCurrentState = 2;
        accessory.context.lastTargetState = 2;
        service.getCharacteristic(Characteristic.CurrentHeatingCoolingState).updateValue(accessory.context.lastCurrentState);
        service.getCharacteristic(Characteristic.TargetHeatingCoolingState).updateValue(accessory.context.lastTargetState);
      }
    }
    callback();
  }
  
  /********************************************************************************************************************************************************/
  /********************************************************************************************************************************************************/
  /************************************************************************** BOILER **********************************************************************/
  /********************************************************************************************************************************************************/
  /********************************************************************************************************************************************************/
  
  getBoilerSettings(accessory, service, battery){
    const self = this;
    if(service.getCharacteristic(Characteristic.HeatValue).value != accessory.context.heatValue){
      accessory.context.heatValue = service.getCharacteristic(Characteristic.HeatValue).value;
      self.log(accessory.displayName + ': Heat Value changed to ' + accessory.context.heatValue);
    }
    if(service.getCharacteristic(Characteristic.CoolValue).value != accessory.context.coolValue){
      accessory.context.coolValue = service.getCharacteristic(Characteristic.CoolValue).value;
      self.log(accessory.displayName + ': Cool Value changed to ' + accessory.context.coolValue);
    }
    battery.getCharacteristic(Characteristic.BatteryLevel).updateValue(accessory.context.batteryLevel);
    battery.getCharacteristic(Characteristic.StatusLowBattery).updateValue(accessory.context.batteryStatus);
    if(accessory.context.room != accessory.context.oldRoom){
      if(accessory.context.oldRoom != undefined)self.log(accessory.displayName + ': Room changed to ' + accessory.context.room);
      accessory.context.oldRoom = accessory.context.room;
    }
    setTimeout(function(){
      self.getBoilerSettings(accessory, service, battery);
    }, 1000);
  }
  
  getBoilerStates(accessory, service, battery){
    const self = this;
    const a = accessory.context;
    self.getContent(a.url + 'homes/' + a.homeID + '/zones/' + a.zoneID + '/state?username=' + a.username + '&password=' + a.password)
      .then((data) => {
        const response = JSON.parse(data);
        if(response.setting.power == 'OFF'){
          accessory.context.lastCurrentState = 0;  
          accessory.context.lastTargetState = 0;           
          /*accessory.context.tempUnitState == 0 ?
            accessory.context.lastTargetTemp = Math.round(response.sensorDataPoints.insideTemperature.celsius) :
            accessory.context.lastTargetTemp = Math.round(response.sensorDataPoints.insideTemperature.fahrenheit);*/
        } else {
          accessory.context.tempUnitState == 0 ?
            accessory.context.lastTargetTemp = Math.round(response.setting.temperature.celsius) :
            accessory.context.lastTargetTemp = Math.round(response.setting.temperature.fahrenheit);
          accessory.context.tempUnitState == 0 ?
            accessory.context.lastCurrentTemp = response.setting.temperature.celsius :
            accessory.context.lastCurrentTemp = response.setting.temperature.fahrenheit;
          if(response.overlayType == 'MANUAL'){
            if(Math.round(response.sensorDataPoints.insideTemperature.celsius) < Math.round(response.setting.temperature.celsius)){
              accessory.context.lastCurrentState = 1;
              accessory.context.lastTargetState = 1;
            }else{
              accessory.context.lastCurrentState = 2;
              accessory.context.lastTargetState = 2;
            }
          } else {
            accessory.context.lastTargetState = 3;
            accessory.context.targetAutoTemp = response.setting.temperature.celsius; //new context
          }
        }
        self.error.boiler = 0;
        service.getCharacteristic(Characteristic.CurrentHeatingCoolingState).updateValue(accessory.context.lastCurrentState);
        service.getCharacteristic(Characteristic.TargetHeatingCoolingState).updateValue(accessory.context.lastTargetState);
        service.getCharacteristic(Characteristic.TargetTemperature).updateValue(accessory.context.lastTargetTemp);
        service.getCharacteristic(Characteristic.CurrentTemperature).updateValue(accessory.context.lastCurrentTemp);
        setTimeout(function(){
          self.getBoilerStates(accessory, service, battery);
        }, self.config.polling);
      })
      .catch((err) => {
        for(const i in self.accessories){
          if(self.accessories[i].context.type == self.types.boilerThermostat){
            if(self.accessories[i].displayName == accessory.displayName){
              if(self.error.boiler > 5){
                self.error.boiler = 0;
                self.log(accessory.displayName + ': An error occured by getting boiler state, trying again...');
                self.log(err);
                setTimeout(function(){
                  self.getBoilerStates(accessory, service, battery);
                }, 30000);
              } else {
                self.error.boiler += 1;
                setTimeout(function(){
                  self.getBoilerStates(accessory, service, battery);
                }, 15000);
              }
              service.getCharacteristic(Characteristic.CurrentHeatingCoolingState).updateValue(accessory.context.lastCurrentState);
              service.getCharacteristic(Characteristic.TargetHeatingCoolingState).updateValue(accessory.context.lastTargetState);
              service.getCharacteristic(Characteristic.TargetTemperature).updateValue(accessory.context.lastTargetTemp);
              service.getCharacteristic(Characteristic.CurrentTemperature).updateValue(accessory.context.lastCurrentTemp);
            }
          }
        }
      });
  }
  
  setBoilerState(accessory, service, state, callback){
    const self = this;
    switch(state){
      case 0: {//off
        let options = {
          host: 'my.tado.com',
          path: '/api/v2/homes/' + accessory.context.homeID + '/zones/' + accessory.context.zoneID + '/overlay?username=' + accessory.context.username + '&password=' + accessory.context.password,
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          }
        };
        let post_data = JSON.stringify({
          'setting': {
            'type': 'HOT_WATER',
            'power': 'OFF'
          },
          'termination': {
            'type': 'MANUAL'
          }
        });
        let req = https.request(options, function(res) {
          self.log(accessory.displayName + ': Switched to OFF (' + res.statusCode + ')');
        });
        req.on('error', function(err) {
          self.log(accessory.displayName + ': An error occured by setting OFF state!');
          self.log(err);
        });
        req.write(post_data);
        req.end();
        accessory.context.lastCurrentState = 0;
        accessory.context.lastTargetTemp = service.getCharacteristic(Characteristic.CurrentTemperature).value;
        service.getCharacteristic(Characteristic.CurrentHeatingCoolingState).updateValue(accessory.context.lastCurrentState);
        service.getCharacteristic(Characteristic.TargetTemperature).updateValue(accessory.context.lastTargetTemp);
        callback();
        break;
      }
      case 1: {//heat
        let options = {
          host: 'my.tado.com',
          path: '/api/v2/homes/' + accessory.context.homeID + '/zones/' + accessory.context.zoneID + '/overlay?username=' + accessory.context.username + '&password=' + accessory.context.password,
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          }
        };
        accessory.context.lastTargetTemp = service.getCharacteristic(Characteristic.CurrentTemperature).value + accessory.context.heatValue;
        if (accessory.context.tempUnit == 'CELSIUS') {
          if (accessory.context.lastTargetTemp > 65) {
            accessory.context.lastTargetTemp = 65;
          }
        } else {
          if (accessory.context.lastTargetTemp > 149) {
            accessory.context.lastTargetTemp = 149;
          }
        }
        let post_data = JSON.stringify({
          'setting': {
            'type': 'HOT_WATER',
            'power': 'ON',
            'temperature': {
              'celsius': accessory.context.lastTargetTemp
            }
          },
          'termination': {
            'type': 'MANUAL'
          }
        });
        let req = https.request(options, function(res) {
          self.log(accessory.displayName + ': Switched to HEAT (' + res.statusCode + ')');
        });
        req.on('error', function(err) {
          self.log(accessory.displayName + ': An error occured by setting HEAT state!');
          self.log(err);
        });
        req.write(post_data);
        req.end();
        accessory.context.lastCurrentState = 1;
        service.getCharacteristic(Characteristic.CurrentHeatingCoolingState).updateValue(accessory.context.lastCurrentState);
        service.getCharacteristic(Characteristic.TargetTemperature).updateValue(accessory.context.lastTargetTemp);
        callback();
        break;
      }
      case 2: {//cool
        let options = {
          host: 'my.tado.com',
          path: '/api/v2/homes/' + accessory.context.homeID + '/zones/' + accessory.context.zoneID + '/overlay?username=' + accessory.context.username + '&password=' + accessory.context.password,
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          }
        };
        accessory.context.lastTargetTemp = service.getCharacteristic(Characteristic.CurrentTemperature).value - accessory.context.heatValue;
        if (accessory.context.tempUnit == 'CELSIUS') {
          if (accessory.context.lastTargetTemp < 30) {
            accessory.context.lastTargetTemp = 30;
          }
        } else {
          if (accessory.context.lastTargetTemp < 86) {
            accessory.context.lastTargetTemp = 86;
          }
        }
        let post_data = JSON.stringify({
          'setting': {
            'type': 'HOT_WATER',
            'power': 'ON',
            'temperature': {
              'celsius': accessory.context.lastTargetTemp
            }
          },
          'termination': {
            'type': 'MANUAL'
          }
        });
        let req = https.request(options, function(res) {
          self.log(accessory.displayName + ': Switched to COOL (' + res.statusCode + ')');
        });
        req.on('error', function(err) {
          self.log(accessory.displayName + ': An error occured by setting COOL state!');
          self.log(err);
        });
        req.write(post_data);
        req.end();
        accessory.context.lastCurrentState = 2;
        service.getCharacteristic(Characteristic.CurrentHeatingCoolingState).updateValue(accessory.context.lastCurrentState);
        service.getCharacteristic(Characteristic.TargetTemperature).updateValue(accessory.context.lastTargetTemp);
        callback();
        break;
      }
      case 3: {//auto
        let options = {
          host: 'my.tado.com',
          path: '/api/v2/homes/' + accessory.context.homeID + '/zones/' + accessory.context.zoneID + '/overlay?username=' + accessory.context.username + '&password=' + accessory.context.password,
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json'
          }
        };
        let req = https.request(options, function(res) {
          self.log(accessory.displayName + ': Switched to AUTO (' + res.statusCode + ')');
        });
        req.on('error', function(err) {
          self.log(accessory.displayName + ': An error occured by setting new temperature!');
          self.log(err);
        });
        req.end();
        accessory.context.lastCurrentState = 0;
        accessory.context.lastTargetState = 3;
        accessory.context.lastTargetTemp = accessory.context.targetAutoTemp;
        service.getCharacteristic(Characteristic.CurrentHeatingCoolingState).updateValue(accessory.context.lastCurrentState);
        service.getCharacteristic(Characteristic.TargetHeatingCoolingState).updateValue(accessory.context.lastTargetState);
        service.getCharacteristic(Characteristic.TargetTemperature).updateValue(accessory.context.lastTargetTemp);
        callback();
        break;
      }
    }
  }
  
  setBoilerTemp(accessory, service, value, callback){
    const self = this;
    if(service.getCharacteristic(Characteristic.TargetHeatingCoolingState).value == 0 || service.getCharacteristic(Characteristic.TargetHeatingCoolingState).value == 3){
      if(value != accessory.context.targetAutoTemp){
        self.log(accessory.displayName + ': Cant set new temperature, boiler is not in MANUAL mode!');
        accessory.context.lastTargetTemp = accessory.context.targetAutoTemp;
        setTimeout(function(){service.getCharacteristic(Characteristic.TargetTemperature).updateValue(accessory.context.lastTargetTemp);},300);
      }
    } else {
      accessory.context.lastTargetTemp = value;
      let options = {
        host: 'my.tado.com',
        path: '/api/v2/homes/' + accessory.context.homeID + '/zones/' + accessory.context.zoneID + '/overlay?username=' + accessory.context.username + '&password=' + accessory.context.password,
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        }
      };
      let post_data = JSON.stringify({
        'setting': {
          'type': 'HOT_WATER',
          'power': 'ON',
          'temperature': {
            'celsius': accessory.context.lastTargetTemp
          }
        },
        'termination': {
          'type': 'MANUAL'
        }
      });
      let req =  https.request(options, function(res) {
        self.log(accessory.displayName + ': ' + accessory.context.lastTargetTemp + '(' + res.statusCode + ')');
      });
      req.on('error', function(err) {
        self.log(accessory.displayName + ': An error occured by setting new temperature!');
        self.log(err);
      });
      req.write(post_data);
      req.end();
      if(accessory.context.lastTargetTemp > service.getCharacteristic(Characteristic.CurrentTemperature).value){
        accessory.context.lastCurrentState = 1;
        accessory.context.lastTargetState = 1;
        service.getCharacteristic(Characteristic.CurrentHeatingCoolingState).updateValue(accessory.context.lastCurrentState);
        service.getCharacteristic(Characteristic.TargetHeatingCoolingState).updateValue(accessory.context.lastTargetState);
      } else {
        accessory.context.lastCurrentState = 2;
        accessory.context.lastTargetState = 2;
        service.getCharacteristic(Characteristic.CurrentHeatingCoolingState).updateValue(accessory.context.lastCurrentState);
        service.getCharacteristic(Characteristic.TargetHeatingCoolingState).updateValue(accessory.context.lastTargetState);
      }
    }
    callback();
  }
  
  /********************************************************************************************************************************************************/
  /********************************************************************************************************************************************************/
  /****************************************************************** CENTRAL SWITCH **********************************************************************/
  /********************************************************************************************************************************************************/
  /********************************************************************************************************************************************************/
  
  getCentralSwitch(accessory, service){
    const self = this;
    const allAccessories = self.accessories;
    accessory.context.lastAutos = 0;
    accessory.context.lastManuals = 0;
    accessory.context.lastOffs = 0;
    accessory.context.maxThermostats = 0;
    for(const i in allAccessories){
      if(allAccessories[i].context.type==self.types.radiatorThermostat||allAccessories[i].context.type==self.types.boilerThermostat){
        const state = allAccessories[i].getService(Service.Thermostat).getCharacteristic(Characteristic.TargetHeatingCoolingState).value;
        accessory.context.maxThermostats += 1;
        if(state == 3){
          accessory.context.lastAutos += 1;
        } else if(state == 1 || state == 2){
          accessory.context.lastManuals += 1;
        } else {
          accessory.context.lastOffs += 1;
        }
      }
    }
    if(accessory.context.lastAutos == 0){
      accessory.context.lastMainState = false;
    } else {
      accessory.context.lastMainState = true;
    }
    if(service.getCharacteristic(Characteristic.DummySwitch).value != accessory.context.lastDummyState){
      accessory.context.lastDummyState = service.getCharacteristic(Characteristic.DummySwitch).value;
      accessory.context.lastDummyState ? self.log('Window Switch: ON') : self.log('Window Switch: OFF');
    }
    service.getCharacteristic(Characteristic.On).updateValue(accessory.context.lastMainState);
    service.getCharacteristic(Characteristic.AutoThermostats)
      .setProps({
        minValue: 0,
        maxValue: accessory.context.maxThermostats,
        minStep: 1
      })
      .updateValue(accessory.context.lastAutos);
    service.getCharacteristic(Characteristic.ManualThermostats)
      .setProps({
        minValue: 0,
        maxValue: accessory.context.maxThermostats,
        minStep: 1
      })
      .updateValue(accessory.context.lastManuals);
    service.getCharacteristic(Characteristic.OfflineThermostats)
      .setProps({
        minValue: 0,
        maxValue: accessory.context.maxThermostats,
        minStep: 1
      })
      .updateValue(accessory.context.lastOffs);
    setTimeout(function(){
      self.getCentralSwitch(accessory, service);
    }, 1000);
  }
  
  setCentralSwitch(accessory, service, state, callback){
    const self = this;
    const allAccessories = self.accessories;
    for(const i in allAccessories){
      if(allAccessories[i].context.type==self.types.radiatorThermostat||allAccessories[i].context.type==self.types.boilerThermostat){
        if(state){
          allAccessories[i].context.lastTargetState = 3;
          allAccessories[i].context.lastCurrentState = 0;
        } else {
          allAccessories[i].context.lastTargetState = 0;
          allAccessories[i].context.lastCurrentState = 0;
        }
        allAccessories[i].getService(Service.Thermostat).getCharacteristic(Characteristic.TargetHeatingCoolingState).setValue(allAccessories[i].context.lastTargetState);
        allAccessories[i].getService(Service.Thermostat).getCharacteristic(Characteristic.CurrentHeatingCoolingState).updateValue(allAccessories[i].context.lastCurrentState);
      }
    }
    accessory.context.lastMainState = state;
    callback(null, accessory.context.lastMainState);
  }
  
  /********************************************************************************************************************************************************/
  /********************************************************************************************************************************************************/
  /**************************************************************** OCCUPANCY *****************************************************************************/
  /********************************************************************************************************************************************************/
  /********************************************************************************************************************************************************/
  
  getMotionDetected(accessory, service){
    const self = this;
    if(accessory.displayName != self.config.name + ' Anyone'){
      service.getCharacteristic(Characteristic.MotionDetected).updateValue(accessory.context.atHome);
    } else {
      const allAccessories = self.accessories;  
      var motion = 0;  
      for(const i in allAccessories){
        if(allAccessories[i].context.type == self.types.occupancy && allAccessories[i].displayName != self.config.name + ' Anyone'){
          const state = allAccessories[i].getService(Service.MotionSensor).getCharacteristic(Characteristic.MotionDetected).value;
          if(state > 0){
            motion += 1;
          }
        }
      }
      if(motion > 0){
        accessory.context.atHome = true;
      } else {
        accessory.context.atHome = false;
      }
      service.getCharacteristic(Characteristic.MotionDetected).updateValue(accessory.context.atHome);
    }
    setTimeout(function(){
      self.getMotionDetected(accessory, service); 
    }, 1000);   
  }
  
  getMotionLastActivation(accessory, service){
    const self = this;
    const totallength = accessory.context.loggingService.history.length - 1;    
    const latestTime = accessory.context.loggingService.history[totallength].time;
    const state = accessory.context.atHome ? 1:0;    
    state == 1 ? accessory.context.lastActivation = moment().unix() : accessory.context.lastActivation = latestTime - accessory.context.loggingService.getInitialTime();
    service.getCharacteristic(Characteristic.EveMotionLastActivation).updateValue(accessory.context.lastActivation);
    setTimeout(function(){
      self.getMotionLastActivation(accessory, service);
    }, 1000);
  }
  
  /********************************************************************************************************************************************************/
  /********************************************************************************************************************************************************/
  /********************************************************************* WEATHER **************************************************************************/
  /********************************************************************************************************************************************************/
  /********************************************************************************************************************************************************/
  
  getWeather(accessory, service){
    const self = this;
    const a = accessory.context;
    self.getContent(a.url + 'homes/' + a.homeID + '/weather?username=' + a.username + '&password=' + a.password)
      .then((data) => {
        const response = JSON.parse(data);
        accessory.context.tempUnitState == 0 ?
          accessory.context.lastWeatherTemperature = response.outsideTemperature.celsius :
          accessory.context.lastWeatherTemperature = response.outsideTemperature.fahrenheit;
        service.getCharacteristic(Characteristic.CurrentTemperature).updateValue(accessory.context.lastWeatherTemperature);
        self.error.weather = 0;
        setTimeout(function(){
          self.getWeather(accessory, service);
        }, self.config.polling);
      })
      .catch((err) => {
        if(self.error.weather > 5){
          self.error.weather = 0;
          self.log(accessory.displayName + ': An error occured by getting weather data, trying again...');
          self.log(err);
          setTimeout(function(){
            self.getWeather(accessory, service);
          }, 30000);
        } else {
          self.error.weather += 1;
          setTimeout(function(){
            self.getWeather(accessory, service);
          }, 15000);
        }
        service.getCharacteristic(Characteristic.CurrentTemperature).updateValue(accessory.context.lastWeatherTemperature);
      });
  }
  
  getOpenWeather(accessory, service){
    const self = this;
    self.getContent(accessory.context.weatherUrl)
      .then((data) => {
        const response = JSON.parse(data);
        accessory.context.lastWeatherHumidity = response.main.humidity;
        accessory.context.lastWeatherPressure = response.main.pressure;
        accessory.context.lastWeatherState = response.weather[0].main;
        accessory.context.lastWeatherSunrise = moment(response.sys.sunrise * 1000).format('HH:mm').toString();
        accessory.context.lastWeatherSunset = moment(response.sys.sunset * 1000).format('HH:mm').toString();
        service.getCharacteristic(Characteristic.CurrentRelativeHumidity).updateValue(accessory.context.lastWeatherHumidity);
        service.getCharacteristic(Characteristic.AirPressure).updateValue(accessory.context.lastWeatherPressure);
        service.getCharacteristic(Characteristic.WeatherState).updateValue(accessory.context.lastWeatherState);
        service.getCharacteristic(Characteristic.Sunrise).updateValue(accessory.context.lastWeatherSunrise);
        service.getCharacteristic(Characteristic.Sunset).updateValue(accessory.context.lastWeatherSunset);
        self.error.openweather = 0;
        setTimeout(function(){
          self.getOpenWeather(accessory, service);
        }, self.config.polling);
      })
      .catch((err) => {
        if(self.error.openweather > 5){
          self.error.openweather = 0;
          self.log(accessory.displayName + ': An error occured by getting openweather data, trying again...');
          self.log(err);
          setTimeout(function(){
            self.getOpenWeather(accessory, service);
          }, 30000);
        } else {
          self.error.openweather += 1;
          setTimeout(function(){
            self.getOpenWeather(accessory, service);
          }, 15000);
        }
        service.getCharacteristic(Characteristic.CurrentRelativeHumidity).updateValue(accessory.context.lastWeatherHumidity);
        service.getCharacteristic(Characteristic.AirPressure).updateValue(accessory.context.lastWeatherPressure);
        service.getCharacteristic(Characteristic.WeatherState).updateValue(accessory.context.lastWeatherState);
        service.getCharacteristic(Characteristic.Sunrise).updateValue(accessory.context.lastWeatherSunrise);
        service.getCharacteristic(Characteristic.Sunset).updateValue(accessory.context.lastWeatherSunset);
      });
  }
  
  /********************************************************************************************************************************************************/
  /********************************************************************************************************************************************************/
  /************************************************************ EXTERNAL SENSORS **************************************************************************/
  /********************************************************************************************************************************************************/
  /********************************************************************************************************************************************************/
  
  getRoomTemperature(accessory, service){
    const self = this;
    const a = accessory.context;
    self.getContent(a.url + 'homes/' + a.homeID + '/zones/' + a.zoneID + '/state?username=' + a.username + '&password=' + a.password)
      .then((data) => {
        const response = JSON.parse(data);
        accessory.context.tempUnitState == 0 ?
          accessory.context.lastRoomTemperature = response.sensorDataPoints.insideTemperature.celsius :
          accessory.context.lastRoomTemperature = response.sensorDataPoints.insideTemperature.fahrenheit;
        accessory.context.lastRoomHumidity = response.sensorDataPoints.humidity.percentage;
        service.getCharacteristic(Characteristic.CurrentTemperature).updateValue(accessory.context.lastRoomTemperature);
        service.getCharacteristic(Characteristic.CurrentRelativeHumidity).updateValue(accessory.context.lastRoomHumidity);
        self.error.externalSensor = 0;
        setTimeout(function(){
          self.getRoomTemperature(accessory, service);
        }, self.config.polling);
      })
      .catch((err) => {
        for(const i in self.accessories){
          if(self.accessories[i].context.type == self.types.externalSensor){
            if(self.accessories[i].displayName == accessory.displayName){
              if(self.error.externalSensor > 5){
                self.error.externalSensor = 0;
                self.log(accessory.displayName + ': An error occured by getting room temperature, trying again...');
                self.log(err);
                setTimeout(function(){
                  self.getRoomTemperature(accessory, service);
                }, 30000);
              } else {
                self.error.externalSensor += 1;
                setTimeout(function(){
                  self.getRoomTemperature(accessory, service);
                }, 15000);
              }
              service.getCharacteristic(Characteristic.CurrentTemperature).updateValue(accessory.context.lastRoomTemperature);
              service.getCharacteristic(Characteristic.CurrentRelativeHumidity).updateValue(accessory.context.lastRoomHumidity);
            }
          }
        }
      });
  }
  
  /********************************************************************************************************************************************************/
  /********************************************************************************************************************************************************/
  /********************************************************************* WINDOW ***************************************************************************/
  /********************************************************************************************************************************************************/
  /********************************************************************************************************************************************************/
  
  getWindowState(accessory, service){
    const self = this;
    const a = accessory.context;
    self.getContent(a.url + 'homes/' + a.homeID + '/zones/' + a.zoneID + '/state?username=' + a.username + '&password=' + a.password)
      .then((data) => {
        const response = JSON.parse(data);
        if(response.openWindow != null){
          accessory.context.windowState = 1;
          accessory.context.windowDuration = response.openWindow.durationInSeconds;
        } else {
          accessory.context.windowState = 0;
          accessory.context.windowDuration = 0;
        }
        if(accessory.context.windowState!=accessory.context.oldState){
          if(accessory.context.oldState != undefined){
            accessory.context.windowState == 1 ? 
              self.log('Open window detected! Turning off thermostat in ' + accessory.context.room + ' for ' + accessory.context.windowDuration/60 + ' minutes!') : 
              self.log('Window closed! Turning on thermostat in ' + accessory.context.room);
          }
          accessory.context.oldState = accessory.context.windowState;
        }
        if(accessory.context.windowState!=accessory.context.oldState&&accessory.context.oldState != undefined)self.log(accessory.displayName + ': Room changed to ' + accessory.context.room);
        service.getCharacteristic(Characteristic.ContactSensorState).updateValue(accessory.context.windowState);
        self.error.windowSensor = 0;
        setTimeout(function(){
          self.getWindowState(accessory, service);
        }, self.config.polling);
      })
      .catch((err) => {
        for(const i in self.accessories){
          if(self.accessories[i].context.type == self.types.windowSensor){
            if(self.accessories[i].displayName == accessory.displayName){
              if(self.error.windowSensor > 5){
                self.error.windowSensor = 0;
                self.log(accessory.displayName + ': An error occured by getting room temperature, trying again...');
                self.log(err);
                setTimeout(function(){
                  self.getWindowState(accessory, service);
                }, 30000);
              } else {
                self.error.windowSensor += 1;
                setTimeout(function(){
                  self.getWindowState(accessory, service);
                }, 15000);
              }
              service.getCharacteristic(Characteristic.CurrentTemperature).updateValue(accessory.context.lastRoomTemperature);
              service.getCharacteristic(Characteristic.CurrentRelativeHumidity).updateValue(accessory.context.lastRoomHumidity);
            }
          }
        }
      });
  }
  
}

module.exports = TADO;
