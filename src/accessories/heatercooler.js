'use strict';

const Logger = require('../helper/logger.js');

const moment = require('moment');

const timeout = (ms) => new Promise((res) => setTimeout(res, ms));

class HeaterCoolerAccessory {
  constructor(api, accessory, accessories, tado, deviceHandler, FakeGatoHistoryService) {
    this.api = api;
    this.accessory = accessory;
    this.accessories = accessories;
    this.FakeGatoHistoryService = FakeGatoHistoryService;

    this.deviceHandler = deviceHandler;
    this.tado = tado;

    this.autoDelayTimeout = null;

    this.getService();
  }

  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
  // Services
  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//

  async getService() {
    let service = this.accessory.getService(this.api.hap.Service.HeaterCooler);
    let serviceThermostat = this.accessory.getService(this.api.hap.Service.Thermostat);
    let serviceSwitch = this.accessory.getService(this.api.hap.Service.Switch);
    let serviceFaucet = this.accessory.getService(this.api.hap.Service.Valve);

    if (serviceThermostat) {
      Logger.info('Removing Thermostat service', this.accessory.displayName);
      this.accessory.removeService(serviceThermostat);
    }

    if (serviceSwitch) {
      Logger.info('Removing Switch service', this.accessory.displayName);
      this.accessory.removeService(serviceSwitch);
    }

    if (serviceFaucet) {
      Logger.info('Removing Faucet service', this.accessory.displayName);
      this.accessory.removeService(serviceFaucet);
    }

    if (!service) {
      Logger.info('Adding HeaterCooler service', this.accessory.displayName);
      service = this.accessory.addService(
        this.api.hap.Service.HeaterCooler,
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

    //Handle AirQuality
    if (this.accessory.context.config.airQuality && this.accessory.context.config.type !== 'HOT_WATER') {
      if (!service.testCharacteristic(this.api.hap.Characteristic.AirQuality))
        service.addCharacteristic(this.api.hap.Characteristic.AirQuality);
    } else {
      if (service.testCharacteristic(this.api.hap.Characteristic.AirQuality))
        service.removeCharacteristic(service.getCharacteristic(this.api.hap.Characteristic.AirQuality));
    }

    //Handle DelaySwitch
    if (this.accessory.context.config.delaySwitch && this.accessory.context.config.type !== 'HOT_WATER') {
      if (!service.testCharacteristic(this.api.hap.Characteristic.DelaySwitch))
        service.addCharacteristic(this.api.hap.Characteristic.DelaySwitch);

      if (!service.testCharacteristic(this.api.hap.Characteristic.DelayTimer))
        service.addCharacteristic(this.api.hap.Characteristic.DelayTimer);

      if (this.accessory.context.config.autoOffDelay) {
        service
          .getCharacteristic(this.api.hap.Characteristic.DelaySwitch)
          .onSet((value) => {
            if (value && this.accessory.context.delayTimer) {
              this.autoDelayTimeout = setTimeout(() => {
                Logger.info('Timer expired, turning off delay switch', this.accessory.displayName);
                service.getCharacteristic(this.api.hap.Characteristic.DelaySwitch).updateValue(false);
                this.autoDelayTimeout = null;
              }, this.accessory.context.delayTimer * 1000);
            } else {
              if (this.autoDelayTimeout) {
                clearTimeout(this.autoDelayTimeout);
                this.autoDelayTimeout = null;
              }
            }
          })
          .updateValue(false);
      } else {
        service
          .getCharacteristic(this.api.hap.Characteristic.DelaySwitch)
          .onGet(() => {
            return this.accessory.context.delaySwitch || false;
          })
          .onSet((value) => {
            this.accessory.context.delaySwitch = value;
          });
      }

      service
        .getCharacteristic(this.api.hap.Characteristic.DelayTimer)
        .onGet(() => {
          return this.accessory.context.delayTimer || 0;
        })
        .onSet((value) => {
          this.accessory.context.delayTimer = value;
        });
    } else {
      if (service.testCharacteristic(this.api.hap.Characteristic.DelaySwitch))
        service.removeCharacteristic(service.getCharacteristic(this.api.hap.Characteristic.DelaySwitch));

      if (service.testCharacteristic(this.api.hap.Characteristic.DelayTimer))
        service.removeCharacteristic(service.getCharacteristic(this.api.hap.Characteristic.DelayTimer));
    }

    if (!service.testCharacteristic(this.api.hap.Characteristic.HeatingThresholdTemperature))
      service.addCharacteristic(this.api.hap.Characteristic.HeatingThresholdTemperature);

    if (this.accessory.context.config.type === 'HEATING') {
      if (!service.testCharacteristic(this.api.hap.Characteristic.CoolingThresholdTemperature))
        service.addCharacteristic(this.api.hap.Characteristic.CoolingThresholdTemperature);

      if (!this.accessory.context.config.separateHumidity) {
        if (!service.testCharacteristic(this.api.hap.Characteristic.CurrentRelativeHumidity))
          service.addCharacteristic(this.api.hap.Characteristic.CurrentRelativeHumidity);
      } else {
        if (service.testCharacteristic(this.api.hap.Characteristic.CurrentRelativeHumidity))
          service.removeCharacteristic(service.getCharacteristic(this.api.hap.Characteristic.CurrentRelativeHumidity));
      }
    } else {
      if (service.testCharacteristic(this.api.hap.Characteristic.CoolingThresholdTemperature))
        service.removeCharacteristic(
          service.getCharacteristic(this.api.hap.Characteristic.CoolingThresholdTemperature)
        );
    }

    let minValue =
      this.accessory.context.config.type === 'HOT_WATER'
        ? this.accessory.context.config.temperatureUnit === 'CELSIUS'
          ? 30
          : 86
        : this.accessory.context.config.temperatureUnit === 'CELSIUS'
        ? 5
        : 41;

    let maxValue =
      this.accessory.context.config.type === 'HOT_WATER'
        ? this.accessory.context.config.temperatureUnit === 'CELSIUS'
          ? 65
          : 149
        : this.accessory.context.config.temperatureUnit === 'CELSIUS'
        ? 25
        : 77;

    minValue = this.accessory.context.config.minValue < maxValue ? this.accessory.context.config.minValue : minValue;

    maxValue = this.accessory.context.config.maxValue > minValue ? this.accessory.context.config.maxValue : maxValue;

    console.log('Before MINSTEP: ' + this.accessory.context.config.minStep, this.accessory.displayName);

    let minStep = parseFloat(
      (this.accessory.context.config.minStep &&
      !isNaN(this.accessory.context.config.minStep) &&
      this.accessory.context.config.minStep > 0 &&
      this.accessory.context.config.minStep <= 1
        ? parseFloat(this.accessory.context.config.minStep)
        : 1
      ).toFixed(2)
    );

    console.log('After MINSTEP: ' + minStep, this.accessory.displayName);

    let maxState = this.accessory.context.config.type === 'HOT_WATER' ? 2 : 3;

    let validState = this.accessory.context.config.type === 'HOT_WATER' ? [0, 1, 2] : [0, 1, 2, 3];

    if (service.getCharacteristic(this.api.hap.Characteristic.CurrentHeaterCoolerState).value > maxState)
      service.getCharacteristic(this.api.hap.Characteristic.CurrentHeaterCoolerState).updateValue(maxState);

    service.getCharacteristic(this.api.hap.Characteristic.CurrentHeaterCoolerState).setProps({
      maxValue: maxState,
      minValue: 0,
      validValues: validState,
    });

    service.getCharacteristic(this.api.hap.Characteristic.TargetHeaterCoolerState).updateValue(1);

    service.getCharacteristic(this.api.hap.Characteristic.TargetHeaterCoolerState).setProps({
      maxValue: 1,
      minValue: 1,
      validValues: [1],
    });

    service.getCharacteristic(this.api.hap.Characteristic.CurrentTemperature).setProps({
      minValue: -255,
      maxValue: 255,
    });

    if (service.getCharacteristic(this.api.hap.Characteristic.HeatingThresholdTemperature).value < minValue)
      service.getCharacteristic(this.api.hap.Characteristic.HeatingThresholdTemperature).updateValue(minValue);

    if (service.getCharacteristic(this.api.hap.Characteristic.HeatingThresholdTemperature).value > maxValue)
      service.getCharacteristic(this.api.hap.Characteristic.HeatingThresholdTemperature).updateValue(maxValue);

    service.getCharacteristic(this.api.hap.Characteristic.HeatingThresholdTemperature).setProps({
      minValue: minValue,
      maxValue: maxValue,
      minStep: minStep,
    });

    if (this.accessory.context.config.type === 'HEATING') {
      if (service.getCharacteristic(this.api.hap.Characteristic.CoolingThresholdTemperature).value < minValue)
        service.getCharacteristic(this.api.hap.Characteristic.CoolingThresholdTemperature).updateValue(minValue);

      if (service.getCharacteristic(this.api.hap.Characteristic.CoolingThresholdTemperature).value > maxValue)
        service.getCharacteristic(this.api.hap.Characteristic.CoolingThresholdTemperature).updateValue(maxValue);

      service.getCharacteristic(this.api.hap.Characteristic.CoolingThresholdTemperature).setProps({
        minValue: minValue,
        maxValue: maxValue,
        minStep: minStep,
      });
    }

    if (!service.testCharacteristic(this.api.hap.Characteristic.ValvePosition))
      service.addCharacteristic(this.api.hap.Characteristic.ValvePosition);

    this.historyService = new this.FakeGatoHistoryService('thermo', this.accessory, {
      storage: 'fs',
      path: this.api.user.storagePath(),
      disableTimer: true,
    });

    await timeout(250); //wait for historyService to load

    service
      .getCharacteristic(this.api.hap.Characteristic.Active)
      .onSet((value) => {
        if (this.waitForEndValue) {
          clearTimeout(this.waitForEndValue);
          this.waitForEndValue = null;
        }

        this.waitForEndValue = setTimeout(() => {
          this.deviceHandler.setStates(this.accessory, this.accessories, 'State', value);
        }, 500);
      })
      .on(
        'change',
        this.deviceHandler.changedStates.bind(this, this.accessory, this.historyService, this.accessory.displayName)
      );

    service
      .getCharacteristic(this.api.hap.Characteristic.CurrentTemperature)
      .on(
        'change',
        this.deviceHandler.changedStates.bind(this, this.accessory, this.historyService, this.accessory.displayName)
      );

    service
      .getCharacteristic(this.api.hap.Characteristic.HeatingThresholdTemperature)
      .onSet((value) => {
        if (this.waitForEndValue) {
          clearTimeout(this.waitForEndValue);
          this.waitForEndValue = null;
        }

        this.waitForEndValue = setTimeout(() => {
          this.deviceHandler.setStates(this.accessory, this.accessories, 'Temperature', value);
        }, 250);
      })
      .on(
        'change',
        this.deviceHandler.changedStates.bind(this, this.accessory, this.historyService, this.accessory.displayName)
      );

    service
      .getCharacteristic(this.api.hap.Characteristic.ValvePosition)
      .on(
        'change',
        this.deviceHandler.changedStates.bind(this, this.accessory, this.historyService, this.accessory.displayName)
      );

    this.refreshHistory(service);
  }

  refreshHistory(service) {
    let currentState = service.getCharacteristic(this.api.hap.Characteristic.CurrentHeaterCoolerState).value;
    let currentTemp = service.getCharacteristic(this.api.hap.Characteristic.CurrentTemperature).value;
    let targetTemp = service.getCharacteristic(this.api.hap.Characteristic.HeatingThresholdTemperature).value;

    let valvePos =
      currentTemp <= targetTemp && currentState !== 0
        ? Math.round(targetTemp - currentTemp >= 5 ? 100 : (targetTemp - currentTemp) * 20)
        : 0;

    //Thermo
    this.historyService.addEntry({
      time: moment().unix(),
      currentTemp: currentTemp,
      setTemp: targetTemp,
      valvePosition: valvePos,
    });

    setTimeout(() => {
      this.refreshHistory(service);
    }, 10 * 60 * 1000);
  }
}

module.exports = HeaterCoolerAccessory;
