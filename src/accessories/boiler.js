'use strict';

const timeout = ms => new Promise(res => setTimeout(res, ms));

var Service, Characteristic;

class thermostat_Accessory {
  constructor (platform, accessory) {
  
    Service = platform.api.hap.Service;
    Characteristic = platform.api.hap.Characteristic;

    this.platform = platform;
    this.log = platform.log;
    this.logger = platform.logger;
    this.debug = platform.debug;
    this.api = platform.api;
    this.config = platform.config;
    this.configPath = platform.configPath;
    this.accessories = platform.accessories;
    this.HBpath = platform.HBpath;
    
    this.tado = platform.tado;
    this.tadoHandler = platform.tadoHandler;
    
    this.settedState = 0;
    
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
    
    let service = accessory.getService(Service.Valve);
        
    service.setCharacteristic(Characteristic.ValveType, Characteristic.ValveType.WATER_FAUCET);
    
    service.getCharacteristic(Characteristic.Active)
      .on('set', this.setState.bind(this, accessory, service));
    
    this.getState(accessory, service);

  }
  
  async getState (accessory, service){
  
    try {
    
      let getSet = await this.getSetStatus();
    
      let zone = await this.tadoHandler.getZone(accessory.context.zoneID);
      
      if(zone.setting.power === 'OFF') {
        
        if(getSet){
          service.getCharacteristic(Characteristic.InUse).updateValue(0);
          service.getCharacteristic(Characteristic.Active).updateValue(0);  
        }
     
      } else {
       
        if(getSet){
          service.getCharacteristic(Characteristic.Active).updateValue(1);
          service.getCharacteristic(Characteristic.InUse).updateValue(1);  
        }
        
      }
    
    } catch(err) {
    
      this.debug(accessory.displayName + ': An error occured while getting new state');
      this.debug(err);
    
    } finally {
  
      if(!accessory.context.remove) setTimeout(this.getState.bind(this,accessory,service),accessory.context.polling);
      
    }
  
  }
  
  async setState(accessory,service,state,callback){
  
    let failed;
  
    try {
    
      this.settedState++;
    
      this.logger.info(accessory.displayName + ': ' + (state ? 'On' : 'Off'));
      
      let termination = state ? accessory.context.overrideMode : 'manual';
      let onOff = state ? 'on' : 'off';
        
      await this.tado.setZoneOverlay(accessory.context.homeID,accessory.context.zoneID,onOff,null,termination,accessory.context.zoneType);

    } catch(err) {
    
      this.logger.error(accessory.displayName + ': An error occured while setting new state!'); 
      this.debug(err);
      
      failed = err;
    
    } finally {
    
      if(failed)
        state = state ? false : true;
      
      if(state){
      
        service.getCharacteristic(Characteristic.Active).updateValue(1);
        service.getCharacteristic(Characteristic.InUse).updateValue(1);  
      
      } else {
      
        service.getCharacteristic(Characteristic.InUse).updateValue(0);
        service.getCharacteristic(Characteristic.Active).updateValue(0);  
      
      }
      
      callback();
    
    }
    
  }
  
  async getSetStatus(){
  
    if(this.settedState){
    
      this.oldState = this.settedState; 
    
      await timeout(5000);
    
      if(this.settedState === this.oldState){
    
        this.settedState = 0;
        return true;
    
      } else {
    
        return false;
    
      }
    
    } else {
    
      return true;
    
    }
  
  }

}

module.exports = thermostat_Accessory;