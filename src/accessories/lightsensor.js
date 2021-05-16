'use strict';

const Logger = require('../helper/logger.js');

class SolarLightsensorAccessory {
  constructor(api, accessory, accessories, tado) {
    this.api = api;
    this.accessory = accessory;
    this.accessories = accessories;

    this.tado = tado;

    this.getService();
  }

  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
  // Services
  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//

  getService() {
    let service = this.accessory.getService(this.api.hap.Service.LightSensor);
    let serviceOld = this.accessory.getService(this.api.hap.Service.Lightbulb);

    if (serviceOld) {
      Logger.info('Removing Lightbulb service', this.accessory.displayName);
      this.accessory.removeService(serviceOld);
    }

    if (!service) {
      Logger.info('Adding LightSensor service', this.accessory.displayName);
      service = this.accessory.addService(
        this.api.hap.Service.LightSensor,
        this.accessory.displayName,
        this.accessory.context.config.subtype
      );
    }
  }
}

module.exports = SolarLightsensorAccessory;
