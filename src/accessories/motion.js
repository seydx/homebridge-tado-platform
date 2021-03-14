'use strict';

const Logger = require('../helper/logger.js');

const moment = require('moment');

const timeout = (ms) => new Promise((res) => setTimeout(res, ms));

class MotionAccessory {

  constructor (api, accessory, accessories, tado, deviceHandler, FakeGatoHistoryService) {
    
    this.api = api;
    this.accessory = accessory;
    this.accessories = accessories;
    this.FakeGatoHistoryService = FakeGatoHistoryService;
    
    this.deviceHandler = deviceHandler;
    this.tado = tado;
    
    this.getService();

  }

  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
  // Services
  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//

  async getService () {
    
    let service = this.accessory.getService(this.api.hap.Service.MotionSensor);
    let serviceOld = this.accessory.getService(this.api.hap.Service.OccupancySensor);
    
    if(serviceOld){
      Logger.info('Removing Occupancy service', this.accessory.displayName);
      this.accessory.removeService(serviceOld);
    }
    
    if(!service){
      Logger.info('Adding Motion service', this.accessory.displayName);
      service = this.accessory.addService(this.api.hap.Service.MotionSensor, this.accessory.displayName, this.accessory.context.config.subtype);
    }
    
    if(!service.testCharacteristic(this.api.hap.Characteristic.LastActivation))
      service.addCharacteristic(this.api.hap.Characteristic.LastActivation);
    
    this.historyService = new this.FakeGatoHistoryService('motion', this.accessory, {storage:'fs', path: this.api.user.storagePath(), disableTimer:true});
    
    await timeout(250); //wait for historyService to load
    
    service.getCharacteristic(this.api.hap.Characteristic.MotionDetected)
      .on('change', this.deviceHandler.changedStates.bind(this, this.accessory, this.historyService, this.accessory.displayName));
    
    this.refreshHistory(service);
    
  }
  
  async refreshHistory(service){ 
    
    let state = service.getCharacteristic(this.api.hap.Characteristic.MotionDetected).value;
    
    this.historyService.addEntry({
      time: moment().unix(), 
      status: state ? 1 : 0
    });
    
    setTimeout(() => {
      this.refreshHistory(service);
    }, 10 * 60 * 1000);
    
  }

}

module.exports = MotionAccessory;