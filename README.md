# homebridge-tado-platform v4.0 BETA

[![npm](https://img.shields.io/npm/v/homebridge-tado-platform.svg?style=flat-square)](https://www.npmjs.com/package/homebridge-tado-platform)
[![npm](https://img.shields.io/npm/dt/homebridge-tado-platform.svg?style=flat-square)](https://www.npmjs.com/package/homebridge-tado-platform)
[![GitHub last commit](https://img.shields.io/github/last-commit/SeydX/homebridge-tado-platform.svg?style=flat-square)](https://github.com/SeydX/homebridge-tado-platform)

# Dynamic plugin for Tado Smart Thermostats
>_Note: If you are looking for the non dynamic version, install the old version! [homebridge-tado-thermostat v3](https://github.com/SeydX/homebridge-tado-thermostat)_ 

This homebridge plugin exposes Tado thermostats, occupancy sensors and weather sensor to Apple's HomeKit. It provides following features:

**Thermostats:**
- Additional modes: Heat, Cool, Auto and Off
- Secure temperature setting (temperature setting only possible in MANUAL mode (heat/cool))
- Auto heat/cool to a certain value (configurable within 3rd party app)
- Battery state and notification
- Built-in humidity sensor
- Delay timer: You can set up a timer as delay for your thermostats to wait a certain time to go back to the automatic mode (Helpful in automations where you shut off the thermostat after window is opened and in automatic mode if window is closed. So this timer let the thermostat wait a certain time in off mode before going back to auto mode. Helpful if you open the window only for a few minutes, also configurable within 3rd party app)
- Elgato EVE history feature (Fakegato)

**Boiler (CURRENTLY NOT AVAILABLE):**
- Expose Tado Hot Water to Apple HomeKit!
- Additional modes: Heat, Cool, Auto and Off
- Auto heat/cool to a certain value (configurable within 3rd party app)
- Elgato EVE history feature (Fakegato)

**Occupancy sensors:**
- If enabled in config.json this plugin will create occupancy/motion sensors for all registered persons (configurable in the tado app).
- In addition to this, it will create an "Anyone" sensor too, to create automations based on "Anyone at home / not at home"
- Elgato EVE history feature (Fakegato)

**Weather sensors:**
- If enabled in config.json, this plugin will create a weather sensor for your location based on tado.
- Elgato EVE history feature (Fakegato)
- OpenWeather Support (CURRENTLY NOT AVAILABLE): If API and Location setted in config, the Weather accessory will also show the current humidity state and Elgato EVE will also show the airpressure, sunrise, sunset and weather state with FakeGato support! Note: You can get an API-Key from [openweathermap.org](https://openweathermap.org) - After sign up, you can create an API Key in the profile section

**Window (CURRENTLY NOT AVAILABLE):**
- If enabled in config.json **AND** under the setting in the tado app (open window detection), this plugin creates windows sensors for each room.

**Central Switch:**
- If enabled in config.json this plugin creates a central switch to turning off/on all thermostats together with just one click!
- Turning on the switch means, turn ALL thermostats into automatic mode
- Turning off the switch means, turn ALL thermostats off
- If ALL thermostats are off, the switch turns off
- If ONE thermostat is on, the switch turns on
- Additional Characteristics to see how much thermostats are in auto/manual/off mode
- Stateful Dummy Switch Characteristic for creating automations with extra conditions basend on the dummy switch

See [Images](https://github.com/SeydX/homebridge-tado-platform/tree/master/images/) for more details.


## Installation instructions

After [Homebridge](https://github.com/nfarina/homebridge) has been installed:

 ```sudo npm install -g homebridge-tado-platform```
 
 
 ## Example config.json:

 ```
{
  "bridge": {
      ...
  },
  "platforms": [
    {
    "platform":"TadoPlatform",
    "name":"Tado",
    "username":"TadoUserName",
    "password":"TadoPassword"
    }
  ]
}
```

 ## Advanced config.json:

 ```
{
  "bridge": {
      ...
  },
  "platforms": [
    {
    "platform": "TadoPlatform",
    "name": "Tado",
    "username": "TadoUsername",
    "password": "TadoPassword",
    "polling": 10,
    "centralSwitch":true,
    "occupancy":true,
    "weather": true,
    "radiatorThermostat":true,
    "boilerThermostat":true,
    "remoteThermostat":true
    }
  ]
}
```
See [Example Config](https://github.com/SeydX/homebridge-tado-platform/edit/master/example-config.json) for more details.


## Options

| Attributes | Required | Usage |
|------------|----------|-------|
| name | no | Name for the Thermostat. Will be used as part of the accessory name.  |
| username | **Yes** | Tado Login Username |
| password | **Yes** | Tado Login Password |
| polling | No | Interval for polling state of accessories (Default: 10s) |
| weather | No | Exposes temperature sensors for your location based on tado (Default: false) | |
| occupancy | No | Exposes occupancy/motion sensors for all registred persons (Default: false) | 
| centralSwitch | No | Exposes a switch to turning on/off all thermostats with just one click! (Default: true) |
| radiatorThermostat | No | Exposes new thermostat accessory for radiator thermostat (Default: true) | 
| boilerThermostat | No | Exposes new thermostat accessory for boiler thermostat (Default: false) | 
| remoteThermostat | No | Exposes new thermostat accessory for remote thermostat (Default: false) | 


## In App settings

<img src="https://github.com/SeydX/homebridge-tado-platform/blob/master/images/tado_settings.gif" align="right" alt="In-App Settings">

There are more settings available within the app to customize the plugin for your own whishes _(this has the advantage that you do not have to restart homebridge every time you make changes, see gif)_

- **Heat Value:** Value for the "Heat" mode. Example: a value of 4 will heat up the room to **Current Room Temperature + 4 degrees**

- **Cool Value:** Value for the "Cool" mode. Example: a value of 4 will cool up the room to **Current Room Temperature - 4 degrees**

- **Delay Timer:** Delay for setting the thermostat back in automatic mode (0 == not enabled)


## Supported clients

This plugin has been verified to work with the following apps on iOS 11.3:

* Apple Home _(partial)_
* All 3rd party apps like Elgato Eve etc. _(recommended)_


## Known issues / TODO

### Issues:
///

### TODO:
- [ ] Support more types: Boiler(BU01) and remote thermostat(RU01) (in work)
- [ ] New Option: 'onePerRoom' (exposes only one thermostet per room)
- [ ] New Accessory: Window Sensor (based on open window detection)
- [ ] More functions for weather accessory with OpenWeather API
- [ ] DEBUG


## Contributing

You can contribute to this homebridge plugin in following ways:

- [Report issues](https://github.com/SeydX/homebridge-tado-platform/issues) and help verify fixes as they are checked in.
- Review the [source code changes](https://github.com/SeydX/homebridge-tado-platform/pulls).
- Contribute bug fixes.
- Contribute changes to extend the capabilities

Pull requests are accepted.
