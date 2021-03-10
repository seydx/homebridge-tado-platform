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
    
    if(serviceContact){
      Logger.info('Removing ContactSensor service', this.accessory.displayName);
      this.accessory.removeService(serviceContact);
    }
    
    if(serviceHeater){
      Logger.info('Removing HeaterCooler service', this.accessory.displayName);
      this.accessory.removeService(serviceHeater);
    }
    
    if(serviceFaucet){
      Logger.info('Removing Faucet service', this.accessory.displayName);
      this.accessory.removeService(serviceFaucet);
    }
    
    if(!service){
      Logger.info('Adding Switch service', this.accessory.displayName);
      service = this.accessory.addService(this.api.hap.Service.Switch, this.accessory.displayName, this.accessory.context.config.subtype);
    }
    
    if(this.accessory.context.config.subtype === 'extra-cntrlswitch'){
      if(!service.testCharacteristic(this.api.hap.Characteristic.OverallHeat))
        service.addCharacteristic(this.api.hap.Characteristic.OverallHeat);
      if(!service.testCharacteristic(this.api.hap.Characteristic.AutoThermostats))
        service.addCharacteristic(this.api.hap.Characteristic.AutoThermostats);
      if(!service.testCharacteristic(this.api.hap.Characteristic.ManualThermostats))
        service.addCharacteristic(this.api.hap.Characteristic.ManualThermostats);
      if(!service.testCharacteristic(this.api.hap.Characteristic.OfflineThermostats))
        service.addCharacteristic(this.api.hap.Characteristic.OfflineThermostats);
    }
    
    service.getCharacteristic(this.api.hap.Characteristic.On)
      .onSet(this.deviceHandler.setStates.bind(this, this.accessory, this.accessories, 'Trigger State')); 
    
  }

}

module.exports = SwitchAccessory;