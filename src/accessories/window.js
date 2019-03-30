'use strict';

const EveTypes = require('../types/eve.js');
const moment = require('moment');

var Service, Characteristic, FakeGatoHistoryService;

class window_Accessory {
  constructor (platform, accessory) {
  
    Service = platform.api.hap.Service;
    Characteristic = platform.api.hap.Characteristic;

    EveTypes.registerWith(platform.api.hap);
    FakeGatoHistoryService = require('fakegato-history')(platform.api);

    this.platform = platform;
    this.log = platform.log;
    this.logger = platform.logger;
    this.debug = platform.debug;
    this.api = platform.api;
    this.config = platform.config;
    this.accessories = platform.accessories;
    this.HBpath = platform.HBpath;
    
    this.tado = platform.tado;   
    this.tadoHandler = platform.tadoHandler;
    
    this.getService(accessory);

  }

  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
  // Services
  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//

  getService (accessory) {
  
    const self = this;

    accessory.on('identify', function(paired, callback) {
      self.logger.info(accessory.displayName + ': Identify!!!');
      callback();
    });
    
    this.historyService = new FakeGatoHistoryService('door', accessory, {storage:'fs',path:self.HBpath, disableTimer: false, disableRepeatLastData:false});

    let service = accessory.getService(Service.ContactSensor);
    
    if (!service.testCharacteristic(Characteristic.LastActivation))
      service.addCharacteristic(Characteristic.LastActivation);

    if (!service.testCharacteristic(Characteristic.TimesOpened))
      service.addCharacteristic(Characteristic.TimesOpened);

    if (!service.testCharacteristic(Characteristic.OpenDuration))
      service.addCharacteristic(Characteristic.OpenDuration);

    if (!service.testCharacteristic(Characteristic.ClosedDuration))
      service.addCharacteristic(Characteristic.ClosedDuration);
    
    service.getCharacteristic(Characteristic.ContactSensorState)
      .on('change', function(value){
        self.historyService.addEntry({time: moment().unix(), status: value.newValue});
        self.debug(accessory.displayName + ': New entry: ' + value.newValue + ' for contact state');
        
        if(value.newValue){
          accessory.context.timesOpened += 1;
          
          let lastActivation = moment().unix() - self.historyService.getInitialTime();          
          let closeDuration = moment().unix() - self.historyService.getInitialTime();
          
          service.getCharacteristic(Characteristic.LastActivation).updateValue(lastActivation);
          service.getCharacteristic(Characteristic.ClosedDuration).updateValue(closeDuration);
          service.getCharacteristic(Characteristic.TimesOpened).updateValue(accessory.context.timesOpened);
        } else {
          let openDuration = moment().unix() - self.historyService.getInitialTime();
          service.getCharacteristic(Characteristic.OpenDuration).updateValue(openDuration);
        }
        
      });

    this.getState(accessory, service);

  }
  
  async getState (accessory, service){
  
    try {
    
      let device = await this.tadoHandler.getZone(accessory.context.id);
      let state = device.openWindow ? 1 : 0;
    
      service.getCharacteristic(Characteristic.ContactSensorState).updateValue(state);  
    
    } catch(err) {
    
      this.logger.error(accessory.displayName + ': An error occured while getting new state');
      this.debug(err);
    
    } finally {
  
      if(!accessory.context.remove) setTimeout(this.getState.bind(this,accessory,service),accessory.context.polling);
  
    }
  
  }

}

module.exports = window_Accessory;