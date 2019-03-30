'use strict';

var Service, Characteristic;

class occupancy_Accessory {
  constructor (platform, accessory) {
  
    Service = platform.api.hap.Service;
    Characteristic = platform.api.hap.Characteristic;

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

    let service = accessory.getService(Service.OccupancySensor);

    this.getState(accessory, service);

  }
  
  async getState (accessory, service){
  
    try {
  
      let state;
    
      if(accessory.displayName !== 'Anyone'){
    
        let device = await this.tadoHandler.getDevice(accessory.context.serial);
        state = device.atHome ? 1 : 0;
      
      } else {
      
        let status = await this.accessories.map( user => {
        
          if(user.context.type === 'occupancy' && user.displayName !== 'Anyone'){
            
            return user.getService(Service.OccupancySensor).getCharacteristic(Characteristic.OccupancyDetected).value;
            
          }
        
        });
        
        state = (status.includes(1)) ? 1 : 0;
      
      }
      
      service.getCharacteristic(Characteristic.OccupancyDetected).updateValue(state);
    
    } catch(err) {
    
      this.logger.error(accessory.displayName + ': An error occured while getting new state');
      this.debug(err);
    
    } finally {
  
      if(!accessory.context.remove) setTimeout(this.getState.bind(this,accessory,service),accessory.context.polling);
      
    }
  
  }

}

module.exports = occupancy_Accessory;