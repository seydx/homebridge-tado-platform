'use strict';

const Logger = require('../helper/logger.js');

const moment = require('moment');

const timeout = (ms) => new Promise((res) => setTimeout(res, ms));

class ContactAccessory {
  constructor(api, accessory, accessories, tado, deviceHandler, FakeGatoHistoryService) {
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

  async getService() {
    let service = this.accessory.getService(this.api.hap.Service.ContactSensor);
    let serviceSwitch = this.accessory.getService(this.api.hap.Service.Switch);

    if (serviceSwitch) {
      Logger.info('Removing Switch service', this.accessory.displayName);
      this.accessory.removeService(serviceSwitch);
    }

    if (!service) {
      Logger.info('Adding ContactSensor service', this.accessory.displayName);
      service = this.accessory.addService(
        this.api.hap.Service.ContactSensor,
        this.accessory.displayName,
        this.accessory.context.config.subtype
      );
    }

    let batteryService = this.accessory.getService(this.api.hap.Service.BatteryService);

    if (!this.accessory.context.config.noBattery && this.accessory.context.config.type === 'HEATING') {
      if (!batteryService) {
        Logger.info('Adding Battery service', this.accessory.displayName);
        batteryService = this.accessory.addService(this.api.hap.Service.BatteryService);
      }
      batteryService.setCharacteristic(
        this.api.hap.Characteristic.ChargingState,
        this.api.hap.Characteristic.ChargingState.NOT_CHARGEABLE
      );
    } else {
      if (batteryService) {
        Logger.info('Removing Battery service', this.accessory.displayName);
        this.accessory.removeService(batteryService);
      }
    }

    if (!service.testCharacteristic(this.api.hap.Characteristic.LastActivation))
      service.addCharacteristic(this.api.hap.Characteristic.LastActivation);

    if (!service.testCharacteristic(this.api.hap.Characteristic.TimesOpened))
      service.addCharacteristic(this.api.hap.Characteristic.TimesOpened);

    if (!service.testCharacteristic(this.api.hap.Characteristic.ResetTotal))
      service.addCharacteristic(this.api.hap.Characteristic.ResetTotal);

    if (!service.testCharacteristic(this.api.hap.Characteristic.OpenDuration))
      service.addCharacteristic(this.api.hap.Characteristic.OpenDuration);

    if (!service.testCharacteristic(this.api.hap.Characteristic.ClosedDuration))
      service.addCharacteristic(this.api.hap.Characteristic.ClosedDuration);

    service.getCharacteristic(this.api.hap.Characteristic.ResetTotal).onSet((value) => {
      Logger.info(value + ': Resetting FakeGato..', this.accessory.displayName);

      const now = Math.round(new Date().valueOf() / 1000);
      const epoch = Math.round(new Date('2001-01-01T00:00:00Z').valueOf() / 1000);

      service.getCharacteristic(this.api.hap.Characteristic.ResetTotal).updateValue(now - epoch);

      this.accessory.context.timesOpened = 0;

      service
        .getCharacteristic(this.api.hap.Characteristic.TimesOpened)
        .updateValue(this.accessory.context.timesOpened);
    });

    this.historyService = new this.FakeGatoHistoryService('door', this.accessory, {
      storage: 'fs',
      path: this.api.user.storagePath(),
      disableTimer: true,
    });

    await timeout(250); //wait for historyService to load

    service
      .getCharacteristic(this.api.hap.Characteristic.ContactSensorState)
      .on(
        'change',
        this.deviceHandler.changedStates.bind(this, this.accessory, this.historyService, this.accessory.displayName)
      );

    this.refreshHistory(service);
  }

  refreshHistory(service) {
    let state = service.getCharacteristic(this.api.hap.Characteristic.ContactSensorState).value;

    this.historyService.addEntry({
      time: moment().unix(),
      status: state ? 1 : 0,
    });

    setTimeout(() => {
      this.refreshHistory(service);
    }, 10 * 60 * 1000);
  }
}

module.exports = ContactAccessory;
