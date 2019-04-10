<p align="center">
    <img src="https://i.imgur.com/xcqkKKy.png" height="200">
</p>


## Tado!Platform v5 (dynamic)

[![npm](https://img.shields.io/npm/v/homebridge-tado-platform.svg?style=flat-square)](https://www.npmjs.com/package/homebridge-tado-platform)
[![npm](https://img.shields.io/npm/dt/homebridge-tado-platform.svg?style=flat-square)](https://www.npmjs.com/package/homebridge-tado-platform)
[![GitHub last commit](https://img.shields.io/github/last-commit/SeydX/homebridge-tado-platform.svg?style=flat-square)](https://github.com/SeydX/homebridge-tado-platform)
[![Donate](https://img.shields.io/badge/Donate-PayPal-blue.svg?style=flat-square&maxAge=2592000)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=NP4T3KASWQLD8)


**Creating and maintaining Homebridge plugins consume a lot of time and effort, if you would like to share your appreciation, feel free to "Star" or donate.**

[Click here](https://github.com/SeydX) to review more of my plugins.


**<u>NOTE:</u>** Updating from **v4.x** to **v5.x** will crash your homebridge, please **REMOVE** the old version first and check also the new [example-config.json](https://github.com/SeydX/homebridge-tado-platform/blob/master/example-config.json) or [extended-config.json](https://github.com/SeydX/homebridge-tado-platform/blob/master/extended-config.json)

### Dynamic:

Every thermostat, user (occupancy sensor) or open window detection (window sensor) are affected by the settings in the Tado app. That means, the plugin knows when you turning on/off the open window detection for a thermostat, adding/removing an user or adding/removing a thermostat or just changing the room of a thermostat, the plugin will expose these or remove them dynamically from HomeKit. You dont need to add it manually or even restart homebridge. Just install the plugin, configure the config.json and lean back!


This homebridge plugin exposes Tado thermostats, occupancy sensors and weather sensor to Apple's HomeKit. It provides following features:

**Thermostats:**
- Additional modes: Heat, Cool, Auto and Off
- Auto heat/cool to a certain value (configurable within 3rd party app)
- Battery state and notification
- Built-in humidity sensor
- Possibility to expose built-in temperature & humidity sensors as new accessories to HomeKit
- Delay: Every thermostat has two options (if extendedDelay setted to true in config.json) which are accessible over 3rd party apps like Elgato EVE etc - Delay Switch and Delay Timer. If delay timer > 0 and you turn on delay switch, the delay timer will begin to run and after the time is up, the switch will automatically turn off. (Thats helpfull for creating automations which needs a delay for turning on/off)
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
- Optional: It is also pissible to create an "Anyone" sensor too, to create automations based on "Anyone at home / not at home" (configurable via config.json)

**Weather sensors:**
- If enabled in config.json, this plugin will create a weather sensor for your location based on tado.
- Elgato EVE history feature (Fakegato)

**Solar Intensity:**
- If enabled in config.json, this plugin will create a lightbulb for the solar intensity.
- Lightbulb accessory that will show you the relative(%) brightness of the sun in your home area. will go off when it's dark.
- Example automations: When solar intensity is off, turn on the lights in your home or when solar intensity is lower than 20% turn on the garden lights etc.

**Window sensors:**
- If enabled in config.json (openWindow) **AND** under the setting in the tado app (open window detection), this plugin creates window sensors for each room. So if the Tado open window detection detects an open window, the sensor will go on, and if the open window goes off, the sensor will also goes off
- Elgato EVE history feature (Fakegato)

**Central Switch:**
- If enabled in config.json this plugin creates a central switch to turning off/on all thermostats together with just one click!
- Turning on the switch means, turn ALL thermostats into automatic mode
- Turning off the switch means, turn ALL thermostats off
- If ALL thermostats are off, the switch turns off
- If ONE thermostat is on, the switch turns on
- Additional Characteristics to see how much thermostats are in auto/manual/off mode
- Stateful Dummy Switch Characteristic for creating automations with extra conditions basend on the dummy switch

**Auto config generator:**

You only need 3 lines in your config.json to start the plugin. After init start, the plugin will check you Tado Account and will expose alls Thermostats etc to HomeKit. It will also auto create an full config.json! After the first start, you are able to change parameter in your config.json to enable/disable extras/thermostats etc.


See [Images](https://github.com/SeydX/homebridge-tado-platform/tree/master/images/) for more details.


## Installation instructions

After [Homebridge](https://github.com/nfarina/homebridge) has been installed:

 ```sudo npm install -g homebridge-tado-platform@latest```
 
 
 ## Example config.json:

```
{
  "bridge": {
      ...
  },
  "platforms": [
    {
    "platform":"TadoPlatform",
    "username":"TadoUserName",
    "password":"TadoPassword"
    }
  ]
}
```
See [Example Config](https://github.com/SeydX/homebridge-tado-platform/edit/beta/example-config.json) for more details or [extended-config.json](https://github.com/SeydX/homebridge-tado-platform/blob/master/extended-config.json)

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


## Contributing

You can contribute to this homebridge plugin in following ways:

- [Report issues](https://github.com/SeydX/homebridge-tado-platform/issues) and help verify fixes as they are checked in.
- Review the [source code changes](https://github.com/SeydX/homebridge-tado-platform/pulls).
- Contribute bug fixes.
- Contribute changes to extend the capabilities

Pull requests are accepted.


## Troubleshooting

If you have any issues with the plugin or TV services then you can run homebridge in debug mode, which will provide some additional information. This might be useful for debugging issues.

***HomeBridge with debug mode:*** ```DEBUG=TadoPlatform,TadoPlatformApi``` and ```homebridge -D ```
