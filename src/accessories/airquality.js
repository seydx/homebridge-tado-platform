'use strict';

const Logger = require('../helper/logger.js');

class AirQualityAccessory {

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
    
    let service = this.accessory.getService(this.api.hap.Service.AirQualitySensor);
    
    if(!service){
      Logger.info('Adding AirQualitySensor service', this.accessory.displayName);
      service = this.accessory.addService(this.api.hap.Service.AirQualitySensor, this.accessory.displayName, this.accessory.context.config.subtype);
    }
    
    if (!service.testCharacteristic(this.api.hap.Characteristic.PM10Density))
      service.addCharacteristic(this.api.hap.Characteristic.PM10Density);
      
    if (!service.testCharacteristic(this.api.hap.Characteristic.PM2_5Density))
      service.addCharacteristic(this.api.hap.Characteristic.PM2_5Density);
      
    if (!service.testCharacteristic(this.api.hap.Characteristic.NitrogenDioxideDensity))
      service.addCharacteristic(this.api.hap.Characteristic.NitrogenDioxideDensity);
      
    if (!service.testCharacteristic(this.api.hap.Characteristic.OzoneDensity))
      service.addCharacteristic(this.api.hap.Characteristic.OzoneDensity);
      
    if (!service.testCharacteristic(this.api.hap.Characteristic.SulphurDioxideDensity))
      service.addCharacteristic(this.api.hap.Characteristic.SulphurDioxideDensity);
      
    if (!service.testCharacteristic(this.api.hap.Characteristic.CarbonMonoxideLevel))
      service.addCharacteristic(this.api.hap.Characteristic.CarbonMonoxideLevel);
      
    service.getCharacteristic(this.api.hap.Characteristic.CarbonMonoxideLevel)
      .setProps({
        minStep: 0.01
      });
      
  }

}

module.exports = AirQualityAccessory;