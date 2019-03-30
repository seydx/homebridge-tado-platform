'use strict';

const HomeKitTypes = require('../types/types.js');

var Service, Characteristic;

class switch_Accessory {
  constructor (platform, accessory) {
  
    Service = platform.api.hap.Service;
    Characteristic = platform.api.hap.Characteristic;
    
    HomeKitTypes.registerWith(platform.api.hap);

    this.platform = platform;
    this.log = platform.log;
    this.logger = platform.logger;
    this.debug = platform.debug;
    this.api = platform.api;
    this.config = platform.config;
    this.accessories = platform.accessories;
    
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

    let service = accessory.getService(Service.Switch);

    service.getCharacteristic(Characteristic.On)
      .on('set', this.setState.bind(this, accessory, service));
      
    if (!service.testCharacteristic(Characteristic.AutoThermostats))
      service.addCharacteristic(Characteristic.AutoThermostats);
      
    if (!service.testCharacteristic(Characteristic.ManualThermostats))
      service.addCharacteristic(Characteristic.ManualThermostats);
      
    if (!service.testCharacteristic(Characteristic.OfflineThermostats))
      service.addCharacteristic(Characteristic.OfflineThermostats);

    this.getState(accessory, service);

  }
  
  async getState (accessory, service){
  
    let states;
    let auto = 0;
    let manual = 0;
    let off = 0;
  
    try {
    
      states = await this.accessories.map( device => {
      
        if(device.context.type === 'thermostat'){
        
          let tarState = device.getService(Service.Thermostat).getCharacteristic(Characteristic.TargetHeatingCoolingState).value;
          
          if(tarState===0)off++;
          if(tarState===1||tarState===2)manual++;
          if(tarState===3)auto++;
        
          return tarState;
          
        }
       
      });
      
      let status = ( states.includes(3) ) ? true : false;
      
      service.getCharacteristic(Characteristic.On).updateValue(status);
      
      service.getCharacteristic(Characteristic.AutoThermostats).updateValue(auto);
      service.getCharacteristic(Characteristic.ManualThermostats).updateValue(manual);
      service.getCharacteristic(Characteristic.OfflineThermostats).updateValue(off);
    
    } catch(err) {
    
      this.logger.error(accessory.displayName + ': An error occured while getting new state');
      this.debug(err);
    
    } finally {
  
      if(!accessory.context.remove) setTimeout(this.getState.bind(this,accessory,service),2000);
      
    }
  
  }
  
  async setState (accessory, service, state, callback){
  
    try {
  
      await this.accessories.map( device => {
      
        if(device.context.type === 'thermostat'){
      
          if(state){
        
            device.getService(Service.Thermostat).getCharacteristic(Characteristic.CurrentHeatingCoolingState)
              .updateValue(0);
              
            device.getService(Service.Thermostat).getCharacteristic(Characteristic.TargetHeatingCoolingState)
              .setValue(3,undefined,{autoSwitch:true});
              
            device.getService(Service.Thermostat).getCharacteristic(Characteristic.TargetHeatingCoolingState)
              .updateValue(3);
          
          } else {
        
            device.getService(Service.Thermostat).getCharacteristic(Characteristic.CurrentHeatingCoolingState)
              .updateValue(0);
              
            device.getService(Service.Thermostat).getCharacteristic(Characteristic.TargetHeatingCoolingState)
              .setValue(0,undefined,{autoSwitch:true});
              
            device.getService(Service.Thermostat).getCharacteristic(Characteristic.TargetHeatingCoolingState)
              .updateValue(0);
        
          }
        
        }
      
      });
      
    } catch(err) {
    
      this.logger.error(accessory.displayName + ': An error occured while setting new state');
      this.debug(err);
      
    } finally {
    
      callback(null, state);
      
    }
  
  }

}

module.exports = switch_Accessory;
