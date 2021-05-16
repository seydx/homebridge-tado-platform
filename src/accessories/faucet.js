'use strict';

const Logger = require('../helper/logger.js');

class FaucetAccessory {
  constructor(api, accessory, accessories, tado, deviceHandler) {
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

  getService() {
    let service = this.accessory.getService(this.api.hap.Service.Valve);
    let serviceSwitch = this.accessory.getService(this.api.hap.Service.Switch);
    let serviceHeaterCooler = this.accessory.getService(this.api.hap.Service.HeaterCooler);
    let serviceThermostat = this.accessory.getService(this.api.hap.Service.Thermostat);

    if (serviceSwitch) {
      Logger.info('Removing Switch service', this.accessory.displayName);
      this.accessory.removeService(serviceSwitch);
    }

    if (serviceThermostat) {
      Logger.info('Removing Thermostat service', this.accessory.displayName);
      this.accessory.removeService(serviceThermostat);
    }

    if (serviceHeaterCooler) {
      Logger.info('Removing HeaterCooler service', this.accessory.displayName);
      this.accessory.removeService(serviceHeaterCooler);
    }

    if (!service) {
      Logger.info('Adding Faucet service', this.accessory.displayName);
      service = this.accessory.addService(
        this.api.hap.Service.Valve,
        this.accessory.displayName,
        this.accessory.context.config.subtype
      );
    }

    service
      .setCharacteristic(this.api.hap.Characteristic.Name, this.accessory.displayName)
      .setCharacteristic(this.api.hap.Characteristic.IsConfigured, this.api.hap.Characteristic.IsConfigured.CONFIGURED)
      .setCharacteristic(this.api.hap.Characteristic.StatusFault, this.api.hap.Characteristic.StatusFault.NO_FAULT)
      .setCharacteristic(this.api.hap.Characteristic.ValveType, this.api.hap.Characteristic.ValveType.WATER_FAUCET);

    service
      .getCharacteristic(this.api.hap.Characteristic.Active)
      .onSet(this.deviceHandler.setStates.bind(this, this.accessory, this.accessories, 'State'));
  }
}

module.exports = FaucetAccessory;
