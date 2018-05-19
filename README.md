# homebridge-tado-platform v4.5

[![npm](https://img.shields.io/npm/v/homebridge-tado-platform.svg?style=flat-square)](https://www.npmjs.com/package/homebridge-tado-platform)
[![npm](https://img.shields.io/npm/dt/homebridge-tado-platform.svg?style=flat-square)](https://www.npmjs.com/package/homebridge-tado-platform)
[![GitHub last commit](https://img.shields.io/github/last-commit/SeydX/homebridge-tado-platform.svg?style=flat-square)](https://github.com/SeydX/homebridge-tado-platform)

**Dynamic Platform plugin for Tado**

>_Note: If you are looking for the non dynamic version, install the old version! [homebridge-tado-thermostat v3](https://github.com/SeydX/homebridge-tado-thermostat)_ 

**What means 'dynamic'?**

Every thermostat, user (occupancy sensor) or open window detection (window sensor) are affected by the settings in the Tado app. That means, the plugin knows when you turning on/off the open window detection for a thermostat, adding/removing an user or adding/removing a thermostat or just changing the room of a thermostat, the plugin will expose these or remove them dynamically from HomeKit. You dont need to add it manually or even restart homebridge. Just install the plugin, configure the config.json and lean back!

This homebridge plugin exposes Tado thermostats, occupancy sensors and weather sensor to Apple's HomeKit. It provides following features:

**Thermostats:**
- Additional modes: Heat, Cool, Auto and Off
- Secure temperature setting (temperature setting only possible in MANUAL mode (heat/cool))
- Auto heat/cool to a certain value (configurable within 3rd party app)
- Battery state and notification
- Built-in humidity sensor
- Possibility to expose built-in temperature & humidity sensors as new accessories to HomeKit
- Extended Delay: Every thermostat has two options (if extendedDelay setted to true in config.json) which are accessible over 3rd party apps like Elgato EVE etc - Delay Switch and Delay Timer. If delay timer > 0 and you turn on delay switch, the delay timer will begin to run and after the time is up, the switch will automatically turn off. (Thats helpfull for creating automations which needs a delay for turning on/off)
- Basic Delay: The thermostat has an additional option in the settings - delay timer (if extendedDelay setted to false in config.json). If delay timer setted to > 0, the delay will be automatically activated. It delays the thermostat to going back into auto mode again.
- Elgato EVE history feature (Fakegato)

**Boiler :**
- Expose Tado Hot Water to Apple HomeKit!
- Additional modes: Heat, Cool, Auto and Off
- Auto heat/cool to a certain value (configurable within 3rd party app)

**Temperature sensors:**
- If enabled in config.json (externalSensor )this plugin will create temperature sensors for each room.
- With built-in humidity sensors
- Elgato EVE history feature (Fakegato)

**Occupancy sensors:**
- If enabled in config.json this plugin will create occupancy/motion sensors for all registered persons (configurable in the tado app).
- In addition to this, it will create an "Anyone" sensor too, to create automations based on "Anyone at home / not at home"
- Elgato EVE history feature (Fakegato)

**Weather sensors:**
- If enabled in config.json, this plugin will create a weather sensor for your location based on tado.
- Elgato EVE history feature (Fakegato)
- OpenWeather Support: If API and Location setted in config, the Weather accessory will also show the current humidity state and Elgato EVE or other 3rd party apps will also show the airpressure, sunrise, sunset and weather state with FakeGato support! Note: You can get an API-Key from [openweathermap.org](https://openweathermap.org) - After sign up, you can create an API Key in the profile section

**Solar Intensity:**
- If enabled in config.json, this plugin will create a lightbulb for the solar intensity.
- Lightbulb accessory that will show you the relative(%) brightness of the sun in your home area. will go off when it's dark.
- Example automations: When solar intensity is off, turn on the lights in your home or when solar intensity is lower than 20% turn on the garden lights etc.

**Window sensors:**
- If enabled in config.json (openWindow) **AND** under the setting in the tado app (open window detection), this plugin creates window sensors for each room. So if the Tado open window detection detects an open window, the sensor will go on, and if the open window goes off, the sensor will also goes off

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
      "remoteThermostat":true,
      "externalSensor":false,
      "onePerRoom":false,
      "openWindow":false,
      "solarIntensity":false,
      "extendedDelay":true,
      "extendedWeather":{
                "activate":false,
                "key": "abcdefghijklmno12345678",
                "location":"Berlin"
      }
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
| externalSensor | No | Exposes built-in temperature and humidty sensors as new accessories for each room | 
| onePerRoom | No | Ignores all thermostats in config.json (except boiler) and exposes for each room ONE thermostat (Default: false) | 
| openWindow | No | Exposes window contact sensors to HomeKit (if OpenWindowDetection activated in Tado settings! - Default: false) | 
| solarIntensity | No | Exposes a new lightbulb accessory to HomeKit which represents the solar intensity based on your home location (Default: false) | 
| extendedWeather | No | If "activate" under **extendedWeather** is setted to **true** and an **API key** and **location** is also given, this plugin will expose additional information to HomeKit like weather humidty, air pressure, sunrise, senset and weather state (default: false / see **example-config** for more info) | 
| extendedDelay | No | Exposes an additional delay switch to the thermostat settings to create automations based on the delay timer and delay switch | 

See [Example Config](https://github.com/SeydX/homebridge-tado-platform/edit/master/example-config.json) for more details.

## In App settings

<img src="https://github.com/SeydX/homebridge-tado-platform/blob/master/images/tado_settings.gif" align="right" alt="In-App Settings">

There are more settings available within the app to customize the plugin for your own whishes _(this has the advantage that you do not have to restart homebridge every time you make changes, see gif (deprecated))_

- **Heat Value:** Value for the "Heat" mode. Example: a value of 4 will heat up the room to **Current Room Temperature + 4 degrees**

- **Cool Value:** Value for the "Cool" mode. Example: a value of 4 will cool up the room to **Current Room Temperature - 4 degrees**

- **Delay Timer:** Delay (in seconds) for the delay switch to turning it off

- **Delay Switch:** After switching it on, the delay timer will begin to run, and if the time is up, the switch will turn off (helpfull for automations that needs a delay on if extendedDelay setted to true in config.json, not in gif)


## Supported clients

This plugin has been verified to work with the following apps on iOS 11.3:

* Apple Home _(partial)_
* All 3rd party apps like Elgato Eve etc. _(recommended)_


## Known issues / TODO

### Issues:
///

### TODO:
- [x] Support more types: Boiler(BU01) and remote thermostat(RU01)
- [x] New Option: 'onePerRoom' (exposes only one thermostet per room)
- [x] New Accessory: Window Sensor (based on open window detection)
- [x] More functions for weather accessory with OpenWeather API
- [x] Lightbulb for Solar Intensity
- [x] DEBUG


## Contributing

You can contribute to this homebridge plugin in following ways:

- [Report issues](https://github.com/SeydX/homebridge-tado-platform/issues) and help verify fixes as they are checked in.
- Review the [source code changes](https://github.com/SeydX/homebridge-tado-platform/pulls).
- Contribute bug fixes.
- Contribute changes to extend the capabilities

Pull requests are accepted.
