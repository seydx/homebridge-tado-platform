'use strict';

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

    this.accessory = accessory;
    this.mainService = this.accessory.getService(Service.Faucet, this.accessory.displayName);
    
    this.handleValve();
    
    this.getService();
  
  }

  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
  // Services
  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
  
  handleValve(){
  
    const self = this;
 
    if(!this.accessory.getServiceByUUIDAndSubType(Service.Valve, 'Hot Water Valve')){
   
      this.valveService = new Service.Valve('Hot Water', 'Hot Water Valve');
      
      this.valveService.addCharacteristic(Characteristic.ConfiguredName);
  
      this.valveService
        .setCharacteristic(Characteristic.Name, 'Hot Water')
        .setCharacteristic(Characteristic.ServiceLabelIndex, 1)
        .setCharacteristic(Characteristic.ConfiguredName, 'Hot Water')
        .setCharacteristic(Characteristic.IsConfigured, Characteristic.IsConfigured.CONFIGURED)
        .setCharacteristic(Characteristic.ValveType, Characteristic.ValveType.WATER_FAUCET);
        
      this.accessory.addService(this.valveService);
      this.mainService.addLinkedService(this.valveService);
            
    } else {
  
      this.valveService = this.accessory.getServiceByUUIDAndSubType(Service.Valve, 'Hot Water Valve');  
      this.mainService.addLinkedService(this.valveService);
        
    }
    
    this.valveService.getCharacteristic(Characteristic.Active)
      .on('set', function(state, callback){      
        self.valveService.getCharacteristic(Characteristic.InUse).updateValue(state);       
        callback();
      });
        
  }

  getService() {
  
    const self = this;

    this.accessory.on('identify', function(paired, callback) {
      self.logger.info(self.accessory.displayName + ': Identify!!!');
      callback();
    });
    
    this.mainService.getCharacteristic(Characteristic.Active)
      .on('set', this.setState.bind(this));
      
    if(this.accessory.context.canSetTemperature){
    
      this.accessory.context.cachedTemp = this.accessory.context.cachedTemp||this.accessory.context.minValue;
        
      if(!this.mainService.testCharacteristic(Characteristic.CurrentHeaterCoolerState))
        this.mainService.addCharacteristic(Characteristic.CurrentHeaterCoolerState);
      
      this.mainService.getCharacteristic(Characteristic.TargetHeaterCoolerState)
        .setProps({ maxValue: 2, minValue: 2, validValues: [2] })
        .updateValue(2);
      
      if(!this.mainService.testCharacteristic(Characteristic.TargetHeaterCoolerState))
        this.mainService.addCharacteristic(Characteristic.TargetHeaterCoolerState);
      
      this.mainService.getCharacteristic(Characteristic.TargetHeaterCoolerState)
        .setProps({ maxValue: 1, minValue: 1, validValues: [1] })
        .updateValue(1);
      
      if(!this.mainService.testCharacteristic(Characteristic.HeatingThresholdTemperature))
        this.mainService.addCharacteristic(Characteristic.HeatingThresholdTemperature);
      
      this.mainService.getCharacteristic(Characteristic.HeatingThresholdTemperature)
        .setProps({ maxValue: this.accessory.context.maxValue, minValue: this.accessory.context.minValue, minStep: 1 })
        .updateValue(this.accessory.context.cachedTemp)
        .on('set', this.setTemp.bind(this));
    
    }
    
    this.getState();

  }
  
  async getState (){
  
    try {
    
      let zone = await this.tadoHandler.getZone(this.accessory.context.zoneID);
      
      if(zone.setting.power === 'OFF') {
        
        this.valveService.getCharacteristic(Characteristic.InUse).updateValue(0);
        this.valveService.getCharacteristic(Characteristic.Active).updateValue(0); 
        this.mainService.getCharacteristic(Characteristic.Active).updateValue(0); 
     
      } else {

        this.mainService.getCharacteristic(Characteristic.Active).updateValue(1); 
        this.valveService.getCharacteristic(Characteristic.Active).updateValue(1); 
        this.valveService.getCharacteristic(Characteristic.InUse).updateValue(1);
        
        if(this.accessory.context.canSetTemperature){
          
          this.accessory.context.cachedTemp = ( this.accessory.context.unit === 1 ) ? zone.setting.temperature.fahrenheit : zone.setting.temperature.celsius;
      
          this.mainService.getCharacteristic(Characteristic.HeatingThresholdTemperature)
            .updateValue(this.accessory.context.cachedTemp); 
        
        }
        
      }
    
    } catch(err) {
    
      this.debug(this.accessory.displayName + ': An error occured while getting new state');
      this.debug(err);
    
    } finally {
  
      if(!this.accessory.context.remove) setTimeout(this.getState.bind(this), this.accessory.context.polling);
      
    }
  
  }
  
  async setState(state,callback){
  
    let failed;
  
    try {
    
      this.logger.info(this.accessory.displayName + ': ' + (state ? 'On' : 'Off'));
      
      let termination = state ? this.accessory.context.overrideMode : 'manual';
      let onOff = state ? 'on' : 'off';
      let temp = this.accessory.context.canSetTemperature ? this.mainService.getCharacteristic(Characteristic.HeatingThresholdTemperature).value : null;
        
      await this.tado.setZoneOverlay(this.accessory.context.homeID,this.accessory.context.zoneID,onOff,temp,termination,this.accessory.context.zoneType,this.accessory.context.unit);

    } catch(err) {
    
      this.logger.error(this.accessory.displayName + ': An error occured while setting new state!'); 
      this.debug(err);
      
      failed = err;
    
    } finally {
    
      if(failed)
        state = state ? false : true;
      
      if(state){
      
        this.valveService.getCharacteristic(Characteristic.InUse).updateValue(0);
        this.valveService.getCharacteristic(Characteristic.Active).updateValue(0); 
        this.mainService.getCharacteristic(Characteristic.Active).updateValue(0); 
      
      } else {
      
        this.mainService.getCharacteristic(Characteristic.Active).updateValue(1); 
        this.valveService.getCharacteristic(Characteristic.Active).updateValue(1); 
        this.valveService.getCharacteristic(Characteristic.InUse).updateValue(1);
      
      }
      
      callback();
    
    }
    
  }
  
  async setTemp(value, callback){
    
    try {
    
      if(this.mainService.getCharacteristic(Characteristic.Active).value){
      
        this.logger.info(this.accessory.displayName + ': Setting new temperature: ' + value);

        await this.tado.setZoneOverlay(this.accessory.context.homeID,this.accessory.context.zoneID,'on',value,this.accessory.context.overrideMode,this.accessory.context.zoneType,this.accessory.context.unit);
      
      }

    } catch(err) {
    
      this.logger.error(this.accessory.displayName + ': An error occured while setting new temp!'); 
      this.debug(err);
    
    } finally {
      
      callback();
    
    }

  }

}

module.exports = thermostat_Accessory;
