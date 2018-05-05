'use strict';

const HomeKitTypes = require('./types.js');
const https = require('https');
const moment = require('moment');

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
      thermostat: 1,
      central: 2,
      occupancy: 3,
      weather: 4
    };

    // Error count
    this.error = {
      thermostats: 0,
      central: 0,
      occupancy: 0,
      weather: 0
    };
    
    //Sleep function
    this.sleep = function(time) {
      return new Promise((resolve) => setTimeout(resolve, time));
    };

    // Init req promise
    this.getContent = function(url) {
      return new Promise((resolve, reject) => {
        const request = https.get(url, (response) => {
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
      case 1:
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
      default:
        break;
    }

    this.log('Publishing new accessory: ' + name);

    accessory = this.accessories[name];
    const uuid = UUIDGen.generate(name);

    accessory = new PlatformAccessory(name, uuid, deviceType);
    accessory.addService(accessoryType, name);
    if(parameter.type == self.types.thermostat)accessory.addService(Service.BatteryService);

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
    accessory.context.serialNo = parameter.serialNo;
    accessory.context.type = parameter.type;
    accessory.context.model = parameter.model;
    
    switch (parameter.type) {
      case 1:
        accessory.context.zoneID = parameter.zoneID;
        accessory.context.heatValue = 5;
        accessory.context.coolValue = 5;
        accessory.context.delayTimer = 0;
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
        accessory.context.lastTargetTemp = 5;
        accessory.context.lastHumidity = 0;
        accessory.context.lastCurrentState = 0;
        accessory.context.lastTargetState = 0;
        break;
      case 2:
        accessory.context.lastMainState = false;
        accessory.context.lastDummyState = false;
        break;
      case 3:
        accessory.context.atHome = parameter.atHome;
        accessory.context.lastState = 0;
        accessory.context.lastActivation = moment().unix();
        break;
      case 4:
        accessory.context.lastWeatherTemperature = 0.00;
        break;
      default:
        break;
    }
    
    accessory.getService(Service.AccessoryInformation)
      .setCharacteristic(Characteristic.Name, parameter.name)
      .setCharacteristic(Characteristic.Identify, parameter.name)
      .setCharacteristic(Characteristic.Manufacturer, 'SeydX')
      .setCharacteristic(Characteristic.Model, parameter.model)
      .setCharacteristic(Characteristic.SerialNumber, parameter.serialNo)
      .setCharacteristic(Characteristic.FirmwareRevision, require('../package.json').version);
      
    //FakeGato
    if(parameter.logging){
      accessory.context.logging = parameter.logging;
      accessory.context.loggingType = parameter.loggingType; 
      accessory.context.loggingTimer = parameter.loggingTimer;
      accessory.context.loggingOptions = {storage:'fs',path:self.HBpath, disableTimer: accessory.context.loggingTimer};
      accessory.context.loggingService = new FakeGatoHistoryService(accessory.context.loggingType,accessory,accessory.context.loggingOptions);
      accessory.context.loggingService.subtype = parameter.serialNo;
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
          .updateValue(accessory.context.lastAutos);
          
        if (!service.testCharacteristic(Characteristic.OfflineThermostats))service.addCharacteristic(Characteristic.OfflineThermostats);
        service.getCharacteristic(Characteristic.OfflineThermostats)
          .updateValue(accessory.context.lastManuals);
          
        if (!service.testCharacteristic(Characteristic.AutoThermostats))service.addCharacteristic(Characteristic.AutoThermostats);
        service.getCharacteristic(Characteristic.AutoThermostats)
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
          .updateValue(accessory.context.lastActivation)
          .on('get', self.getMotionLastActivation.bind(this, accessory, service));  
        
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
        break;
      }
    } self.getHistory(accessory, service, type);
  }
  
  /********************************************************************************************************************************************************/
  /********************************************************************************************************************************************************/
  /************************************************************************* HISTORY **********************************************************************/
  /********************************************************************************************************************************************************/
  /********************************************************************************************************************************************************/
  
  getHistory(accessory, service, type){
    const self = this;
    if(accessory.context.logging){
      var latestTemp, historyTimer;
      const totallength = accessory.context.loggingService.history.length - 1;    
      //const latestTime = accessory.context.loggingService.history[totallength].time;
      if(accessory.context.loggingService.history[totallength].temp) latestTemp = accessory.context.loggingService.history[totallength].temp;
      switch(type){
        case 1:{ //THERMOSTAT
          historyTimer = 60 * 1000; //1min
          if(accessory.context.lastCurrentTemp != latestTemp){
            self.log(accessory.displayName + ': Temperature changed to ' + accessory.context.lastCurrentTemp);
            accessory.context.loggingService.addEntry({
              time: moment().unix(),
              temp: accessory.context.lastCurrentTemp,
              pressure: 0,
              humidity: accessory.context.lastHumidity
            });
          }
          break;
        }
        case 2: //CENTRAL SWITCHN
          //NO HISTORY
          break;
        case 3:{ //OCCUPANCY
          historyTimer = 1000; //1sec
          var newState = accessory.context.atHome ? 1:0;
          if(accessory.displayName == self.config.name + ' Anyone'){
            if(newState != accessory.context.lastState){
              if(newState == 0) self.log('Nobody at home!');
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
          if(accessory.context.lastWeatherTemperature != latestTemp){
            self.log(accessory.displayName + ': Temperature changed to ' + accessory.context.lastWeatherTemperature);
            accessory.context.loggingService.addEntry({
              time: moment().unix(),
              temp: accessory.context.lastWeatherTemperature,
              pressure: 0,
              humidity: 0
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
        }, 10000);
      })
      .catch((err) => {
        if(self.error.thermostats > 5){
          self.error.thermostats = 0;
          self.log('An error occured by getting thermostat state, trying again...');
          self.log(err);
          setTimeout(function(){
            self.getThermoStates(accessory, service, battery);
          }, 30000);
        } else {
          self.error.thermostats += 1;
          setTimeout(function(){
            self.getThermoStates(accessory, service, battery);
          }, 10000);
        }
        service.getCharacteristic(Characteristic.CurrentHeatingCoolingState).updateValue(accessory.context.lastCurrentState);
        service.getCharacteristic(Characteristic.TargetHeatingCoolingState).updateValue(accessory.context.lastTargetState);
        service.getCharacteristic(Characteristic.TargetTemperature).updateValue(accessory.context.lastTargetTemp);
        service.getCharacteristic(Characteristic.CurrentTemperature).updateValue(accessory.context.lastCurrentTemp);
        service.getCharacteristic(Characteristic.CurrentRelativeHumidity).updateValue(accessory.context.lastHumidity);
      });
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
        if (accessory.context.delayTimer > 0) {
          self.log(accessory.displayName + ': Switching to automatic mode in ' + accessory.context.delayTimer + ' seconds...');
          self.sleep(accessory.context.delayTimer*1000).then(() => {
            let req = https.request(options, function(res) {
              self.log(accessory.displayName + ': Switched to AUTO (' + res.statusCode + ')');
            });
            req.on('error', function(err) {
              self.log(accessory.displayName + ': An error occured by setting AUTO state!');
              self.log(err);
            });
            req.end();
            accessory.context.lastCurrentState = 0;
            accessory.context.lastTargetState = 3;
            accessory.context.lastTargetTemp = accessory.context.targetAutoTemp;
            service.getCharacteristic(Characteristic.CurrentHeatingCoolingState).updateValue(accessory.context.lastCurrentState);
            service.getCharacteristic(Characteristic.TargetHeatingCoolingState).updateValue(accessory.context.lastTargetState);
            service.getCharacteristic(Characteristic.TargetTemperature).updateValue(accessory.context.lastTargetTemp);
          });
        } else {
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
        }
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
  /****************************************************************** CENTRAL SWITCH **********************************************************************/
  /********************************************************************************************************************************************************/
  /********************************************************************************************************************************************************/
  
  getCentralSwitch(accessory, service){
    const self = this;
    const allAccessories = self.accessories;
    accessory.context.lastAutos = 0;
    accessory.context.lastManuals = 0;
    accessory.context.lastOffs = 0;
    for(const i in allAccessories){
      if(allAccessories[i].context.type == self.types.thermostat){
        const state = allAccessories[i].getService(Service.Thermostat).getCharacteristic(Characteristic.TargetHeatingCoolingState).value;
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
      accessory.context.lastDummyState ? self.log('Dummy Switch: ON') : self.log('Dummy Switch: OFF');
    }
    service.getCharacteristic(Characteristic.On).updateValue(accessory.context.lastMainState);
    service.getCharacteristic(Characteristic.AutoThermostats).updateValue(accessory.context.lastAutos);
    service.getCharacteristic(Characteristic.ManualThermostats).updateValue(accessory.context.lastManuals);
    service.getCharacteristic(Characteristic.OfflineThermostats).updateValue(accessory.context.lastOffs);
    setTimeout(function(){
      self.getCentralSwitch(accessory, service);
    }, 1000);
  }
  
  setCentralSwitch(accessory, service, state, callback){
    const self = this;
    const allAccessories = self.accessories;
    for(const i in allAccessories){
      if(allAccessories[i].context.type == self.types.thermostat){
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
  
  getMotionLastActivation(accessory, service, callback){
    const totallength = accessory.context.loggingService.history.length - 1;    
    const latestTime = accessory.context.loggingService.history[totallength].time;
    const state = accessory.context.atHome ? 1:0;    
    state == 1 ? accessory.context.lastActivation = moment().unix() : accessory.context.lastActivation = latestTime - accessory.context.loggingService.getInitialTime();
    callback(null, accessory.context.lastActivation);
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
        }, 10000);
      })
      .catch((err) => {
        if(self.error.weather > 5){
          self.error.weather = 0;
          self.log('An error occured by getting weather data, trying again...');
          self.log(err);
          setTimeout(function(){
            self.getWeather(accessory, service);
          }, 30000);
        } else {
          self.error.weather += 1;
          setTimeout(function(){
            self.getWeather(accessory, service);
          }, 10000);
        }
        service.getCharacteristic(Characteristic.CurrentTemperature).updateValue(accessory.context.lastWeatherTemperature);
      });
  }
  
}

module.exports = TADO;
