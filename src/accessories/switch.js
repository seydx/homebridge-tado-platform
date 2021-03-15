'use strict';

const Logger = require('../helper/logger.js');

class SwitchAccessory {

  constructor (api, accessory, accessories, tado, deviceHandler) {
    
    this.api = api;
    this.accessory = accessory;
    this.accessories = accessories;
    
    this.deviceHandler = deviceHandler;
    this.tado = tado;
    
    this.getService();

  }

  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
  // Services
  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//

  getService () {
    
    let service = this.accessory.getService(this.api.hap.Service.Switch);
    
    let serviceContact = this.accessory.getService(this.api.hap.Service.ContactSensor);
    let serviceHeater = this.accessory.getService(this.api.hap.Service.HeaterCooler);
    let serviceFaucet = this.accessory.getService(this.api.hap.Service.Valve);
    let serviceSecurity = this.accessory.getService(this.api.hap.Service.SecuritySystem);
    let serviceThermostat = this.accessory.getService(this.api.hap.Service.Thermostat);
    
    let serviceHomeSwitch = this.accessory.getServiceById(this.api.hap.Service.Switch, 'HomeSwitch');
    let serviceAwaySwitch = this.accessory.getServiceById(this.api.hap.Service.Switch, 'AwaySwitch');
    
    if(serviceContact){
      Logger.info('Removing ContactSensor service', this.accessory.displayName);
      this.accessory.removeService(serviceContact);
    }
    
    if(serviceHeater){
      Logger.info('Removing HeaterCooler service', this.accessory.displayName);
      this.accessory.removeService(serviceHeater);
    }
    
    if(serviceThermostat){
      Logger.info('Removing Thermostat service', this.accessory.displayName);
      this.accessory.removeService(serviceThermostat);
    }
    
    if(serviceFaucet){
      Logger.info('Removing Faucet service', this.accessory.displayName);
      this.accessory.removeService(serviceFaucet);
    }
    
    if(serviceSecurity){
      Logger.info('Removing Security service', this.accessory.displayName);
      this.accessory.removeService(serviceSecurity);
    }
    
    if(!service && this.accessory.context.config.subtype !== 'extra-plockswitch' && this.accessory.context.config.subtype !== 'extra-childswitch' && this.accessory.context.config.subtype !== 'zone-window-switch' && this.accessory.context.config.subtype !== 'extra-cntrlswitch'){
      Logger.info('Adding Switch service', this.accessory.displayName);
      service = this.accessory.addService(this.api.hap.Service.Switch, this.accessory.displayName, this.accessory.context.config.subtype);
    }
    
    if(this.accessory.context.config.subtype === 'extra-plockswitch'){

      if(!serviceHomeSwitch){
        Logger.info('Adding Switch service (home)', this.accessory.displayName);
        serviceHomeSwitch = this.accessory.addService(this.api.hap.Service.Switch, 'Home', 'HomeSwitch');
      }
      
      if(!serviceAwaySwitch){
        Logger.info('Adding Switch service (away)', this.accessory.displayName);
        serviceAwaySwitch = this.accessory.addService(this.api.hap.Service.Switch, 'Away', 'AwaySwitch');
      }
      
    }
    
    if(this.accessory.context.config.subtype === 'extra-childswitch'){
    
      this.accessory.services.forEach(service => {
        if(service.subtype){
          let found = false;
          this.accessory.context.config.childLocks.forEach(childLock => {
            if(service.subtype === childLock.serialNumber){
              found = true;
            }
          });
          if(!found){
            Logger.info('Removing Switch service (' + service.displayName + ')', this.accessory.displayName);
            let removableService = this.accessory.getServiceById(this.api.hap.Service.Switch, service.subtype);
            this.accessory.removeService(removableService);
          }
        }
      });

      this.accessory.context.config.childLocks.forEach(childLock => {
      
        let serviceChildLock = this.accessory.getServiceById(this.api.hap.Service.Switch, childLock.serialNumber);
         
        if(!serviceChildLock){
          Logger.info('Adding Switch service (' + childLock.name + ')', this.accessory.displayName);
          serviceChildLock = this.accessory.addService(this.api.hap.Service.Switch, childLock.name, childLock.serialNumber);
        }
            
        serviceChildLock.getCharacteristic(this.api.hap.Characteristic.On)
          .onSet(this.deviceHandler.setStates.bind(this, this.accessory, this.accessories, childLock.serialNumber)); 
      
      });
      
    }
    
    if(this.accessory.context.config.subtype === 'extra-cntrlswitch'){
      
      this.accessory.services.forEach(service => {
        if(service.subtype){
          let found = false;
          this.accessory.context.config.switches.forEach(sub => {
            if(service.subtype === sub.sub){
              found = true;
            }
          });
          if(!found){
            Logger.info('Removing Switch service (' + service.displayName + ')', this.accessory.displayName);
            let removableService = this.accessory.getServiceById(this.api.hap.Service.Switch, service.subtype);
            this.accessory.removeService(removableService);
          }
        }
      });
      
      this.accessory.context.config.switches.forEach(sub => {
      
        let serviceSubSwitch = this.accessory.getServiceById(this.api.hap.Service.Switch, sub.sub);
         
        if(!serviceSubSwitch){
          Logger.info('Adding Switch service (' + sub.name + ')', this.accessory.displayName);
          serviceSubSwitch = this.accessory.addService(this.api.hap.Service.Switch, sub.name, sub.sub);
        }
        
        if(sub.name !== 'Central'){
      
          serviceSubSwitch.getCharacteristic(this.api.hap.Characteristic.On)
            .updateValue(false);
       
        } else {
          
          //Modes
          if(!serviceSubSwitch.testCharacteristic(this.api.hap.Characteristic.AutoThermostats))
            serviceSubSwitch.addCharacteristic(this.api.hap.Characteristic.AutoThermostats);
            
          if(!serviceSubSwitch.testCharacteristic(this.api.hap.Characteristic.ManualThermostats))
            serviceSubSwitch.addCharacteristic(this.api.hap.Characteristic.ManualThermostats);
            
          if(!serviceSubSwitch.testCharacteristic(this.api.hap.Characteristic.OfflineThermostats))
            serviceSubSwitch.addCharacteristic(this.api.hap.Characteristic.OfflineThermostats);  
            
          //Activity
          if(this.accessory.context.config.runningInformation){
            
            if(!serviceSubSwitch.testCharacteristic(this.api.hap.Characteristic.OverallHeatDay))
              serviceSubSwitch.addCharacteristic(this.api.hap.Characteristic.OverallHeatDay);
              
            if(!serviceSubSwitch.testCharacteristic(this.api.hap.Characteristic.OverallHeatMonth))
              serviceSubSwitch.addCharacteristic(this.api.hap.Characteristic.OverallHeatMonth);
              
            if(!serviceSubSwitch.testCharacteristic(this.api.hap.Characteristic.OverallHeatYear))
              serviceSubSwitch.addCharacteristic(this.api.hap.Characteristic.OverallHeatYear);  
          
          } else {
            
            if(serviceSubSwitch.testCharacteristic(this.api.hap.Characteristic.OverallHeatDay))
              serviceSubSwitch.removeCharacteristic(serviceSubSwitch.getCharacteristic(this.api.hap.Characteristic.OverallHeatDay));
              
            if(serviceSubSwitch.testCharacteristic(this.api.hap.Characteristic.OverallHeatMonth))
              serviceSubSwitch.removeCharacteristic(serviceSubSwitch.getCharacteristic(this.api.hap.Characteristic.OverallHeatMonth));
              
            if(serviceSubSwitch.testCharacteristic(this.api.hap.Characteristic.OverallHeatYear))
              serviceSubSwitch.removeCharacteristic(serviceSubSwitch.getCharacteristic(this.api.hap.Characteristic.OverallHeatYear));  
            
          }
          
        }
            
        serviceSubSwitch.getCharacteristic(this.api.hap.Characteristic.On)
          .onSet(this.deviceHandler.setStates.bind(this, this.accessory, this.accessories, sub.name)); 
      
      });
      
    }
    
    if(this.accessory.context.config.subtype === 'zone-window-switch'){
    
      this.accessory.services.forEach(service => {
        if(service.subtype){
          let found = false;
          this.accessory.context.config.openWindows.forEach(window => {
            if(service.subtype === window.name){
              found = true;
            }
          });
          if(!found){
            Logger.info('Removing Switch service (' + service.displayName + ')', this.accessory.displayName);
            let removableService = this.accessory.getServiceById(this.api.hap.Service.Switch, service.subtype);
            this.accessory.removeService(removableService);
          }
        }
      });

      this.accessory.context.config.openWindows.forEach(window => {
      
        let serviceSwitch = this.accessory.getServiceById(this.api.hap.Service.Switch, window.name);
         
        if(!serviceSwitch){
          Logger.info('Adding Switch service (' + window.name + ')', this.accessory.displayName);
          serviceSwitch = this.accessory.addService(this.api.hap.Service.Switch, window.name, window.name);
        }
            
        serviceSwitch.getCharacteristic(this.api.hap.Characteristic.On)
          .onSet(this.deviceHandler.setStates.bind(this, this.accessory, this.accessories, window.name + '-' + window.zoneId)); 
      
      });
      
    }
    
    if(this.accessory.context.config.subtype === 'extra-plockswitch'){
      
      serviceHomeSwitch.getCharacteristic(this.api.hap.Characteristic.On)
        .onSet(this.deviceHandler.setStates.bind(this, this.accessory, this.accessories, 'Home')); 
        
      serviceAwaySwitch.getCharacteristic(this.api.hap.Characteristic.On)
        .onSet(this.deviceHandler.setStates.bind(this, this.accessory, this.accessories, 'Away')); 
        
    } else if(this.accessory.context.config.subtype !== 'extra-childswitch' && this.accessory.context.config.subtype !== 'zone-window-switch' && this.accessory.context.config.subtype !== 'extra-cntrlswitch') {
    
      service.getCharacteristic(this.api.hap.Characteristic.On)
        .onSet(this.deviceHandler.setStates.bind(this, this.accessory, this.accessories, 'Trigger State')); 
    
    }
    
  }

}

module.exports = SwitchAccessory;