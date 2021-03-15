# Changelog


## v6.0.1 - 2021-03-15
- Fixed a bug with faucet accessory appearing as air quality sensor
- Fixed a bug for HOT_WATER devices without temperature support
- Improvements

**Note:**

Hot water devices show 0° when they are first started in HomeKit if they are in "OFF" mode. The reason for this is that in "OFF" mode there is no temperature value in the API. When you turn on the device, the plugin saves the value for the further use case.

## v6.0.0 - 2021-03-14


**<u>NOTE:</u>** Updating from **<= v5.x** to **v6.x** will crash your homebridge, please **REMOVE** the old version first and check also the new [example-config.json](https://github.com/SeydX/homebridge-tado-platform/blob/master/example-config.json) 

- Config UI X support (config.schema.json)
- Custom UI
- Support for non config ui x user
- Auto-fill config for non config ui x user
- HB 1.3 support
  - Support new onGet/onSet event
- Refactored code
- Multiple tado accounts
  - Possibility to control multiple homes
- Customizable temperature unit via HomeKit
- Customizable Modes (AUTO | HEAT | COOL | OFF) or (ON | OFF)
- Deactivatable battery indicator (support for old gen thermostats)
- Customizable zone termination, separate for each zone
- Delay Switch
  - Delay as switch characteristic with adjustable timer characteristic for automations
  - Auto turn off options
- Separate humidity sensor
- Separate temperature sensor
- Boiler with adjustable accessory type
  - Switch (if no temperature is supported) 
  - Faucet (if no temperature supported)
  - HeaterCooler (if temperature supported)
- Grouped Central Switch with custom characteristics 
  - Overall heat in h for day/month/year
  - Thermostat/Boiler states (manual, auto, off)
  - Boost trigger switch
  - Resume shedule trigger switch
  - Turn off trigger switch
- OpenWindow
  - Grouped Switch: Enables open window and trigger open window detection
  - Contact: Read-only open window state as contact sensor
- Presence Lock
  - As Security System
  - As Grouped Switch Accessory 
- Air Quality
  - Weather
  - Zones
- FakeGato
  - Thermostats
  - HeaterCooler
  - Temperature sensors
  - Humidity sensors
  - Contact sensors (window)
- Telegram
  - Presence
  - OpenWindow
- Child Lock Switches as Grouped Switch Accessory
- Better error handling

## v5.1.5 - 2019-04-27
- Refactored HOTWATER Accessory (*)
- Bugfixes
- Cleanup code


## v5.1.4 - 2019-04-25
- Bugfixes


## v5.1.2 - 2019-04-22
- [NEW] Added Valve (Faucet Type) for Hotwater without temp adjustment possibility
- Bugfixes
- Code Cleanup


## v5.0.5 - 2019-04-22
- Code cleanup
- Bugfixes


## v5.0.3 - 2019-04-17
- Bugfixes
- Added new parameter into config.json (overrideMode) to set up the mode after temperature changement (manual or auto)
- Cleanup code

## v5.0.0 - 
- Initial release
