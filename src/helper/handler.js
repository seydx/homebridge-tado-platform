'use strict';

const Logger = require('../helper/logger.js');

const moment = require('moment');

var settingState = false;
var delayTimer = {};

const timeout = (ms) => new Promise((res) => setTimeout(res, ms));

module.exports = (api, accessories, config, tado, telegram) => {
  async function setStates(accessory, accs, target, value) {
    accessories = accs.filter((acc) => acc && acc.context.config.homeName === config.homeName);

    try {
      settingState = true;

      value = typeof value === 'number' ? parseFloat(value.toFixed(2)) : value;

      Logger.info(target + ': ' + value, accessory.displayName);

      switch (accessory.context.config.subtype) {
        case 'zone-thermostat':
        case 'zone-heatercooler':
        case 'zone-heatercooler-boiler': {
          let power, temp, clear;

          let service =
            accessory.getService(api.hap.Service.HeaterCooler) || accessory.getService(api.hap.Service.Thermostat);

          let targetTempCharacteristic = accessory.getService(api.hap.Service.HeaterCooler)
            ? api.hap.Characteristic.HeatingThresholdTemperature
            : api.hap.Characteristic.TargetTemperature;

          if (
            accessory.context.config.subtype !== 'zone-heatercooler-boiler' &&
            !accessory.context.config.autoOffDelay &&
            accessory.context.config.delaySwitch &&
            accessory.context.delaySwitch &&
            accessory.context.delayTimer &&
            value < 5
          ) {
            if (value === 0) {
              if (delayTimer[accessory.displayName]) {
                Logger.info('Resetting delay timer', accessory.displayName);
                clearTimeout(delayTimer[accessory.displayName]);
                delayTimer[accessory.displayName] = null;
              }

              power = 'OFF';
              temp = parseFloat(service.getCharacteristic(targetTempCharacteristic).value.toFixed(2));

              let mode =
                accessory.context.config.mode === 'TIMER'
                  ? (accessory.context.config.modeTimer || 30) * 60
                  : accessory.context.config.mode;

              await tado.setZoneOverlay(
                config.homeId,
                accessory.context.config.zoneId,
                power,
                temp,
                mode,
                accessory.context.config.temperatureUnit
              );
            } else {
              let mode =
                accessory.context.config.mode === 'TIMER'
                  ? (accessory.context.config.modeTimer || 30) * 60
                  : accessory.context.config.mode;

              let timer = accessory.context.delayTimer;
              let tarState = value === 1 ? 'HEAT' : 'AUTO';

              if (delayTimer[accessory.displayName]) {
                clearTimeout(delayTimer[accessory.displayName]);
                delayTimer[accessory.displayName] = null;
              }

              Logger.info('Wait ' + timer + ' seconds before switching state', accessory.displayName);

              delayTimer[accessory.displayName] = setTimeout(async () => {
                Logger.info('Delay timer finished, switching state to ' + tarState, accessory.displayName);

                //targetState
                clear = value === 3;
                power = 'ON';
                temp = parseFloat(service.getCharacteristic(targetTempCharacteristic).value.toFixed(2));

                if (
                  clear ||
                  (value &&
                    accessory.context.config.mode === 'AUTO' &&
                    accessory.context.config.subtype.includes('heatercooler'))
                ) {
                  await tado.clearZoneOverlay(config.homeId, accessory.context.config.zoneId);
                  return;
                }

                mode =
                  !value &&
                  accessory.context.config.mode === 'AUTO' &&
                  accessory.context.config.subtype.includes('heatercooler')
                    ? 'MANUAL'
                    : mode;

                await tado.setZoneOverlay(
                  config.homeId,
                  accessory.context.config.zoneId,
                  power,
                  temp,
                  mode,
                  accessory.context.config.temperatureUnit
                );

                delayTimer[accessory.displayName] = null;
              }, timer * 1000);
            }
          } else {
            let mode =
              accessory.context.config.mode === 'TIMER'
                ? (accessory.context.config.modeTimer || 30) * 60
                : accessory.context.config.mode;

            if ([0, 1, 3].includes(value)) {
              //targetState
              clear = value === 3;

              power = value ? 'ON' : 'OFF';

              temp = parseFloat(service.getCharacteristic(targetTempCharacteristic).value.toFixed(2));

              if (
                clear ||
                (value &&
                  accessory.context.config.mode === 'CUSTOM' &&
                  accessory.context.config.subtype.includes('heatercooler'))
              ) {
                await tado.clearZoneOverlay(config.homeId, accessory.context.config.zoneId);
                return;
              }

              mode =
                !value &&
                accessory.context.config.mode === 'CUSTOM' &&
                accessory.context.config.subtype.includes('heatercooler')
                  ? 'MANUAL'
                  : mode;
            } else {
              //temp
              power = 'ON';
              temp = parseFloat(value.toFixed(2));
            }

            await tado.setZoneOverlay(
              config.homeId,
              accessory.context.config.zoneId,
              power,
              temp,
              mode,
              accessory.context.config.temperatureUnit
            );
          }

          break;
        }

        case 'zone-switch':
        case 'zone-faucet': {
          let faucetService = accessory.getService(api.hap.Service.Faucet);

          let temp = null;
          let power = value ? 'ON' : 'OFF';

          if (faucetService) faucetService.getCharacteristic(this.api.hap.Characteristic.InUse).updateValue(value);

          let mode =
            accessory.context.config.mode === 'TIMER'
              ? (accessory.context.config.modeTimer || 30) * 60
              : accessory.context.config.mode;

          await tado.setZoneOverlay(
            config.homeId,
            accessory.context.config.zoneId,
            power,
            temp,
            mode,
            accessory.context.config.temperatureUnit
          );

          break;
        }

        case 'extra-plock':
        case 'extra-plockswitch': {
          let targetState;

          if (accessory.context.config.subtype === 'extra-plockswitch') {
            let serviceHomeSwitch = accessory.getServiceById(api.hap.Service.Switch, 'HomeSwitch');
            let serviceAwaySwitch = accessory.getServiceById(api.hap.Service.Switch, 'AwaySwitch');

            let characteristic = api.hap.Characteristic.On;

            if (value) {
              if (target === 'Home') {
                targetState = 'HOME';

                serviceAwaySwitch.getCharacteristic(characteristic).updateValue(false);
              } else {
                targetState = 'AWAY';

                serviceHomeSwitch.getCharacteristic(characteristic).updateValue(false);
              }
            } else {
              targetState = 'AUTO';

              serviceAwaySwitch.getCharacteristic(characteristic).updateValue(false);

              serviceHomeSwitch.getCharacteristic(characteristic).updateValue(false);
            }
          } else {
            let serviceSecurity = accessory.getService(api.hap.Service.SecuritySystem);
            let characteristicCurrent = api.hap.Characteristic.SecuritySystemCurrentState;

            serviceSecurity.getCharacteristic(characteristicCurrent).updateValue(value);

            if (value === 1) {
              //away

              targetState = 'AWAY';
            } else if (value === 3) {
              //off

              targetState = 'AUTO';
            } else {
              //at home

              targetState = 'HOME';
            }
          }

          await tado.setPresenceLock(config.homeId, targetState);

          break;
        }

        case 'zone-window-switch': {
          let zoneId = target.split('-');
          zoneId = zoneId[zoneId.length - 1];

          await tado.setWindowDetection(config.homeId, zoneId, value, 3600);
          await tado.setOpenWindowMode(config.homeId, zoneId, value);

          break;
        }

        case 'extra-childswitch': {
          await tado.setChildLock(target, value);

          break;
        }

        case 'extra-cntrlswitch': {
          if (target === 'Dummy') return;

          const heatAccessories = accessories.filter((acc) => acc && acc.context.config.type === 'HEATING');

          const rooms = accessory.context.config.rooms
            .map((room) => {
              return {
                id: room.id,
                power: target === 'Central' ? (value ? 'ON' : 'OFF') : target === 'Off' ? 'OFF' : 'ON',
                maxTempInCelsius: target === 'Central' ? (value ? 25 : 0) : target === 'Off' ? false : 25,
                termination: ['MANUAL', 'AUTO', 'TIMER'].includes(room.mode) ? room.mode : 'MANUAL',
                timer:
                  ['MANUAL', 'AUTO', 'TIMER'].includes(room.mode) && room.mode === 'TIMER'
                    ? room.modeTimer && room.modeTimer >= 1
                      ? room.modeTimer * 60
                      : 1800 //30min
                    : false,
              };
            })
            .filter((room) => room);

          if (value) {
            if (target === 'Central' || target === 'Schedule') {
              const roomIds = accessory.context.config.rooms
                .map((room) => {
                  return room.id;
                })
                .filter((id) => id);

              await tado.resumeSchedule(config.homeId, roomIds);

              //Turn all back to AUTO/ON
              heatAccessories.forEach((acc) => {
                let serviceThermostat = acc.getService(api.hap.Service.Thermostat);
                let serviceHeaterCooler = acc.getService(api.hap.Service.HeaterCooler);

                if (serviceThermostat) {
                  let characteristicTarget = api.hap.Characteristic.TargetHeatingCoolingState;

                  serviceThermostat.getCharacteristic(characteristicTarget).updateValue(3);
                } else if (serviceHeaterCooler) {
                  let characteristicActive = api.hap.Characteristic.Active;

                  serviceHeaterCooler.getCharacteristic(characteristicActive).updateValue(1);
                }
              });

              accessory
                .getServiceById(api.hap.Service.Switch, 'Central')
                .getCharacteristic(api.hap.Characteristic.On)
                .updateValue(true);

              return;
            }

            if (target === 'Boost') {
              //Turn On All & Max temp & Central Switch
              heatAccessories.forEach((acc) => {
                let serviceThermostat = acc.getService(api.hap.Service.Thermostat);
                let serviceHeaterCooler = acc.getService(api.hap.Service.HeaterCooler);

                if (serviceThermostat) {
                  let characteristicCurrent = api.hap.Characteristic.CurrentHeatingCoolingState;
                  let characteristicTarget = api.hap.Characteristic.TargetHeatingCoolingState;
                  let characteristicTargetTemp = api.hap.Characteristic.TargetTemperature;

                  let maxTemp = serviceThermostat.getCharacteristic(characteristicTargetTemp).props.maxValue;

                  serviceThermostat.getCharacteristic(characteristicCurrent).updateValue(1);

                  serviceThermostat.getCharacteristic(characteristicTarget).updateValue(1);

                  serviceThermostat.getCharacteristic(characteristicTargetTemp).updateValue(maxTemp);
                } else if (serviceHeaterCooler) {
                  let characteristicActive = api.hap.Characteristic.Active;
                  let characteristicTargetTempHeat = api.hap.Characteristic.HeatingThresholdTemperature;

                  let maxTemp = serviceHeaterCooler.getCharacteristic(characteristicTargetTempHeat).props.maxValue; //same for cool

                  serviceHeaterCooler.getCharacteristic(characteristicActive).updateValue(1);

                  serviceHeaterCooler.getCharacteristic(characteristicTargetTempHeat).updateValue(maxTemp);
                }
              });

              accessory
                .getServiceById(api.hap.Service.Switch, 'Central')
                .getCharacteristic(api.hap.Characteristic.On)
                .updateValue(true);
            }

            if (target === 'Off') {
              //Turn Off All && Central Switch
              heatAccessories.forEach((acc) => {
                let serviceThermostat = acc.getService(api.hap.Service.Thermostat);
                let serviceHeaterCooler = acc.getService(api.hap.Service.HeaterCooler);

                if (serviceThermostat) {
                  let characteristicCurrent = api.hap.Characteristic.CurrentHeatingCoolingState;
                  let characteristicTarget = api.hap.Characteristic.TargetHeatingCoolingState;

                  serviceThermostat.getCharacteristic(characteristicCurrent).updateValue(0);

                  serviceThermostat.getCharacteristic(characteristicTarget).updateValue(0);
                } else if (serviceHeaterCooler) {
                  let characteristicActive = api.hap.Characteristic.Active;

                  serviceHeaterCooler.getCharacteristic(characteristicActive).updateValue(0);
                }
              });

              accessory
                .getServiceById(api.hap.Service.Switch, 'Central')
                .getCharacteristic(api.hap.Characteristic.On)
                .updateValue(false);
            }

            if (target !== 'Central') {
              setTimeout(() => {
                accessory
                  .getServiceById(api.hap.Service.Switch, 'Central' + target)
                  .getCharacteristic(api.hap.Characteristic.On)
                  .updateValue(false);
              }, 500);
            }
          } else {
            if (target !== 'Central') return;

            //Turn Off All && Central Switch
            heatAccessories.forEach((acc) => {
              let serviceThermostat = acc.getService(api.hap.Service.Thermostat);
              let serviceHeaterCooler = acc.getService(api.hap.Service.HeaterCooler);

              if (serviceThermostat) {
                let characteristicCurrent = api.hap.Characteristic.CurrentHeatingCoolingState;
                let characteristicTarget = api.hap.Characteristic.TargetHeatingCoolingState;

                serviceThermostat.getCharacteristic(characteristicCurrent).updateValue(0);

                serviceThermostat.getCharacteristic(characteristicTarget).updateValue(0);
              } else if (serviceHeaterCooler) {
                let characteristicActive = api.hap.Characteristic.Active;

                serviceHeaterCooler.getCharacteristic(characteristicActive).updateValue(0);
              }
            });

            accessory
              .getServiceById(api.hap.Service.Switch, 'Central')
              .getCharacteristic(api.hap.Characteristic.On)
              .updateValue(false);
          }

          await tado.switchAll(config.homeId, rooms);

          break;
        }

        default:
          Logger.warn(
            'Unknown accessory type! [' + accessory.context.config.subtype + '] ' + target + ': ' + value,
            accessory.displayName
          );
          break;
      }
    } catch (err) {
      errorHandler(err);
    } finally {
      settingState = false;
    }
  }

  async function changedStates(accessory, historyService, replacer, value) {
    if (value.oldValue !== value.newValue) {
      switch (accessory.context.config.subtype) {
        case 'zone-thermostat': {
          let currentState = accessory
            .getService(api.hap.Service.Thermostat)
            .getCharacteristic(api.hap.Characteristic.CurrentHeatingCoolingState).value;
          let targetState = accessory
            .getService(api.hap.Service.Thermostat)
            .getCharacteristic(api.hap.Characteristic.TargetHeatingCoolingState).value;
          let currentTemp = accessory
            .getService(api.hap.Service.Thermostat)
            .getCharacteristic(api.hap.Characteristic.CurrentTemperature).value;
          let targetTemp = accessory
            .getService(api.hap.Service.Thermostat)
            .getCharacteristic(api.hap.Characteristic.TargetTemperature).value;

          let valvePos =
            currentTemp <= targetTemp &&
            currentState !== api.hap.Characteristic.CurrentHeatingCoolingState.OFF &&
            targetState !== api.hap.Characteristic.TargetHeatingCoolingState.OFF
              ? Math.round(targetTemp - currentTemp >= 5 ? 100 : (targetTemp - currentTemp) * 20)
              : 0;

          historyService.addEntry({
            time: moment().unix(),
            currentTemp: currentTemp,
            setTemp: targetTemp,
            valvePosition: valvePos,
          });

          break;
        }

        case 'zone-heatercooler':
        case 'zone-heatercooler-boiler': {
          let currentState = accessory
            .getService(api.hap.Service.HeaterCooler)
            .getCharacteristic(api.hap.Characteristic.CurrentHeaterCoolerState).value;
          let currentTemp = accessory
            .getService(api.hap.Service.HeaterCooler)
            .getCharacteristic(api.hap.Characteristic.CurrentTemperature).value;
          let targetTemp = accessory
            .getService(api.hap.Service.HeaterCooler)
            .getCharacteristic(api.hap.Characteristic.HeatingThresholdTemperature).value;

          let valvePos =
            currentTemp <= targetTemp && currentState !== 0
              ? Math.round(targetTemp - currentTemp >= 5 ? 100 : (targetTemp - currentTemp) * 20)
              : 0;

          historyService.addEntry({
            time: moment().unix(),
            currentTemp: currentTemp,
            setTemp: targetTemp,
            valvePosition: valvePos,
          });

          break;
        }

        case 'zone-window-contact': {
          if (value.newValue) {
            accessory.context.timesOpened = accessory.context.timesOpened || 0;
            accessory.context.timesOpened += 1;

            let lastActivation = moment().unix() - historyService.getInitialTime();
            let closeDuration = moment().unix() - historyService.getInitialTime();

            accessory
              .getService(api.hap.Service.ContactSensor)
              .getCharacteristic(api.hap.Characteristic.LastActivation)
              .updateValue(lastActivation);

            accessory
              .getService(api.hap.Service.ContactSensor)
              .getCharacteristic(api.hap.Characteristic.TimesOpened)
              .updateValue(accessory.context.timesOpened);

            accessory
              .getService(api.hap.Service.ContactSensor)
              .getCharacteristic(api.hap.Characteristic.ClosedDuration)
              .updateValue(closeDuration);
          } else {
            let openDuration = moment().unix() - historyService.getInitialTime();

            accessory
              .getService(api.hap.Service.ContactSensor)
              .getCharacteristic(api.hap.Characteristic.ClosedDuration)
              .updateValue(openDuration);
          }

          historyService.addEntry({ time: moment().unix(), status: value.newValue ? 1 : 0 });

          let dest = value.newValue ? 'opened' : 'closed';

          replacer = replacer.split(accessory.context.config.homeName + ' ')[1];
          let additional = accessory.context.config.homeName;

          if (telegram) telegram.send('openWindow', dest, replacer, additional);

          break;
        }

        case 'presence-occupancy':
        case 'presence-motion': {
          if (historyService) {
            let lastActivation = moment().unix() - historyService.getInitialTime();

            accessory
              .getService(api.hap.Service.MotionSensor)
              .getCharacteristic(api.hap.Characteristic.LastActivation)
              .updateValue(lastActivation);

            historyService.addEntry({ time: moment().unix(), status: value.newValue ? 1 : 0 });
          }

          let dest;

          replacer = replacer.split(accessory.context.config.homeName + ' ')[1];
          let additional = accessory.context.config.homeName;

          if (value.newValue) {
            dest = accessory.displayName === accessory.context.config.homeName + ' Anyone' ? 'anyone_in' : 'user_in';
          } else {
            dest = accessory.displayName === accessory.context.config.homeName + ' Anyone' ? 'anyone_out' : 'user_out';
          }

          if (telegram) telegram.send('presence', dest, replacer === 'Anyone' ? false : replacer, additional);

          break;
        }

        case 'zone-temperature':
        case 'weather-temperature': {
          historyService.addEntry({ time: moment().unix(), temp: value.newValue, humidity: 0, ppm: 0 });

          break;
        }

        case 'zone-humidity': {
          historyService.addEntry({ time: moment().unix(), temp: 0, humidity: value.newValue, ppm: 0 });

          break;
        }

        default:
          Logger.warn('Accessory with unknown subtype wanted to store history data', accessory.displayName);
          break;
      }
    }
  }

  async function getStates() {
    try {
      //ME
      if (!config.homeId) await updateMe();

      //Home
      if (
        !config.temperatureUnit ||
        (config.extras &&
          config.weather.airQuality &&
          (!config.geolocation ||
            (config.geolocation && !config.geolocation.longitude) ||
            !config.geolocation.latitude))
      )
        await updateHome();

      //Zones
      if (config.zones.length) await updateZones();

      //Zones Room Air Quality
      if (config.zones.length && config.zones.find((zone) => zone && zone.airQuality)) await updateRoomAirQuality();

      //MobileDevices
      if (config.presence.length) await updateMobileDevices();

      //Weather
      if (config.weather.temperatureSensor || config.weather.solarIntensity) await updateWeather();

      //AirQuality
      if (
        config.weather.airQuality &&
        config.geolocation &&
        config.geolocation.longitude &&
        config.geolocation.latitude
      )
        await updateAirQuality();

      //RunningTime
      if (config.extras.centralSwitch && config.extras.runningInformation) await updateRunningTime();

      //Presence Lock
      if (config.extras.presenceLock) await updatePresence();

      //Child Lock
      if (config.childLock.length) await updateDevices();
    } catch (err) {
      errorHandler(err);
    } finally {
      setTimeout(() => {
        getStates();
      }, config.polling * 1000);
    }
  }

  async function updateMe() {
    if (!settingState) {
      Logger.debug('Polling User Info...', config.homeName);

      const me = await tado.getMe();

      if (config.homeName !== me.homes[0].name) throw ('Cannot find requested home in the API!', config.homeName);

      config.homeId = me.homes[0].id;
    }

    return;
  }

  async function updateHome() {
    if (!settingState) {
      Logger.debug('Polling Home Info...', config.homeName);

      const home = await tado.getHome(config.homeId);

      if (!config.temperatureUnit) config.temperatureUnit = home.temperatureUnit || 'CELSIUS';

      //config.skills = home.skills || []; //do we need this?

      if (
        !config.geolocation ||
        (config.geolocation && !config.geolocation.longitude) ||
        !config.geolocation.latitude
      ) {
        if (!home.geolocation) home.geolocation = {};

        config.geolocation = {
          longitude: (home.geolocation.longitude || '').toString() || false,
          latitude: (home.geolocation.latitude || '').toString() || false,
        };
      }
    }

    return;
  }

  async function updateZones() {
    if (!settingState) {
      Logger.debug('Polling Zones...', config.homeName);

      //CentralSwitch
      let inManualMode = 0;
      let inOffMode = 0;
      let inAutoMode = 0;

      let zonesWithoutID = config.zones.filter((zone) => zone && !zone.id);

      if (zonesWithoutID.length) {
        const allZones = (await tado.getZones(config.homeId)) || [];

        for (const [index, zone] of config.zones.entries()) {
          allZones.forEach((zoneWithID) => {
            if (zoneWithID.name === zone.name) config.zones[index].id = zoneWithID.id;
          });
        }
      }

      const allZones = (await tado.getZones(config.homeId)) || [];

      for (const [index, zone] of config.zones.entries()) {
        allZones.forEach((zoneWithID) => {
          if (zoneWithID.name === zone.name) {
            const heatAccessory = accessories.filter(
              (acc) => acc && acc.displayName === config.homeName + ' ' + zone.name + ' Heater'
            );

            if (heatAccessory.length) heatAccessory[0].context.config.zoneId = zoneWithID.id;

            config.zones[index].id = zoneWithID.id;
            config.zones[index].battery = !config.zones[index].noBattery
              ? zoneWithID.devices.filter(
                  (device) =>
                    device &&
                    zone.type === 'HEATING' &&
                    typeof device.batteryState === 'string' &&
                    !device.batteryState.includes('NORMAL')
                ).length
                ? zoneWithID.devices.filter((device) => device && !device.batteryState.includes('NORMAL'))[0]
                    .batteryState
                : zoneWithID.devices.filter((device) => device && device.duties.includes('ZONE_LEADER'))[0].batteryState
              : false;
            config.zones[index].openWindowEnabled =
              zoneWithID.openWindowDetection && zoneWithID.openWindowDetection.enabled ? true : false;
          }
        });
      }

      for (const zone of config.zones) {
        const zoneState = await tado.getZoneState(config.homeId, zone.id);

        let currentState, targetState, currentTemp, targetTemp, humidity, active, battery, tempEqual;

        if (zoneState.setting.type === 'HEATING') {
          battery = zone.battery === 'NORMAL' ? 100 : 10;

          if (zoneState.sensorDataPoints.humidity) humidity = zoneState.sensorDataPoints.humidity.percentage;

          //HEATING
          if (zoneState.sensorDataPoints.insideTemperature) {
            currentTemp =
              config.temperatureUnit === 'FAHRENHEIT'
                ? zoneState.sensorDataPoints.insideTemperature.fahrenheit
                : zoneState.sensorDataPoints.insideTemperature.celsius;

            if (zoneState.setting.power === 'ON') {
              targetTemp =
                config.temperatureUnit === 'FAHRENHEIT'
                  ? zoneState.setting.temperature.fahrenheit
                  : zoneState.setting.temperature.celsius;

              tempEqual = Math.round(currentTemp) === Math.round(targetTemp);

              currentState = currentTemp <= targetTemp ? 1 : 2;

              targetState = 1;

              active = 1;
            } else {
              currentState = 0;
              targetState = 0;
              active = 0;
            }

            if (zoneState.overlayType === null) {
              currentState = 0;
              targetState = 3;
            }
          }

          //Thermostat/HeaterCooler
          const thermoAccessory = accessories.filter(
            (acc) =>
              acc &&
              (acc.context.config.subtype === 'zone-thermostat' || acc.context.config.subtype === 'zone-heatercooler')
          );

          if (thermoAccessory.length) {
            thermoAccessory.forEach((acc) => {
              if (acc.displayName.includes(zone.name)) {
                let serviceThermostat = acc.getService(api.hap.Service.Thermostat);
                let serviceHeaterCooler = acc.getService(api.hap.Service.HeaterCooler);

                let serviceBattery = acc.getService(api.hap.Service.BatteryService);
                let characteristicBattery = api.hap.Characteristic.BatteryLevel;

                if (serviceBattery && zone.battery) {
                  serviceBattery.getCharacteristic(characteristicBattery).updateValue(battery);
                }

                if (serviceThermostat) {
                  let characteristicCurrentTemp = api.hap.Characteristic.CurrentTemperature;
                  let characteristicTargetTemp = api.hap.Characteristic.TargetTemperature;
                  let characteristicCurrentState = api.hap.Characteristic.CurrentHeatingCoolingState;
                  let characteristicTargetState = api.hap.Characteristic.TargetHeatingCoolingState;
                  let characteristicHumidity = api.hap.Characteristic.CurrentRelativeHumidity;
                  let characteristicUnit = api.hap.Characteristic.TemperatureDisplayUnits;

                  if (!isNaN(currentTemp)) {
                    acc.context.config.temperatureUnit = acc.context.config.temperatureUnit || config.temperatureUnit;

                    let isFahrenheit = serviceThermostat.getCharacteristic(characteristicUnit).value === 1;
                    let unitChanged = config.temperatureUnit !== acc.context.config.temperatureUnit;

                    let cToF = (c) => Math.round((c * 9) / 5 + 32);
                    let fToC = (f) => Math.round(((f - 32) * 5) / 9);

                    let newValue = unitChanged ? (isFahrenheit ? cToF(currentTemp) : fToC(currentTemp)) : currentTemp;

                    serviceThermostat.getCharacteristic(characteristicCurrentTemp).updateValue(newValue);
                  }

                  if (!isNaN(targetTemp))
                    serviceThermostat.getCharacteristic(characteristicTargetTemp).updateValue(targetTemp);

                  if (!isNaN(currentState))
                    serviceThermostat.getCharacteristic(characteristicCurrentState).updateValue(currentState);

                  if (!isNaN(targetState))
                    serviceThermostat.getCharacteristic(characteristicTargetState).updateValue(targetState);

                  if (!isNaN(humidity) && serviceThermostat.testCharacteristic(characteristicHumidity))
                    serviceThermostat.getCharacteristic(characteristicHumidity).updateValue(humidity);
                }

                if (serviceHeaterCooler) {
                  let characteristicHumidity = api.hap.Characteristic.CurrentRelativeHumidity;
                  let characteristicCurrentTemp = api.hap.Characteristic.CurrentTemperature;
                  let characteristicTargetTempHeating = api.hap.Characteristic.HeatingThresholdTemperature;
                  let characteristicTargetTempCooling = api.hap.Characteristic.CoolingThresholdTemperature;
                  let characteristicCurrentState = api.hap.Characteristic.CurrentHeaterCoolerState;
                  let characteristicTargetState = api.hap.Characteristic.TargetHeaterCoolerState;
                  let characteristicActive = api.hap.Characteristic.Active;

                  currentState = active ? (targetState === 3 || tempEqual ? 1 : currentState + 1) : 0;

                  targetState = 1;

                  if (!isNaN(active)) serviceHeaterCooler.getCharacteristic(characteristicActive).updateValue(active);

                  if (!isNaN(currentTemp))
                    serviceHeaterCooler.getCharacteristic(characteristicCurrentTemp).updateValue(currentTemp);

                  if (!isNaN(targetTemp)) {
                    serviceHeaterCooler.getCharacteristic(characteristicTargetTempHeating).updateValue(targetTemp);

                    serviceHeaterCooler.getCharacteristic(characteristicTargetTempCooling).updateValue(targetTemp);
                  }

                  if (!isNaN(currentState))
                    serviceHeaterCooler.getCharacteristic(characteristicCurrentState).updateValue(currentState);

                  if (!isNaN(targetState))
                    serviceHeaterCooler.getCharacteristic(characteristicTargetState).updateValue(targetState);

                  if (!isNaN(humidity) && serviceHeaterCooler.testCharacteristic(characteristicHumidity))
                    serviceHeaterCooler.getCharacteristic(characteristicHumidity).updateValue(humidity);
                }
              }
            });
          }
        } else {
          if (zoneState.setting.power === 'ON') {
            active = 1;
            currentState = zoneState.overlayType === null ? 1 : 2;
          } else {
            active = 0;
            currentState = 0;
          }

          targetState = 1;

          currentTemp =
            zoneState.setting.temperature !== null
              ? config.temperatureUnit === 'FAHRENHEIT'
                ? zoneState.setting.temperature.fahrenheit
                : zoneState.setting.temperature.celsius
              : undefined;

          targetTemp = active && currentTemp ? currentTemp : undefined;

          //Thermostat/HeaterCooler
          const heaterAccessory = accessories.filter(
            (acc) => acc && acc.context.config.subtype === 'zone-heatercooler-boiler'
          );
          const switchAccessory = accessories.filter((acc) => acc && acc.context.config.subtype === 'zone-switch');
          const faucetAccessory = accessories.filter((acc) => acc && acc.context.config.subtype === 'zone-faucet');

          if (heaterAccessory.length) {
            heaterAccessory.forEach((acc) => {
              if (acc.displayName.includes(zone.name)) {
                let service = acc.getService(api.hap.Service.HeaterCooler);

                let characteristicCurrentTemp = api.hap.Characteristic.CurrentTemperature;
                let characteristicActive = api.hap.Characteristic.Active;
                let characteristicCurrentState = api.hap.Characteristic.CurrentHeaterCoolerState;
                let characteristicTargetState = api.hap.Characteristic.TargetHeaterCoolerState;
                let characteristicTargetTempHeating = api.hap.Characteristic.HeatingThresholdTemperature;

                service.getCharacteristic(characteristicActive).updateValue(active);

                service.getCharacteristic(characteristicCurrentState).updateValue(currentState);

                service.getCharacteristic(characteristicTargetState).updateValue(targetState);

                if (!isNaN(currentTemp) || acc.context.currentTemp) {
                  if (!isNaN(currentTemp)) acc.context.currentTemp = currentTemp; //store current temp in config

                  service.getCharacteristic(characteristicCurrentTemp).updateValue(acc.context.currentTemp);
                }

                if (!isNaN(targetTemp)) {
                  service.getCharacteristic(characteristicTargetTempHeating).updateValue(targetTemp);
                }
              }
            });
          }

          if (switchAccessory.length) {
            switchAccessory.forEach((acc) => {
              if (acc.displayName.includes(zone.name)) {
                let service = acc.getService(api.hap.Service.Switch);

                let characteristic = api.hap.Characteristic.On;

                service.getCharacteristic(characteristic).updateValue(active ? true : false);
              }
            });
          }

          if (faucetAccessory.length) {
            faucetAccessory.forEach((acc) => {
              if (acc.displayName.includes(zone.name)) {
                let service = acc.getService(api.hap.Service.Valve);

                let characteristicActive = api.hap.Characteristic.Active;
                let characteristicInUse = api.hap.Characteristic.InUse;

                service.getCharacteristic(characteristicActive).updateValue(active ? 1 : 0);

                service.getCharacteristic(characteristicInUse).updateValue(active ? 1 : 0);
              }
            });
          }
        }

        //TemperatureSensor
        const tempAccessory = accessories.filter((acc) => acc && acc.context.config.subtype === 'zone-temperature');

        if (tempAccessory.length) {
          tempAccessory.forEach((acc) => {
            if (acc.displayName.includes(zone.name)) {
              let serviceBattery = acc.getService(api.hap.Service.BatteryService);
              let characteristicBattery = api.hap.Characteristic.BatteryLevel;

              if (serviceBattery && !isNaN(battery)) {
                serviceBattery.getCharacteristic(characteristicBattery).updateValue(battery);
              }

              if (!isNaN(currentTemp)) {
                let service = acc.getService(api.hap.Service.TemperatureSensor);
                let characteristic = api.hap.Characteristic.CurrentTemperature;

                service.getCharacteristic(characteristic).updateValue(currentTemp);
              }
            }
          });
        }

        //HumiditySensor
        const humidityAccessory = accessories.filter((acc) => acc && acc.context.config.subtype === 'zone-humidity');

        humidityAccessory.forEach((acc) => {
          if (acc.displayName.includes(zone.name)) {
            let serviceBattery = acc.getService(api.hap.Service.BatteryService);
            let characteristicBattery = api.hap.Characteristic.BatteryLevel;

            if (serviceBattery && !isNaN(battery)) {
              serviceBattery.getCharacteristic(characteristicBattery).updateValue(battery);
            }

            if (!isNaN(humidity)) {
              let service = acc.getService(api.hap.Service.HumiditySensor);
              let characteristic = api.hap.Characteristic.CurrentRelativeHumidity;

              service.getCharacteristic(characteristic).updateValue(humidity);
            }
          }
        });

        //WindowSensor
        const windowContactAccessory = accessories.filter(
          (acc) => acc && acc.context.config.subtype === 'zone-window-contact'
        );
        const windowSwitchAccessory = accessories.filter(
          (acc) => acc && acc.displayName === acc.context.config.homeName + ' Open Window'
        );

        if (windowContactAccessory.length) {
          windowContactAccessory.forEach((acc) => {
            if (acc.displayName.includes(zone.name)) {
              let serviceBattery = acc.getService(api.hap.Service.BatteryService);
              let characteristicBattery = api.hap.Characteristic.BatteryLevel;

              if (serviceBattery && !isNaN(battery)) {
                serviceBattery.getCharacteristic(characteristicBattery).updateValue(battery);
              }

              let service = acc.getService(api.hap.Service.ContactSensor);
              let characteristic = api.hap.Characteristic.ContactSensorState;

              let state = zoneState.openWindow || zoneState.openWindowDetected ? 1 : 0;

              service.getCharacteristic(characteristic).updateValue(state);
            }
          });
        }

        if (windowSwitchAccessory.length) {
          windowSwitchAccessory[0].services.forEach((switchService) => {
            if (switchService.subtype && switchService.subtype.includes(zone.name)) {
              let service = windowSwitchAccessory[0].getServiceById(api.hap.Service.Switch, switchService.subtype);
              let characteristic = api.hap.Characteristic.On;

              let state = zone.openWindowEnabled ? true : false;

              service.getCharacteristic(characteristic).updateValue(state);
            }
          });
        }

        if (zoneState.setting.type === 'HEATING') {
          //CentralSwitch
          if (zoneState.overlayType === null) inAutoMode += 1;

          if (zoneState.overlayType !== null && zoneState.setting.power === 'OFF') inOffMode += 1;

          if (zoneState.overlayType !== null && zoneState.setting.power === 'ON' && zoneState.overlay.termination)
            inManualMode += 1;
        }
      }

      //CentralSwitch
      const centralSwitchAccessory = accessories.filter(
        (acc) => acc && acc.displayName === acc.context.config.homeName + ' Central Switch'
      );

      if (centralSwitchAccessory.length) {
        centralSwitchAccessory[0].services.forEach((service) => {
          if (service.subtype === 'Central') {
            let serviceSwitch = centralSwitchAccessory[0].getServiceById(api.hap.Service.Switch, service.subtype);
            let characteristicOn = api.hap.Characteristic.On;
            let characteristicAuto = api.hap.Characteristic.AutoThermostats;
            let characteristicOff = api.hap.Characteristic.OfflineThermostats;
            let characteristicManual = api.hap.Characteristic.ManualThermostats;

            let state = (inManualMode || inAutoMode) !== 0;

            serviceSwitch.getCharacteristic(characteristicAuto).updateValue(inAutoMode);

            serviceSwitch.getCharacteristic(characteristicManual).updateValue(inManualMode);

            serviceSwitch.getCharacteristic(characteristicOff).updateValue(inOffMode);

            serviceSwitch.getCharacteristic(characteristicOn).updateValue(state);
          }
        });
      }
    }
  }

  async function updateMobileDevices() {
    if (!settingState) {
      Logger.debug('Polling MobileDevices...', config.homeName);

      const mobileDevices = await tado.getMobileDevices(config.homeId);

      const userAccessories = accessories.filter(
        (user) =>
          user &&
          user.context.config.subtype.includes('presence') &&
          user.displayName !== user.context.config.homeName + ' Anyone'
      );

      const anyone = accessories.filter(
        (user) =>
          user &&
          user.context.config.subtype.includes('presence') &&
          user.displayName === user.context.config.homeName + ' Anyone'
      );

      let activeUser = 0;

      mobileDevices.forEach((device) => {
        userAccessories.forEach((acc) => {
          if (acc.context.config.homeName + ' ' + device.name === acc.displayName) {
            let atHome = device.location && device.location.atHome ? 1 : 0;

            if (atHome) activeUser += 1;

            let service =
              acc.getService(api.hap.Service.MotionSensor) || acc.getService(api.hap.Service.OccupancySensor);

            let characteristic = service.testCharacteristic(api.hap.Characteristic.MotionDetected)
              ? api.hap.Characteristic.MotionDetected
              : api.hap.Characteristic.OccupancyDetected;

            service.getCharacteristic(characteristic).updateValue(atHome);
          }
        });
      });

      if (anyone.length) {
        let service =
          anyone[0].getService(api.hap.Service.MotionSensor) || anyone[0].getService(api.hap.Service.OccupancySensor);

        let characteristic = service.testCharacteristic(api.hap.Characteristic.MotionDetected)
          ? api.hap.Characteristic.MotionDetected
          : api.hap.Characteristic.OccupancyDetected;

        service.getCharacteristic(characteristic).updateValue(activeUser ? 1 : 0);
      }
    }

    return;
  }

  async function updateWeather() {
    if (!settingState) {
      const weatherTemperatureAccessory = accessories.filter(
        (acc) => acc && acc.displayName === acc.context.config.homeName + ' Weather'
      );

      const solarIntensityAccessory = accessories.filter(
        (acc) => acc && acc.displayName === acc.context.config.homeName + ' Solar Intensity'
      );

      if (weatherTemperatureAccessory.length || solarIntensityAccessory.length) {
        Logger.debug('Polling Weather...', config.homeName);

        const weather = await tado.getWeather(config.homeId);

        if (weatherTemperatureAccessory.length && weather.outsideTemperature) {
          let tempUnit = config.temperatureUnit;
          let service = weatherTemperatureAccessory[0].getService(api.hap.Service.TemperatureSensor);
          let characteristic = api.hap.Characteristic.CurrentTemperature;

          let temp =
            tempUnit === 'FAHRENHEIT' ? weather.outsideTemperature.fahrenheit : weather.outsideTemperature.celsius;

          service.getCharacteristic(characteristic).updateValue(temp);
        }

        if (solarIntensityAccessory.length && weather.solarIntensity) {
          let state = weather.solarIntensity.percentage !== 0;
          let brightness = weather.solarIntensity.percentage;

          solarIntensityAccessory[0].context.lightBulbState = state;
          solarIntensityAccessory[0].context.lightBulbBrightness = brightness;

          let serviceLightbulb = solarIntensityAccessory[0].getService(api.hap.Service.Lightbulb);
          let serviceLightsensor = solarIntensityAccessory[0].getService(api.hap.Service.LightSensor);

          if (serviceLightbulb) {
            let characteristicOn = api.hap.Characteristic.On;
            let characteristicBrightness = api.hap.Characteristic.Brightness;

            serviceLightbulb.getCharacteristic(characteristicOn).updateValue(state);

            serviceLightbulb.getCharacteristic(characteristicBrightness).updateValue(brightness);
          } else {
            let characteristicLux = api.hap.Characteristic.CurrentAmbientLightLevel;

            serviceLightsensor
              .getCharacteristic(characteristicLux)
              .updateValue(brightness ? brightness * 1000 : 0.0001);
          }
        }
      }
    }

    return;
  }

  async function updateRoomAirQuality() {
    if (!settingState) {
      Logger.debug('Polling Room AirQuality...', config.homeName);

      const airQuality = await tado.getAirComfort(config.homeId);

      const heatAccessories = accessories.filter(
        (acc) =>
          (acc && acc.context.config.subtype === 'zone-thermostat') ||
          acc.context.config.subtype === 'zone-heatercooler'
      );

      heatAccessories.forEach((acc) => {
        if (acc.context.config.airQuality) {
          airQuality.comfort.forEach((room) => {
            if (room.roomId === acc.context.config.zoneId && room.coordinate) {
              let state =
                room.coordinate.radial >= 0.8
                  ? 5
                  : room.coordinate.radial >= 0.6
                  ? 4
                  : room.coordinate.radial >= 0.4
                  ? 3
                  : room.coordinate.radial >= 0.2
                  ? 2
                  : room.coordinate.radial >= 0
                  ? 1
                  : 0;

              let service = acc.getService(api.hap.Service.Thermostat) || acc.getService(api.hap.Service.HeaterCooler);
              let characteristic = api.hap.Characteristic.AirQuality;

              service.getCharacteristic(characteristic).updateValue(state);
            }
          });
        }
      });
    }
  }

  async function updateAirQuality() {
    if (!settingState) {
      const airQualityAccessory = accessories.filter(
        (acc) => acc && acc.displayName === acc.context.config.homeName + ' Air Quality'
      );

      if (airQualityAccessory.length) {
        Logger.debug('Polling AirQuality...', config.homeName);

        const airQuality = await tado.getWeatherAirComfort(
          config.homeId,
          config.geolocation.longitude,
          config.geolocation.latitude
        );

        let service = airQualityAccessory[0].getService(api.hap.Service.AirQualitySensor);

        let characteristicAqi = api.hap.Characteristic.AirQuality;
        let characteristicPm10 = api.hap.Characteristic.PM10Density;
        let characteristicPm25 = api.hap.Characteristic.PM2_5Density;
        let characteristicNdd = api.hap.Characteristic.NitrogenDioxideDensity;
        let characteristicOd = api.hap.Characteristic.OzoneDensity;
        let characteristicSdd = api.hap.Characteristic.SulphurDioxideDensity;
        let characteristicCo = api.hap.Characteristic.CarbonMonoxideLevel;

        if (airQuality.outdoorQuality) {
          let returnPol = (target) =>
            airQuality.outdoorQuality.pollutants.filter((pol) => pol && pol.scientificName.includes(target));

          let aqi =
            airQuality.outdoorQuality.aqi.value >= 80
              ? 1
              : airQuality.outdoorQuality.aqi.value >= 60
              ? 2
              : airQuality.outdoorQuality.aqi.value >= 40
              ? 3
              : airQuality.outdoorQuality.aqi.value >= 20
              ? 4
              : airQuality.outdoorQuality.aqi.value >= 0
              ? 5
              : 0;

          let pm10 = returnPol('PM<sub>10</sub>')[0].concentration.value;
          let pm25 = returnPol('PM<sub>2.5</sub>')[0].concentration.value;
          let ndd = returnPol('NO<sub>2</sub>')[0].concentration.value;
          let od = returnPol('O<sub>3</sub>')[0].concentration.value;
          let sdd = returnPol('SO<sub>2</sub>')[0].concentration.value;
          let co = returnPol('CO')[0].concentration.value;

          if (!isNaN(aqi)) service.getCharacteristic(characteristicAqi).updateValue(aqi);

          if (!isNaN(pm10)) service.getCharacteristic(characteristicPm10).updateValue(pm10);

          if (!isNaN(pm25)) service.getCharacteristic(characteristicPm25).updateValue(pm25);

          if (!isNaN(ndd)) service.getCharacteristic(characteristicNdd).updateValue(ndd * 1.9123);

          if (!isNaN(od)) service.getCharacteristic(characteristicOd).updateValue(od * 1.9954);

          if (!isNaN(sdd)) service.getCharacteristic(characteristicSdd).updateValue(sdd * 2.6647);

          if (!isNaN(co)) service.getCharacteristic(characteristicCo).updateValue(co / 1000); //ppb to ppm
        }
      }
    }

    return;
  }

  async function updatePresence() {
    if (!settingState) {
      const presenceLockAccessory = accessories.filter(
        (acc) => acc && acc.displayName === acc.context.config.homeName + ' Presence Lock'
      );

      if (presenceLockAccessory.length) {
        Logger.debug('Polling PresenceLock...', config.homeName);

        const presenceLock = await tado.getState(config.homeId);

        /*
          0: Home  | true
          1: Away  | true
          3: Off   | false
        */

        let state = presenceLock.presenceLocked ? (presenceLock.presence === 'AWAY' ? 1 : 0) : 3;

        let serviceSecurity = presenceLockAccessory[0].getService(api.hap.Service.SecuritySystem);
        let serviceHomeSwitch = presenceLockAccessory[0].getServiceById(api.hap.Service.Switch, 'HomeSwitch');
        let serviceAwaySwitch = presenceLockAccessory[0].getServiceById(api.hap.Service.Switch, 'AwaySwitch');

        if (serviceSecurity) {
          let characteristicCurrent = api.hap.Characteristic.SecuritySystemCurrentState;
          let characteristicTarget = api.hap.Characteristic.SecuritySystemTargetState;

          serviceSecurity.getCharacteristic(characteristicCurrent).updateValue(state);

          serviceSecurity.getCharacteristic(characteristicTarget).updateValue(state);
        } else if (serviceHomeSwitch || serviceAwaySwitch) {
          let characteristicOn = api.hap.Characteristic.On;

          let homeState = !state ? true : false;

          let awayState = state === 1 ? true : false;

          serviceAwaySwitch.getCharacteristic(characteristicOn).updateValue(awayState);

          serviceHomeSwitch.getCharacteristic(characteristicOn).updateValue(homeState);
        }
      }
    }
  }

  async function updateRunningTime() {
    if (!settingState) {
      const centralSwitchAccessory = accessories.filter(
        (acc) => acc && acc.displayName === acc.context.config.homeName + ' Central Switch'
      );

      if (centralSwitchAccessory.length) {
        Logger.debug('Polling RunningTime...', config.homeName);

        let periods = ['days', 'months', 'years'];

        for (const period of periods) {
          let fromDate =
            period === 'days'
              ? moment().format('YYYY-MM-DD')
              : period === 'months'
              ? moment().subtract(1, 'days').subtract(1, period).format('YYYY-MM-DD')
              : moment().add(1, 'months').startOf('month').subtract(1, period).format('YYYY-MM-DD');

          let toDate = period === 'years' ? moment().format('YYYY-MM-DD') : false;

          let time = period.substring(0, period.length - 1);

          const runningTime = await tado.getRunningTime(config.homeId, time, fromDate, toDate);

          if (runningTime && runningTime.summary) {
            let summaryInHours = runningTime.summary.totalRunningTimeInSeconds / 3600;

            let serviceSwitch = centralSwitchAccessory[0].getServiceById(api.hap.Service.Switch, 'Central');
            let characteristic =
              period === 'years'
                ? api.hap.Characteristic.OverallHeatYear
                : period === 'months'
                ? api.hap.Characteristic.OverallHeatMonth
                : api.hap.Characteristic.OverallHeatDay;

            serviceSwitch.getCharacteristic(characteristic).updateValue(summaryInHours);
          }

          await timeout(500);
        }
      }
    }

    return;
  }

  async function updateDevices() {
    if (!settingState) {
      Logger.debug('Polling Devices...', config.homeName);

      const devices = await tado.getDevices(config.homeId);

      const childLockAccessories = accessories.filter(
        (acc) => acc && acc.context.config.subtype === 'extra-childswitch'
      );

      devices.forEach((device) => {
        childLockAccessories[0].services.forEach((service) => {
          if (device.serialNo === service.subtype) {
            let serviceChildLock = childLockAccessories[0].getServiceById(api.hap.Service.Switch, service.subtype);
            let characteristic = api.hap.Characteristic.On;

            let childLockEnabled = device.childLockEnabled || false;

            serviceChildLock.getCharacteristic(characteristic).updateValue(childLockEnabled);
          }
        });
      });
    }

    return;
  }

  function errorHandler(err) {
    let error;

    if (err.options)
      Logger.debug(
        'API request ' + err.options.method + ' ' + err.options.url.pathname + ' <error> ' + err.message,
        config.homeName
      );

    if (err.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      if (err.response.data) {
        error = {
          status: err.response.status,
          message: err.response.statusText,
          data: err.response.data,
        };
      } else {
        error = {
          status: err.response.status,
          message: err.response.statusText,
        };
      }
    } else if (err.request) {
      error = {
        code: err.code,
        message: 'Cannot reach Tado. No response received.',
      };
    } else if (err.output && err.output.payload && Object.keys(err.output.payload).length) {
      //simple-oauth2 boom error
      error = err.output.payload;
    } else {
      // Something happened in setting up the request that triggered an Error
      error = err;
    }

    Logger.error(error, config.homeName);

    return;
  }

  return {
    getStates: getStates,
    setStates: setStates,
    changedStates: changedStates,
  };
};
