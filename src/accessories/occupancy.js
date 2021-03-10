'use strict';

const Logger = require('../helper/logger.js');

class OccupancyAccessory {

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

  async getService () {
    
    let service = this.accessory.getService(this.api.hap.Service.OccupancySensor);
    let serviceOld = this.accessory.getService(this.api.hap.Service.MotionSensor);
    
    if(serviceOld){
      Logger.info('Removing Motion service', this.accessory.displayName);
      this.accessory.removeService(serviceOld);
    }
    
    if(!service){
      Logger.info('Adding Occupancy service', this.accessory.displayName);
      service = this.accessory.addService(this.api.hap.Service.OccupancySensor, this.accessory.displayName, this.accessory.context.config.subtype);
    }
    
    service.getCharacteristic(this.api.hap.Characteristic.OccupancyDetected)
      .on('change', this.deviceHandler.changedStates.bind(this, this.accessory, false, this.accessory.displayName));
    
  }
  
}

module.exports = OccupancyAccessory;