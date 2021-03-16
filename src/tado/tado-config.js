'use strict';

const fs = require('fs-extra');

const Logger = require('../helper/logger.js');
const TadoApi = require('./tado-api.js');
const Telegram = require('../helper/telegram');

//https://stackoverflow.com/a/15710692
const hashCode = s => Math.abs(s.split('').reduce((a,b)=>{a=((a<<5)-a)+b.charCodeAt(0);return a&a;},0)).toString();

const devices = new Map();
const deviceHandler = new Map();

let telegram;

module.exports = {

  add: async function(config, credentials){
  
    config.homes = config.homes || [];
        
    for(const user of credentials){
      
      let username = user.username;
      let password = user.password;
    
      const tado = new TadoApi('Configuration', { username: username, password: password });
      
      const me = await tado.getMe();
      
      for(const foundHome of me.homes){
        
        let homeIndex;
        config.homes.forEach((home, index) => {
          if(home.name === foundHome.name || home.id === foundHome.id){
            homeIndex = index;
          }
        });
        
        if(homeIndex === undefined){
        
          const homeConfig = {
            id: foundHome.id,
            name: foundHome.name,
            username: username,
            password: password, 
            polling: 30,
            zones: [],
            presence: {
              anyone: false,
              accTypeAnyone: 'OCCUPANCY',
              user: []
            },
            weather: {
              temperatureSensor: false,
              solarIntensity: false,
              airQuality: false
            },
            extras: {
              centralSwitch: false,
              runningInformation: false,
              boostSwitch: false,
              sheduleSwitch: false,
              turnoffSwitch: false,
              presenceLock: false,
              accTypePresenceLock: 'ALARM',
              accTypeChildLock: 'SWITCH',
              childLockSwitches: []
            },
            telegram: {
              active: false
            }
          };
       
          //Home Informations
          const homeInfo = await tado.getHome(foundHome.id);
          
          homeConfig.temperatureUnit = homeInfo.temperatureUnit;
          homeConfig.geolocation = {
            longitude: homeInfo.geolocation.longitude.toString(),
            latitude: homeInfo.geolocation.latitude.toString()
          };
          
          //Mobile Devices Informations
          const mobileDevices = await tado.getMobileDevices(foundHome.id); 
          
          homeConfig.presence.user = mobileDevices.map(user => {
            return {
              active: false,
              name: user.name,
              accType: 'OCCUPANCY'
            };
          }); 
          
          //Zone Informations
          const zones = await tado.getZones(foundHome.id); 
          
          for(const zone of zones){
          
            if(zone.devices)
              zone.devices.forEach(device => {
                if(device.deviceType && (device.deviceType.includes('VA01') || device.deviceType.includes('VA02')))  //https://community.tado.com/en-gb/discussion/705/released-child-lock
                  homeConfig.extras.childLockSwitches.push({
                    active: false,
                    name: zone.name + ' ' + device.shortSerialNo,
                    serialNumber: device.shortSerialNo
                  });
              });
              
            const capabilities  = await tado.getZoneCapabilities(foundHome.id, zone.id);
            
            homeConfig.zones.push({
              active: true,
              id: zone.id,
              name: zone.name,
              type: zone.type,
              delaySwitch: false,
              autoOffDelay: false,
              noBattery: false,
              mode: 'MANUAL',
              modeTimer: 30,
              easyMode: false,
              minValue: homeConfig.temperatureUnit === 'CELSIUS'
                ? capabilities.temperatures.celsius.min
                : capabilities.temperatures.fahrenheit.min,
              maxValue: homeConfig.temperatureUnit === 'CELSIUS'
                ? capabilities.temperatures.celsius.max
                : capabilities.temperatures.fahrenheit.max,
              minStep: homeConfig.temperatureUnit === 'CELSIUS'
                ? capabilities.temperatures.celsius.step
                : capabilities.temperatures.fahrenheit.step,
              openWindowSensor: false,
              openWindowSwitch: false,
              accTypeOpenWindowSwitch: 'SWITCH',
              airQuality: false,
              separateTemperature: false,
              separateHumidity: false,
              accTypeBoiler: 'SWITCH',
              boilerTempSupport: false
            });
          
          }
          
          config.homes.push(homeConfig);
        
        }
        
      }
      
    } 
    
    return config;
      
  },
  
  resync: async function(config, credentials){
    
    const availableHomesInApis = [];
    
    for(const user of credentials){
      
      //Init API with credentials
      const tado = new TadoApi('Configuration', { username: user.username, password: user.password });

      const me = await tado.getMe();
      
      me.homes.forEach(foundHome => {
        availableHomesInApis.push({
          id: foundHome.id,
          name: foundHome.name,
          username: user.username,
          password: user.password
        });
      });
    
    }
    
    //remove non exist homes from config that doesnt exist in api
    for(let [i, home] of config.homes.entries()){
   
      let foundHome;
       
      for(const apiHome of availableHomesInApis){
        if(home.name === apiHome.name || home.id === apiHome.id){
          foundHome = apiHome;
        }
      }
    
      if(!foundHome){
        config.homes.splice(i, 1);
      }
    
    } 
    
    //refresh existing homes
    for(let home of config.homes.entries()){   
      if(home.name && home.username && home.password){
        config = await this.refresh(home.name, config, { username: home.username, password: home.password });   
      }  
    }
    
    config = await this.add(config, availableHomesInApis);
    
    return config;
    
  },

  refresh: async function(currentHome, config, credentials){
    
    let username = credentials.username;
    let password = credentials.password;
    
    const tado = new TadoApi('Configuration', { username: username, password: password });
    
    //Home Informations
    let home = config.homes.find(home => home && home.name === currentHome);
    
    if(!home)
      throw new Error('Cannot refresh ' + currentHome + '. Not found in config!');
      
    if(!home.id){

      const me = await tado.getMe();
      
      me.homes.map(foundHome => {
        if(foundHome.name === home.name)
          home.id = foundHome.id;
      });
  
      if(!home.id)
        throw new Error('Cannot get a Home ID for ' + home.name + '. ' + home.name + ' not found for this user!');
    
    }
    
    const homeInfo = await tado.getHome(home.id);
    
    for(let [i, home] of config.homes.entries()){
  
      if(config.homes[i].name === homeInfo.name){
      
        config.homes[i].id = homeInfo.id;
        config.homes[i].username = credentials.username;
        config.homes[i].password = credentials.password;
        config.homes[i].temperatureUnit = homeInfo.temperatureUnit || 'CELSIUS';
        config.homes[i].zones = config.homes[i].zones || []; 
        
        if(homeInfo.geolocation)
          config.homes[i].geolocation = {
            longitude: homeInfo.geolocation.longitude.toString(),
            latitude: homeInfo.geolocation.latitude.toString()
          };
        
        //init devices for childLock
        config.homes[i].extras = config.homes[i].extras || {};
        config.homes[i].extras.childLockSwitches = config.homes[i].extras.childLockSwitches || [];
        
        let allFoundDevices = []; 
      
        //Mobile Devices Informations
        const mobileDevices = await tado.getMobileDevices(home.id); 
     
        if(!config.homes[i].presence)
          config.homes[i].presence = {
            anyone: false,
            accTypeAnyone: 'OCCUPANCY',
            user: []
          };
          
        //Remove not registred devices
        config.homes[i].presence.user.forEach((user, index) => {
          let found = false;
          mobileDevices.forEach(foundUser => {
            if(foundUser.name === user.name){
              found = true;
            }
          });
          if(!found){
            config.homes[i].presence.user.splice(index, 1);
          }
        });
      
        //Check for new registred devices
        if(config.homes[i].presence.user.length){
          for(const foundUser of mobileDevices){
            let userIndex;
            config.homes[i].presence.user.forEach((user, index) => {
              if(user.name === foundUser.name){
                userIndex = index;
              }
            });
            if(userIndex === undefined){
              config.homes[i].presence.user.push({
                active: false,
                name: foundUser.name,
                accType: 'OCCUPANCY'
              });
            }
          }
        } else {
          config.homes[i].presence.user = mobileDevices.map(user => {
            return {
              active: false,
              name: user.name,
              accType: 'OCCUPANCY'
            };
          }); 
        } 
      
        //Zone Informations
        const zones = await tado.getZones(home.id); 
        
        //Remove not available zones
        config.homes[i].zones.forEach((zone, index) => {
          let found = false;
          zones.forEach(foundZone => {
            if(foundZone.name === zone.name){
              found = true;
            }
          });
          if(!found){
            config.homes[i].zones.splice(index, 1);
          }
        });
        
        //Check for new zones or refresh exist one
        if(config.homes[i].zones.length){
          for(const foundZone of zones){
          
            const capabilities  = await tado.getZoneCapabilities(home.id, foundZone.id);

            if(foundZone.devices)
              foundZone.devices.forEach(dev => {
                if(dev.deviceType && (dev.deviceType.includes('VA01') || dev.deviceType.includes('VA02')))
                  allFoundDevices.push({
                    name: foundZone.name + ' ' + dev.shortSerialNo,
                    serialNumber: dev.shortSerialNo
                  });
              });
          
            let zoneIndex;
            config.homes[i].zones.forEach((zone, index) => {
              if(zone.name === foundZone.name){
                zoneIndex = index;
              }
            });
            if(zoneIndex !== undefined){
              config.homes[i].zones[zoneIndex].id = foundZone.id;
              config.homes[i].zones[zoneIndex].type = foundZone.type;
              config.homes[i].zones[zoneIndex].minValue = homeInfo.temperatureUnit === 'CELSIUS'
                ? capabilities.temperatures.celsius.min
                : capabilities.temperatures.fahrenheit.min;
              config.homes[i].zones[zoneIndex].maxValue = homeInfo.temperatureUnit === 'CELSIUS'
                ? capabilities.temperatures.celsius.max
                : capabilities.temperatures.fahrenheit.max;
              config.homes[i].zones[zoneIndex].minStep = homeInfo.temperatureUnit === 'CELSIUS'
                ? capabilities.temperatures.celsius.step
                : capabilities.temperatures.fahrenheit.step;
            } else {
              config.homes[i].zones.push({
                active: true,
                id: foundZone.id,
                name: foundZone.name,
                type: foundZone.type,
                delaySwitch: false,
                autoOffDelay: false,
                noBattery: false,
                mode: 'MANUAL',
                modeTimer: 30,
                minValue: homeInfo.temperatureUnit === 'CELSIUS'
                  ? capabilities.temperatures.celsius.min
                  : capabilities.temperatures.fahrenheit.min,
                maxValue: homeInfo.temperatureUnit === 'CELSIUS'
                  ? capabilities.temperatures.celsius.max
                  : capabilities.temperatures.fahrenheit.max,
                minStep: homeInfo.temperatureUnit === 'CELSIUS'
                  ? capabilities.temperatures.celsius.step
                  : capabilities.temperatures.fahrenheit.step,
                easyMode: false,
                openWindowSensor: false,
                openWindowSwitch: false,
                accTypeOpenWindowSwitch: 'SWITCH',
                airQuality: false,
                separateTemperature: false,
                separateHumidity: false,
                accTypeBoiler: 'SWITCH',
                boilerTempSupport: false
              });
            } 
          }
        } else {
          
          for(const zone of zones){
          
            const capabilities  = await tado.getZoneCapabilities(home.id, zone.id);
          
            if(zone.devices)
              zone.devices.forEach(dev => {
                if(dev.deviceType && (dev.deviceType.includes('VA01') || dev.deviceType.includes('VA02')))
                  allFoundDevices.push({
                    name: zone.name + ' ' + dev.shortSerialNo,
                    serialNumber: dev.shortSerialNo
                  });
              });
            
            config.homes[i].zones.push({
              active: true,
              id: zone.id,
              name: zone.name,
              type: zone.type,
              delaySwitch: false,
              autoOffDelay: false,
              noBattery: false,
              mode: 'MANUAL',
              modeTimer: 30,
              minValue: homeInfo.temperatureUnit === 'CELSIUS'
                ? capabilities.temperatures.celsius.min
                : capabilities.temperatures.fahrenheit.min,
              maxValue: homeInfo.temperatureUnit === 'CELSIUS'
                ? capabilities.temperatures.celsius.max
                : capabilities.temperatures.fahrenheit.max,
              minStep: homeInfo.temperatureUnit === 'CELSIUS'
                ? capabilities.temperatures.celsius.step
                : capabilities.temperatures.fahrenheit.step,
              easyMode: false,
              openWindowSensor: false,
              openWindowSwitch: false,
              accTypeOpenWindowSwitch: 'SWITCH',
              airQuality: false,
              separateTemperature: false,
              separateHumidity: false,
              accTypeBoiler: 'SWITCH',
              boilerTempSupport: false
            });
          
          }

        }
        
        //remove non existing childLockSwitches
        config.homes[i].extras.childLockSwitches.forEach((childLockSwitch, index) => {
          let found = false;
          allFoundDevices.forEach(foundDevice => {
            if(foundDevice.serialNumber === childLockSwitch.serialNumber){
              found = true;
            }
          });
          if(!found){
            config.homes[i].extras.childLockSwitches.splice(index, 1);
          }
        });
        
        //check for new childLockSwitches
        if(config.homes[i].extras.childLockSwitches.length){
          for(const foundDevice of allFoundDevices){
            let found = false;
            config.homes[i].extras.childLockSwitches.forEach(childLockSwitch => {
              if(childLockSwitch.serialNumber === foundDevice.serialNumber){
                found = true;
              }
            });
            if(!found){
              config.homes[i].extras.childLockSwitches.push({
                active: false,
                name: foundDevice.name,
                serialNumber: foundDevice.serialNumber
              });
            } 
          }
        } else {
          config.homes[i].extras.childLockSwitches = allFoundDevices.map(device => {
            return {
              active: false,
              name: device.name,
              serialNumber: device.serialNumber
            };
          }); 
        }
        
      }
   
    }
    
    return config;
    
  },
  
  setup: function(config, UUIDGen){
    
    if(config.homes && config.homes.length) {
      
      config.homes.forEach(home => {
      
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
            accTypeAnyone: home.presence && home.presence.accTypeAnyone,
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
                  
                  const name = home.name + ' ' + zone.name + (zone.type === 'HEATING' ? ' Heater' : ' Boiler');
                
                  const uuid = UUIDGen.generate(name);
                  
                  if (devices.has(uuid)) {
               
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
                    config.airQuality = zone.airQuality;
                    config.separateTemperature = zone.separateTemperature;
                    config.separateHumidity = zone.separateHumidity;
                    config.minStep = zone.minStep;
                    config.minValue = zone.minValue;
                    config.maxValue = zone.maxValue;
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
                    config.autoOffDelay = zone.autoOffDelay;
                    config.model = zone.type;
                    config.serialNumber = hashCode(name);
                    
                    devices.set(uuid, config);
                    
                    //Configure openWindowSensor
                    if(zone.openWindowSensor){
                    
                      const thisName = home.name + ' ' + zone.name + ' Window';
                      
                      const uuid2 = UUIDGen.generate(thisName);
                      
                      if (devices.has(uuid2)) {
                      
                        Logger.warn('Multiple devices are configured with this name. Duplicate devices will be skipped.', thisName);
                      
                      } else {
                      
                        let newConfig = { ...config };
                        newConfig.name = thisName;
                        newConfig.subtype = 'zone-window-contact';
                        newConfig.model = newConfig.subtype;
                        newConfig.serialNumber = hashCode(zone.name);
                      
                        devices.set(uuid2, newConfig);
                      
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
                      
                      const thisName = home.name + ' ' + zone.name + ' Temperature';
                      
                      const uuid2 = UUIDGen.generate(thisName);
                      
                      if (devices.has(uuid2)) {
                      
                        Logger.warn('Multiple devices are configured with this name. Duplicate devices will be skipped.', thisName);
                      
                      } else {
                      
                        let newConfig = { ...config };
                        newConfig.name = thisName;
                        newConfig.subtype = 'zone-temperature';
                        newConfig.model = newConfig.subtype;
                        newConfig.serialNumber = hashCode(zone.name);
                      
                        devices.set(uuid2, newConfig);
                      
                      }
                    
                    }
                    
                    //Configure  Separate HumiditySensor
                    if(zone.separateHumidity){
                    
                      const thisName = home.name + ' ' + zone.name + ' Humidity';
                      
                      const uuid2 = UUIDGen.generate(thisName);
                      
                      if (devices.has(uuid2)) {
                      
                        Logger.warn('Multiple devices are configured with this name. Duplicate devices will be skipped.', thisName);
                      
                      } else {
                      
                        let newConfig = { ...config };
                        newConfig.name = thisName;
                        newConfig.subtype = 'zone-humidity';
                        newConfig.model = newConfig.subtype;
                        newConfig.serialNumber = hashCode(zone.name);
                      
                        devices.set(uuid2, newConfig);
                      
                      }
                    
                    }
                    
                  }
                
                }
              
              }
        
            });
            
            if(validOpenWindowSwitches.length){
            
              const name = home.name + ' Open Window';
              const uuid = UUIDGen.generate(name);
               
              if (devices.has(uuid)) {
             
                Logger.warn('Multiple devices are configured with this name. Duplicate devices will be skipped.', name);
             
              } else {
                   
                let config = { ...accessoryConfig };
                   
                config.name = name;
                config.subtype = 'zone-window-switch';
                config.openWindows = validOpenWindowSwitches; 
                config.model = config.subtype;
                config.serialNumber = hashCode(name);
              
                devices.set(uuid, config);
                  
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
                
                  const thisName = home.name + ' ' + user.name; 
                 
                  const uuid = UUIDGen.generate(thisName);
                   
                  if (devices.has(uuid)) {
                 
                    Logger.warn('Multiple devices are configured with this name. Duplicate devices will be skipped.', thisName);
                 
                  } else {
                    
                    activeUser += 1;
                       
                    let config = { ...accessoryConfig };
                       
                    config.name = thisName;
                    config.subtype = valid_userTypes.includes(user.accType) && user.accType === 'MOTION'
                      ? 'presence-motion'
                      : 'presence-occupancy';
                    config.anyone = home.presence.anyone;
                     
                    config.model = config.subtype;
                    config.serialNumber = hashCode(thisName);
                  
                    devices.set(uuid, config);
                      
                  }
                 
                }
                 
              }
             
            });
             
            //Coinfigure Anyone Sensor
            if(activeUser && home.presence.anyone){                       
                
              const name = home.name + ' Anyone'; 
              const uuid = UUIDGen.generate(name);
               
              if (devices.has(uuid)) {
             
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
                 
                devices.set(uuid, config);
                  
              }
             
            }
            
          }
          
          error = false;
          
          //Configure Weather
          if(home.weather){
           
            //Configure Weather TemperatureSensor
            if(home.weather.temperatureSensor){
             
              const name = home.name + ' Weather'; 
              const uuid = UUIDGen.generate(name);
               
              if (devices.has(uuid)) {
             
                Logger.warn('Multiple devices are configured with this name. Duplicate devices will be skipped.', name);
             
              } else {
                   
                let config = { ...accessoryConfig };
                   
                config.name = name;
                config.subtype = 'weather-temperature';
                 
                config.model = 'Weather Temperature';
                config.serialNumber = hashCode(name);
                 
                devices.set(uuid, config);
                  
              }
               
            }
             
            //Configure Weather SolarIntensity Lightbulb
            if(home.weather.solarIntensity){
             
              const name = home.name + ' Solar Intensity'; 
              const uuid = UUIDGen.generate(name);
               
              if (devices.has(uuid)) {
             
                Logger.warn('Multiple devices are configured with this name. Duplicate devices will be skipped.', name);
             
              } else {
                   
                let config = { ...accessoryConfig };
                   
                config.name = name;
                config.subtype = 'weather-lightbulb';
                 
                config.model = 'Solar Intensity';
                config.serialNumber = hashCode(name);
                 
                devices.set(uuid, config);
                  
              }
             
            }
             
            //Configure Weather AirQuality Sensor
            if(home.weather.airQuality && home.geolocation && home.geolocation.latitude && home.geolocation.longitude){
             
              const name = home.name + ' Air Quality'; 
              const uuid = UUIDGen.generate(name);
               
              if (devices.has(uuid)) {
             
                Logger.warn('Multiple devices are configured with this name. Duplicate devices will be skipped.', name);
             
              } else {
                   
                let config = { ...accessoryConfig };
                   
                config.name = name;
                config.subtype = 'weather-airquality';
                config.latitude = home.geolocation.latitude;
                config.longitude = home.geolocation.longitude;
                
                config.model = 'Air Quality Sensor';
                config.serialNumber = hashCode(name);
                 
                devices.set(uuid, config);
                  
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
              
                const name = home.name + ' Central Switch'; 
                const uuid = UUIDGen.generate(name);
                 
                if (devices.has(uuid)) {
               
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
                   
                  devices.set(uuid, config);
                    
                }
              
              }
            
            }
             
            //Configure Presence Lock
            if(home.extras.presenceLock){
             
              const name = home.name + ' Presence Lock'; 
              const uuid = UUIDGen.generate(name);
               
              if (devices.has(uuid)) {
             
                Logger.warn('Multiple devices are configured with this name. Duplicate devices will be skipped.', name);
             
              } else {
                   
                let config = { ...accessoryConfig };
                   
                config.name = name;
                config.subtype = home.extras.accTypePresenceLock === 'ALARM'
                  ? 'extra-plock'
                  : 'extra-plockswitch';
                 
                config.model = 'Presence Lock';
                config.serialNumber = hashCode(name);
                 
                devices.set(uuid, config);
                  
              }
             
            }
            
            //Configure Child Lock
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
              
                const name = home.name + ' Child Lock';
                const uuid = UUIDGen.generate(name);
                 
                if (devices.has(uuid)) {
               
                  Logger.warn('Multiple devices are configured with this name. Duplicate devices will be skipped.', name);
               
                } else {
                     
                  let config = { ...accessoryConfig };
                     
                  config.name = name;
                  config.subtype = 'extra-childswitch';
                  config.childLocks = validSwitches; 
                  config.model = config.subtype;
                  config.serialNumber = hashCode(name);
                
                  devices.set(uuid, config);
                    
                }
              
              }
             
            }
          
          }
          
          if(home.telegram && home.telegram.active && home.telegram.token && home.telegram.chatID){
        
            const telegramConfig = home.telegram;
            telegramConfig.messages = home.telegram.messages || {};
            
            const messages = {};
           
            Object.keys(telegramConfig.messages)
              .filter( msg => Object.keys(telegramConfig.messages[msg]).length )
              .map(msg => {
                messages[msg] = {
                  ...telegramConfig.messages[msg]
                };
              });
              
            telegram = new Telegram(telegramConfig, messages);  
            
          } else {
        
            Logger.debug('Telegram is not or not correctly set up. Skip.');
        
          }  
          
          deviceHandler.set(home.name, accessoryConfig);
        
        }
        
      });
      
    } 
    
    return {
      config: config,
      devices: devices,
      deviceHandler: deviceHandler,
      telegram: telegram
    };
    
  },
  
  store: async function(config, storePath){
    
    const configJSON = await fs.readJson(storePath + '/config.json');
        
    for(const i in configJSON.platforms)
      if(configJSON.platforms[i].platform === 'TadoPlatform')
        configJSON.platforms[i] = config;
      
    fs.writeJsonSync(storePath + '/config.json', configJSON, { spaces: 4 });
    
    return;
    
  }

};