'use strict';

const DeviceHandler = require('./helper/deviceHandler.js');
const Logger = require('./helper/logger.js');
const packageFile = require('../package.json');

const TadoApi = require('./helper/tado.js');
const Telegram = require('./helper/telegram');

//Accessories
const AirqualityAccessory = require('./accessories/airquality.js');
const ContactAccessory = require('./accessories/contact.js');
const FaucetAccessory = require('./accessories/faucet.js');
const HeaterCoolerAccessory = require('./accessories/heatercooler.js');
const HumidityAccessory = require('./accessories/humidity.js');
const MotionAccessory = require('./accessories/motion.js');
const OccupancyAccessory = require('./accessories/occupancy.js');
const SecurityAccessory = require('./accessories/security.js');
const SolarlightAccessory = require('./accessories/lightbulb.js');
const SwitchAccessory = require('./accessories/switch.js');
const TemperatureAccessory = require('./accessories/temperature.js');
const ThermostatAccessory = require('./accessories/thermostat.js');

//Custom Types
const CustomTypes = require('./types/custom.js');
const EveTypes = require('./types/eve.js');

const PLUGIN_NAME = 'homebridge-tado-platform';
const PLATFORM_NAME = 'TadoPlatform';

//https://stackoverflow.com/a/15710692
const hashCode = s => Math.abs(s.split('').reduce((a,b)=>{a=((a<<5)-a)+b.charCodeAt(0);return a&a;},0)).toString();

var Accessory, UUIDGen, FakeGatoHistoryService;

module.exports = function (homebridge) {

  Accessory = homebridge.platformAccessory;
  UUIDGen = homebridge.hap.uuid;
  
  return TadoPlatform;

};

function TadoPlatform (log, config, api) {
  
  if (!api||!config) 
    return;

  //init logger
  Logger.init(log, config.debug);
  
  //init types/fakegato
  CustomTypes.registerWith(api.hap);
  EveTypes.registerWith(api.hap);
  FakeGatoHistoryService = require('fakegato-history')(api);

  this.api = api;
  this.accessories = [];
  this.config = config;
  
  this.devices = new Map();
  this.deviceHandler = new Map();
  
  //setup config/plugin
  this.setupPlugin();

  this.api.on('didFinishLaunching', this.didFinishLaunching.bind(this));
  
}

TadoPlatform.prototype = {
  
  setupPlugin: function(){
     
    try {
      
      if(this.config.homes && this.config.homes.length) {
      
        this.config.homes.forEach(home => {
        
          let error = false;
          let activeZones = 0;
    
          if (!home.name) {
            Logger.warn('There is no name configured for this home. This home will be skipped.');
            error = true;
          } else if (!home.username) {
            Logger.warn('There is no username configured for this home. This home will be skipped.', home.name);
            error = true;
          } else if (!home.password) {
            Logger.warn('There is no password configured for this home. This home will be skipped.', home.name);
            error = true;
          }
    
          if (!error) { 
          
            //Base Config
            const tado = new TadoApi(home.name, { username: home.username, password: home.password });
            
            const accessoryConfig = {
              homeId: home.id,
              homeName: home.name,
              username: home.username,
              password: home.password,
              temperatureUnit: home.temperatureUnit || 'CELSIUS',
              geolocation: home.geolocation,
              tado: tado,
              anyone: home.presence && home.presence.anyone,
              weather: home.weather || {},
              extras: home.extras || {},
              zones: home.zones
                ? home.zones.filter(zone => zone && zone.active)
                : [],
              presence: home.presence && home.presence.user 
                ? home.presence.user.filter(user => user && user.active)
                : [],
              childLock: home.extras && home.extras.childLockSwitches 
                ? home.extras.childLockSwitches.filter(childLockSwitch => childLockSwitch && childLockSwitch.active)
                : [],
              polling: Number.isInteger(home.polling) 
                ?  home.polling < 30 
                  ? 30 
                  : home.polling
                :  30
            };
            
            if(home.zones && home.zones.length){
            
              let validOpenWindowSwitches = [];
            
              home.zones.forEach(zone => {
              
                if(zone.active){
                
                  let valid_boilerTypes = ['SWITCH', 'FAUCET'];
                  let valid_zoneTypes = ['HEATING', 'HOT_WATER'];
                  let valid_modes = ['MANUAL', 'AUTO', 'TIMER'];
                
                  if(!zone.name) {
                    Logger.warn('There is no name configured for this zone. This zone will be skipped.', home.name);
                    error = true;
                  } else if(!valid_zoneTypes.includes(zone.type)){
                    Logger.warn('There is no or no correct zone type configured for this zone. Setting it to "HEATING".', zone.name);
                    zone.type = 'HEATING';
                  }  
            
                  if(!error){ 
                  
                    activeZones += 1;
                    
                    const name = zone.name + (zone.type === 'HEATING' ? ' Heater' : ' Boiler');
                  
                    const uuid = UUIDGen.generate(name);
                    
                    if (this.devices.has(uuid)) {
                 
                      Logger.warn('Multiple devices are configured with this name. Duplicate devices will be skipped.', name);
                 
                    } else {
                      
                      let config = { ...accessoryConfig };
                      
                      config.name = name;    
                    
                      config.subtype = zone.type === 'HEATING' 
                        ? zone.easyMode
                          ? 'zone-heatercooler'
                          : 'zone-thermostat'
                        : valid_boilerTypes.includes(zone.accTypeBoiler) && zone.accTypeBoiler === 'FAUCET'
                          ? 'zone-faucet'
                          : 'zone-switch'; 
                      
                      config.subtype = zone.boilerTempSupport 
                        ? 'zone-heatercooler-boiler'
                        :  config.subtype;
                        
                      config.zoneId = zone.id;
                      config.type = zone.type;
                      config.separateTemperature = zone.separateTemperature;
                      config.separateHumidity = zone.separateHumidity;
                      config.openWindowSensor = zone.openWindowSensor;
                      config.openWindowSwitch = zone.openWindowSwitch;
                      config.noBattery = zone.noBattery;
                      config.mode = valid_modes.includes(zone.mode)
                        ? zone.mode
                        : 'MANUAL';
                      config.modeTimer = zone.modeTimer && zone.modeTimer >= 1
                        ? zone.modeTimer
                        : 1;
                      config.delaySwitch = zone.delaySwitch;
                      config.model = zone.type;
                      config.serialNumber = hashCode(name);
                      
                      this.devices.set(uuid, config);
                      
                      //Configure openWindowSensor
                      if(zone.openWindowSensor){
                        
                        const uuid2 = UUIDGen.generate(zone.name + ' Window Sensor');
                        
                        if (this.devices.has(uuid2)) {
                        
                          Logger.warn('Multiple devices are configured with this name. Duplicate devices will be skipped.', zone.name + ' Window Sensor');
                        
                        } else {
                        
                          let newConfig = { ...config };
                          newConfig.name = zone.name + ' Window Sensor';
                          newConfig.subtype = 'zone-window-contact';
                          newConfig.model = newConfig.subtype;
                          newConfig.serialNumber = hashCode(zone.name);
                        
                          this.devices.set(uuid2, newConfig);
                        
                        }
                      
                      }
                      
                      //Configure openWindowSwitch
                      if(zone.openWindowSwitch){
                      
                        validOpenWindowSwitches.push({
                          name: zone.name + ' Window',
                          zoneId: zone.id
                        });
                      
                      }
                      
                      //Configure  Separate TemperatureSensor
                      if(zone.separateTemperature){
                        
                        const uuid2 = UUIDGen.generate(zone.name + ' Temperature Sensor');
                        
                        if (this.devices.has(uuid2)) {
                        
                          Logger.warn('Multiple devices are configured with this name. Duplicate devices will be skipped.', zone.name + ' Temperature Sensor');
                        
                        } else {
                        
                          let newConfig = { ...config };
                          newConfig.name = zone.name + ' Temperature Sensor';
                          newConfig.subtype = 'zone-temperature';
                          newConfig.model = newConfig.subtype;
                          newConfig.serialNumber = hashCode(zone.name);
                        
                          this.devices.set(uuid2, newConfig);
                        
                        }
                      
                      }
                      
                      //Configure  Separate HumiditySensor
                      if(zone.separateHumidity){
                        
                        const uuid2 = UUIDGen.generate(zone.name + ' Humidity Sensor');
                        
                        if (this.devices.has(uuid2)) {
                        
                          Logger.warn('Multiple devices are configured with this name. Duplicate devices will be skipped.', zone.name + ' Humidity Sensor');
                        
                        } else {
                        
                          let newConfig = { ...config };
                          newConfig.name = zone.name + ' Humidity Sensor';
                          newConfig.subtype = 'zone-humidity';
                          newConfig.model = newConfig.subtype;
                          newConfig.serialNumber = hashCode(zone.name);
                        
                          this.devices.set(uuid2, newConfig);
                        
                        }
                      
                      }
                      
                    }
                  
                  }
                
                }
          
              });
              
              if(validOpenWindowSwitches.length){
              
                const name = 'Open Window';
                const uuid = UUIDGen.generate(name);
                 
                if (this.devices.has(uuid)) {
               
                  Logger.warn('Multiple devices are configured with this name. Duplicate devices will be skipped.', name);
               
                } else {
                     
                  let config = { ...accessoryConfig };
                     
                  config.name = name;
                  config.subtype = 'zone-window-switch';
                  config.openWindows = validOpenWindowSwitches; 
                  config.model = config.subtype;
                  config.serialNumber = hashCode(name);
                
                  this.devices.set(uuid, config);
                    
                }
              
              }
            
            }
            
            error = false;
            
            //Configure Presence
            if(home.presence && home.presence.user && home.presence.user.length){
               
              let valid_userTypes = ['MOTION', 'OCCUPANCY'];
              let activeUser = 0;
               
              home.presence.user.forEach(user => {
               
                if(user.active){
                  
                  if(!user.name) {
                    Logger.warn('There is no name configured for this user. This user will be skipped.', home.name);
                    error = true;
                  }
                   
                  if(!error){   
                   
                    const uuid = UUIDGen.generate(user.name);
                     
                    if (this.devices.has(uuid)) {
                   
                      Logger.warn('Multiple devices are configured with this name. Duplicate devices will be skipped.', user.name);
                   
                    } else {
                      
                      activeUser += 1;
                         
                      let config = { ...accessoryConfig };
                         
                      config.name = user.name;
                      config.subtype = valid_userTypes.includes(user.accType) && user.accType === 'MOTION'
                        ? 'presence-motion'
                        : 'presence-occupancy';
                      config.anyone = home.presence.anyone;
                       
                      config.model = config.subtype;
                      config.serialNumber = hashCode(user.name);
                    
                      this.devices.set(uuid, config);
                        
                    }
                   
                  }
                   
                }
               
              });
               
              //Coinfigure Anyone Sensor
              if(activeUser && home.presence.anyone){
                  
                const name = 'Anyone Sensor'; 
                const uuid = UUIDGen.generate(name);
                 
                if (this.devices.has(uuid)) {
               
                  Logger.warn('Multiple devices are configured with this name. Duplicate devices will be skipped.', name);
               
                } else {
                     
                  let config = { ...accessoryConfig };
                     
                  config.name = name;
                  config.subtype = valid_userTypes.includes(config.accTypeAnyone) && config.accTypeAnyone === 'MOTION'
                    ? 'presence-motion'
                    : 'presence-occupancy';
                  config.anyone = home.presence.anyone;
                   
                  config.model = config.subtype;
                  config.serialNumber = hashCode(name);
                   
                  this.devices.set(uuid, config);
                    
                }
               
              }
              
            }
            
            error = false;
            
            //Configure Weather
            if(home.weather){
             
              //Configure Weather TemperatureSensor
              if(home.weather.temperatureSensor){
               
                const name = 'Weather Temperature Sensor'; 
                const uuid = UUIDGen.generate(name);
                 
                if (this.devices.has(uuid)) {
               
                  Logger.warn('Multiple devices are configured with this name. Duplicate devices will be skipped.', name);
               
                } else {
                     
                  let config = { ...accessoryConfig };
                     
                  config.name = name;
                  config.subtype = 'weather-temperature';
                   
                  config.model = 'Weather Temperature';
                  config.serialNumber = hashCode(name);
                   
                  this.devices.set(uuid, config);
                    
                }
                 
              }
               
              //Configure Weather SolarIntensity Lightbulb
              if(home.weather.solarIntensity){
               
                const name = 'Solar Intensity'; 
                const uuid = UUIDGen.generate(name);
                 
                if (this.devices.has(uuid)) {
               
                  Logger.warn('Multiple devices are configured with this name. Duplicate devices will be skipped.', name);
               
                } else {
                     
                  let config = { ...accessoryConfig };
                     
                  config.name = name;
                  config.subtype = 'weather-lightbulb';
                   
                  config.model = 'Solar Intensity';
                  config.serialNumber = hashCode(name);
                   
                  this.devices.set(uuid, config);
                    
                }
               
              }
               
              //Configure Weather AirQuality Sensor
              if(home.weather.airQuality && home.geolocation && home.geolocation.latitude && home.geolocation.longitude){
               
                const name = 'Air Quality Sensor'; 
                const uuid = UUIDGen.generate(name);
                 
                if (this.devices.has(uuid)) {
               
                  Logger.warn('Multiple devices are configured with this name. Duplicate devices will be skipped.', name);
               
                } else {
                     
                  let config = { ...accessoryConfig };
                     
                  config.name = name;
                  config.subtype = 'weather-airquality';
                  config.latitude = home.geolocation.latitude;
                  config.longitude = home.geolocation.longitude;
                  
                  config.model = 'Air Quality Sensor';
                  config.serialNumber = hashCode(name);
                   
                  this.devices.set(uuid, config);
                    
                }
               
              }
            
            }
            
            error = false;
            
            //Configure Extras
            if(home.extras){
              
              if(activeZones){
              
                let validSwitches = [];
                
                //Configure Central Switch
                if(home.extras.centralSwitch){
                
                  validSwitches.push({
                    name: 'Central',
                    sub: 'Central'
                  });

                  //Configure Boost Switch
                  if(home.extras.boostSwitch){
                   
                    validSwitches.push({
                      name: 'Boost',
                      sub: 'CentralBoost'
                    });
                   
                  }
                  
                  //Configure Shedule Switch
                  if(home.extras.sheduleSwitch){
                   
                    validSwitches.push({
                      name: 'Shedule',
                      sub: 'CentralShedule'
                    });
                   
                  }
                  
                  //Configure Turnoff Switch
                  if(home.extras.turnoffSwitch){
                   
                    validSwitches.push({
                      name: 'Off',
                      sub: 'CentralOff'
                    });
                   
                  }
               
                }
                
                if(validSwitches.length){ 
                
                  const name = 'Central Switch'; 
                  const uuid = UUIDGen.generate(name);
                   
                  if (this.devices.has(uuid)) {
                 
                    Logger.warn('Multiple devices are configured with this name. Duplicate devices will be skipped.', name);
                 
                  } else {
                       
                    let config = { ...accessoryConfig };
                       
                    config.name = name;
                    config.subtype = 'extra-cntrlswitch';
                    config.runningInformation = home.extras.runningInformation; 
                    config.rooms = home.zones.filter(zne => zne && zne.id);
                    config.switches = validSwitches;
                    config.model = 'Central Switch';
                    config.serialNumber = hashCode(name);
                     
                    this.devices.set(uuid, config);
                      
                  }
                
                }
              
              }
               
              //Configure PresenceLock Security
              if(home.extras.presenceLock){
               
                const name = 'Presence Lock'; 
                const uuid = UUIDGen.generate(name);
                 
                if (this.devices.has(uuid)) {
               
                  Logger.warn('Multiple devices are configured with this name. Duplicate devices will be skipped.', name);
               
                } else {
                     
                  let config = { ...accessoryConfig };
                     
                  config.name = name;
                  config.subtype = home.extras.accTypePresenceLock === 'ALARM'
                    ? 'extra-plock'
                    : 'extra-plockswitch';
                   
                  config.model = 'Presence Lock';
                  config.serialNumber = hashCode(name);
                   
                  this.devices.set(uuid, config);
                    
                }
               
              }
              
              //Configure ChildLock Switch
              if(home.extras.childLockSwitches){
              
                let validSwitches = [];
              
                home.extras.childLockSwitches.forEach(childLock => {
                
                  if(childLock.active){
                    
                    if(!childLock.name) {
                      Logger.warn('There is no name configured for this child lock switch. This switch will be skipped.', home.name);
                      error = true;
                    }
                     
                    if(!error){  
                    
                      validSwitches.push(childLock); 
                     
                    }
                     
                  }
                
                
                });
                
                if(validSwitches.length){
                
                  const name = 'Child Lock';
                  const uuid = UUIDGen.generate(name);
                   
                  if (this.devices.has(uuid)) {
                 
                    Logger.warn('Multiple devices are configured with this name. Duplicate devices will be skipped.', name);
                 
                  } else {
                       
                    let config = { ...accessoryConfig };
                       
                    config.name = name;
                    config.subtype = 'extra-childswitch';
                    config.childLocks = validSwitches; 
                    config.model = config.subtype;
                    config.serialNumber = hashCode(name);
                  
                    this.devices.set(uuid, config);
                      
                  }
                
                }
               
              }
            
            }
            
            if(home.telegram && home.telegram.active && home.telegram.token && home.telegram.chatID){
          
              this.telegramConfig = home.telegram;
              this.telegramConfig.messages = home.telegram.messages || {};
              this.messages = {};
             
              Object.keys(this.telegramConfig.messages)
                .filter( msg => Object.keys(this.telegramConfig.messages[msg]).length )
                .map(msg => {
                  this.messages[msg] = {
                    ...this.telegramConfig.messages[msg]
                  };
                });
                
              this.telegram = new Telegram(this.telegramConfig, this.messages);  
              
            } else {
          
              Logger.debug('Telegram is not or not correctly set up. Skip.');
              
              this.telegramConfig = false;
              this.messages = false;
          
            }  
            
            this.deviceHandler.set(home.name, accessoryConfig);
          
          }
          
        });
        
      }                                                                                                     
    
    } catch(err) {
    
      Logger.error('An error occured during setting up plugin!');
      Logger.error(err);
    
    }
    
    return;
  
  },
  
  didFinishLaunching: function(){
  
    for (const entry of this.devices.entries()) {
    
      let uuid = entry[0];
      let device = entry[1];
      
      const cachedAccessory = this.accessories.find(curAcc => curAcc.UUID === uuid);
      
      if (!cachedAccessory) {
      
        const accessory = new Accessory(device.name, uuid);

        Logger.info('Configuring new accessory...', accessory.displayName); 
        
        this.setupAccessory(accessory, device);
        
        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
        
        this.accessories.push(accessory);
        
      }
      
    }

    this.accessories.forEach(accessory => {
    
      const device = this.devices.get(accessory.UUID);
      
      try {
      
        if (!device)
          this.removeAccessory(accessory);
    
      } catch(err) {

        Logger.info('It looks like the device has already been removed. Skip removing.', device.name);
        Logger.debug(err);
     
      }
      
    });
    
    for(const entry of this.deviceHandler.entries()){
        
      const name = entry[0];
      const config = entry[1];
      
      const tado = config.tado;
      delete config.tado;
      
      let accessories = this.accessories
        .filter(acc => acc && acc.context.config.homeName === name);
      
      const deviceHandler = DeviceHandler(this.api, accessories, config, tado, this.telegram);
      deviceHandler.getStates();
      
    }
    
  },
  
  setupAccessory: function(accessory, device){
    
    accessory.on('identify', () => {
      Logger.info('Identify requested.', accessory.displayName);
    });
    
    const manufacturer = 'Tado';
      
    const model = device.model
      ? device.model 
      : device.subtype;
    
    const serialNumber = device.serialNumber
      ? device.serialNumber 
      : '123456789';
    
    const AccessoryInformation = accessory.getService(this.api.hap.Service.AccessoryInformation);
    
    AccessoryInformation
      .setCharacteristic(this.api.hap.Characteristic.Manufacturer, manufacturer)
      .setCharacteristic(this.api.hap.Characteristic.Model, model)
      .setCharacteristic(this.api.hap.Characteristic.SerialNumber, serialNumber)
      .setCharacteristic(this.api.hap.Characteristic.FirmwareRevision, packageFile.version);
    
    const tado = device.tado;
    
    delete device.tado;
    delete device.geolocation;
    delete device.zones;
    delete device.presence;
    delete device.anyone;
    delete device.weather;
    delete device.extras;
    delete device.childLock;
    
    accessory.context.config = device;
    
    const configHandler = this.deviceHandler.get(accessory.context.config.homeName);
    const deviceHandler = DeviceHandler(this.api, false, configHandler, tado, this.telegram);
    
    switch (device.subtype) {
      case 'zone-thermostat':
        new ThermostatAccessory(this.api, accessory, this.accessories, tado, deviceHandler, FakeGatoHistoryService);   
        break;        
      case 'zone-heatercooler':
      case 'zone-heatercooler-boiler':
        new HeaterCoolerAccessory(this.api, accessory, this.accessories, tado, deviceHandler);
        break;
      case 'zone-switch': 
      case 'zone-window-switch':
      case 'extra-childswitch':
      case 'extra-cntrlswitch':
      case 'extra-boost':
      case 'extra-shedule':
      case 'extra-turnoff':
      case 'extra-plockswitch':
        new SwitchAccessory(this.api, accessory, this.accessories, tado, deviceHandler);  
        break;        
      case 'zone-faucet': 
        new FaucetAccessory(this.api, accessory, this.accessories, tado, deviceHandler);
        break;        
      case 'zone-window-contact':
        new ContactAccessory(this.api, accessory, this.accessories, tado, deviceHandler, FakeGatoHistoryService);
        break;
      case 'zone-temperature':
        new TemperatureAccessory(this.api, accessory, this.accessories, tado, deviceHandler, FakeGatoHistoryService);
        break;
      case 'zone-humidity':
        new HumidityAccessory(this.api, accessory, this.accessories, tado, deviceHandler, FakeGatoHistoryService);
        break;
      case 'presence-motion':
        new MotionAccessory(this.api, accessory, this.accessories, tado, deviceHandler, FakeGatoHistoryService);
        break;
      case 'presence-occupancy': 
        new OccupancyAccessory(this.api, accessory, this.accessories, tado, deviceHandler);     
        break;
      case 'weather-temperature':
        new TemperatureAccessory(this.api, accessory, this.accessories, tado, deviceHandler, FakeGatoHistoryService);
        break;
      case 'weather-lightbulb':
        new SolarlightAccessory(this.api, accessory, this.accessories, tado);
        break;
      case 'weather-airquality':
        new AirqualityAccessory(this.api, accessory, this.accessories, tado);
        break;
      case 'extra-plock':
        new SecurityAccessory(this.api, accessory, this.accessories, tado, deviceHandler);
        break;
      default:
        Logger.warn('Unknown accessory type: '  + device.subtype, accessory.displayName);
        break;
    }
    
    return;

  },

  configureAccessory: function(accessory){

    const device = this.devices.get(accessory.UUID);

    if (device){                                                                                   
      Logger.info('Configuring accessory...', accessory.displayName);
      this.setupAccessory(accessory, device);
    }
  
    this.accessories.push(accessory);
  
  },
  
  removeAccessory: function(accessory) {
  
    Logger.info('Removing accessory...', accessory.displayName);
    
    let accessories = this.accessories.map( cachedAccessory => {
      if(cachedAccessory.displayName !== accessory.displayName){
        return cachedAccessory;
      }
    });
    
    this.accessories = accessories.filter(function (el) {
      return el != null;
    });

    this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
  
  }

};