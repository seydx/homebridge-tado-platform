'use strict';

const Logger = require('../helper/logger.js');

class SecurityAccessory {
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
    let service = this.accessory.getService(this.api.hap.Service.SecuritySystem);
    let serviceOld = this.accessory.getService(this.api.hap.Service.Switch);

    let serviceHomeSwitch = this.accessory.getServiceById(this.api.hap.Service.Switch, 'HomeSwitch');
    let serviceAwaySwitch = this.accessory.getServiceById(this.api.hap.Service.Switch, 'AwaySwitch');

    if (serviceHomeSwitch) {
      Logger.info('Removing Switch service (home)', this.accessory.displayName);
      this.accessory.removeService(serviceHomeSwitch);
    }

    if (serviceAwaySwitch) {
      Logger.info('Removing Switch service (away)', this.accessory.displayName);
      this.accessory.removeService(serviceAwaySwitch);
    }

    if (serviceOld) {
      Logger.info('Removing Switch service', this.accessory.displayName);
      this.accessory.removeService(serviceOld);
    }

    if (!service) {
      Logger.info('Adding SecuritySystem service', this.accessory.displayName);
      service = this.accessory.addService(
        this.api.hap.Service.SecuritySystem,
        this.accessory.displayName,
        this.accessory.context.config.subtype
      );
    }

    service
      .setCharacteristic(this.api.hap.Characteristic.Name, this.accessory.displayName)
      .setCharacteristic(this.api.hap.Characteristic.SecuritySystemAlarmType, 0)
      .setCharacteristic(this.api.hap.Characteristic.StatusFault, this.api.hap.Characteristic.StatusFault.NO_FAULT)
      .setCharacteristic(
        this.api.hap.Characteristic.StatusTampered,
        this.api.hap.Characteristic.StatusTampered.NOT_TAMPERED
      );

    service.getCharacteristic(this.api.hap.Characteristic.SecuritySystemCurrentState).setProps({
      maxValue: 3,
      minValue: 0,
      validValues: [0, 1, 3],
    });

    service.getCharacteristic(this.api.hap.Characteristic.SecuritySystemTargetState).setProps({
      maxValue: 3,
      minValue: 0,
      validValues: [0, 1, 3],
    });

    service
      .getCharacteristic(this.api.hap.Characteristic.SecuritySystemTargetState)
      .onSet(this.deviceHandler.setStates.bind(this, this.accessory, this.accessories, 'State'));
  }
}

module.exports = SecurityAccessory;
