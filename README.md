<p align="center">
  <img src="https://github.com/SeydX/homebridge-tado-platform/blob/master/images/tado_logo.png" height="200">
</p>

# homebridge-tado-platform

[![npm](https://img.shields.io/npm/v/homebridge-tado-platform.svg?style=flat-square)](https://www.npmjs.com/package/homebridge-tado-platform)
[![npm](https://img.shields.io/npm/dt/homebridge-tado-platform.svg?style=flat-square)](https://www.npmjs.com/package/homebridge-tado-platform)
[![GitHub last commit](https://img.shields.io/github/last-commit/SeydX/homebridge-tado-platform.svg?style=flat-square)](https://github.com/SeydX/homebridge-tado-platform)
[![Donate](https://img.shields.io/badge/Donate-PayPal-blue.svg?style=flat-square&maxAge=2592000)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=NP4T3KASWQLD8)

**Creating and maintaining Homebridge plugins consume a lot of time and effort, if you would like to share your appreciation, feel free to "Star" or donate.**

[Click here](https://github.com/SeydX) to review more of my plugins.

## Info

**TafoPlatform** is possibly the biggest homebridge plugin for Tado devices. 


**Multiple home support**

The plugin even offers support for multiple houses. So it is finally possible to create multiple houses and control them together.


**Full HomeKit Support**

Everything Tado offers can be displayed through the plugin in Apple HomeKit. The thermostat buttons themselves have custom characteristics and can even display the air quality for a room. Full hot water support, weather temperature, solar intensity, weather air quality, tado quick actions, child lock, presence lock and much more awaits you with this plugin! 


**History**

Every temperature sensor, humidity sensor, contact sensor, motion sensor and thermostats are also able to show the history in Elgato EVE app. 


**Push Notification**

In addition, you can even get push notifications via Telegram when a user arrives or is absent, or when "Open Window" is triggered.


You can do that and much more with the new version 6. Have Fun!

## Installation

After [Homebridge](https://github.com/nfarina/homebridge) has been installed:

 ```sudo npm install -g homebridge-tado-platform@latest```

## Documentation

- [Example config.json](https://github.com/SeydX/homebridge-tado-platform/blob/master/example-config.json)
- [Non Config Ui X User?](#non-config-ui-x-user)
- [Configuration](#configuration)
  - [Thermostat](#thermostat)
    -  [Open Window](#open-window)
  - [Hot Water](#hot-water)
  - [Presence](#presence)
  - [Weather](#weather)
    - [Air Quality](#air-quality)
  - [Extras](#extras)
    - [Central Switch](#central-switch)
      - [Boost Switch](#boost-switch)
      - [Shedule Switch](#shedule-switch)
      - [Turnoff Switch](#turnoff-switch)
      - [Dummy Switch](#dummy-switch)
    - [Presence Lock](#presence-lock)
    - [Child Lock](#child-lock)
  - [Telegram](#telegram)
- [Supported Clients](#supported-clients)
- [Contributing](#contributing)
- [Troubleshooting](#troubleshooting)

## Custom UI

Unlike other plugins, this plugin allows you to manually enable/disable each zone, thermostat, user and everything you see in HomeKit via config.json.

The config.json offers a lot of configuration options. And if, as recommended, you use Config UI X, the plugin will be all the better.

It supports the full potential of Config UI X and makes configuring the plugin much easier. With it, you can create a "home" in no time and control everything through Config UI X. From logging in to creating config.json works fully automatically with Config UI X!

<img src="https://i.ibb.co/tL955Lg/hb-tadoplatform-ui-test.gif" align="center" alt="CustomUI">

_(In the section below you can find more information about the functions.)_
 
## Non Config Ui X User?:

The plugin can also work without config ui x or a custom ui. If you want the config.json auto-fill feature, you have to put the following part in your config.json. This will generate a ready to use config.json with all options disabled except thermostats. After the first start, thhis user will get ``"reconfigure": false``. If you want to refresh a home, just enable ``"reconfigure"`` for the user and restart homebridge. If you want to add an another home, add the user credentials (username/password) to the array. The Plugin can handle multiple accounts. 

**Note:**

If you on HOOBS, you need to reboot the HOOBS server to get your first start config changes instead of restarting Homebridge/HOOBS service.

```
{
  "bridge": {
    ...
  },
  "accessories": [
    ...
  ],
  "platforms": [
    {
      "name": "TadoPlatform",
      "platform": "TadoPlatform",
      "debug": false,
      "user": [
        {
          "username": "test@mail.com",
          "password": "testPassword123"
        }
      ]
    }
  ]
}
```
See [Example Config](https://github.com/SeydX/homebridge-tado-platform/edit/master/example-config.json) for more details

## Configuration

## Thermostat

Each zone in the config.json with ``"type": "HEATING"`` and ``"easyMode": false`` is exposed to HomeKit as a thermostat accessory with the following features:

- Current Mode: OFF | COOLING | HEATING | AUTO
- Target Mode: OFF | HEATING | AUTO
- Curent Temperature
- Target Temperature
- Built-in humidity sensor
- Room Air Quality
- Separate Humidity (if ``"separateHumidity": true``)
- Separate Temperature Sensor (if ``"separateTemperature": true``)
- Battery state (if ``noBattery: false``)
- Delay Switch characteristic with timer (if ``"delaySwitch": true``)
- Elgato EVE history feature (FakeGato)

**Delay Switch**
The Delay Switch (characteristic) can be used for eg. if you have an automation with `Open Window => Thermostat Off / Close Window => Thermostat On` and you want avoid multiple state changes, u can set ``"delaySwitch": true``in your config and change the timer (in seconds) via a third party app. If setted correctly, the thermostat will wait eg 60 seconds before switching to ON. It can also be used for own automations if you need a switch that turns off automatically after the given perioswithout affecting your thermostats (``"autoOffDelay": true``)

**Mode / Mode Timer**
``mode`` for the commands to be sent with. can be 'MANUAL' for manual control until ended by the user, 'AUTO' for manual control until next schedule change in tado° app OR 'TIMER' for manual control until timer ends. ``modeTimer`` for the ``MANUAL`` mode in minutes.

Each zone in the config.json with ``type: HEATING`` and ``easyMode: true`` is exposed to HomeKit as a HeaterCooler accessory with the features as above and some minor changes:

- Active: ON | OFF
- Target Mode: HEATING
- **NO** Elgato EVE history feature (FakeGato)

You can also adjust the minimum temperature step ``"minStep"``, minimum temperature value ``"minValue"`` or maximum temperature value ``"maxValue"`` via config.json. 

- **minValue**: By default, HEATING devices, also this plugin, supports a minValue of 5° Celsius / 41° Fahrenheit. If your device has a different minValue, you can set it up here. (Incorrect minValue may cause problems!)
- **maxValue**: By default, HEATING devices, also this plugin, supports a maxValue of 25° Celsius / 77° Fahrenheit by default. If your device has a different minValue, you can set it up here. (Incorrect maxValue may cause problems!)
- **minStep**: Minimum step for temperature adjustment. (Default: 1, must be between 0 - 1)

```
"homes": [
  {
    "zones": [
      {
        "active": true,
        "id": 32,
        "name": "Living Room",
        "type": "HEATING",
        "mode": "MANUAL",
        "modeTimer": 30,
        "delaySwitch": true,
        "autoOffDelay": false,
        "openWindowSensor": true,
        "openWindowSwitch": false,
        "airQuality": true,
        "separateTemperature": false,
        "separateHumidity": true,
        "mode": "MANUAL",
        "modeTimer": 30,
        "minValue": 5,
        "maxValue": 25,
        "minStep": "0.5",
        "easyMode": false,
        "noBattery": false
      }
      ...
    ]
  }
  ...
]
```

#### Open Window:

Each zone with ``"type": "HEATING"`` also has the possibility to display "OpenWindow" contact sensors or switches in HomeKit with the following features:

- Switch to enable disable open window for the zone or trigger the open window state of the zone
- Contact sensor to show the open window state

```
"homes": [
  {
    "zones": [
      {
        "active": true,
        "name": "Living Room",
        "type": "HEATING",
        "mode": "AUTO"
        "openWindowSensor": true,
        "openWindowSwitch": true
        ...
      }
      ...
    ]
  }
  ...
]
```

## Hot Water

Each zone in the config.json with ``"type": HOT_WATER`` and ``"boilerTempSupport": false`` is exposed to HomeKit as a switch (``"accTypeBoiler: "SWITCH"``) or faucet (``"accTypeBoiler: "FAUCET"``) accessory with the following features:

- Active: ON | OFF

Each zone in the config.json with ``type: HOT_WATER`` and ``boilerTempSupport: true`` is exposed to HomeKit as a HeaterCooler accessory with the following features:

- Current Mode: OFF | ON
- Target Mode: OFF | ON
- Curent Temperature
- Target Temperature
- Separate Temperature Sensor (if ``separateTemperature: true``)

You can also adjust the minimum temperature step ``"minStep"``, minimum temperature value ``"minValue"`` or maximum temperature value ``"maxValue"`` via config.json. 

- **minValue**: By default, HOT WATER devices, also this plugin, supports a minValue of 30° Celsius / 86° Fahrenheit. If your device has a different minValue, you can set it up here. (Incorrect minValue may cause problems!)
- **maxValue**: By default, HOT WATER devices, also this plugin, supports a maxValue of 65° Celsius / 149° Fahrenheit by default. If your device has a different minValue, you can set it up here. (Incorrect maxValue may cause problems!)
- **minStep**: Minimum step for temperature adjustment. (Default: 1, must be between 0 - 1)

```
"homes": [
  {
    "zones": [
      {
        "active": true,
        "id": 1,
        "name": "Bathroom",
        "type": "HOT_WATER",
        "mode": "MANUAL",
        "modeTimer": 30,
        "minValue": 30,
        "maxValue": 65,
        "minStep": "1",
        "separateTemperature": true,
        "boilerTempSupport": false,
        "accTypeBoiler": "SWITCH"
      }
      ...
    ]
  }
  ...
]
```

## Presence

Each user or anyone sensor in the config.json is exposed to HomeKit as a occupancy (``"accType: "OCCUPANCY"``) or motion (``"accType: "MOTION"``) accessory. 

```
"homes": [
  {
    "zones": [ ... ],
    "extras": { ... },
    "presence": {
      "anyone": true,
      "accTypeAnyone": "MOTION",
      "user": [
        {
          "active": true,
          "name": "Buddy 1",
          "accType": "MOTION"
        },
        {
          "active": true,
          "name": "Buddy 2",
          "accType": "OCCUPANCY"
        }
      ]
    }
    ...
  }
]
```

## Weather

Weather settings allow you to display a sensor for temperature, a light bulb (```"accTypeSolarIntensity": "LIGHTBULB"```)  or light sensor (```"accTypeSolarIntensity": "SENSOR"```) for sun intensity, or a sensor for air quality in HomeKit.

```
"homes": [
  {
    "zones": [ ... ],
    "extras": { ... },
    "presence": { ... },
    "weather": {
      "temperatureSensor": true,
      "solarIntensity": true,
      "accTypeSolarIntensity": "LIGHTBULB",
      "airQuality": true
    }
    ...
  }
  ...
]
```

### Air Quality

In order to use the Air Quality Sensor, you need to enable airQuality ``"airQuality": true`` (see above) **AND** you must enter your location data (latitude and longitude) in config.json. You can easily find the coordinates to your location/address on the following page: [latlong.net](https://www.latlong.net/convert-address-to-lat-long.html)


```
"homes": [
  {
    "geolocation": {
      "longitude": "10.1234567",
      "latitude": "23.4567890"
    },
    "zones": [ ... ],
    "extras": { ... },
    "presence": { ... },
    "weather": { 
      "airQuality": true
    }
    ...
  }
  ...
]
```

## Extras

### Central Switch
Shows a switch accessory with additional switches in HomeKit which mimics the "Boost" and "Turnoff" switch from Tado. It also shows the Heater Running information as a custom characteristic for the month (in hours) and it shows also how many thermostats are in auto, manual or off mode. Its also possible to show a dummy switch withiun the central switch for eg. automation purposes.

```
"homes": [
  {
    "zones": [ ... ],
    "extras": { ... },
    "presence": { ... },
    "weather": { ... },
    "extras": {
      "centralSwitch": true,
      "runningInformation": true
    }
    ...
  }
  ...
]
```

#### Boost Switch
Shows a switch accessory in HomeKit (added to central switch) which mimics the "Boost" switch from Tado and switches all heaters to max temperature. 
_Note: Central Switch needs to be truned on._

```
"homes": [
  {
    "zones": [ ... ],
    "extras": { ... },
    "presence": { ... },
    "weather": { ... },
    "extras": {
      "centralSwitch": true,
      "boostSwitch": true
    }
    ...
  }
  ...
]
```

#### Shedule Switch
Shows a switch accessory in HomeKit (added to central switch) which mimics the "Shedule" switch from Tado and switches all heaters to their default shedule
_Note: Central Switch needs to be truned on._

```
"homes": [
  {
    "zones": [ ... ],
    "extras": { ... },
    "presence": { ... },
    "weather": { ... },
    "extras": {
      "centralSwitch": true,
      "sheduleSwitch": true
    }
    ...
  }
  ...
]
```

#### Turnoff Switch
Shows a switch accessory in HomeKit (added to central switch) which mimics the "Turn Off" switch from Tado and switches all heaters off
_Note: Central Switch needs to be truned on._

```
"homes": [
  {
    "zones": [ ... ],
    "extras": { ... },
    "presence": { ... },
    "weather": { ... },
    "extras": {
      "centralSwitch": true,
      "turnoffSwitch": true
    }
    ...
  }
  ...
]
```


#### Dummy Switch
Shows a dummy switch accessory in HomeKit (added to central switch) without any functions. Can be used for eg automation purposes.
_Note: Central Switch needs to be truned on._

```
"homes": [
  {
    "zones": [ ... ],
    "extras": { ... },
    "presence": { ... },
    "weather": { ... },
    "extras": {
      "centralSwitch": true,
      "dummySwitch": true
    }
    ...
  }
  ...
]
```

### Presence Lock
Shows a switch with to sub switchs within the main accessory (``"accTypePresenceLock": "SWITCH"``) or security (``"accTypePresenceLock": "ALARM"``) accessory in HomeKit with following features: HOME | AWAY | DISABLED

```
"homes": [
  {
    "zones": [ ... ],
    "extras": { ... },
    "presence": { ... },
    "weather": { ... },
    "extras": {
      "presenceLock": true,
      "accTypePresenceLock": "SWITCH"
    }
    ...
  }
  ...
]
```

### Child Lock
Each device with ``"type": "HEATING"`` and child lock support can be exposed to HomeKit as a "sub" switch to the main switch accessory which can show you if child lock is enabled or you can also enable/disable child lock.

```
"homes": [
  {
    "zones": [ ... ],
    "extras": { ... },
    "presence": { ... },
    "weather": { ... },
    "extras": {
      "childLockSwitches": [
        {
        "active": true,
        "name": "Living Room Heater",
        "serialNumber": "VA1234567890"
        },
        {
        "active": true,
        "name": "Sleeping Room Heater",
        "serialNumber": "VA1234567890"
        }
      ]
    }
    ...
  }
  ...
]
```

## Telegram

You can set up the notifier to get a Telegram notification with customized messages and markdown capability when user arrives/leaves or open window detection triggers. Before you can use the "Telegram Notification" functionality, you need to set up a bot. Here you can find more information: [Setup Telegram Bot](https://github.com/SeydX/homebridge-fritz-platform/blob/master/docs/Telegram.md)

**Hint:**
To better customize the messages, special characters can be set so that the plugin replaces them.

**@** character will be replaced by the Accessory name

**%** character will be replaced by the house name

```
"homes": [
  {
    "zones": [ ... ],
    "extras": { ... },
    "presence": { ... },
    "weather": { ... },
    "telegram": {
      "active": true,
      "token": "136373846:HKAHEVbsuwxl0uCSIi8kdFJsheköjezz72525",
      "chatID": "-123456789",
      "messages": {
        "presence": {
          "user_in": "%: Welcome @",
          "user_out": "%: Bye Bye @",
          "anyone_in": "%: Anyone at home.",
          "anyone_out": "%: Nobody at home."
        },
        "openWindow": {
          "opened": "%: Open Window activated from @!",
          "closed": "%: Open Window deactivated from @!"
        }
      }
    }
  }
  ...
]
```

## Supported clients

This plugin has been verified to work with the following apps on iOS 14:

* Apple Home
* All 3rd party apps like Elgato Eve etc.
* Homebridge >= v1.1.6

## Contributing

You can contribute to this homebridge plugin in following ways:

- [Report issues](https://github.com/SeydX/homebridge-tado-platform/issues) and help verify fixes as they are checked in.
- Review the [source code changes](https://github.com/SeydX/homebridge-tado-platform/pulls).
- Contribute bug fixes.
- Contribute changes to extend the capabilities

Pull requests are accepted.

## Troubleshooting

If you have any issues with the plugin, you can enable the debug mode, which will provide some additional information. This might be useful for debugging issues. Open your config.json and set ``"debug": true``


## Disclaimer

All product and company names are trademarks™ or registered® trademarks of their respective holders. Use of them does not imply any affiliation with or endorsement by them.
