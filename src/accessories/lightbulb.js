'use strict';

const Logger = require('../helper/logger.js');

class SolarlightAccessory {

  constructor (api, accessory, accessories, tado) {
    
    this.api = api;
    this.accessory = accessory;
    this.accessories = accessories;
    
    this.tado = tado;
    
    this.getService();

  }

  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
  // Services
  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//

  getService () {
  
    let service = this.accessory.getService(this.api.hap.Service.Lightbulb);
        
    if(!service){
      Logger.info('Adding Lightbulb service', this.accessory.displayName);
      service = this.accessory.addService(this.api.hap.Service.Lightbulb, this.accessory.displayName, this.accessory.context.config.subtype);
    }
    
    if(!service.testCharacteristic(this.api.hap.Characteristic.Brightness))
      service.addCharacteristic(this.api.hap.Characteristic.Brightness);  
    
    service.getCharacteristic(this.api.hap.Characteristic.On)
      .onSet(() => {
        setTimeout(() => {
          service.getCharacteristic(this.api.hap.Characteristic.On)
            .updateValue(this.accessory.context.lightBulbState || false);
        }, 500);   
      }); 
    
    service.getCharacteristic(this.api.hap.Characteristic.Brightness)
      .onSet(() => {        
        setTimeout(() => {
          service.getCharacteristic(this.api.hap.Characteristic.On)
            .updateValue(this.accessory.context.lightBulbBrightness || 0);
        }, 500);     
      }); 
      
  }

}

module.exports = SolarlightAccessory;