/*global $, window, homebridge, fetchDevicesBar, schema*/

const pageNavigation = {
  currentContent: false,
  previousContent: []
};

let customSchemaActive = false;
let pluginConfig = false;
let currentHome = false;

const TIMEOUT = (ms) => new Promise((res) => setTimeout(res, ms)); 

function toggleContent(){

  $('#header').hide();
  $('#main').show();
  
  return;
  
}

async function showOldSchema(oldVersion) {

  let config = await homebridge.getPluginConfig();

  if(oldVersion){
    
    $('#main').removeClass('pb-5');
    $('#notSupported').show();
    
    setTimeout(() => {
      $('#main').fadeOut(500);
    }, 5000);
  
  } else {
  
    let activeContent = $('#notConfigured').css('display') !== 'none' 
      ? '#notConfigured'
      : '#isConfigured';
  
    transPage($('#main, ' + activeContent), $('#headerOld'), false, true);
  
  }
  
  if(!config.length)
    homebridge.updatePluginConfig([{}]);
  
  homebridge.showSchemaForm();
  
  return;

}

function transPage(cur, next, removed, showSchema) {

  if(showSchema){
 
    cur.hide();
    next.show();
    
    //pageNavigation.previousContent.push($('#isConfigured'));
    pageNavigation.previousContent.push(cur);
    pageNavigation.currentContent = next;
 
    return;
 
  } else {
  
    toggleContent();
  
  }
  
  if(cur){

    cur.fadeOut(500, () =>{
      
      next.fadeIn(500);
      
      if(!removed)
        pageNavigation.previousContent.push(cur);
      
      pageNavigation.currentContent = next;
    
    });

  } else {

    next.fadeIn(500);
   
    if(!removed)
      pageNavigation.previousContent.push(next);
    
    pageNavigation.currentContent = next;
    
  }

  if(customSchemaActive)
    customSchemaActive.end();
    
  homebridge.hideSchemaForm();
    
  return;

}

function goBack(index) {

  if(pageNavigation.previousContent.length && pageNavigation.currentContent){

    index = index === undefined 
      ? pageNavigation.previousContent.length - 1
      : index;

    transPage(pageNavigation.currentContent, pageNavigation.previousContent[index], true);
    //pageNavigation.currentContent = pageNavigation.previousContent[index];
    pageNavigation.previousContent.splice(index, 1);
    
    if(customSchemaActive)
      customSchemaActive.end();

  }

  return;

}

async function createCustomSchema(home){

  customSchemaActive = homebridge.createForm(schema, {
    name: pluginConfig[0].name,
    debug: pluginConfig[0].debug,
    homes: home
  });
  
  customSchemaActive.onChange(async config => {
    
    pluginConfig[0].name = config.name;
    pluginConfig[0].debug = config.debug;
    pluginConfig[0].homes = pluginConfig[0].homes.map(home => {
      if(home.name === config.homes.name){
        home = config.homes;                                                           
      }
      return home;
    });
    
    try {
   
      await homebridge.updatePluginConfig(pluginConfig);
  
    } catch(err) {
   
      console.log(err);
      homebridge.toast.error(err.message, 'Error');
  
    }
  
  });
  
  return;

}

async function resetUI(){

  homebridge.request('/reset');

  resetForm();
  resetSchema();
  
  currentHome = false;
  
  return;

}

function resetForm(){

  $('#homeUsername').val('');
  $('#homePassword').val('');
  
  if(fetchDevicesBar)
    fetchDevicesBar.set(0);

  return;

}

function resetSchema(){

  if(customSchemaActive){
    customSchemaActive.end();
    customSchemaActive = false;
  }
  
  return;

}

function addDeviceToList(home){

  let name = home.name;
  let owner = home.username;
  
  $('#deviceSelect').append('<option value="' + name + '">' + name + ' &lt;' + owner + '&gt;' + '</option>');

  return;

}

function removeDeviceFromList(home){

  let name = typeof home === 'string' ? home : home.name;
  $('#deviceSelect option[value=\'' + name + '\']').remove();

  return;

}

async function addNewDeviceToConfig(config, refresh, resync){

  try {  
    
    for(const i in config[0].homes){
     
      let found = false;
     
      for(const j in pluginConfig[0].homes)
        if(config[0].homes[i].name === pluginConfig[0].homes[j].name)
          found = true;

      if(!found){
        addDeviceToList(config[0].homes[i]);
        homebridge.toast.success(config[0].homes[i].name + ' added to config!', 'Success');
      } else if(refresh){
        homebridge.toast.success(config[0].homes[i].name + ' refreshed!', 'Success');
      } else if(resync) {
        homebridge.toast.success(config[0].homes[i].name + ' resynchronized!', 'Success');
      }

    }
    
    pluginConfig = JSON.parse(JSON.stringify(config));
    
    await homebridge.updatePluginConfig(pluginConfig);
    await homebridge.savePluginConfig();

  } catch(err) {

    console.log(err);
    homebridge.toast.error(err.message, 'Error');

  }
  
  return;

}

async function removeDeviceFromConfig(name){

  currentHome = name || currentHome;
    
  let foundIndex;
  let pluginConfigBkp = JSON.parse(JSON.stringify(pluginConfig));
  
  pluginConfig[0].homes.forEach((home, index) => {
    if(home.name === currentHome){
      foundIndex = index;
    }
  });
  
  if(foundIndex !== undefined){
    
    try {
      
      pluginConfig[0].homes.splice(foundIndex, 1);
      removeDeviceFromList(currentHome);
      
      if(!pluginConfig[0].homes.length){
        delete pluginConfig[0].debug;
      }
      
      await homebridge.updatePluginConfig(pluginConfig);
      await homebridge.savePluginConfig();
      
      homebridge.toast.success(currentHome + ' removed from config!', 'Success');
      
    } catch(err) {
      
      pluginConfig = JSON.parse(JSON.stringify(pluginConfigBkp));
      
      throw err; 
 
    }

  } else {
    
    throw new Error('No home found in config to remove!');
    
  }
    
  return;
  
}

async function fetchDevices(credentials, refresh, resync){

  if(!credentials && !resync)
    return homebridge.toast.error('No credentials!', 'Error');

  const config = JSON.parse(JSON.stringify(pluginConfig));

  try {
    
    if(!resync){
      //Init API with credentials
      homebridge.request('/authenticate', credentials);
      
      await TIMEOUT(2000);
      
      fetchDevicesBar.animate(0.20);
    }
  
    if(refresh){
    
      //refresh selected home
      
      //Home Informations
      let home = config[0].homes.find(home => home && home.name === currentHome);
      
      if(!home)
        return homebridge.toast.error('Cannot refresh ' + currentHome + '. Not found in config!', 'Error');
        
      if(!home.id){
        homebridge.toast.info('No Home ID defined in config. Getting Home ID for ' + home.name, credentials.username);
        const me = await homebridge.request('/exec', {dest: 'getMe'});
        me.homes.map(foundHome => {
          if(foundHome.name === home.name)
            home.id = foundHome.id;
        });
        await TIMEOUT(1000);
        if(!home.id)
          return homebridge.toast.error('Cannot get a Home ID for ' + home.name + '. ' + home.name + ' not found for this user!', credentials.username);
      }
      
      await TIMEOUT(2000);
      
      fetchDevicesBar.animate(0.40);
      
      const homeInfo = await homebridge.request('/exec', {dest: 'getHome', data: home.id});
      
      for(let [i, home] of config[0].homes.entries()){
    
        if(config[0].homes[i].name === homeInfo.name){
        
          config[0].homes[i].id = homeInfo.id;
          config[0].homes[i].username = credentials.username;
          config[0].homes[i].password = credentials.password;
          config[0].homes[i].temperatureUnit = homeInfo.temperatureUnit || 'CELSIUS';
          config[0].homes[i].zones = config[0].homes[i].zones || []; 
          
          if(homeInfo.geolocation)
            config[0].homes[i].geolocation = {
              longitude: homeInfo.geolocation.longitude.toString(),
              latitude: homeInfo.geolocation.latitude.toString()
            };
          
          //init devices for childLock
          config[0].homes[i].extras = config[0].homes[i].extras || {};
          config[0].homes[i].extras.childLockSwitches = config[0].homes[i].extras.childLockSwitches || [];
          
          let allFoundDevices = []; 
        
          await TIMEOUT(2000);
          
          fetchDevicesBar.animate(0.60);
          
          //Mobile Devices Informations
          const mobileDevices = await homebridge.request('/exec', {dest: 'getMobileDevices', data: home.id}); 
       
          if(!config[0].homes[i].presence)
            config[0].homes[i].presence = {
              anyone: false,
              accTypeAnyone: 'OCCUPANCY',
              user: []
            };
            
          //Remove not registred devices
          config[0].homes[i].presence.user.forEach((user, index) => {
            let found = false;
            mobileDevices.forEach(foundUser => {
              if(foundUser.name === user.name){
                found = true;
              }
            });
            if(!found){
              homebridge.toast.info(user.name + ' removed from config!', credentials.username);
              config[0].homes[i].presence.user.splice(index, 1);
            }
          });
        
          //Check for new registred devices
          if(config[0].homes[i].presence.user.length){
            for(const foundUser of mobileDevices){
              let userIndex;
              config[0].homes[i].presence.user.forEach((user, index) => {
                if(user.name === foundUser.name){
                  userIndex = index;
                }
              });
              if(userIndex === undefined){
                config[0].homes[i].presence.user.push({
                  active: false,
                  name: foundUser.name,
                  accType: 'OCCUPANCY'
                });
              }
            }
          } else {
            config[0].homes[i].presence.user = mobileDevices.map(user => {
              return {
                active: false,
                name: user.name,
                accType: 'OCCUPANCY'
              };
            }); 
          } 
        
          await TIMEOUT(2000);
          
          fetchDevicesBar.animate(0.80);
          
          //Zone Informations
          const zones = await homebridge.request('/exec', {dest: 'getZones', data: home.id}); 
          
          //Remove not available zones
          config[0].homes[i].zones.forEach((zone, index) => {
            let found = false;
            zones.forEach(foundZone => {
              if(foundZone.name === zone.name){
                found = true;
              }
            });
            if(!found){
              homebridge.toast.info(zone.name + ' removed from config!', credentials.username);
              config[0].homes[i].zones.splice(index, 1);
            }
          });
          
          //Check for new zones or refresh exist one
          if(config[0].homes[i].zones.length){
            for(const foundZone of zones){
            
              const capabilities  = await homebridge.request('/exec', {dest: 'getZoneCapabilities', data: [home.id, foundZone.id]}); 
            
              if(foundZone.devices)
                foundZone.devices.forEach(dev => {
                  if(dev.deviceType && (dev.deviceType.includes('VA01') || dev.deviceType.includes('VA02')))
                    allFoundDevices.push({
                      name: foundZone.name + ' ' + dev.shortSerialNo,
                      serialNumber: dev.shortSerialNo
                    });
                });
            
              let zoneIndex;
              config[0].homes[i].zones.forEach((zone, index) => {
                if(zone.name === foundZone.name){
                  zoneIndex = index;
                }
              });
              if(zoneIndex !== undefined){
                config[0].homes[i].zones[zoneIndex].id = foundZone.id;
                config[0].homes[i].zones[zoneIndex].type = foundZone.type;
                config[0].homes[i].zones[zoneIndex].minValue = homeInfo.temperatureUnit === 'CELSIUS'
                  ? capabilities.temperatures.celsius.min
                  : capabilities.temperatures.fahrenheit.min;
                config[0].homes[i].zones[zoneIndex].maxValue = homeInfo.temperatureUnit === 'CELSIUS'
                  ? capabilities.temperatures.celsius.max
                  : capabilities.temperatures.fahrenheit.max;
                config[0].homes[i].zones[zoneIndex].minStep = homeInfo.temperatureUnit === 'CELSIUS'
                  ? capabilities.temperatures.celsius.step
                  : capabilities.temperatures.fahrenheit.step;
              } else {
                config[0].homes[i].zones.push({
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
            
              const capabilities  = await homebridge.request('/exec', {dest: 'getZoneCapabilities', data: [home.id, zone.id]}); 
            
              if(zone.devices)
                zone.devices.forEach(dev => {
                  allFoundDevices.push({
                    name: zone.name + ' ' + dev.shortSerialNo,
                    serialNumber: dev.shortSerialNo
                  });
                });
                
              config[0].homes[i].zones.push({
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
                airQuality: false,
                separateTemperature: false,
                separateHumidity: false,
                accTypeBoiler: 'SWITCH',
                boilerTempSupport: false
              });
            
            }
          }
          
          //remove non existing childLockSwitches
          config[0].homes[i].extras.childLockSwitches.forEach((childLockSwitch, index) => {
            let found = false;
            allFoundDevices.forEach(foundDevice => {
              if(foundDevice.serialNumber === childLockSwitch.serialNumber){
                found = true;
              }
            });
            if(!found){
              homebridge.toast.info(childLockSwitch.name + ' removed from config!', credentials.username);
              config[0].homes[i].extras.childLockSwitches.splice(index, 1);
            }
          });
          
          //check for new childLockSwitches
          if(config[0].homes[i].extras.childLockSwitches.length){
            for(const foundDevice of allFoundDevices){
              let found = false;
              config[0].homes[i].extras.childLockSwitches.forEach(childLockSwitch => {
                if(childLockSwitch.serialNumber === foundDevice.serialNumber){
                  found = true;
                }
              });
              if(!found){
                config[0].homes[i].extras.childLockSwitches.push({
                  active: false,
                  name: foundDevice.name,
                  serialNumber: foundDevice.serialNumber
                });
              } 
            }
          } else {
            config[0].homes[i].extras.childLockSwitches = allFoundDevices.map(device => {
              return {
                active: false,
                name: device.name,
                serialNumber: device.serialNumber
              };
            }); 
          }
          
        }
     
      }
    
    } else if(resync){
    
      homebridge.toast.info('Checking for available homes for given user...', 'Info');
    
      const availableHomesInApis = [];
      
      for(let home of config[0].homes){
      
        if(home.name && home.username && home.password){
        
          //Init API with credentials
          homebridge.request('/authenticate', {username: home.username, password: home.password}); 
          
          //resync home (refresh/remove)
          const me = await homebridge.request('/exec', {dest: 'getMe'});
          
          me.homes.forEach(foundHome => {
            availableHomesInApis.push({
              id: foundHome.id,
              name: foundHome.name,
              username: home.username,
              password: home.password
            });
          });
        
        }
      
      }
      
      await TIMEOUT(2000);
      
      homebridge.toast.info('Found ' + availableHomesInApis.length + ' in total!', 'Info');
      
      await TIMEOUT(2000);
      
      homebridge.toast.info('Search for homes in the config to remove that were not found in the api...', 'Info');
      
      let removedHomes = 0;
      
      //remove non exist homes from config that doesnt exist in api
      for(let [i, home] of config[0].homes.entries()){
      
        if(home.name && home.username && home.password){
        
          //Init API with credentials
          homebridge.request('/authenticate', {username: home.username, password: home.password}); 
     
          let foundHome;
           
          for(const apiHome of availableHomesInApis){
            if(home.name === apiHome.name || home.id === apiHome.id){
              foundHome = apiHome;
            }
          }
        
          if(!foundHome){
          
            homebridge.toast.info(home.name + ' removed from config!', home.username);
           
            await removeDeviceFromConfig(home.name);
            config[0].homes.splice(i, 1);
            
            removedHomes += 1;
            
            await TIMEOUT(2000);
           
          }
          
        }
      
      } 
      
      if(!removedHomes)
        await TIMEOUT(2000);
      
      homebridge.toast.info(removedHomes + ' removed from config in total!', 'Info');
      
      await TIMEOUT(2000); 
      
      //refresh existing homes
      for(let [i, home] of config[0].homes.entries()){
      
        if(home.name && home.username && home.password){
        
          //Init API with credentials
          homebridge.request('/authenticate', {username: home.username, password: home.password}); 
     
          let foundHome;
           
          for(const apiHome of availableHomesInApis){
            if(home.name === apiHome.name || home.id === apiHome.id){
              foundHome = apiHome;
              home.id = apiHome.id;
            }
          }
        
          if(foundHome){
          
            homebridge.toast.info(home.name + ' resynchronizing...', home.username);
              
            const homeInfo = await homebridge.request('/exec', {dest: 'getHome', data: home.id});
              
            config[0].homes[i].id = homeInfo.id;
            config[0].homes[i].username = foundHome.username;
            config[0].homes[i].password = foundHome.password;
            config[0].homes[i].temperatureUnit = homeInfo.temperatureUnit || 'CELSIUS';
            config[0].homes[i].zones = config[0].homes[i].zones || []; 
              
            if(homeInfo.geolocation)
              config[0].homes[i].geolocation = {
                longitude: homeInfo.geolocation.longitude.toString(),
                latitude: homeInfo.geolocation.latitude.toString()
              };
              
            //init devices for childLock
            config[0].homes[i].extras = config[0].homes[i].extras || {};
            config[0].homes[i].extras.childLockSwitches = config[0].homes[i].extras.childLockSwitches || [];
              
            let allFoundDevices = []; 
              
            //Mobile Devices Informations
            const mobileDevices = await homebridge.request('/exec', {dest: 'getMobileDevices', data: home.id}); 
           
            if(!config[0].homes[i].presence)
              config[0].homes[i].presence = {
                anyone: false,
                accTypeAnyone: 'OCCUPANCY',
                user: []
              };
                
            //Remove not registred devices
            config[0].homes[i].presence.user.forEach((user, index) => {
              let found = false;
              mobileDevices.forEach(foundUser => {
                if(foundUser.name === user.name){
                  found = true;
                }
              });
              if(!found){
                homebridge.toast.info(user.name + ' removed from config!', home.username);
                config[0].homes[i].presence.user.splice(index, 1);
              }
            });
            
            //Check for new registred devices
            if(config[0].homes[i].presence.user.length){
              for(const foundUser of mobileDevices){
                let userIndex;
                config[0].homes[i].presence.user.forEach((user, index) => {
                  if(user.name === foundUser.name){
                    userIndex = index;
                  }
                });
                if(userIndex === undefined){
                  config[0].homes[i].presence.user.push({
                    active: false,
                    name: foundUser.name,
                    accType: 'OCCUPANCY'
                  });
                }
              }
            } else {
              config[0].homes[i].presence.user = mobileDevices.map(user => {
                return {
                  active: false,
                  name: user.name,
                  accType: 'OCCUPANCY'
                };
              }); 
            } 
              
            //Zone Informations
            const zones = await homebridge.request('/exec', {dest: 'getZones', data: home.id}); 
              
            //Remove not available zones
            config[0].homes[i].zones.forEach((zone, index) => {
              let found = false;
              zones.forEach(foundZone => {
                if(foundZone.name === zone.name){
                  found = true;
                }
              });
              if(!found){
                homebridge.toast.info(zone.name + ' removed from config!', home.username);
                config[0].homes[i].zones.splice(index, 1);
              }
            });
              
            //Check for new zones or refresh exist one
            if(config[0].homes[i].zones.length){
              for(const foundZone of zones){
              
                const capabilities  = await homebridge.request('/exec', {dest: 'getZoneCapabilities', data: [home.id, foundZone.id]}); 
                
                if(foundZone.devices)
                  foundZone.devices.forEach(dev => {
                    if(dev.deviceType && (dev.deviceType.includes('VA01') || dev.deviceType.includes('VA02')))
                      allFoundDevices.push({
                        name: foundZone.name + ' ' + dev.shortSerialNo,
                        serialNumber: dev.shortSerialNo
                      });
                  });
                
                let zoneIndex;
                config[0].homes[i].zones.forEach((zone, index) => {
                  if(zone.name === foundZone.name){
                    zoneIndex = index;
                  }
                });
                if(zoneIndex !== undefined){
                  config[0].homes[i].zones[zoneIndex].id = foundZone.id;
                  config[0].homes[i].zones[zoneIndex].type = foundZone.type;
                  config[0].homes[i].zones[zoneIndex].minValue = homeInfo.temperatureUnit === 'CELSIUS'
                    ? capabilities.temperatures.celsius.min
                    : capabilities.temperatures.fahrenheit.min;
                  config[0].homes[i].zones[zoneIndex].maxValue = homeInfo.temperatureUnit === 'CELSIUS'
                    ? capabilities.temperatures.celsius.max
                    : capabilities.temperatures.fahrenheit.max;
                  config[0].homes[i].zones[zoneIndex].minStep = homeInfo.temperatureUnit === 'CELSIUS'
                    ? capabilities.temperatures.celsius.step
                    : capabilities.temperatures.fahrenheit.step;
                } else {
                  config[0].homes[i].zones.push({
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
              
                const capabilities  = await homebridge.request('/exec', {dest: 'getZoneCapabilities', data: [home.id, zone.id]}); 
              
                if(zone.devices)
                  zone.devices.forEach(dev => {
                    if(dev.deviceType && (dev.deviceType.includes('VA01') || dev.deviceType.includes('VA02')))
                      allFoundDevices.push({
                        name: zone.name + ' ' + dev.shortSerialNo,
                        serialNumber: dev.shortSerialNo
                      });
                  });
                  
                config[0].homes[i].zones.push({
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
                  airQuality: false,
                  separateTemperature: false,
                  separateHumidity: false,
                  accTypeBoiler: 'SWITCH',
                  boilerTempSupport: false
                });  
              
              }
            }
              
            //remove non existing childLockSwitches
            config[0].homes[i].extras.childLockSwitches.forEach((childLockSwitch, index) => {
              let found = false;
              allFoundDevices.forEach(foundDevice => {
                if(foundDevice.serialNumber === childLockSwitch.serialNumber){
                  found = true;
                }
              });
              if(!found){
                homebridge.toast.info(childLockSwitch.serialNumber + ' removed from config!', home.username);
                config[0].homes[i].extras.childLockSwitches.splice(index, 1);
              }
            });
              
            //check for new childLockSwitches
            if(config[0].homes[i].extras.childLockSwitches.length){
              for(const foundDevice of allFoundDevices){
                let found = false;
                config[0].homes[i].extras.childLockSwitches.forEach(childLockSwitch => {
                  if(childLockSwitch.serialNumber === foundDevice.serialNumber){
                    found = true;
                  }
                });
                if(!found){
                  config[0].homes[i].extras.childLockSwitches.push({
                    active: false,
                    name: foundDevice.name,
                    serialNumber: foundDevice.serialNumber
                  });
                } 
              }
            } else {
              config[0].homes[i].extras.childLockSwitches = allFoundDevices.map(device => {
                return {
                  active: false,
                  name: device.name,
                  serialNumber: device.serialNumber
                };
              }); 
            }
            
            await TIMEOUT(2000);
            
            homebridge.toast.info(home.name + ' resynchronized!', home.username);
            
            await TIMEOUT(2000);
            
           
          }
          
        }
      
      }     
      
      homebridge.toast.info('Looking for homes which are found in the api but are not configured...', 'Info');  
      
      await TIMEOUT(2000);
      
      let addedHomes = 0;

      //add new homes from api that doesnt exist in config
      for(const foundHome of availableHomesInApis){
     
        let found = false;
     
        config[0].homes.forEach(home => {
          if(home.name === foundHome.name || home.id === foundHome.id)
            found = true;
        });
       
        if(!found){
        
          homebridge.toast.info('Found ' + foundHome.name, foundHome.username);  
          
          addedHomes += 1;
        
          //Init API with credentials
          homebridge.request('/authenticate', {username: foundHome.username, password: foundHome.password}); 
        
          const homeConfig = {
            id: foundHome.id,
            name: foundHome.name,
            username: foundHome.username,
            password: foundHome.password,
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
              childLockSwitches: []
            },
            telegram: {
              active: false
            }
          };
          
          //Home Informations
          const homeInfo = await homebridge.request('/exec', {dest: 'getHome', data: foundHome.id});
          
          homeConfig.temperatureUnit = homeInfo.temperatureUnit;
          homeConfig.geolocation = {
            longitude: homeInfo.geolocation.longitude.toString(),
            latitude: homeInfo.geolocation.latitude.toString()
          };
          
          //Mobile Devices Informations
          const mobileDevices = await homebridge.request('/exec', {dest: 'getMobileDevices', data: foundHome.id}); 
          
          homeConfig.presence.user = mobileDevices.map(user => {
            return {
              active: false,
              name: user.name,
              accType: 'OCCUPANCY'
            };
          }); 
              
          //Zone Informations
          const zones = await homebridge.request('/exec', {dest: 'getZones', data: foundHome.id}); 
          
          for(const zone of zones){
          
            const capabilities  = await homebridge.request('/exec', {dest: 'getZoneCapabilities', data: [homeInfo.id, zone.id]}); 
          
            if(zone.devices)
              zone.devices.forEach(device => {
                if(device.deviceType && (device.deviceType.includes('VA01') || device.deviceType.includes('VA02')))
                  homeConfig.extras.childLockSwitches.push({
                    active: false,
                    name: zone.name + ' ' + device.shortSerialNo,
                    serialNumber: device.shortSerialNo
                  });
              });
              
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
              airQuality: false,
              separateTemperature: false,
              separateHumidity: false,
              accTypeBoiler: 'SWITCH',
              boilerTempSupport: false
            });  
          
          }
          
          config[0].homes.push(homeConfig);
          
          await TIMEOUT(2000); 
          
          homebridge.toast.info(foundHome.name + ' added to config.json!', foundHome.username);  
          
          await TIMEOUT(2000);
        
        }
   
      }
      
      if(!addedHomes)
        await TIMEOUT(2000);
      
      homebridge.toast.info(removedHomes + ' new homes configured!', 'Info');
    
    } else {
    
      //add new account/home 
      
      const me = await homebridge.request('/exec', {dest: 'getMe'});
      
      for(const foundHome of me.homes){
    
        let homeIndex;
        config[0].homes.forEach((home, index) => {
          if(home.name === foundHome.name || home.id === foundHome.id){
            homeIndex = index;
          }
        });
        
        if(homeIndex === undefined){
        
          const homeConfig = {
            id: foundHome.id,
            name: foundHome.name,
            username: credentials.username,
            password: credentials.password, 
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
              childLockSwitches: []
            },
            telegram: {
              active: false
            }
          };
       
          await TIMEOUT(2000);
          
          fetchDevicesBar.animate(0.40);
          
          //Home Informations
          const homeInfo = await homebridge.request('/exec', {dest: 'getHome', data: foundHome.id});
          
          homeConfig.temperatureUnit = homeInfo.temperatureUnit;
          homeConfig.geolocation = {
            longitude: homeInfo.geolocation.longitude.toString(),
            latitude: homeInfo.geolocation.latitude.toString()
          };
          
          await TIMEOUT(2000);
          
          fetchDevicesBar.animate(0.60);
          
          //Mobile Devices Informations
          const mobileDevices = await homebridge.request('/exec', {dest: 'getMobileDevices', data: foundHome.id}); 
          
          homeConfig.presence.user = mobileDevices.map(user => {
            return {
              active: false,
              name: user.name,
              accType: 'OCCUPANCY'
            };
          }); 
          
          await TIMEOUT(2000);
          
          fetchDevicesBar.animate(0.80);
              
          //Zone Informations
          const zones = await homebridge.request('/exec', {dest: 'getZones', data: foundHome.id}); 
          
          for(const zone of zones){
          
            const capabilities  = await homebridge.request('/exec', {dest: 'getZoneCapabilities', data: [homeInfo.id, zone.id]}); 
            
            if(zone.devices)
              zone.devices.forEach(device => {
                if(device.deviceType && (device.deviceType.includes('VA01') || device.deviceType.includes('VA02')))
                  homeConfig.extras.childLockSwitches.push({
                    active: false,
                    name: zone.name + ' ' + device.shortSerialNo,
                    serialNumber: device.shortSerialNo
                  });
              });
              
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
              airQuality: false,
              separateTemperature: false,
              separateHumidity: false,
              accTypeBoiler: 'SWITCH',
              boilerTempSupport: false
            });
            
          }
          
          
          config[0].homes.push(homeConfig);
       
        }  
        
      }
    
    }
    
    await TIMEOUT(2000);
  
    fetchDevicesBar.animate(1.00);
   
    if(resync)
      homebridge.toast.info('Resynchronized!', credentials.username);
   
    await TIMEOUT(2000);
    
    return config;
   
  } catch(err) {

    fetchDevicesBar.set(0);
    fetchDevicesBar.setText('Error!');
    
    console.log(err);
    homebridge.toast.error(err.message, 'Error');
    
    await TIMEOUT(2000);
    return false;
   
  }
     
}

(async () => {
                                       
  try {
  
    //check version before load ui
    if(window.compareVersions(window.homebridge.serverEnv.env.packageVersion, '4.34.0') < 0){
      await showOldSchema(true);
      return;
    }
    
    pluginConfig = await homebridge.getPluginConfig();
    
    if(!pluginConfig.length){
    
      pluginConfig = [{
        platform: 'TadoPlatform',
        name: 'TadoPlatform',
        homes: [] 
      }];
      
      transPage(false, $('#notConfigured'));
      
    } else {
    
      if(!pluginConfig[0].homes || (pluginConfig[0].homes && !pluginConfig[0].homes.length)){
        pluginConfig[0].homes = [];
        return transPage(false, $('#notConfigured'));
      }
      
      pluginConfig[0].homes.forEach(home => {
        $('#deviceSelect').append('<option value="' + home.name + '">'+ home.name + ' &lt;' + home.username + '&gt;</option>');
      });
      
      transPage(false, $('#isConfigured'));
    
    }
  
  } catch(err) {
  
    console.log(err);
    homebridge.toast.error(err.message, 'Error');
  
  }

})();

//jquery listener

$('.back').on('click', () => {
  goBack();
});

$('.oldConfig').on('click', async () => {
  await showOldSchema(false);
});

$('#start, #addDevice').on('click', () => {
  
  resetUI();
  
  let activeContent = $('#notConfigured').css('display') !== 'none' ? $('#notConfigured') : $('#isConfigured');
  
  transPage(activeContent, $('#configureDevice'));

});

$('#reSync').on('click', async () => {

  try {
  
    homebridge.showSpinner();
    
    const config = await fetchDevices(false, false, true);
    
    if(config){
      await addNewDeviceToConfig(config, false, true);
      resetUI();
    }
    
    homebridge.hideSpinner();
    
  } catch(err) {
  
    homebridge.hideSpinner();
  
    console.log(err);
    homebridge.toast.error(err.message, 'Error');
  
  }
    
});

$('#auth').on('click', async () => {

  try {
      
    let credentials = {
      username: $('#homeUsername').val(),
      password: $('#homePassword').val()
    };
    
    transPage($('#configureDevice'), $('#fetchDevices'));
    
    const config = await fetchDevices(credentials, false, false);
    
    if(config){
      await addNewDeviceToConfig(config, false, false);
      transPage($('#fetchDevices'), $('#isConfigured'));
      resetUI();
    }
    
  } catch(err) {
  
    console.log(err);
    homebridge.toast.error(err.message, 'Error');
  
  }
    
});

$('#editDevice').on('click', () => {

  resetUI();
  
  currentHome = $( '#deviceSelect option:selected' ).val();
  let home = pluginConfig[0].homes.find(home => home.name === currentHome);

  if(!home)
    return homebridge.toast.error('Can not find selected home!', 'Error');

  createCustomSchema(home);
  
  transPage($('#main, #isConfigured'), $('#header'), false, true);

});

$('#refreshDevice').on('click', async () => {  
    
  if(customSchemaActive && currentHome){
  
    resetSchema();
  
    let home = pluginConfig[0].homes.find(home => home.name === currentHome);

    if(!home)
      return homebridge.toast.error('Can not find home in config!', 'Error');
    
    transPage($('#isConfigured'), $('#fetchDevices'));
    
    const config = await fetchDevices({ username: home.username, password: home.password }, true, false);
    
    if(config){
      await addNewDeviceToConfig(config, true, false);
      transPage($('#fetchDevices'), $('#isConfigured'));
      resetUI();
    }
      
  } else {
  
    homebridge.toast.error('No home selected to refresh!', 'Error');
  
  }
  
});

$('#removeDevice').on('click', async () => {
  
  try {
    
    await removeDeviceFromConfig();
    
    resetUI();
  
    transPage(false, pluginConfig[0].homes.length ? $('#isConfigured') : $('#notConfigured'));
    
  } catch (err) {
    
    console.log(err);
    homebridge.toast.error(err.message, 'Error');
    
  }

});