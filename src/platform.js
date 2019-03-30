'use strict';

const packageFile = require('../package.json');
const LogUtil = require('../lib/LogUtil.js');

const Tado = require('../lib/Tado.js');
const tadoHandler = require('../lib/tadoHandler.js');
const debug = require('debug')('TadoPlatform');
const store = require('json-fs-store');

//Accessories
const weather_Accessory = require('./accessories/weather.js');
const sensor_Accessory = require('./accessories/sensor.js');
const window_Accessory = require('./accessories/window.js');
const occupancy_Accessory = require('./accessories/occupancy.js');
const thermostat_Accessory = require('./accessories/thermostat.js');
const switch_Accessory = require('./accessories/switch.js');

const pluginName = 'homebridge-tado-platform';
const platformName = 'TadoPlatform';

var Accessory, Service, Characteristic, UUIDGen;

module.exports = function (homebridge) {

  Accessory = homebridge.platformAccessory;
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  UUIDGen = homebridge.hap.uuid;
  
  return TadoPlatform;
};

function TadoPlatform (log, config, api) {

  if (!api||!config) return;

  if(!config.username||!config.password) {
    log('No credentials in config.json!');
    return;
  }

  this.log = log;
  this.logger = new LogUtil(null, log);
  this.debug = debug;
  this.accessories = [];
  this._accessories = new Map();
  this.config = config;
  this.configPath = api.user.storagePath();
  this.HBpath = api.user.storagePath()+'/accessories';

  this.loggedIn = false;

  if (api) {

    if (api.version < 2.2) {
      throw new Error('Unexpected API version. Please update your homebridge!');
    }

    this.logger.info('**************************************************************');
    this.logger.info('TadoPlatform v'+packageFile.version+' by SeydX');
    this.logger.info('GitHub: https://github.com/SeydX/'+pluginName);
    this.logger.info('Email: seyd55@outlook.de');
    this.logger.info('**************************************************************');
    this.logger.info('start success...');

    this.api = api;
    this.tado = new Tado();

    this.api.on('didFinishLaunching', this._login.bind(this));

  }
}

TadoPlatform.prototype = {

  _login: async function(){

    try {
    
      await this.tado.login(this.config.username, this.config.password);
      this._checkConfig();

    } catch(err) {
    
      debug(err);
      
    }

  },

  _checkConfig: async function(){

    try {

      this.config.polling = this.config.polling||10;
      this.config.exclude = [];
      
      this.config.deviceOptions = this.config.deviceOptions||{};

      if(!this.config.unit) {

        let response = await this.tado.getMe();
        this.config.unit = response.locale === 'en' ? 'fahrenheit' : 'celsius';
 
      }
      
      // fetch homeID

      if(this.config.homeID) {

        this.tadoHandler = new tadoHandler(this);

      } else if(this.config.homeName) {

        let response = await this.tado.getMe();

        let error = true;

        for(const i in response.homes){
          if(this.config.homeName === response.homes[i].name){
            this.config.homeID = response.homes[i].id;
            
            this.tadoHandler = new tadoHandler(this);

            error = false;
          }
        }

        if(error){
          this.logger.warn('Error! Please check your home name in config.json!');
          return;   
        }

      } else {

        let response = await this.tado.getMe();

        let error = true;

        if(!(response.homes.length > 1)) {
          this.config.homeID = response.homes[0].id;
          
          this.tadoHandler = new tadoHandler(this);

          error = false;
        }

        if(error){
          this.logger.warn('Found ' + response.homes.length + ' home entries! Please define current home name in config.json and restart homebridge!');
          return;
        }

      }
      
      let deviceArray = await this.tadoHandler.getData();
      
      deviceArray.map( dev => {
      
        if(dev.type === 'thermostat') {
      
          if(Object.keys(this.config.deviceOptions).length){
    
            for(const i in this.config.deviceOptions){
  
              this.config.deviceOptions[dev.serial] = this.config.deviceOptions[dev.serial]||{};              
              this.config.deviceOptions[dev.serial].active = ( this.config.deviceOptions[dev.serial].active === undefined ) ? true : this.config.deviceOptions[dev.serial].active;
              this.config.deviceOptions[dev.serial].heatValue = !isNaN(parseInt(this.config.deviceOptions[dev.serial].heatValue)) ? this.config.deviceOptions[dev.serial].heatValue : 5;              
              this.config.deviceOptions[dev.serial].coolValue = !isNaN(parseInt(this.config.deviceOptions[dev.serial].coolValue)) ? this.config.deviceOptions[dev.serial].coolValue : 5;              
              this.config.deviceOptions[dev.serial].roomName = dev.zoneName;
                
              if(!this.config.deviceOptions[dev.serial].active && !this.config.exclude.includes(dev.serial)) this.config.exclude.push(dev.serial);
  
            }
    
          } else {
 
            this.config.deviceOptions[dev.serial] = this.config.deviceOptions[dev.serial]||{};
            this.config.deviceOptions[dev.serial].active = ( this.config.deviceOptions[dev.serial].active === undefined ) ? true : this.config.deviceOptions[dev.serial].active;
            this.config.deviceOptions[dev.serial].heatValue = !isNaN(parseInt(this.config.deviceOptions[dev.serial].heatValue)) ? this.config.deviceOptions[dev.serial].heatValue : 5;
            this.config.deviceOptions[dev.serial].coolValue = !isNaN(parseInt(this.config.deviceOptions[dev.serial].coolValue)) ? this.config.deviceOptions[dev.serial].coolValue : 5;
            this.config.deviceOptions[dev.serial].roomName = dev.zoneName;

            if(!this.config.deviceOptions[dev.serial].active && !this.config.exclude.includes(dev.serial)) this.config.exclude.push(dev.serial);
    
          }
    
        }
  
      });
  
      let config = {
        homeID: this.config.homeID,
        unit: this.config.unit,
        polling: this.config.polling,
        exclude: this.config.exclude,
        occupancy: this.config.occupancy||false,
        anyone: this.config.anyone||false,
        weather: this.config.weather||false,
        openWindow: this.config.openWindow||false,
        solarIntensity: this.config.solarIntensity||false,
        centralSwitch: this.config.centralSwitch||false,
        externalSensor: this.config.externalSensor||false,
        deviceOptions: this.config.deviceOptions
      };
      
      let newConfig = await this._refreshConfig(config);      
      this.debug(JSON.stringify(newConfig,null,4));
      
      this.loggedIn = true;
      
      this._initPlatform();

    } catch(err) {

      this.logger.error('An error occured while checking config! Trying again..');
      debug(err);
      
      setTimeout(this._checkConfig.bind(this),5000);

    }

  },
  
  _refreshConfig: function(object,accessory,deviceOptions){
  
    const self = this;
    let name = accessory ? accessory.displayName : 'Platform';
  
    return new Promise((resolve, reject) => {

      if(object && Object.keys(object).length){
  
        self.debug(name + ': Writing new parameter into config.json...');

        let path = this.configPath;
        store(path).load('config', function(err,obj){    
          if(obj){
                  
            if(!(obj.id === 'config')) { 
              self.firstLaunch = true;
              self.logger.initinfo('Init first launch');
            }
            
            self.debug(name + ': Config.json loaded!');
      
            obj.id = 'config';
        
            for(const i in obj.platforms){
              if(obj.platforms[i].platform === 'TadoPlatform'){
              
                if(deviceOptions){
              
                  for(const j in obj.platforms[i].deviceOptions){
              
                    if(j === accessory.context.serial){
              
                      for(const l in object){
              
                        obj.platforms[i].deviceOptions[j][l] = object[l];
                    
                      }
              
                    }
              
                  }
              
                } else {
            
                  for(const j in object){
                  
                    obj.platforms[i][j] = object[j];
                    
                  }
            
                } 
                
              }
            }
        
            store(path).add(obj, function(err) {
              if(err)reject(err);
              
              if(self.firstLaunch){
                self.logger.initinfo('Config.json refreshed');
                //self.logger.initinfo(' ');
                //self.logger.initinfo(JSON.stringify(object,null,4));
              }
              
              self.debug(name + ': Config.json refreshed!');
              
              resolve(self.config);
            });
        
          } else {
            reject(err);
          }
        });
    
      } else {
    
        reject(name + ': Can not write new parameter into config.json, no key(s) defined!');
    
      }

    });
  
  },

  _initPlatform: async function(){

    this._devices = new Map();
    
    try {
  
      let deviceArray = await this.tadoHandler.getData();
      deviceArray.map( dev => this._devices.set(dev.serial, dev));
      deviceArray.map( dev => this._addOrRemoveDevice(dev, dev.serial, dev.type, (dev.type === 'occupancy' ? dev.gps : dev.enabled) ));
    
    } catch(err) {
    
      this.logger.error('An error occured while fetching devices!');
      debug(err);
    
    } finally {

      setTimeout(this._initPlatform.bind(this),2000);
      
    }
    
  },

  _addOrRemoveDevice: function(object, serial, type, rm) {

    if(rm === false){

      this.accessories.map( accessory => {

        if(accessory.context.serial === serial){
          this._accessories.delete(serial);
          this.removeAccessory(accessory);
        }

      });

    } else {

      if(!this.config.exclude.includes(serial)){

        const accessory = this._accessories.get(serial);

        if(!accessory){

          this._accessories.set(serial, object);

          this.addAccessory(object);

        }

      }

      this.accessories.map( accessory => {

        if(!this._devices.has(accessory.context.serial)){

          this._accessories.delete(accessory.context.serial);
          this.removeAccessory(accessory);

        }

        this.config.exclude.map( exSerial => {

          if(this._accessories.has(exSerial) && accessory.context.serial === exSerial){

            this._accessories.delete(exSerial);
            this.removeAccessory(accessory);
          }

        });

      });

    }

  },
  
  _refreshContext: function(accessory, object, type, add){
  
    accessory.reachable = true;
    accessory.context.homeID = this.config.homeID;
    accessory.context.unit = this.config.unit === 'fahrenheit' ? 1 : 0;
    accessory.context.polling = this.config.polling * 1000;
    
    for(const i in this.config.deviceOptions){
      if(i===accessory.context.serial){
        accessory.context.heatValue = this.config.deviceOptions[i].heatValue;
        accessory.context.coolValue = this.config.deviceOptions[i].coolValue;
      }
    }

    if(add){
      accessory.context.serial = object.serial;
      accessory.context.type = object.type;
      if(object.id) accessory.context.id = object.id;
      if(object.zoneID) accessory.context.zoneID = object.zoneID;
      if(object.zoneName) accessory.context.zoneName = object.zoneName;
      if(object.zoneType) accessory.context.zoneType = object.zoneType;
      if(object.deviceType) accessory.context.deviceType = object.deviceType.replace(/[0-9]/g, '');      
    }
    
    if(accessory.context.unit === 1){
      accessory.context.minValue = accessory.context.zoneType === 'HOT_WATER' ? 86 : 41;
      accessory.context.maxValue = accessory.context.zoneType === 'HOT_WATER' ? 149 : 77;
    } else {
      accessory.context.minValue = accessory.context.zoneType === 'HOT_WATER' ? 30 : 5;
      accessory.context.maxValue = accessory.context.zoneType === 'HOT_WATER' ? 65 : 25;
    }
    
  },

  _addOrConfigure: function(accessory, object, type, add){

    this._refreshContext(accessory, object, type, add);    
    this._addOrConfAccessoryInformation(accessory);

    switch(type){

      case 'thermostat':

        if(add){
          accessory.addService(Service.Thermostat, object.name);
          accessory.addService(Service.BatteryService);
        }
        
        if(this.config.deviceOptions.hasOwnProperty(accessory.context.serial) && !this.config.exclude.includes(accessory.context.serial)){
          if(!add)this.logger.info('Configuring accessory ' + accessory.displayName);
          new thermostat_Accessory(this, accessory);
        }

        break;

      case 'occupancy':

        if(add)
          accessory.addService(Service.OccupancySensor, object.name);
        
        if(this.config.occupancy){
          if(!add)this.logger.info('Configuring accessory ' + accessory.displayName);
          new occupancy_Accessory(this, accessory);
        }

        break;

      case 'contact':

        if(add)
          accessory.addService(Service.ContactSensor, object.name);

        if(this.config.openWindow){
          if(!add)this.logger.info('Configuring accessory ' + accessory.displayName);
          new window_Accessory(this, accessory);
        }

        break;

      case 'temperature':

        if(add)
          accessory.addService(Service.TemperatureSensor, object.name);

        if(this.config.weather){
          if(!add)this.logger.info('Configuring accessory ' + accessory.displayName);
          new weather_Accessory(this, accessory);
        }

        break;
        
      case 'temperature humidity':

        if(add)
          accessory.addService(Service.TemperatureSensor, object.name);

        if(this.config.externalSensor){
          if(!add)this.logger.info('Configuring accessory ' + accessory.displayName);
          new sensor_Accessory(this, accessory);
        }
        
        break;
        
      case 'lightbulb':

        if(add)
          accessory.addService(Service.Lightbulb, object.name);

        if(this.config.solarIntensity){
          if(!add)this.logger.info('Configuring accessory ' + accessory.displayName);
          new weather_Accessory(this, accessory);
        }

        break;
        
      case 'switch':
      
        if(add)
          accessory.addService(Service.Switch, object.name);
          
        if(this.config.centralSwitch){
          if(!add)this.logger.info('Configuring accessory ' + accessory.displayName);
          new switch_Accessory(this, accessory);
        }
      
        break;
        
      default:
        //

    }

  },
  
  _addOrConfAccessoryInformation(accessory){
  
    accessory.getService(Service.AccessoryInformation)
      .setCharacteristic(Characteristic.Name, accessory.displayName)
      .setCharacteristic(Characteristic.Identify, accessory.displayName)
      .setCharacteristic(Characteristic.Manufacturer, 'SeydX')
      .setCharacteristic(Characteristic.Model, accessory.context.type)
      .setCharacteristic(Characteristic.SerialNumber, accessory.context.serial)
      .setCharacteristic(Characteristic.FirmwareRevision, packageFile.version);
  
  },

  addAccessory: function(object){

    this.logger.info('Adding new accessory: ' + object.name);

    let uuid = UUIDGen.generate(object.name);
    let accessory = new Accessory(object.name, uuid);

    accessory.context = {};

    this._addOrConfigure(accessory, object, object.type, true);

    this.accessories.push(accessory);
    this.api.registerPlatformAccessories(pluginName, platformName, [accessory]);

  },

  configureAccessory: function(accessory){

    this._accessories.set(accessory.context.serial, accessory);

    if(this.loggedIn) {

      this.accessories.push(accessory);
      this._addOrConfigure(accessory, null, accessory.context.type, false);

    } else {

      setTimeout(this.configureAccessory.bind(this,accessory),1000);

    }

  },

  removeAccessory: function (accessory) {
    if (accessory) {

      this.logger.warninfo('Removing accessory: ' + accessory.displayName + '. No longer configured.');

      for(const i in this.accessories){
        if(this.accessories[i].displayName === accessory.displayName){
          this.accessories[i].context.remove = true;
        }
      }

      let newAccessories = this.accessories.map( acc => {
        if(acc.displayName !== accessory.displayName){
          return acc;
        }
      });

      let filteredAccessories = newAccessories.filter(function (el) {
        return el != null;
      });

      this.api.unregisterPlatformAccessories(pluginName, platformName, [accessory]); 

      this.accessories = filteredAccessories;

    }
  }

};
